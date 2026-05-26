<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import client from '@/api/client'
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton.vue'
import MaterialIcon from '@/components/shell/MaterialIcon.vue'
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import { useApiRequest } from '@/composables/useApiRequest'
import { useAuthStore } from '@/stores/auth'

type DashboardOverview = {
  viewer: {
    role: 'ADMIN' | 'COORDINATOR' | 'PROFESSOR' | 'STUDENT' | 'PATIENT'
    appId: number | null
    courseId: number | null
  }
  filters: {
    appId: number | null
    courseId: number | null
    periodDays: number
    since: string
    until: string
  }
  cards: {
    apps: number
    courses: number
    pendingPrescriptions: number
    adherenceRate: number | null
    users?: number
    patients?: number
    students?: number
    myPatients?: number
    categories?: number
    subcategories?: number
    reportsCreated?: number
    reportsPublished?: number
    activePatients?: number
    highRiskPatients?: number
  }
  lists: {
    courses: Array<{
      id: number
      name: string
      appId: number
      active: boolean
      patients: number
      pendingPrescriptions: number
      adherenceRate: number | null
    }>
    apps: Array<{ id: number; name: string; active: boolean }>
  }
}

type AdminNoteStatus = 'OPEN' | 'IN_PROGRESS' | 'PAUSED' | 'DONE' | 'REJECTED'
type AdminNote = {
  id: number
  description: string
  requestedBy: string | null
  status: AdminNoteStatus
  observations: string | null
  active?: boolean
  rejectionReason?: string | null
  rejectedAt?: string | null
  rejectedByUser?: { id: number; name: string; email: string } | null
  finishedAt: string | null
  createdAt: string
  updatedAt: string
  createdByUser?: { id: number; name: string; email: string }
  updatedByUser?: { id: number; name: string; email: string } | null
}

const auth = useAuthStore()
const router = useRouter()
const scopedId = computed(() => auth.scopedAppId)

const isAdmin = computed(() => auth.user?.role === 'ADMIN')
const isCoordinator = computed(() => viewerRole.value === 'COORDINATOR')
const selectedAppId = ref<number | null>(null)
const selectedCourseId = ref<number | null>(null)
const periodDays = ref<7 | 30 | 90>(30)
type DateMode = 'period' | 'range' | 'single'
const dateMode = ref<DateMode>('period')
const rangeStart = ref<string>('')
const rangeEnd = ref<string>('')
const singleDate = ref<string>('')
// exports removidos (não usado inicialmente no dashboard)

type ApiStatus = 'checking' | 'online' | 'offline'
const apiStatus = ref<ApiStatus>('checking')
let apiTimer: number | null = null

const newNoteDescription = ref('')
const newNoteRequestedBy = ref('')
const newNoteStatus = ref<AdminNoteStatus>('OPEN')
const newNoteObs = ref('')
const creatingNote = ref(false)

const notesActiveFilter = ref<'active' | 'inactive' | 'all'>('active')
const notesStatusFilter = ref<AdminNoteStatus | ''>('')
const notesRequesterFilter = ref<string>('')
const requesters = ref<string[]>([])

const rejectModalOpen = ref(false)
const rejectTargetId = ref<number | null>(null)
const rejectReason = ref('')

function openRejectModal(noteId: number) {
  rejectTargetId.value = noteId
  rejectReason.value = ''
  rejectModalOpen.value = true
}

function closeRejectModal() {
  rejectModalOpen.value = false
  rejectTargetId.value = null
  rejectReason.value = ''
}

async function confirmReject() {
  const id = rejectTargetId.value
  if (!id) return
  await updateAdminNote(id, {
    status: 'REJECTED',
    rejectionReason: rejectReason.value.trim() || 'Rejeitado.',
  })
  closeRejectModal()
}

function todayIsoDate() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtBrDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear())
  return `${dd}/${mm}/${yy}`
}

const {
  data: adminNotes,
  loading: adminNotesLoading,
  failed: adminNotesFailed,
  execute: loadAdminNotes,
} = useApiRequest<AdminNote[]>(
  async () => {
    const params: Record<string, string> = { active: notesActiveFilter.value }
    if (notesStatusFilter.value) params.status = notesStatusFilter.value
    if (!isCoordinator.value && notesRequesterFilter.value.trim())
      params.requestedBy = notesRequesterFilter.value.trim()
    const { data } = await client.get<AdminNote[]>('/admin-notes', { params })
    return data
  },
  { onUnauthorized: handleUnauthorized },
)

async function loadRequesters() {
  const { data } = await client.get<string[]>('/admin-notes/requesters')
  requesters.value = data
}

async function createAdminNote() {
  if (!newNoteDescription.value.trim()) return
  creatingNote.value = true
  try {
    await client.post('/admin-notes', {
      description: newNoteDescription.value.trim(),
      requestedBy: newNoteRequestedBy.value.trim() || undefined,
      status: newNoteStatus.value,
      observations: newNoteObs.value.trim() || undefined,
    })
    newNoteDescription.value = ''
    newNoteRequestedBy.value = ''
    newNoteStatus.value = 'OPEN'
    newNoteObs.value = ''
    await loadAdminNotes()
  } finally {
    creatingNote.value = false
  }
}

async function updateAdminNote(
  id: number,
  patch: Partial<Pick<AdminNote, 'status' | 'observations' | 'active' | 'rejectionReason' | 'finishedAt'>>,
) {
  await client.patch(`/admin-notes/${id}`, patch)
  await loadAdminNotes()
}

async function deactivateAdminNote(id: number) {
  await client.patch(`/admin-notes/${id}/deactivate`)
  await loadAdminNotes()
}

const queryParams = computed(() => {
  const params: Record<string, number | string> = {}
  if (dateMode.value === 'period') params.periodDays = periodDays.value
  else if (dateMode.value === 'single' && singleDate.value) params.date = singleDate.value
  else if (dateMode.value === 'range' && rangeStart.value && rangeEnd.value) {
    params.startDate = rangeStart.value
    params.endDate = rangeEnd.value
  } else {
    // fallback seguro
    params.periodDays = periodDays.value
  }
  // Se o contexto do login for APP, respeita. Se for GLOBAL e for admin, permite selecionar app no filtro.
  if (scopedId.value != null) params.appId = scopedId.value
  else if (isAdmin.value && selectedAppId.value != null) params.appId = selectedAppId.value
  if (selectedCourseId.value != null) params.courseId = selectedCourseId.value
  return params
})

function handleUnauthorized() {
  auth.logout()
  window.location.href = '/login'
}

const { data, loading, failed, execute } = useApiRequest<DashboardOverview>(
  async () => {
    const { data } = await client.get<DashboardOverview>('/dashboard/overview', {
      params: queryParams.value,
    })
    return data
  },
  { onUnauthorized: handleUnauthorized },
)

const appsDisplay = computed(() => data.value?.lists.apps ?? [])
const coursesDisplay = computed(() => data.value?.lists.courses ?? [])
const cards = computed(() => data.value?.cards ?? null)
const viewerRole = computed(() => data.value?.viewer.role ?? (auth.user?.role ?? 'STUDENT'))

const kpiA = computed(() => {
  const c = cards.value
  if (!c) return { label: '—', value: '—', tag: 'Visão' }
  if (viewerRole.value === 'ADMIN') return { label: 'Aplicativos', value: String(c.apps), tag: 'Sistema' }
  if (viewerRole.value === 'COORDINATOR') return { label: 'Alunos', value: String(c.students ?? '—'), tag: 'Curso' }
  if (viewerRole.value === 'STUDENT') return { label: 'Meus pacientes', value: String(c.myPatients ?? c.patients ?? '—'), tag: 'Pessoal' }
  return { label: 'Pacientes', value: String(c.patients ?? '—'), tag: 'Visão' }
})

const kpiB = computed(() => {
  const c = cards.value
  if (!c) return { label: '—', value: '—', tag: 'Visão' }
  if (viewerRole.value === 'ADMIN') return { label: 'Usuários', value: String(c.users ?? '—'), tag: 'Sistema' }
  if (viewerRole.value === 'COORDINATOR') return { label: 'Pacientes', value: String(c.patients ?? '—'), tag: 'Curso' }
  if (viewerRole.value === 'STUDENT') return { label: 'Cursos', value: String(c.courses), tag: 'Contexto' }
  return { label: 'Cursos', value: String(c.courses), tag: 'Contexto' }
})

function formatPercent(v: number | null) {
  if (v == null) return '—'
  return `${Math.round(v * 100)}%`
}

function onCourseChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value
  selectedCourseId.value = v === '' ? null : Number(v)
}

function onPeriodChange(e: Event) {
  const v = Number((e.target as HTMLSelectElement).value) as 7 | 30 | 90
  periodDays.value = v
  dateMode.value = 'period'
}

function onDateModeChange(e: Event) {
  dateMode.value = (e.target as HTMLSelectElement).value as DateMode
}

function applySingleToday() {
  singleDate.value = todayIsoDate()
}

function onAppChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value
  selectedAppId.value = v === '' ? null : Number(v)
  selectedCourseId.value = null
}

// exportCsv/exportDetailedCsv removidos

watch(queryParams, () => {
  void execute()
})

async function checkApi() {
  apiStatus.value = 'checking'
  try {
    await client.get('/health')
    apiStatus.value = 'online'
  } catch {
    apiStatus.value = 'offline'
  }
}

function openInternalApiGuide() {
  if (apiStatus.value !== 'online') return
  void router.push({ name: 'app-api-guide' })
}

onMounted(() => {
  void execute()
  void checkApi()
  if (viewerRole.value === 'ADMIN') void loadRequesters()
  if (viewerRole.value === 'ADMIN' || viewerRole.value === 'COORDINATOR') void loadAdminNotes()
  apiTimer = window.setInterval(() => {
    void checkApi()
  }, 60_000)
})

onUnmounted(() => {
  if (apiTimer != null) window.clearInterval(apiTimer)
})
</script>

<template>
  <div class="page">
    <DashboardSkeleton v-if="loading" />

    <template v-else-if="failed">
      <div class="page-head">
        <div>
          <h2 class="page-title">Painel Gerencial</h2>
          <p class="page-sub">Monitoramento em tempo real do ecossistema clínico UNIFAE.</p>
          <p v-if="scopedId == null" class="ctx">Contexto: todos os aplicativos</p>
          <p v-else class="ctx ctx--scoped">Contexto: aplicativo #{{ scopedId }}</p>
        </div>
      </div>
      <UiConnectionRetry @retry="execute" />
    </template>

    <template v-else>
      <div class="page-head">
        <div>
          <h2 class="page-title">Painel Gerencial</h2>
          <p class="page-sub">Monitoramento em tempo real do ecossistema clínico UNIFAE.</p>
          <p v-if="scopedId == null" class="ctx">Contexto: todos os aplicativos</p>
          <p v-else class="ctx ctx--scoped">Contexto: aplicativo #{{ scopedId }}</p>
        </div>
        <div class="page-head__filters">
          <div class="pill-group tonal">
            <select
              v-if="isAdmin && scopedId == null"
              class="pill-select"
              aria-label="Aplicativo"
              :value="selectedAppId ?? ''"
              @change="onAppChange"
            >
              <option value="">Todos os apps</option>
              <option v-for="a in appsDisplay" :key="a.id" :value="String(a.id)">{{ a.name }}</option>
            </select>
            <select
              v-else-if="isCoordinator"
              class="pill-select"
              aria-label="Aplicativo"
              disabled
            >
              <option>Meu app</option>
            </select>
            <span v-if="(isAdmin && scopedId == null) || isCoordinator" class="pill-div" />

            <select
              v-if="isCoordinator"
              class="pill-select"
              aria-label="Curso"
              disabled
            >
              <option>Meu curso</option>
            </select>
            <select v-else class="pill-select" aria-label="Curso" :value="selectedCourseId ?? ''" @change="onCourseChange">
              <option value="">Todos os Cursos</option>
              <option v-for="c in coursesDisplay" :key="c.id" :value="String(c.id)">
                {{ c.name }}
              </option>
            </select>
            <span class="pill-div" />
            <select class="pill-select" aria-label="Período" :value="String(periodDays)" @change="onPeriodChange">
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
            </select>
            <span class="pill-div" />
            <select class="pill-select" aria-label="Filtro de datas" :value="dateMode" @change="onDateModeChange">
              <option value="period">Período</option>
              <option value="range">Intervalo</option>
              <option value="single">Dia único</option>
            </select>
          </div>
        </div>
      </div>

      <div v-if="dateMode !== 'period'" class="date-row">
        <div v-if="dateMode === 'range'" class="date-row__inner tonal">
          <div class="field">
            <label class="lbl">De</label>
            <input v-model="rangeStart" class="in in--sm" type="date" />
          </div>
          <div class="field">
            <label class="lbl">Até</label>
            <input v-model="rangeEnd" class="in in--sm" type="date" />
          </div>
        </div>
        <div v-else class="date-row__inner tonal">
          <div class="field">
            <label class="lbl">Dia</label>
            <input v-model="singleDate" class="in in--sm" type="date" />
          </div>
          <button type="button" class="btn btn--ghost btn--sm" @click="applySingleToday">Hoje</button>
        </div>
      </div>

      <p v-if="viewerRole !== 'ADMIN'" class="hub-hint tonal">
        <MaterialIcon name="school" size="1.1rem" />
        Indicadores de <strong>prescrições</strong> e <strong>adesão</strong> por curso estão em
        <strong>Por curso → [curso] → Visão geral</strong>.
      </p>

      <div class="kpi-grid">
        <button
          v-if="viewerRole === 'ADMIN'"
          type="button"
          class="kpi kpi--hover kpi--action"
          :disabled="apiStatus !== 'online'"
          @click="openInternalApiGuide"
        >
          <div class="kpi-top">
            <div class="kpi-icon kpi-icon--sec">
              <MaterialIcon :name="apiStatus === 'online' ? 'cloud_done' : apiStatus === 'offline' ? 'cloud_off' : 'cloud_sync'" />
            </div>
            <span class="kpi-tag kpi-tag--sec">API</span>
          </div>
          <h3 class="kpi-label">Disponibilidade</h3>
          <p class="kpi-value">
            {{ apiStatus === 'online' ? 'Online' : apiStatus === 'offline' ? 'Offline' : 'Checando…' }}
          </p>
          <p class="kpi-foot">
            {{ apiStatus === 'online' ? 'Clique para abrir o guia interno das APIs do app.' : 'Guia disponível quando a API estiver online.' }}
          </p>
        </button>
        <div class="kpi kpi--hover">
          <div class="kpi-top">
            <div class="kpi-icon kpi-icon--sec">
              <MaterialIcon name="person_search" />
            </div>
            <span class="kpi-tag kpi-tag--sec">{{ kpiA.tag }}</span>
          </div>
          <h3 class="kpi-label">{{ kpiA.label }}</h3>
          <p class="kpi-value">{{ kpiA.value }}</p>
        </div>
        <div v-if="viewerRole === 'ADMIN'" class="kpi kpi--hover">
          <div class="kpi-top">
            <div class="kpi-icon kpi-icon--sec">
              <MaterialIcon name="menu_book" />
            </div>
            <span class="kpi-tag kpi-tag--sec">Catálogo</span>
          </div>
          <h3 class="kpi-label">Cursos cadastrados</h3>
          <p class="kpi-value">{{ cards?.courses ?? '—' }}</p>
        </div>
        <div class="kpi kpi--hover">
          <div class="kpi-top">
            <div class="kpi-icon kpi-icon--ter">
              <MaterialIcon name="exercise" />
            </div>
            <span class="kpi-tag kpi-tag--ter">{{ kpiB.tag }}</span>
          </div>
          <h3 class="kpi-label">{{ kpiB.label }}</h3>
          <p class="kpi-value">{{ kpiB.value }}</p>
        </div>
        <div v-if="viewerRole === 'ADMIN'" class="kpi kpi--hover">
          <div class="kpi-top">
            <div class="kpi-icon kpi-icon--ter">
              <MaterialIcon name="category" />
            </div>
            <span class="kpi-tag kpi-tag--ter">Taxonomia</span>
          </div>
          <h3 class="kpi-label">Categorias</h3>
          <p class="kpi-value">{{ cards?.categories ?? '—' }}</p>
        </div>
        <div v-if="viewerRole === 'ADMIN'" class="kpi kpi--hover">
          <div class="kpi-top">
            <div class="kpi-icon kpi-icon--ter">
              <MaterialIcon name="subdirectory_arrow_right" />
            </div>
            <span class="kpi-tag kpi-tag--ter">Classif.</span>
          </div>
          <h3 class="kpi-label">Subcategorias</h3>
          <p class="kpi-value">{{ cards?.subcategories ?? '—' }}</p>
        </div>
        <div v-if="cards?.reportsCreated != null" class="kpi kpi--hover">
          <div class="kpi-top">
            <div class="kpi-icon kpi-icon--pf">
              <MaterialIcon name="analytics" />
            </div>
            <span class="kpi-tag kpi-tag--pf">Relatórios</span>
          </div>
          <p class="kpi-value">
            {{ cards?.reportsCreated }}
          </p>
        </div>
      </div>

      <!-- ADMIN/COORDINATOR: notas em painéis separados, logo abaixo dos cards -->
      <div v-if="viewerRole === 'ADMIN' || viewerRole === 'COORDINATOR'" class="admin-notes-row">
        <section class="panel tonal admin-notes admin-notes--add">
          <h4 class="h-sm">Adicionar nota</h4>
          <form class="admin-notes__form" @submit.prevent="createAdminNote">
            <div class="field">
              <label class="lbl">Descrição</label>
              <textarea
                v-model="newNoteDescription"
                class="ta"
                rows="4"
                placeholder="Ex: Ajustar fluxo de aprovação, adicionar filtros, etc."
              />
            </div>
            <div class="row">
              <div class="field">
                <label class="lbl">Solicitante</label>
                <input v-model="newNoteRequestedBy" class="in" placeholder="Ex: Coordenação, Prof. X, Aluno Y" />
              </div>
              <div class="field">
                <label class="lbl">Status</label>
                <select v-model="newNoteStatus" class="in">
                  <option value="OPEN">Aberto</option>
                  <option value="IN_PROGRESS">Em andamento</option>
                  <option value="PAUSED">Pausado</option>
                  <option value="DONE">Implementado</option>
                  <option value="REJECTED">Rejeitado</option>
                </select>
              </div>
            </div>
            <div class="field">
              <label class="lbl">Observações</label>
              <textarea v-model="newNoteObs" class="ta" rows="3" placeholder="Contexto, critérios, links, etc." />
            </div>

            <button type="submit" class="btn-export" :disabled="creatingNote || !newNoteDescription.trim()">
              <MaterialIcon name="add" size="1rem" />
              {{ creatingNote ? 'Salvando…' : 'Salvar nota' }}
            </button>
          </form>
        </section>

        <section class="panel tonal admin-notes admin-notes--list">
          <div class="admin-notes__head">
            <div>
              <h4>{{ viewerRole === 'ADMIN' ? 'Relatório de notas' : 'Minhas notas' }}</h4>
              <p class="panel-sub">
                {{ viewerRole === 'ADMIN' ? 'Inclui sugestões de outros usuários para avaliação.' : 'Acompanhe o status das suas sugestões.' }}
              </p>
            </div>
            <div class="admin-notes__actions">
              <button type="button" class="btn-export btn-export--ghost" @click="loadRequesters">
                <MaterialIcon name="sync" size="1rem" />
                Solicitantes
              </button>
              <button type="button" class="btn-export btn-export--ghost" @click="loadAdminNotes">
                <MaterialIcon name="refresh" size="1rem" />
                Atualizar
              </button>
            </div>
          </div>

          <div class="admin-notes__filters">
            <div class="field">
              <label class="lbl">Mostrar</label>
              <select v-model="notesActiveFilter" class="in in--sm" @change="loadAdminNotes">
                <option value="active">Ativos</option>
                <option value="inactive">Inativos (excluídos)</option>
                <option value="all">Todos</option>
              </select>
            </div>
            <div class="field">
              <label class="lbl">Status</label>
              <select v-model="notesStatusFilter" class="in in--sm" @change="loadAdminNotes">
                <option value="">Todos</option>
                <option value="OPEN">Aberto</option>
                <option value="IN_PROGRESS">Em andamento</option>
                <option value="PAUSED">Pausado</option>
                <option value="DONE">Implementado</option>
                <option value="REJECTED">Rejeitado</option>
              </select>
            </div>
            <div class="field">
              <label class="lbl">Solicitante</label>
              <template v-if="viewerRole === 'ADMIN'">
                <select
                  v-if="requesters.length"
                  v-model="notesRequesterFilter"
                  class="in in--sm"
                  @change="loadAdminNotes"
                >
                  <option value="">Todos</option>
                  <option v-for="r in requesters" :key="r" :value="r">{{ r }}</option>
                </select>
                <input
                  v-else
                  v-model="notesRequesterFilter"
                  class="in in--sm"
                  placeholder="Filtrar por solicitante…"
                  @change="loadAdminNotes"
                />
              </template>
              <input v-else class="in in--sm" value="Apenas minhas notas" disabled />
            </div>
          </div>

          <div class="admin-notes__list">
            <p v-if="adminNotesLoading" class="muted-small">Carregando notas…</p>
            <UiConnectionRetry v-else-if="adminNotesFailed" @retry="loadAdminNotes" />
            <ul v-else class="note-list">
              <li v-for="n in adminNotes ?? []" :key="n.id" class="note">
                <div class="note__top">
                  <strong class="note__id">#{{ n.id }}</strong>
                  <div class="note__top-actions">
                    <span class="note__status">{{ n.status }}</span>
                    <button
                      v-if="notesActiveFilter !== 'inactive'"
                      type="button"
                      class="btn-mini"
                      @click="deactivateAdminNote(n.id)"
                    >
                      Desativar
                    </button>
                    <button
                      v-else
                      type="button"
                      class="btn-mini"
                      @click="updateAdminNote(n.id, { active: true })"
                    >
                      Reativar
                    </button>
                  </div>
                </div>
                <p class="note__desc">{{ n.description }}</p>
                <p v-if="n.requestedBy" class="note__meta"><strong>Solicitante</strong> {{ n.requestedBy }}</p>
                <p v-if="n.status === 'DONE' && n.finishedAt" class="note__meta">
                  <strong>Implementado em</strong> {{ fmtBrDate(n.finishedAt) }}
                </p>
                <p v-if="n.status === 'REJECTED' && n.rejectionReason" class="note__meta">
                  <strong>Motivo</strong> {{ n.rejectionReason }}
                </p>
                <p v-if="n.status === 'REJECTED' && (n.rejectedByUser || n.rejectedAt)" class="note__meta">
                  <strong>Rejeitado por</strong>
                  {{ n.rejectedByUser?.name ?? '—' }}
                  <span class="sep">•</span>
                  {{ fmtBrDate(n.rejectedAt ?? null) }}
                </p>
                <div class="note__edit">
                  <select
                    class="in in--sm"
                    :value="n.status"
                    @change="(($event) => { const v = ($event.target as HTMLSelectElement).value as any; if (v === 'REJECTED') openRejectModal(n.id); else updateAdminNote(n.id, { status: v }) })($event)"
                  >
                    <option value="OPEN">Aberto</option>
                    <option value="IN_PROGRESS">Em andamento</option>
                    <option value="PAUSED">Pausado</option>
                    <option value="DONE">Implementado</option>
                    <option value="REJECTED">Rejeitado</option>
                  </select>
                  <input
                    class="in in--sm"
                    :value="n.observations ?? ''"
                    placeholder="Observações…"
                    @change="updateAdminNote(n.id, { observations: ($event.target as HTMLInputElement).value })"
                  />
                  <div v-if="n.status === 'DONE'" class="note__done">
                    <input
                      class="in in--sm"
                      type="date"
                      :value="(n.finishedAt ?? '').slice(0, 10)"
                      @change="updateAdminNote(n.id, { finishedAt: ($event.target as HTMLInputElement).value })"
                    />
                    <button type="button" class="btn-mini" @click="updateAdminNote(n.id, { finishedAt: todayIsoDate() })">
                      Hoje
                    </button>
                  </div>
                </div>
              </li>
              <li v-if="!(adminNotes?.length)" class="empty">Sem notas para este filtro.</li>
            </ul>
          </div>
        </section>
      </div>

      <div class="bottom-panels">
        <section class="panel tonal">
          <h4>Aplicativos</h4>
          <ul class="simple-list">
            <li v-for="a in appsDisplay" :key="a.id">
              {{ a.name }}
              <span :class="['badge', !a.active && 'badge--off']">{{ a.active ? 'ativo' : 'inativo' }}</span>
            </li>
            <li v-if="!appsDisplay.length" class="empty">Nenhum app.</li>
          </ul>
        </section>

        <section class="panel tonal">
          <h4>Distribuição</h4>
          <p class="panel-sub">
            Por curso (dados ao vivo)
            <span class="tip" title="A porcentagem indica a adesão do curso no período filtrado (COMPLETED ÷ total de execuções).">
              <MaterialIcon name="info" size="1rem" />
            </span>
          </p>
          <ul class="dist-list">
            <li v-for="c in coursesDisplay" :key="c.id">
              <span class="dot" />
              <span>{{ c.name }}</span>
              <strong>{{ formatPercent(c.adherenceRate) }}</strong>
            </li>
            <li v-if="!coursesDisplay.length" class="empty">Nenhum curso no contexto.</li>
          </ul>
        </section>
      </div>

      <!-- Modal simples: motivo da rejeição -->
      <div v-if="rejectModalOpen" class="modal-backdrop" role="dialog" aria-modal="true">
        <div class="modal">
          <h4>Rejeitar nota</h4>
          <p class="panel-sub">Informe o motivo da rejeição/recusa.</p>
          <textarea v-model="rejectReason" class="ta" rows="4" placeholder="Ex: Fora do escopo, sem viabilidade técnica, depende de aprovação institucional…" />
          <div class="modal-actions">
            <button type="button" class="btn-export btn-export--ghost" @click="closeRejectModal">Cancelar</button>
            <button type="button" class="btn-export" :disabled="!rejectReason.trim()" @click="confirmReject">
              Confirmar rejeição
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page {
  font-family: var(--uf-font);
  color: var(--uf-on-surface);
}
.hub-hint {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin: 0 0 1.25rem;
  padding: 0.85rem 1.1rem;
  border-radius: var(--uf-radius-xl);
  font-size: 0.85rem;
  color: var(--uf-on-surface-variant);
  line-height: 1.45;
}
.hub-hint strong {
  color: var(--uf-on-surface);
}
.page-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
}
.page-title {
  margin: 0 0 0.25rem;
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.page-sub {
  margin: 0;
  font-size: 0.875rem;
  color: var(--uf-on-surface-variant);
}
.ctx {
  margin: 0.5rem 0 0;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--uf-on-surface-variant);
}
.ctx--scoped {
  color: var(--uf-primary);
}
.page-head__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}
.date-row {
  margin-top: 0.75rem;
  display: flex;
  justify-content: flex-end;
}
.date-row__inner {
  display: inline-flex;
  gap: 0.75rem;
  align-items: flex-end;
  padding: 0.75rem;
  border-radius: var(--uf-radius-xl);
  background: var(--uf-surface-container-lowest);
  box-shadow: var(--uf-tonal-shadow);
}
.btn--sm {
  padding: 0.45rem 0.8rem;
  font-size: 0.75rem;
}
.pill-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  background: var(--uf-surface-container-lowest);
}
.tonal {
  box-shadow: var(--uf-tonal-shadow);
}
.pill-select {
  border: none;
  background: transparent;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.35rem 0.75rem;
  font-family: var(--uf-font);
  color: var(--uf-on-surface);
  cursor: pointer;
}
.pill-div {
  width: 1px;
  height: 1rem;
  background: rgba(191, 202, 186, 0.35);
}
.btn-export {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 999px;
  font-family: var(--uf-font);
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--uf-on-primary);
  cursor: pointer;
  background: linear-gradient(90deg, var(--uf-primary), var(--uf-primary-container));
  box-shadow: 0 8px 20px rgba(13, 99, 27, 0.2);
}
.btn-export:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
}
.btn-export--ghost {
  background: rgba(13, 99, 27, 0.08);
  color: var(--uf-primary);
  box-shadow: none;
}
.tip {
  display: inline-flex;
  align-items: center;
  margin-left: 0.35rem;
  color: var(--uf-on-surface-variant);
  opacity: 0.9;
  cursor: help;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 50;
}
.modal {
  width: 100%;
  max-width: 520px;
  background: var(--uf-surface-container-lowest);
  border-radius: var(--uf-radius-xl);
  outline: 1px solid var(--uf-outline-variant);
  box-shadow: var(--uf-tonal-shadow);
  padding: 1.25rem;
}
.modal h4 {
  margin: 0 0 0.35rem;
}
.modal-actions {
  margin-top: 0.9rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}
.kpi {
  padding: 1.5rem;
  border-radius: var(--uf-radius-xl);
  background: var(--uf-surface-container-lowest);
  box-shadow: var(--uf-tonal-shadow);
  transition: background 0.25s ease;
}
.kpi--action {
  width: 100%;
  border: none;
  text-align: left;
  font-family: var(--uf-font);
  cursor: pointer;
}
.kpi--action:disabled {
  cursor: not-allowed;
  opacity: 0.85;
}
.kpi--hover:hover {
  background: var(--uf-primary);
  color: var(--uf-on-primary);
}
.kpi--hover:hover .kpi-label,
.kpi--hover:hover .kpi-value {
  color: inherit;
}
.kpi--hover:hover .kpi-label {
  opacity: 0.85;
}
.kpi-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}
.kpi-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--uf-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--uf-primary);
}
.kpi-icon--sec {
  background: var(--uf-secondary-container);
}
.kpi-icon--ter {
  background: #ffd9e2;
  color: var(--uf-tertiary);
}
.kpi-icon--err {
  background: #ffdad6;
  color: var(--uf-error);
}
.kpi-icon--pf {
  background: #a3f69c;
  color: var(--uf-primary);
}
.kpi--hover:hover .kpi-icon {
  background: rgba(255, 255, 255, 0.2);
  color: var(--uf-on-primary);
}
.kpi-tag {
  font-size: 0.625rem;
  font-weight: 700;
  padding: 0.2rem 0.45rem;
  border-radius: 0.25rem;
  text-transform: uppercase;
}
.kpi-tag--sec {
  background: var(--uf-secondary-container);
  color: var(--uf-primary);
}
.kpi-tag--ter {
  background: #ffd9e2;
  color: var(--uf-tertiary);
}
.kpi-tag--err {
  background: #ffdad6;
  color: var(--uf-error);
}
.kpi-tag--pf {
  background: #a3f69c;
  color: var(--uf-primary);
}
.kpi--hover:hover .kpi-tag {
  background: rgba(255, 255, 255, 0.2);
  color: var(--uf-on-primary);
}
.kpi-label {
  margin: 0 0 0.25rem;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--uf-on-surface-variant);
}
.kpi-value {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--uf-on-surface);
}
.kpi-value--dual {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  flex-wrap: wrap;
}
.kpi-sep {
  font-weight: 600;
  opacity: 0.5;
  font-size: 1.1rem;
}
.kpi-foot {
  margin: 0.35rem 0 0;
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--uf-on-surface-variant);
  opacity: 0.85;
}
.charts {
  margin: 2rem 0;
}
.panel {
  padding: 2rem;
  border-radius: var(--uf-radius-xl);
  background: var(--uf-surface-container-lowest);
}
.panel--wide {
  grid-column: span 1;
}
.panel-h {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}
.panel h4 {
  margin: 0 0 0.25rem;
  font-size: 1.05rem;
  font-weight: 700;
}
.panel-sub {
  margin: 0;
  font-size: 0.75rem;
  color: var(--uf-on-surface-variant);
}
.chart-placeholder {
  min-height: 200px;
  position: relative;
}
.chart-svg {
  width: 100%;
  height: 180px;
}
.chart-loading {
  font-size: 0.875rem;
  color: var(--uf-on-surface-variant);
}
.chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  color: var(--uf-on-surface-variant);
  pointer-events: none;
}
.chart-axis {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  font-size: 0.6875rem;
  color: var(--uf-on-surface-variant);
}
.chart-legend {
  margin-top: 0.6rem;
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: var(--uf-on-surface-variant);
}
.lg {
  display: inline-block;
  width: 0.9rem;
  height: 0.55rem;
  border-radius: 0.2rem;
  margin-right: 0.35rem;
  vertical-align: middle;
}
.lg--bar {
  background: rgba(13, 99, 27, 0.25);
}
.lg--line {
  height: 0.18rem;
  background: var(--uf-primary);
  border-radius: 999px;
}
.dist-list {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
}
.dist-list li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  font-size: 0.8125rem;
  border-bottom: 1px solid rgba(191, 202, 186, 0.2);
}
.dist-list li strong {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--uf-on-surface-variant);
}
.dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--uf-primary);
}
.admin-notes-row {
  margin-top: 1.5rem;
  display: grid;
  grid-template-columns: 1fr 1.35fr;
  gap: 1.5rem;
}
@media (max-width: 1080px) {
  .admin-notes-row {
    grid-template-columns: 1fr;
  }
}
.bottom-panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-top: 2rem;
}
@media (max-width: 960px) {
  .bottom-panels {
    grid-template-columns: 1fr;
  }
}
.admin-notes {
  margin-top: 1.5rem;
}
.admin-notes__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}
.admin-notes__actions {
  display: inline-flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.admin-notes__grid {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: 1fr 1.25fr;
  gap: 1rem;
}
@media (max-width: 920px) {
  .admin-notes__grid {
    grid-template-columns: 1fr;
  }
}
.h-sm {
  margin: 0;
  font-size: 0.95rem;
}
.admin-notes__filters {
  display: grid;
  grid-template-columns: 160px 160px 1fr;
  gap: 0.75rem;
  align-items: end;
}
@media (max-width: 920px) {
  .admin-notes__filters {
    grid-template-columns: 1fr;
  }
}
.note__top-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
}
.btn-mini {
  border: none;
  border-radius: 999px;
  padding: 0.35rem 0.65rem;
  font-family: var(--uf-font);
  font-size: 0.75rem;
  font-weight: 800;
  cursor: pointer;
  color: var(--uf-primary);
  background: rgba(13, 99, 27, 0.08);
}
.btn-mini:hover {
  background: rgba(13, 99, 27, 0.14);
}
.admin-notes__form {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.row {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 0.75rem;
}
@media (max-width: 560px) {
  .row {
    grid-template-columns: 1fr;
  }
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.lbl {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--uf-on-surface-variant);
}
.in,
.ta {
  width: 100%;
  box-sizing: border-box;
  padding: 0.6rem 0.75rem;
  font-family: var(--uf-font);
  font-size: 0.875rem;
  color: var(--uf-on-surface);
  background: var(--uf-surface-container-highest);
  border: none;
  border-radius: var(--uf-radius-md);
  outline: 1px solid var(--uf-outline-variant);
}
.ta {
  resize: vertical;
}
.in--sm {
  padding: 0.45rem 0.6rem;
  font-size: 0.8125rem;
}
.muted-small {
  margin: 0.75rem 0 0;
  font-size: 0.8125rem;
  color: var(--uf-on-surface-variant);
}
.note-list {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.note {
  padding: 0.9rem;
  border-radius: var(--uf-radius-xl);
  outline: 1px solid rgba(191, 202, 186, 0.25);
  background: var(--uf-surface-container-lowest);
}
.note__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.note__id {
  font-size: 0.8125rem;
}
.note__status {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--uf-on-surface-variant);
}
.note__desc {
  margin: 0.6rem 0 0.4rem;
  font-size: 0.875rem;
  line-height: 1.45;
}
.note__meta {
  margin: 0;
  font-size: 0.75rem;
  color: var(--uf-on-surface-variant);
}
.note__meta strong {
  margin-right: 0.35rem;
  color: var(--uf-on-surface);
}
.sep {
  margin: 0 0.4rem;
  opacity: 0.6;
}
.note__edit {
  margin-top: 0.75rem;
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 0.6rem;
}
@media (max-width: 560px) {
  .note__edit {
    grid-template-columns: 1fr;
  }
}
.note__done {
  grid-column: 1 / -1;
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
}
.simple-list {
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0;
}
.simple-list li {
  padding: 0.5rem 0;
  font-size: 0.875rem;
  border-bottom: 1px solid rgba(191, 202, 186, 0.2);
}
.badge {
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  margin-left: 0.35rem;
  padding: 0.15rem 0.45rem;
  border-radius: 0.25rem;
  background: rgba(46, 125, 50, 0.12);
  color: var(--uf-primary-container);
}
.badge--off {
  background: var(--uf-surface-container-low);
  color: var(--uf-on-surface-variant);
}
.empty {
  color: var(--uf-on-surface-variant);
  font-style: italic;
}
</style>
