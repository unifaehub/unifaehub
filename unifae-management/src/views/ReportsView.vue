<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { NavRole } from '@/config/navigation'
import axios from 'axios'
import client from '@/api/client'
import PrescriptionReportModal from '@/components/reports/PrescriptionReportModal.vue'
import MaterialIcon from '@/components/shell/MaterialIcon.vue'
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiPager from '@/components/ui/UiPager.vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import type { Paged } from '@/types/pagination'

type AppOpt = { id: number; name: string }
type CourseOpt = { id: number; name: string; appId: number | null }

const REPORT_TABS = [
  { id: 'apps', label: 'Apps', path: '/reports/apps', desc: 'Aplicativos cadastrados no hub.' },
  { id: 'courses', label: 'Cursos', path: '/reports/courses', desc: 'Cursos, app, rótulo de contexto e navegação JSON.' },
  { id: 'users', label: 'Usuários', path: '/reports/users', desc: 'Perfis, vínculos curso/app, login e período ativo.' },
  { id: 'patients', label: 'Pacientes', path: '/reports/patients', desc: 'Prontuários com estagiário, professor, curso e app.' },
  {
    id: 'prescriptions',
    label: 'Prescrições',
    path: '/reports/prescriptions',
    desc: 'Todas as prescrições com status, responsáveis e contagem de itens.',
  },
  {
    id: 'approvals',
    label: 'Aprovações',
    path: '/reports/approvals',
    desc: 'Fila (pendentes por padrão); altere o filtro de status se precisar.',
  },
  { id: 'categories', label: 'Categorias', path: '/reports/categories', desc: 'Árvore taxonômica: tipo, caso clínico, curso e app.' },
  { id: 'exercises', label: 'Exercícios', path: '/reports/exercises', desc: 'Catálogo com anexos e vínculos a categorias.' },
  {
    id: 'exercise-categories',
    label: 'Exercício × categorias',
    path: '/reports/exercise-categories',
    desc: 'Cada linha de vínculo entre exercício e categoria.',
  },
  { id: 'menu-nodes', label: 'Menus (catálogo)', path: '/reports/menu-nodes', desc: 'Nós globais do hub (chave, ícone, pai).' },
  {
    id: 'course-menus',
    label: 'Menus por curso',
    path: '/reports/course-menus',
    desc: 'Habilitação e ordem dos nós por curso.',
  },
  { id: 'clinical-cases', label: 'Casos clínicos', path: '/reports/clinical-cases', desc: 'Contextos por curso e app.' },
] as const

type TabId = (typeof REPORT_TABS)[number]['id']

const auth = useAuthStore()
const toast = useToastStore()

const userRole = computed(() => (auth.user?.role ?? '') as NavRole | '')

/** Abas visíveis conforme perfil (alinhado à API `ReportsService.ensureReportAccess`). */
const visibleReportTabs = computed(() => {
  const r = userRole.value
  if (r === 'ADMIN') return [...REPORT_TABS]
  if (r === 'STUDENT') {
    return REPORT_TABS.filter((t) => ['patients', 'prescriptions', 'approvals'].includes(t.id))
  }
  if (r === 'COORDINATOR' || r === 'PROFESSOR') {
    return REPORT_TABS.filter((t) => t.id !== 'menu-nodes')
  }
  return [...REPORT_TABS]
})

/** Estagiário: dados já limitados à conta dele na API; esconde filtro de app/curso. */
const hideScopeFilters = computed(() => userRole.value === 'STUDENT')

function apiErrorMessage(err: unknown, fallback: string) {
  if (!axios.isAxiosError(err)) return fallback
  const m = err.response?.data as { message?: string | string[] } | undefined
  const raw = m?.message
  if (Array.isArray(raw)) return raw.join(' ')
  if (typeof raw === 'string' && raw.trim()) return raw
  return fallback
}

const activeTab = ref<TabId>('apps')
const appsOptions = ref<AppOpt[]>([])
const coursesOptions = ref<CourseOpt[]>([])

const q = ref('')
const filterAppId = ref<number | ''>('')
const filterCourseId = ref<number | ''>('')
const filterStatus = ref<'' | 'PENDING' | 'APPROVED' | 'REJECTED'>('')
const filterRole = ref<string>('')
const filterActive = ref<'' | 'true' | 'false'>('')
const includeDeleted = ref(false)
const createdFrom = ref('')
const createdTo = ref('')

const page = ref(1)
const limit = ref(50)
const total = ref(0)
const rows = ref<Record<string, unknown>[]>([])
const loading = ref(false)
const failed = ref(false)

let qDebounceTimer: ReturnType<typeof setTimeout> | null = null
let selectingTab = false
let suppressPageWatch = false

const isAdmin = computed(() => auth.user?.role === 'ADMIN')

const currentMeta = computed(() => visibleReportTabs.value.find((t) => t.id === activeTab.value))

/** Filtros contextualizados por aba (evita enviar app/curso onde não há efeito na API). */
const showFilterApp = computed(
  () => !hideScopeFilters.value && !['apps', 'menu-nodes'].includes(activeTab.value),
)
const showFilterCourse = computed(
  () => !hideScopeFilters.value && !['apps', 'menu-nodes'].includes(activeTab.value),
)
const showFilterActive = computed(() =>
  ['apps', 'courses', 'exercises', 'users'].includes(activeTab.value),
)
const showPrescriptionFilters = computed(
  () => activeTab.value === 'prescriptions' || activeTab.value === 'approvals',
)
const showPrescriptionViewAction = computed(
  () => activeTab.value === 'prescriptions' || activeTab.value === 'approvals',
)
const showUserFilters = computed(() => activeTab.value === 'users')

const reportModalOpen = ref(false)
const reportModalId = ref<number | null>(null)

function openPrescriptionReport(id: number) {
  if (!Number.isFinite(id)) return
  reportModalId.value = id
  reportModalOpen.value = true
}

function closePrescriptionReport() {
  reportModalOpen.value = false
  reportModalId.value = null
}

function humanizeKey(key: string): string {
  const map: Record<string, string> = {
    id: 'ID',
    name: 'Nome',
    email: 'E-mail',
    role: 'Papel',
    active: 'Ativo',
    activeFrom: 'Ativo desde',
    activeUntil: 'Ativo até',
    appId: 'ID aplicativo',
    appName: 'Aplicativo',
    courseId: 'ID curso',
    courseName: 'Curso',
    patientId: 'ID paciente',
    patientName: 'Paciente',
    patientEmail: 'E-mail paciente',
    studentId: 'ID estagiário',
    studentName: 'Estagiário',
    studentEmail: 'E-mail estagiário',
    professorId: 'ID professor',
    professorName: 'Professor',
    professorEmail: 'E-mail professor',
    menuNodeId: 'ID nó de menu',
    clinicalCaseId: 'ID caso clínico',
    clinicalCaseName: 'Caso clínico',
    parentId: 'ID categoria pai',
    parentName: 'Categoria pai',
    itemsCount: 'Qtd. itens',
    categoriesLinksCount: 'Qtd. vínculos (categorias)',
    attachmentsCount: 'Qtd. anexos',
    hasNavigationJson: 'Navegação JSON',
    includeInNewCourses: 'Incluir em cursos novos',
    deletedAt: 'Excluído em',
    createdAt: 'Criado em',
    updatedAt: 'Atualizado em',
    firstLoginAt: 'Primeiro login',
    firstLoginIp: 'IP primeiro login',
    lastLoginAt: 'Último login',
    nextVisitDate: 'Próxima visita',
    justification: 'Justificativa',
    caseContextLabel: 'Rótulo de contexto',
    categoryTypeKey: 'Tipo (chave)',
    categoryTypeLabel: 'Tipo (rótulo)',
    exerciseId: 'ID exercício',
    exerciseName: 'Exercício',
    categoryId: 'ID categoria',
    categoryName: 'Categoria',
    linkId: 'ID vínculo',
    createdById: 'ID autor',
    createdByName: 'Criado por',
    description: 'Descrição',
    instructions: 'Instruções',
    videoUrl: 'URL do vídeo',
    status: 'Status',
    menuKey: 'Chave do menu',
    menuLabel: 'Rótulo do menu',
    menuIcon: 'Ícone',
    menuRouteName: 'Nome da rota',
    key: 'Chave',
    label: 'Rótulo',
    icon: 'Ícone',
    routeName: 'Nome da rota',
    parentKey: 'Chave do pai',
    parentLabel: 'Rótulo do pai',
    sortOrder: 'Ordem',
    enabled: 'Habilitado',
    isLeafLevel: 'Nível folha',
  }
  if (map[key]) return map[key]
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())
}

const columns = computed(() => {
  const r = rows.value[0]
  if (!r) return [] as string[]
  return Object.keys(r)
})

function formatPtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function formatPtDateOnly(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('pt-BR')
}

function formatRole(v: string): string {
  const m: Record<string, string> = {
    ADMIN: 'Administrador',
    COORDINATOR: 'Coordenação',
    PROFESSOR: 'Professor',
    STUDENT: 'Estagiário',
    PATIENT: 'Paciente',
  }
  return m[v] ?? v
}

function formatPrescriptionStatus(v: string): string {
  const m: Record<string, string> = {
    PENDING: 'Pendente',
    APPROVED: 'Aprovada',
    REJECTED: 'Rejeitada',
  }
  return m[v] ?? v
}

/** Exibição e exportação CSV em pt-BR. */
function formatCell(columnKey: string, v: unknown): string {
  if (v === null || v === undefined) return '—'

  if (columnKey === 'active' && typeof v === 'boolean') {
    return v ? 'Ativo' : 'Inativo'
  }

  if (columnKey === 'role' && typeof v === 'string') {
    return formatRole(v)
  }

  if (
    columnKey === 'status' &&
    typeof v === 'string' &&
    ['PENDING', 'APPROVED', 'REJECTED'].includes(v)
  ) {
    return formatPrescriptionStatus(v)
  }

  if (
    ['enabled', 'includeInNewCourses', 'isLeafLevel', 'hasNavigationJson'].includes(columnKey) &&
    typeof v === 'boolean'
  ) {
    return v ? 'Sim' : 'Não'
  }

  if (typeof v === 'boolean') {
    return v ? 'Sim' : 'Não'
  }

  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return formatPtDateOnly(`${v}T12:00:00`)
  }

  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    if (columnKey === 'activeFrom' || columnKey === 'activeUntil') {
      return formatPtDateOnly(v)
    }
    return formatPtDate(v)
  }

  return String(v)
}

async function loadCatalog() {
  try {
    const [{ data: apps }, { data: courses }] = await Promise.all([
      client.get<Paged<AppOpt>>('/apps', { params: { page: 1, limit: 100 } }),
      client.get<Paged<CourseOpt>>('/courses', { params: { page: 1, limit: 100 } }),
    ])
    appsOptions.value = apps.data ?? []
    coursesOptions.value = courses.data ?? []
  } catch {
    appsOptions.value = []
    coursesOptions.value = []
  }
}

function buildReportParams(): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {
    page: page.value,
    limit: limit.value,
  }
  const tab = activeTab.value
  const qt = q.value.trim()
  if (qt) params.q = qt

  if (showFilterApp.value && filterAppId.value !== '') {
    params.appId = filterAppId.value
  }
  if (showFilterCourse.value && filterCourseId.value !== '') {
    params.courseId = filterCourseId.value
  }

  if (tab === 'approvals') {
    params.status = filterStatus.value || 'PENDING'
  } else if (tab === 'prescriptions' && filterStatus.value) {
    params.status = filterStatus.value
  }

  if (tab === 'users') {
    if (filterRole.value) params.role = filterRole.value
    if (filterActive.value) params.active = filterActive.value
    if (isAdmin.value && includeDeleted.value) params.includeDeleted = 'true'
  }

  if (showFilterActive.value && tab !== 'users' && filterActive.value) {
    params.active = filterActive.value
  }

  if (showPrescriptionFilters.value && createdFrom.value) {
    params.createdFrom = createdFrom.value
  }
  if (showPrescriptionFilters.value && createdTo.value) {
    params.createdTo = createdTo.value
  }

  return params
}

async function fetchReport() {
  const tab = REPORT_TABS.find((t) => t.id === activeTab.value)
  if (!tab) return
  loading.value = true
  failed.value = false
  try {
    const params = buildReportParams()
    const { data } = await client.get<Paged<Record<string, unknown>>>(tab.path, { params })
    rows.value = data.data ?? []
    total.value = data.total ?? 0
  } catch (e) {
    failed.value = true
    rows.value = []
    total.value = 0
    toast.error(apiErrorMessage(e, 'Não foi possível carregar o relatório.'))
  } finally {
    loading.value = false
  }
}

function onFilterControlChange() {
  const prev = page.value
  if (prev === 1) {
    void fetchReport()
    return
  }
  suppressPageWatch = true
  page.value = 1
  void nextTick(() => {
    suppressPageWatch = false
    void fetchReport()
  })
}

function exportCsv() {
  if (!rows.value.length) {
    toast.error('Nada para exportar.')
    return
  }
  const cols = columns.value
  const esc = (col: string, v: unknown) => {
    const s = formatCell(col, v)
    return `"${s.replace(/"/g, '""')}"`
  }
  const header = cols.map((c) => `"${humanizeKey(c).replace(/"/g, '""')}"`).join(';')
  const lines = rows.value.map((row) => cols.map((c) => esc(c, row[c])).join(';'))
  const bom = '\uFEFF'
  const csv = bom + [header, ...lines].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `relatorio-${activeTab.value}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
  toast.success('CSV gerado.')
}

function selectTab(id: TabId) {
  if (qDebounceTimer) {
    clearTimeout(qDebounceTimer)
    qDebounceTimer = null
  }
  selectingTab = true
  suppressPageWatch = true
  q.value = ''
  filterAppId.value = ''
  filterCourseId.value = ''
  filterStatus.value = ''
  filterRole.value = ''
  filterActive.value = ''
  includeDeleted.value = false
  createdFrom.value = ''
  createdTo.value = ''
  page.value = 1
  activeTab.value = id
  void nextTick(() => {
    selectingTab = false
    suppressPageWatch = false
    void fetchReport()
  })
}

watch(q, () => {
  if (selectingTab) return
  if (qDebounceTimer) clearTimeout(qDebounceTimer)
  const trimmed = q.value.trim()
  const run = () => {
    suppressPageWatch = true
    page.value = 1
    void nextTick(() => {
      suppressPageWatch = false
      void fetchReport()
    })
  }
  if (!trimmed) {
    run()
    return
  }
  qDebounceTimer = setTimeout(() => {
    qDebounceTimer = null
    run()
  }, 400)
})

watch([page, limit], () => {
  if (suppressPageWatch) return
  void fetchReport()
})

watch(userRole, () => {
  const tabs = visibleReportTabs.value
  if (!tabs.length) return
  if (!tabs.some((t) => t.id === activeTab.value)) {
    suppressPageWatch = true
    page.value = 1
    activeTab.value = tabs[0]!.id
    void nextTick(() => {
      suppressPageWatch = false
      void fetchReport()
    })
  }
})

onMounted(() => {
  const tabs = visibleReportTabs.value
  if (tabs.length && !tabs.some((t) => t.id === activeTab.value)) {
    activeTab.value = tabs[0]!.id
  }
  void loadCatalog()
  void fetchReport()
})
</script>

<template>
  <div class="page">
    <header class="hero">
      <div>
        <h1 class="title">Relatórios</h1>
        <p class="sub">
          Administrador vê todos os relatórios; coordenação e professor veem dados do curso/app vinculados (exceto catálogo
          global de menus). Estagiários veem apenas pacientes e prescrições da própria conta.
        </p>
        <p v-if="currentMeta" class="hint">{{ currentMeta.desc }}</p>
      </div>
      <button type="button" class="btn-export" :disabled="loading || !rows.length" @click="exportCsv">
        <MaterialIcon name="download" size="1.05rem" />
        Exportar CSV
      </button>
    </header>

    <div class="tabs-wrap">
      <div class="tabs" role="tablist">
        <button
          v-for="t in visibleReportTabs"
          :key="t.id"
          type="button"
          class="tab"
          :class="{ 'tab--active': activeTab === t.id }"
          role="tab"
          :aria-selected="activeTab === t.id"
          @click="selectTab(t.id)"
        >
          {{ t.label }}
        </button>
      </div>
    </div>

    <div class="filters panel tonal">
      <div class="filters__grid">
        <div class="field field--grow">
          <label class="lbl">Busca</label>
          <input v-model="q" class="in" type="search" placeholder="Digite para filtrar…" />
        </div>
        <div v-if="showFilterApp" class="field">
          <label class="lbl">Aplicativo</label>
          <select v-model="filterAppId" class="in" @change="onFilterControlChange">
            <option value="">Todos</option>
            <option v-for="a in appsOptions" :key="a.id" :value="a.id">{{ a.name }}</option>
          </select>
        </div>
        <div v-if="showFilterCourse" class="field">
          <label class="lbl">Curso</label>
          <select v-model="filterCourseId" class="in" @change="onFilterControlChange">
            <option value="">Todos</option>
            <option v-for="c in coursesOptions" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div v-if="showPrescriptionFilters" class="field">
          <label class="lbl">Status</label>
          <select v-model="filterStatus" class="in" @change="onFilterControlChange">
            <option value="">Todos</option>
            <option value="PENDING">Pendente</option>
            <option value="APPROVED">Aprovada</option>
            <option value="REJECTED">Rejeitada</option>
          </select>
        </div>
        <div v-if="showUserFilters" class="field">
          <label class="lbl">Papel</label>
          <select v-model="filterRole" class="in" @change="onFilterControlChange">
            <option value="">Todos</option>
            <option value="ADMIN">Administrador</option>
            <option value="COORDINATOR">Coordenação</option>
            <option value="PROFESSOR">Professor</option>
            <option value="STUDENT">Estagiário</option>
            <option value="PATIENT">Paciente</option>
          </select>
        </div>
        <div v-if="showFilterActive" class="field">
          <label class="lbl">Ativo</label>
          <select v-model="filterActive" class="in" @change="onFilterControlChange">
            <option value="">Todos</option>
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
        </div>
        <div v-if="showUserFilters && isAdmin" class="field field--check">
          <label class="lbl">Incluir excluídos</label>
          <label class="chk">
            <input v-model="includeDeleted" type="checkbox" @change="onFilterControlChange" />
            <span>Usuários com exclusão lógica</span>
          </label>
        </div>
        <div v-if="showPrescriptionFilters" class="field">
          <label class="lbl">Emitidas de</label>
          <input v-model="createdFrom" class="in" type="date" @change="onFilterControlChange" />
        </div>
        <div v-if="showPrescriptionFilters" class="field">
          <label class="lbl">Emitidas até</label>
          <input v-model="createdTo" class="in" type="date" @change="onFilterControlChange" />
        </div>
      </div>
    </div>

    <UiConnectionRetry v-if="failed" @retry="fetchReport" />
    <p v-else-if="loading" class="muted pad">Carregando…</p>
    <div v-else class="table-wrap panel tonal">
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th v-if="showPrescriptionViewAction" class="col-doc">Documento</th>
              <th v-for="col in columns" :key="col">{{ humanizeKey(col) }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, ri) in rows" :key="row.id != null ? String(row.id) : ri">
              <td v-if="showPrescriptionViewAction" class="col-doc">
                <UiIconButton
                  icon="visibility"
                  label="Ver prescrição / imprimir"
                  variant="doc"
                  :disabled="row.id == null"
                  @click="openPrescriptionReport(Number(row.id))"
                />
              </td>
              <td v-for="col in columns" :key="col">{{ formatCell(col, row[col]) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="!rows.length" class="empty muted">Nenhum registro neste filtro.</p>
      <UiPager
        v-if="total > 0"
        v-model:page="page"
        :limit="limit"
        :total="total"
        :loading="loading"
      />
    </div>

    <PrescriptionReportModal
      :open="reportModalOpen"
      :prescription-id="reportModalId"
      @close="closePrescriptionReport"
    />
  </div>
</template>

<style scoped>
.page {
  font-family: var(--uf-font);
  color: var(--uf-on-surface);
}
.hero {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.25rem;
}
.title {
  margin: 0;
  font-size: 2.1rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.sub {
  margin: 0.35rem 0 0;
  max-width: 44rem;
  color: var(--uf-on-surface-variant);
  font-size: 0.9rem;
  line-height: 1.5;
}
.hint {
  margin: 0.5rem 0 0;
  font-size: 0.82rem;
  color: var(--uf-primary);
  font-weight: 600;
}
.btn-export {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1.1rem;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  font-family: var(--uf-font);
  font-weight: 700;
  font-size: 0.82rem;
  background: var(--uf-primary);
  color: #fff;
}
.btn-export:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.tabs-wrap {
  margin-bottom: 1rem;
  overflow-x: auto;
}
.tabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.tab {
  border: 1px solid rgba(191, 202, 186, 0.45);
  background: var(--uf-surface-container-lowest);
  color: var(--uf-on-surface-variant);
  font-family: var(--uf-font);
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.4rem 0.65rem;
  border-radius: var(--uf-radius-md);
  cursor: pointer;
  white-space: nowrap;
}
.tab--active {
  background: rgba(13, 99, 27, 0.14);
  color: var(--uf-primary);
  border-color: rgba(13, 99, 27, 0.35);
}
.filters {
  padding: 1rem 1.15rem;
  margin-bottom: 1rem;
}
.filters__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.75rem 1rem;
  align-items: end;
}
.field--grow {
  grid-column: span 2;
  min-width: 200px;
}
.field--check {
  grid-column: span 2;
}
.lbl {
  display: block;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--uf-on-surface-variant);
  margin-bottom: 0.2rem;
}
.in {
  width: 100%;
  box-sizing: border-box;
  border-radius: var(--uf-radius-md);
  border: 1px solid rgba(191, 202, 186, 0.55);
  padding: 0.45rem 0.55rem;
  font-family: var(--uf-font);
  font-size: 0.85rem;
}
.chk {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  cursor: pointer;
}
.table-wrap {
  padding: 0;
  overflow: hidden;
}
.table-scroll {
  overflow-x: auto;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}
.data-table th,
.data-table td {
  padding: 0.45rem 0.6rem;
  border-bottom: 1px solid rgba(191, 202, 186, 0.25);
  text-align: left;
  vertical-align: top;
}
.data-table th {
  background: var(--uf-surface-container-low);
  font-weight: 700;
  white-space: nowrap;
}
.col-doc {
  width: 3rem;
  text-align: center;
}
.ibtn {
  padding: 0.35rem;
  border: none;
  border-radius: var(--uf-radius-md);
  background: transparent;
  color: var(--uf-primary);
  cursor: pointer;
  vertical-align: middle;
}
.ibtn:hover:not(:disabled) {
  background: rgba(46, 125, 50, 0.08);
}
.ibtn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.ibtn--doc {
  color: var(--uf-on-surface-variant);
}
.ibtn--doc:hover:not(:disabled) {
  color: var(--uf-primary);
}
.data-table td {
  max-width: 22rem;
  word-break: break-word;
}
.empty {
  padding: 1rem 1.25rem;
}
.muted {
  color: var(--uf-on-surface-variant);
}
.pad {
  padding: 1rem 0;
}
.panel.tonal {
  box-shadow: var(--uf-tonal-shadow);
  border-radius: var(--uf-radius-xl);
  background: var(--uf-surface-container-lowest);
}
</style>
