<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import axios from 'axios'
import client from '@/api/client'
import MaterialIcon from '@/components/shell/MaterialIcon.vue'
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiPager from '@/components/ui/UiPager.vue'
import { useAuthStore } from '@/stores/auth'
import { useConfirmStore } from '@/stores/confirm'
import { useToastStore } from '@/stores/toast'
import type { Paged } from '@/types/pagination'
import { buildTaxonomyReportGroups } from '@/utils/exerciseTaxonomyReport'

type AppRow = { id: number; name: string; active: boolean }
type CourseRow = {
  id: number
  name: string
  app: { id: number; name: string } | null
}

type PrescriptionSummary = {
  id: number
  patientId: number
  patientName: string
  courseId: number
  courseName: string
  appId: number
  studentId: number
  studentName: string
  professorId: number | null
  professorName: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  justification: string | null
  nextVisitDate: string | null
  createdAt: string
  itemsCount: number
}

type PrescriptionDetail = PrescriptionSummary & {
  items: {
    id: number
    exerciseId: number
    exerciseName: string
    instructions: string | null
    repetitions: string | null
    notes: string | null
    exerciseTaxonomy?: {
      clinicalCaseName: string | null
      typeLabel: string
      typeKey: string
      categoryName: string
    }[]
  }[]
}

const props = withDefaults(
  defineProps<{
    embeddedInCourse?: boolean
    courseAppId?: number
    courseScopeId?: number
  }>(),
  { embeddedInCourse: false },
)

const auth = useAuthStore()
const toast = useToastStore()
const confirm = useConfirmStore()

function apiErrorMessage(err: unknown, fallback: string) {
  if (!axios.isAxiosError(err)) return fallback
  const m = err.response?.data as { message?: string | string[] } | undefined
  const raw = m?.message
  if (Array.isArray(raw)) return raw.join(' ')
  if (typeof raw === 'string' && raw.trim()) return raw
  return fallback
}

function handleUnauthorized() {
  auth.logout()
  window.location.href = '/login'
}

const filterAppId = ref<number | ''>('')
const manualCourseId = ref<number | ''>('')
/** Padrão: pendentes; coordenação/professor podem ver histórico. */
const filterStatus = ref<'' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')

const appsList = ref<AppRow[]>([])
const coursesList = ref<CourseRow[]>([])
const catalogLoading = ref(false)
const catalogFailed = ref(false)

const search = ref('')
const listPage = ref(1)
const listLimit = ref(12)
const listTotal = ref(0)
const pendingBadgeTotal = ref(0)
const debouncedSearch = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, (v) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    debouncedSearch.value = v.trim()
  }, 400)
})
watch(debouncedSearch, () => {
  listPage.value = 1
})

const listLoading = ref(false)
const listFailed = ref(false)
const rows = ref<PrescriptionSummary[]>([])

const selectedId = ref<number | null>(null)

const showDetail = ref(false)
const detailLoading = ref(false)
const detail = ref<PrescriptionDetail | null>(null)

const showRejectModal = ref(false)
const rejectJustification = ref('')
const rejectTargetId = ref<number | null>(null)
const actionLoading = ref(false)

const canApprove = computed(() =>
  ['ADMIN', 'COORDINATOR', 'PROFESSOR'].includes(auth.user?.role ?? ''),
)
const isScopedActor = computed(() => {
  const r = auth.user?.role
  return r === 'COORDINATOR' || r === 'PROFESSOR'
})

function toFiniteId(v: unknown): number {
  if (v == null || v === '') return NaN
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : NaN
}

const activeAppId = computed((): number => {
  if (props.embeddedInCourse) return toFiniteId(props.courseAppId)
  const v = filterAppId.value
  return v === '' ? NaN : v
})

const coursesForApp = computed(() => {
  const aid = filterAppId.value
  const list = coursesList.value
  if (aid === '') return []
  return list.filter((c) => c.app?.id === aid).sort((a, b) => a.name.localeCompare(b.name))
})

const effectiveCourseId = computed(() => {
  const list = coursesForApp.value
  if (list.length === 0) return '' as number | ''
  const first = list[0]!
  if (list.length === 1) return first.id
  const m = manualCourseId.value
  if (m !== '' && list.some((c) => c.id === m)) return m
  return first.id
})

const activeCourseId = computed((): number => {
  if (props.embeddedInCourse) return toFiniteId(props.courseScopeId)
  const v = effectiveCourseId.value
  return v === '' ? NaN : v
})

type CourseAutoLine = { kind: 'none' } | { kind: 'one'; name: string } | { kind: 'multi'; n: number }

const courseAutoLine = computed((): CourseAutoLine => {
  const list = coursesForApp.value
  if (list.length === 0) return { kind: 'none' }
  if (list.length === 1) return { kind: 'one', name: list[0]!.name }
  return { kind: 'multi', n: list.length }
})

watch(coursesForApp, (list) => {
  if (props.embeddedInCourse) return
  if (list.length > 1 && manualCourseId.value === '') {
    const first = list[0]
    if (first) manualCourseId.value = first.id
  }
})

function applyScopeFromAuth() {
  if (props.embeddedInCourse) return
  const u = auth.user
  if (!u) return
  if (u.role === 'COORDINATOR' || u.role === 'PROFESSOR') {
    if (u.appId != null) filterAppId.value = u.appId
    if (u.courseId != null) manualCourseId.value = u.courseId
  }
}

async function loadCatalog() {
  catalogLoading.value = true
  catalogFailed.value = false
  try {
    const [appsRes, coursesRes] = await Promise.all([
      client.get<Paged<AppRow>>('/apps', { params: { page: 1, limit: 100 } }),
      client.get<Paged<CourseRow>>('/courses', { params: { page: 1, limit: 100 } }),
    ])
    appsList.value = appsRes.data.data
    coursesList.value = coursesRes.data.data
  } catch (e) {
    catalogFailed.value = true
    appsList.value = []
    coursesList.value = []
    if (axios.isAxiosError(e) && e.response?.status === 401) handleUnauthorized()
  } finally {
    catalogLoading.value = false
  }
}

async function loadList() {
  const aid = activeAppId.value
  const cid = activeCourseId.value
  if (!Number.isFinite(aid) || !Number.isFinite(cid)) {
    rows.value = []
    listTotal.value = 0
    pendingBadgeTotal.value = 0
    return
  }
  listLoading.value = true
  listFailed.value = false
  try {
    const base: Record<string, string | number> = { courseId: cid, appId: aid }
    const listParams: Record<string, string | number> = {
      ...base,
      page: listPage.value,
      limit: listLimit.value,
    }
    if (filterStatus.value) listParams.status = filterStatus.value
    const q = debouncedSearch.value.trim()
    if (q) listParams.q = q

    const [listRes, pendRes] = await Promise.all([
      client.get<Paged<PrescriptionSummary>>('/prescriptions', { params: listParams }),
      client.get<Paged<PrescriptionSummary>>('/prescriptions', {
        params: { ...base, status: 'PENDING', page: 1, limit: 1 },
      }),
    ])
    rows.value = listRes.data.data
    listTotal.value = listRes.data.total
    pendingBadgeTotal.value = pendRes.data.total
  } catch (e) {
    listFailed.value = true
    rows.value = []
    listTotal.value = 0
    pendingBadgeTotal.value = 0
    if (axios.isAxiosError(e) && e.response?.status === 401) handleUnauthorized()
  } finally {
    listLoading.value = false
  }
}

watch(
  () => [filterAppId.value, effectiveCourseId.value, filterStatus.value] as const,
  () => {
    listPage.value = 1
  },
)

watch(
  [listPage, listLimit, debouncedSearch, filterStatus, activeAppId, activeCourseId],
  () => {
    void loadList()
  },
  { immediate: true },
)

watch(filterAppId, () => {
  if (!props.embeddedInCourse) manualCourseId.value = ''
})

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatRelative(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  if (h < 48) return `${h} h`
  const days = Math.floor(h / 24)
  return `${days} d`
}

function statusLabel(s: string) {
  if (s === 'PENDING') return 'Pendente'
  if (s === 'APPROVED') return 'Aprovada'
  return 'Rejeitada'
}

function statusBadgeClass(s: string) {
  if (s === 'PENDING') return 'badge--pend'
  if (s === 'APPROVED') return 'badge--ok'
  return 'badge--rej'
}

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (!p.length) return '?'
  if (p.length === 1) return p[0]!.slice(0, 2).toUpperCase()
  return (p[0]![0]! + p[p.length - 1]![0]!).toUpperCase()
}

function selectCard(r: PrescriptionSummary) {
  selectedId.value = selectedId.value === r.id ? null : r.id
}

async function openDetail(r: PrescriptionSummary) {
  selectedId.value = r.id
  showDetail.value = true
  detail.value = null
  detailLoading.value = true
  try {
    const { data } = await client.get<PrescriptionDetail>(`/prescriptions/${r.id}`)
    detail.value = data
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Não foi possível carregar o detalhe.'))
    showDetail.value = false
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  showDetail.value = false
  detail.value = null
}

async function approveRx(r: PrescriptionSummary) {
  const ok = await confirm.confirm({
    title: 'Aprovar prescrição',
    message: `Aprovar prescrição de ${r.patientName}?`,
    confirmText: 'Aprovar',
    cancelText: 'Cancelar',
  })
  if (!ok) return
  actionLoading.value = true
  try {
    await client.patch(`/prescriptions/${r.id}`, { status: 'APPROVED' })
    toast.success('Prescrição aprovada. Registro em auditoria.')
    await loadList()
    if (detail.value?.id === r.id) {
      const { data } = await client.get<PrescriptionDetail>(`/prescriptions/${r.id}`)
      detail.value = data
    }
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Falha ao aprovar.'))
  } finally {
    actionLoading.value = false
  }
}

function openReject(r: PrescriptionSummary) {
  rejectTargetId.value = r.id
  rejectJustification.value = ''
  showRejectModal.value = true
}

async function confirmReject() {
  const id = rejectTargetId.value
  if (id == null) return
  if (!rejectJustification.value.trim()) {
    toast.error('Informe o motivo da rejeição.')
    return
  }
  actionLoading.value = true
  try {
    await client.patch(`/prescriptions/${id}`, {
      status: 'REJECTED',
      justification: rejectJustification.value.trim(),
    })
    toast.success('Prescrição rejeitada. Registro em auditoria.')
    showRejectModal.value = false
    rejectTargetId.value = null
    await loadList()
    if (detail.value?.id === id) {
      const { data } = await client.get<PrescriptionDetail>(`/prescriptions/${id}`)
      detail.value = data
    }
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Falha ao rejeitar.'))
  } finally {
    actionLoading.value = false
  }
}

async function removeRx(r: PrescriptionSummary) {
  if (r.status !== 'PENDING') {
    toast.error('Só é possível excluir prescrições pendentes.')
    return
  }
  const ok = await confirm.confirm({
    title: 'Excluir prescrição',
    message: `Excluir a prescrição pendente de ${r.patientName}? A ação fica registrada em log.`,
    confirmText: 'Excluir',
    cancelText: 'Cancelar',
    tone: 'danger',
  })
  if (!ok) return
  actionLoading.value = true
  try {
    await client.delete(`/prescriptions/${r.id}`)
    toast.success('Prescrição excluída.')
    if (selectedId.value === r.id) selectedId.value = null
    if (detail.value?.id === r.id) closeDetail()
    await loadList()
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Não foi possível excluir.'))
  } finally {
    actionLoading.value = false
  }
}

onMounted(() => {
  applyScopeFromAuth()
  if (!props.embeddedInCourse) void loadCatalog()
})

watch(
  () => auth.user,
  () => applyScopeFromAuth(),
)
</script>

<template>
  <div class="page" :class="{ 'page--embedded': embeddedInCourse }">
    <header class="head">
      <div>
        <h1 class="title">Aprovações</h1>
        <p v-if="!embeddedInCourse" class="sub">
          Fila de <strong>prescrições</strong> por curso e app. Aprovar, rejeitar ou excluir (pendentes) conforme seu
          perfil. Todas as alterações geram <strong>auditoria</strong> (PATCH/DELETE em prescrições e metadados de
          status).
        </p>
        <p v-else class="sub sub--compact">
          Decisões sobre prescrições deste curso; ações auditadas como nas prescrições globais.
        </p>
      </div>
      <div class="head-stats">
        <div class="stat-pill">
          <MaterialIcon name="pending_actions" size="1.25rem" />
          <div>
            <span class="stat-pill__lbl">Pendentes no escopo</span>
            <span class="stat-pill__num">{{ listLoading ? '…' : pendingBadgeTotal }}</span>
          </div>
        </div>
        <button type="button" class="btn-refresh" :disabled="listLoading" @click="loadList">
          <MaterialIcon name="refresh" size="1.1rem" />
          Atualizar
        </button>
      </div>
    </header>

    <div v-if="!embeddedInCourse" class="filters panel tonal">
      <p v-if="catalogLoading" class="muted">Carregando catálogo…</p>
      <UiConnectionRetry v-else-if="catalogFailed" @retry="loadCatalog" />
      <div v-else class="filters__grid">
        <div class="field">
          <label class="lbl">App</label>
          <select v-model="filterAppId" class="in" :disabled="isScopedActor">
            <option value="">Selecione…</option>
            <option v-for="a in appsList" :key="a.id" :value="a.id">{{ a.name }}</option>
          </select>
        </div>
        <div v-if="courseAutoLine?.kind === 'one'" class="field field--grow">
          <label class="lbl">Curso</label>
          <p class="course-auto">{{ courseAutoLine.name }}</p>
        </div>
        <div v-else-if="courseAutoLine?.kind === 'multi'" class="field">
          <label class="lbl">Curso</label>
          <select v-model="manualCourseId" class="in" :disabled="isScopedActor">
            <option v-for="c in coursesForApp" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="field">
          <label class="lbl">Status</label>
          <select v-model="filterStatus" class="in">
            <option value="PENDING">Pendentes</option>
            <option value="">Todos</option>
            <option value="APPROVED">Aprovadas</option>
            <option value="REJECTED">Rejeitadas</option>
          </select>
        </div>
        <div class="field field--grow">
          <label class="lbl">Buscar</label>
          <input
            v-model="search"
            class="in"
            type="search"
            placeholder="Paciente ou estagiário…"
            autocomplete="off"
          />
        </div>
      </div>
    </div>

    <div
      v-else-if="embeddedInCourse && Number.isFinite(activeAppId) && Number.isFinite(activeCourseId)"
      class="filters panel tonal filters--compact"
    >
      <div class="filters__grid filters__grid--compact">
        <div class="field">
          <label class="lbl">Status</label>
          <select v-model="filterStatus" class="in">
            <option value="PENDING">Pendentes</option>
            <option value="">Todos</option>
            <option value="APPROVED">Aprovadas</option>
            <option value="REJECTED">Rejeitadas</option>
          </select>
        </div>
        <div class="field field--grow">
          <label class="lbl">Buscar</label>
          <input
            v-model="search"
            class="in"
            type="search"
            placeholder="Paciente ou estagiário…"
            autocomplete="off"
          />
        </div>
      </div>
    </div>

    <p v-if="listLoading && !rows.length" class="muted pad">Carregando…</p>
    <UiConnectionRetry v-else-if="listFailed" @retry="loadList" />
    <p
      v-else-if="!Number.isFinite(activeAppId) || !Number.isFinite(activeCourseId)"
      class="muted pad"
    >
      {{ embeddedInCourse ? 'Escopo do curso indisponível.' : 'Selecione app e curso.' }}
    </p>
    <template v-else>
      <p v-if="!rows.length" class="muted pad">Nenhuma prescrição neste filtro.</p>
      <div v-else class="grid">
        <article
          v-for="r in rows"
          :key="r.id"
          class="card tonal"
          :class="{ 'card--on': selectedId === r.id }"
          @click="selectCard(r)"
        >
          <div class="card-top">
            <div class="who">
              <div class="who-icon">
                <MaterialIcon name="personal_injury" />
              </div>
              <div>
                <h3>{{ r.patientName }}</h3>
                <p>{{ r.courseName }} · {{ r.itemsCount }} exercício(s)</p>
              </div>
            </div>
            <span class="badge" :class="statusBadgeClass(r.status)">{{ statusLabel(r.status) }}</span>
          </div>
          <div class="card-foot">
            <div class="ava">{{ initials(r.studentName) }}</div>
            <div class="grow">
              <p class="lbl">Estagiário</p>
              <p class="val">{{ r.studentName }}</p>
            </div>
            <div class="tar">
              <p class="lbl">Emitida</p>
              <p class="val">{{ formatRelative(r.createdAt) }}</p>
            </div>
          </div>
          <div class="card-actions ui-act-row" @click.stop>
            <UiIconButton icon="visibility" label="Detalhes" variant="doc" @click="openDetail(r)" />
            <template v-if="r.status === 'PENDING' && canApprove">
              <UiIconButton
                icon="check_circle"
                label="Aprovar"
                variant="success"
                :disabled="actionLoading"
                @click="approveRx(r)"
              />
              <UiIconButton
                icon="cancel"
                label="Rejeitar"
                variant="warn"
                :disabled="actionLoading"
                @click="openReject(r)"
              />
              <UiIconButton
                icon="delete"
                label="Excluir"
                variant="danger"
                :disabled="actionLoading"
                @click="removeRx(r)"
              />
            </template>
          </div>
        </article>
      </div>
      <UiPager
        v-if="listTotal > 0"
        v-model:page="listPage"
        :limit="listLimit"
        :total="listTotal"
        :loading="listLoading"
      />
    </template>

    <div v-if="showDetail" class="modal-backdrop" @click.self="closeDetail">
      <div class="modal modal--wide">
        <div class="modal-head">
          <h3 class="h3">Prescrição #{{ detail?.id ?? '…' }}</h3>
          <button type="button" class="icon-close" aria-label="Fechar" @click="closeDetail">
            <MaterialIcon name="close" />
          </button>
        </div>
        <p v-if="detailLoading" class="muted">Carregando…</p>
        <template v-else-if="detail">
          <div class="detail-grid">
            <div>
              <p class="dlbl">Paciente</p>
              <p class="dval">{{ detail.patientName }}</p>
            </div>
            <div>
              <p class="dlbl">Estagiário</p>
              <p class="dval">{{ detail.studentName }}</p>
            </div>
            <div>
              <p class="dlbl">Professor</p>
              <p class="dval">{{ detail.professorName ?? '—' }}</p>
            </div>
            <div>
              <p class="dlbl">Status</p>
              <p class="dval">{{ statusLabel(detail.status) }}</p>
            </div>
            <div class="span-2">
              <p class="dlbl">Emitida em</p>
              <p class="dval">{{ formatDate(detail.createdAt) }}</p>
            </div>
            <div v-if="detail.justification" class="span-2">
              <p class="dlbl">Justificativa / observações</p>
              <p class="dval dval--multiline">{{ detail.justification }}</p>
            </div>
          </div>
          <h4 class="h4">Exercícios</h4>
          <ul class="item-list">
            <li v-for="it in detail.items" :key="it.id" class="item-li">
              <strong>{{ it.exerciseName }}</strong>
              <span v-if="it.instructions" class="item-meta">{{ it.instructions }}</span>
              <span v-if="it.repetitions" class="item-meta">Reps: {{ it.repetitions }}</span>
              <div v-if="it.exerciseTaxonomy?.length" class="item-tax">
                <div
                  v-for="(blk, bi) in buildTaxonomyReportGroups(it.exerciseTaxonomy)"
                  :key="bi"
                  class="item-tax__block"
                >
                  <p class="item-tax__case">{{ blk.clinicalCaseName ?? 'Sem caso clínico' }}</p>
                  <ul class="item-tax__lines">
                    <li v-for="(ln, li) in blk.lines" :key="li" class="item-tax__line">
                      <span class="item-tax__type">{{ ln.typeLabel }}:</span>
                      <span class="item-tax__val">{{ ln.categoriesText }}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </li>
          </ul>
          <div v-if="detail.status === 'PENDING' && canApprove" class="modal-foot ui-act-row">
            <UiIconButton
              icon="check_circle"
              label="Aprovar"
              variant="success"
              :disabled="actionLoading"
              @click="approveRx(detail)"
            />
            <UiIconButton
              icon="cancel"
              label="Rejeitar"
              variant="warn"
              :disabled="actionLoading"
              @click="openReject(detail)"
            />
            <UiIconButton
              icon="delete"
              label="Excluir pendente"
              variant="danger"
              :disabled="actionLoading"
              @click="removeRx(detail)"
            />
          </div>
        </template>
      </div>
    </div>

    <div v-if="showRejectModal" class="modal-backdrop" @click.self="showRejectModal = false">
      <div class="modal">
        <h3 class="h3">Rejeitar prescrição</h3>
        <label class="lbl">Motivo (obrigatório)</label>
        <textarea v-model="rejectJustification" class="textarea" rows="4" placeholder="Descreva o motivo…" />
        <div class="modal-foot">
          <button type="button" class="btn-mini" @click="showRejectModal = false">Cancelar</button>
          <button
            type="button"
            class="btn-mini btn-mini--warn"
            :disabled="actionLoading"
            @click="confirmReject"
          >
            Confirmar rejeição
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  font-family: var(--uf-font);
  color: var(--uf-on-surface);
}
.page--embedded .title {
  font-size: 1.65rem;
}
.head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 1.25rem;
}
.title {
  margin: 0;
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.sub {
  margin: 0.35rem 0 0;
  max-width: 42rem;
  line-height: 1.5;
  color: var(--uf-on-surface-variant);
}
.sub--compact {
  max-width: none;
  font-size: 0.9rem;
}
.head-stats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}
.stat-pill {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  background: var(--uf-surface-container-low);
  outline: 1px solid rgba(191, 202, 186, 0.25);
  color: var(--uf-primary);
}
.stat-pill__lbl {
  display: block;
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--uf-on-surface-variant);
}
.stat-pill__num {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--uf-on-surface);
}
.btn-refresh {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 999px;
  font-family: var(--uf-font);
  font-size: 0.8rem;
  font-weight: 800;
  cursor: pointer;
  color: var(--uf-primary);
  background: rgba(13, 99, 27, 0.08);
}
.btn-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.filters {
  padding: 1rem 1.25rem;
  margin-bottom: 1.25rem;
  border-radius: var(--uf-radius-xl);
}
.filters--compact {
  padding: 0.85rem 1rem;
}
.filters__grid {
  display: grid;
  grid-template-columns: 1fr 1fr 160px 1fr;
  gap: 0.75rem;
}
.filters__grid--compact {
  grid-template-columns: 200px 1fr;
}
@media (max-width: 900px) {
  .filters__grid {
    grid-template-columns: 1fr;
  }
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.field--grow {
  min-width: 0;
}
.lbl {
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--uf-on-surface-variant);
}
.in {
  width: 100%;
  box-sizing: border-box;
  padding: 0.5rem 0.65rem;
  font-family: var(--uf-font);
  font-size: 0.875rem;
  border: none;
  border-radius: var(--uf-radius-md);
  background: var(--uf-surface-container-highest);
  outline: 1px solid var(--uf-outline-variant);
}
.course-auto {
  margin: 0;
  padding: 0.5rem 0;
  font-weight: 600;
  font-size: 0.9rem;
}
.pad {
  padding: 0.5rem 0;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}
.card {
  padding: 1.25rem;
  border-radius: 1.5rem;
  background: var(--uf-surface-container-lowest);
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease;
  cursor: pointer;
  box-shadow: 0 12px 40px rgba(25, 28, 29, 0.05);
}
.card:hover {
  transform: translateY(-2px);
}
.card--on {
  outline: 2px solid rgba(13, 99, 27, 0.28);
  box-shadow:
    0 12px 40px rgba(25, 28, 29, 0.05),
    0 0 0 4px rgba(13, 99, 27, 0.06);
}
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}
.who {
  display: flex;
  gap: 0.85rem;
  align-items: flex-start;
  min-width: 0;
}
.who-icon {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: var(--uf-radius-xl);
  background: rgba(46, 125, 50, 0.1);
  color: var(--uf-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.who h3 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.25;
}
.who p {
  margin: 0.2rem 0 0;
  font-size: 0.72rem;
  color: var(--uf-on-surface-variant);
}
.badge {
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.3rem 0.55rem;
  border-radius: 999px;
  flex-shrink: 0;
}
.badge--pend {
  background: rgba(146, 51, 87, 0.1);
  color: var(--uf-tertiary);
}
.badge--ok {
  background: rgba(46, 125, 50, 0.14);
  color: #1b5e20;
}
.badge--rej {
  background: rgba(179, 38, 30, 0.1);
  color: #b3261e;
}
.card-foot {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--uf-surface-container);
}
.ava {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: var(--uf-secondary-container);
  color: var(--uf-on-secondary-container);
  font-size: 0.55rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.grow {
  flex: 1;
  min-width: 0;
}
.card-foot .lbl {
  margin: 0;
  font-size: 0.6rem;
}
.card-foot .val {
  margin: 0.08rem 0 0;
  font-size: 0.8rem;
  font-weight: 600;
}
.tar {
  text-align: right;
}
.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.85rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(191, 202, 186, 0.2);
}
.btn-mini {
  border: none;
  border-radius: 999px;
  padding: 0.35rem 0.65rem;
  font-family: var(--uf-font);
  font-size: 0.72rem;
  font-weight: 800;
  cursor: pointer;
  color: var(--uf-primary);
  background: rgba(13, 99, 27, 0.08);
}
.btn-mini:hover:not(:disabled) {
  background: rgba(13, 99, 27, 0.14);
}
.btn-mini:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-mini--positive {
  color: #1b5e20;
  background: rgba(46, 125, 50, 0.16);
}
.btn-mini--warn {
  color: #b3261e;
  background: rgba(211, 47, 47, 0.12);
}
.btn-mini--danger {
  color: #7f1d1d;
  background: rgba(185, 28, 28, 0.12);
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 100;
}
.modal {
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
  overflow: auto;
  padding: 1.25rem;
  border-radius: var(--uf-radius-xl);
  background: var(--uf-surface-container-lowest);
  outline: 1px solid var(--uf-outline-variant);
  box-shadow: var(--uf-tonal-shadow);
}
.modal--wide {
  max-width: 640px;
}
.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.icon-close {
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--uf-on-surface-variant);
  padding: 0.25rem;
  border-radius: 0.25rem;
}
.h3 {
  margin: 0;
  font-size: 1.05rem;
}
.h4 {
  margin: 1rem 0 0.5rem;
  font-size: 0.9rem;
}
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem 1rem;
}
.span-2 {
  grid-column: span 2;
}
.dlbl {
  margin: 0;
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--uf-on-surface-variant);
}
.dval {
  margin: 0.15rem 0 0;
  font-size: 0.88rem;
  font-weight: 600;
}
.dval--multiline {
  white-space: pre-wrap;
  font-weight: 500;
}
.item-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.item-li {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--uf-surface-container);
  font-size: 0.85rem;
}
.item-meta {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.78rem;
  color: var(--uf-on-surface-variant);
}
.item-tax {
  margin: 0.35rem 0 0;
  padding: 0.35rem 0.5rem;
  background: var(--uf-surface-container-lowest);
  border-radius: var(--uf-radius-sm);
  border: 1px solid var(--uf-outline-variant);
}
.item-tax__block + .item-tax__block {
  margin-top: 0.45rem;
  padding-top: 0.45rem;
  border-top: 1px dashed var(--uf-outline-variant);
}
.item-tax__case {
  margin: 0 0 0.2rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--uf-primary);
}
.item-tax__lines {
  margin: 0;
  padding: 0;
  list-style: none;
}
.item-tax__line {
  display: grid;
  grid-template-columns: minmax(4.5rem, 44%) 1fr;
  gap: 0.25rem 0.5rem;
  font-size: 0.72rem;
  padding: 0.1rem 0;
  color: var(--uf-on-surface-variant);
}
.item-tax__type {
  font-weight: 600;
}
.item-tax__val {
  font-weight: 600;
  color: var(--uf-on-surface);
}
.modal-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 1rem;
}
.textarea {
  width: 100%;
  box-sizing: border-box;
  margin: 0.5rem 0 1rem;
  padding: 0.6rem;
  font-family: var(--uf-font);
  font-size: 0.875rem;
  border-radius: var(--uf-radius-md);
  border: 1px solid var(--uf-outline-variant);
  background: var(--uf-surface-container-highest);
}
.tonal {
  box-shadow: var(--uf-tonal-shadow);
}
</style>
