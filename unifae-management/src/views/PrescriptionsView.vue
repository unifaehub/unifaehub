<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import axios from 'axios'
import client from '@/api/client'
import MaterialIcon from '@/components/shell/MaterialIcon.vue'
import UiAsyncPanel from '@/components/ui/UiAsyncPanel.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import UiPager from '@/components/ui/UiPager.vue'
import UiSearchSelect, { type SearchSelectOption } from '@/components/ui/UiSearchSelect.vue'
import { useApiRequest } from '@/composables/useApiRequest'
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

type PatientOption = { id: number; name: string; email: string }
type ExerciseOption = { id: number; name: string }

type PrescriptionStepRow = { order: number; text: string }

type ItemForm = {
  exerciseId: number | ''
  steps: string[]
  repetitions: string
  notes: string
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
  careEpisodeId: number | null
  careEpisodeTitle: string | null
}

type PrescriptionDetail = PrescriptionSummary & {
  careEpisodeTitle?: string | null
  items: {
    id: number
    exerciseId: number
    exerciseName: string
    exerciseDescription?: string | null
    exerciseCatalogInstructions?: string | null
    instructions: string | null
    steps?: PrescriptionStepRow[]
    repetitions: string | null
    notes: string | null
    exerciseTaxonomy?: {
      clinicalCaseName: string | null
      typeLabel: string
      typeKey: string
      categoryName: string
    }[]
  }[]
  patientEmail?: string | null
  studentEmail?: string | null
  professorEmail?: string | null
  appName?: string | null
  courseCoordinators?: string[]
  careEpisodeStatus?: 'ACTIVE' | 'RESOLVED' | 'ARCHIVED' | null
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
const filterStatus = ref<'' | 'PENDING' | 'APPROVED' | 'REJECTED'>('')

const { data: appsData, execute: loadApps } = useApiRequest<AppRow[]>(
  async () => {
    const { data } = await client.get<Paged<AppRow>>('/apps', { params: { page: 1, limit: 100 } })
    return data.data
  },
  { onUnauthorized: handleUnauthorized },
)

const { data: coursesData, execute: loadCourses } = useApiRequest<CourseRow[]>(
  async () => {
    const { data } = await client.get<Paged<CourseRow>>('/courses', { params: { page: 1, limit: 100 } })
    return data.data
  },
  { onUnauthorized: handleUnauthorized },
)

const coursesForApp = computed(() => {
  const aid = filterAppId.value
  const list = coursesData.value ?? []
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

type CourseAutoLine =
  | { kind: 'none' }
  | { kind: 'one'; name: string }
  | { kind: 'multi'; n: number }

const courseAutoLine = computed((): CourseAutoLine => {
  const list = coursesForApp.value
  if (list.length === 0) return { kind: 'none' }
  if (list.length === 1) return { kind: 'one', name: list[0]!.name }
  return { kind: 'multi', n: list.length }
})

function emptyItemForm(): ItemForm {
  return { exerciseId: '', steps: [''], repetitions: '', notes: '' }
}

function instructionsToStepLines(text: string | null | undefined): string[] {
  if (!text?.trim()) return ['']
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.length) return ['']
  return lines.map((line) => {
    const numbered = line.match(/^\d+[\).\-\s]+(.+)$/)
    return (numbered?.[1] ?? line).trim()
  })
}

function itemStepsFromDetail(item: PrescriptionDetail['items'][number]): string[] {
  if (item.steps?.length) {
    return [...item.steps]
      .sort((a, b) => a.order - b.order)
      .map((s) => s.text)
  }
  return instructionsToStepLines(item.instructions)
}

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

const activeCourseId = computed((): number => {
  if (props.embeddedInCourse) return toFiniteId(props.courseScopeId)
  const v = effectiveCourseId.value
  return v === '' ? NaN : v
})

watch(coursesForApp, (list) => {
  if (props.embeddedInCourse) return
  if (list.length > 1 && manualCourseId.value === '') {
    const first = list[0]
    if (first) manualCourseId.value = first.id
  }
})

const search = ref('')
const prescriptionsPage = ref(1)
const prescriptionsLimit = ref(20)
const prescriptionsTotal = ref(0)
const pendingBadgeTotal = ref(0)
const debouncedRxSearch = ref('')
let rxSearchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, (v) => {
  if (rxSearchTimer) clearTimeout(rxSearchTimer)
  rxSearchTimer = setTimeout(() => {
    debouncedRxSearch.value = v.trim()
  }, 400)
})
watch(debouncedRxSearch, () => {
  prescriptionsPage.value = 1
})

const listLoading = ref(false)
const listFailed = ref(false)
const prescriptionsList = ref<PrescriptionSummary[]>([])

const patientsOptions = ref<PatientOption[]>([])
const patientsSearchLoading = ref(false)
let patientSearchTimer: ReturnType<typeof setTimeout> | null = null
const exercisesOptions = ref<ExerciseOption[]>([])
const picksLoading = ref(false)

const showModal = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)
const loadingDetail = ref(false)

const formPatientId = ref<number | ''>('')
const formCareEpisodeId = ref<number | ''>('')
const formJustification = ref('')
const formNextVisit = ref('')
const formItems = ref<ItemForm[]>([emptyItemForm()])
const episodeOptions = ref<
  {
    id: number
    title: string
    status: string
    prescriptionCount: number
  }[]
>([])
const editRxStatus = ref<'' | 'PENDING' | 'APPROVED' | 'REJECTED'>('')

const showRejectModal = ref(false)
const rejectJustification = ref('')
const rejectTargetId = ref<number | null>(null)

const showReportModal = ref(false)
const reportLoading = ref(false)
const reportData = ref<PrescriptionDetail | null>(null)

const role = computed(() => auth.user?.role ?? '')
const canApprove = computed(() =>
  ['ADMIN', 'COORDINATOR', 'PROFESSOR'].includes(role.value),
)
const isStudent = computed(() => role.value === 'STUDENT')
const canChangeCareEpisode = computed(
  () => editRxStatus.value === 'PENDING' && editingId.value != null,
)

function applyStudentScopeFromAuth() {
  if (props.embeddedInCourse) return
  const u = auth.user
  if (!u || u.role !== 'STUDENT') return
  if (u.appId != null) filterAppId.value = u.appId
  if (u.courseId != null) manualCourseId.value = u.courseId
}

async function loadPrescriptions() {
  const aid = activeAppId.value
  const cid = activeCourseId.value
  if (!Number.isFinite(aid) || !Number.isFinite(cid)) {
    prescriptionsList.value = []
    prescriptionsTotal.value = 0
    pendingBadgeTotal.value = 0
    return
  }
  listLoading.value = true
  listFailed.value = false
  try {
    const base: Record<string, string | number> = { courseId: cid, appId: aid }
    const listParams: Record<string, string | number> = {
      ...base,
      page: prescriptionsPage.value,
      limit: prescriptionsLimit.value,
    }
    if (filterStatus.value) listParams.status = filterStatus.value
    const q = debouncedRxSearch.value.trim()
    if (q) listParams.q = q

    const [listRes, pendRes] = await Promise.all([
      client.get<Paged<PrescriptionSummary>>('/prescriptions', { params: listParams }),
      client.get<Paged<PrescriptionSummary>>('/prescriptions', {
        params: { ...base, status: 'PENDING', page: 1, limit: 1 },
      }),
    ])
    prescriptionsList.value = listRes.data.data
    prescriptionsTotal.value = listRes.data.total
    pendingBadgeTotal.value = pendRes.data.total
  } catch (e) {
    listFailed.value = true
    prescriptionsList.value = []
    prescriptionsTotal.value = 0
    pendingBadgeTotal.value = 0
    if (axios.isAxiosError(e) && e.response?.status === 401) handleUnauthorized()
  } finally {
    listLoading.value = false
  }
}

async function searchPatientsForForm(query = '') {
  const aid = activeAppId.value
  const cid = activeCourseId.value
  if (!Number.isFinite(aid) || !Number.isFinite(cid)) {
    patientsOptions.value = []
    return
  }
  patientsSearchLoading.value = true
  try {
    const { data } = await client.get<Paged<PatientOption & { email: string }>>('/patients', {
      params: {
        courseId: cid,
        appId: aid,
        page: 1,
        limit: 50,
        q: query.trim() || undefined,
      },
    })
    patientsOptions.value = data.data.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
    }))
  } catch {
    patientsOptions.value = []
  } finally {
    patientsSearchLoading.value = false
  }
}

function schedulePatientSearch(query: string) {
  if (patientSearchTimer) clearTimeout(patientSearchTimer)
  patientSearchTimer = setTimeout(() => void searchPatientsForForm(query), 280)
}

const patientSelectOptions = computed((): SearchSelectOption[] =>
  patientsOptions.value.map((p) => ({
    id: p.id,
    label: p.name,
    hint: p.email,
  })),
)

async function loadPicks() {
  const aid = activeAppId.value
  const cid = activeCourseId.value
  if (!Number.isFinite(aid) || !Number.isFinite(cid)) {
    patientsOptions.value = []
    exercisesOptions.value = []
    return
  }
  picksLoading.value = true
  try {
    const [exercises] = await Promise.all([
      client.get<Paged<ExerciseOption>>('/exercises', {
        params: { courseId: cid, appId: aid, page: 1, limit: 100 },
      }),
      searchPatientsForForm(''),
    ])
    exercisesOptions.value = exercises.data.data.map((e) => ({ id: e.id, name: e.name }))
  } catch {
    patientsOptions.value = []
    exercisesOptions.value = []
  } finally {
    picksLoading.value = false
  }
}

async function loadEpisodesForPatient(patientId: number) {
  try {
    const { data } = await client.get<
      {
        id: number
        title: string
        status: string
        prescriptionCount: number
      }[]
    >(`/patients/${patientId}/care-episodes`)
    episodeOptions.value = Array.isArray(data) ? data : []
  } catch {
    episodeOptions.value = []
  }
}

function pickDefaultCareEpisode() {
  const active = episodeOptions.value.filter((e) => e.status === 'ACTIVE')
  if (active.length === 1) {
    formCareEpisodeId.value = active[0]!.id
    return
  }
  if (active.length === 0 && episodeOptions.value.length === 1) {
    formCareEpisodeId.value = episodeOptions.value[0]!.id
    return
  }
  formCareEpisodeId.value = ''
}

watch(formPatientId, async (pid) => {
  if (editingId.value != null) return
  if (pid === '' || !Number.isFinite(Number(pid))) {
    episodeOptions.value = []
    formCareEpisodeId.value = ''
    return
  }
  await loadEpisodesForPatient(Number(pid))
  pickDefaultCareEpisode()
})

watch(
  () => [activeAppId.value, activeCourseId.value, filterStatus.value] as const,
  () => {
    prescriptionsPage.value = 1
  },
)

watch(
  [prescriptionsPage, prescriptionsLimit, debouncedRxSearch, activeAppId, activeCourseId, filterStatus],
  () => {
    void loadPrescriptions()
  },
)

function statusClass(s: string) {
  if (s === 'PENDING') return 'st-pend'
  if (s === 'APPROVED') return 'st-ok'
  return 'st-rej'
}

function statusLabel(s: string) {
  if (s === 'PENDING') return 'Pendente'
  if (s === 'APPROVED') return 'Aprovada'
  return 'Rejeitada'
}

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

function formatDateLong(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function justificationPreview(text: string | null | undefined, max = 140) {
  const t = text?.trim() ?? ''
  if (!t) return ''
  return t.length <= max ? t : `${t.slice(0, max)}…`
}

async function openReport(id: number) {
  showReportModal.value = true
  reportData.value = null
  reportLoading.value = true
  try {
    const { data } = await client.get<PrescriptionDetail>(`/prescriptions/${id}`)
    reportData.value = data
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Não foi possível carregar o documento.'))
    showReportModal.value = false
  } finally {
    reportLoading.value = false
  }
}

function closeReport() {
  showReportModal.value = false
  reportData.value = null
}

function printReport() {
  window.print()
}

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (!p.length) return '?'
  if (p.length === 1) return p[0]!.slice(0, 2).toUpperCase()
  return (p[0]![0]! + p[p.length - 1]![0]!).toUpperCase()
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function openNew() {
  editingId.value = null
  formPatientId.value = ''
  formCareEpisodeId.value = ''
  episodeOptions.value = []
  formJustification.value = ''
  formNextVisit.value = ''
  formItems.value = [emptyItemForm()]
  editRxStatus.value = ''
  void loadPicks()
  showModal.value = true
}

async function openEdit(id: number) {
  editingId.value = id
  loadingDetail.value = true
  showModal.value = true
  void loadPicks()
  try {
    const { data } = await client.get<PrescriptionDetail>(`/prescriptions/${id}`)
    formPatientId.value = data.patientId
    editRxStatus.value = data.status
    formCareEpisodeId.value =
      data.careEpisodeId != null && Number.isFinite(data.careEpisodeId)
        ? data.careEpisodeId
        : ''
    await loadEpisodesForPatient(data.patientId)
    formJustification.value = data.justification ?? ''
    formNextVisit.value = toDatetimeLocal(data.nextVisitDate)
    formItems.value =
      data.items.length > 0
        ? data.items.map((i) => ({
            exerciseId: i.exerciseId,
            steps: itemStepsFromDetail(i),
            repetitions: i.repetitions ?? '',
            notes: i.notes ?? '',
          }))
        : [emptyItemForm()]
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Não foi possível carregar a prescrição.'))
    closeModal()
  } finally {
    loadingDetail.value = false
  }
}

function closeModal() {
  showModal.value = false
  editingId.value = null
  editRxStatus.value = ''
  episodeOptions.value = []
}

function addItemRow() {
  formItems.value.push(emptyItemForm())
}

function addStepRow(item: ItemForm) {
  if (item.steps.length >= 20) return
  item.steps.push('')
}

function removeStepRow(item: ItemForm, stepIdx: number) {
  if (item.steps.length <= 1) return
  item.steps.splice(stepIdx, 1)
}

function removeItemRow(i: number) {
  if (formItems.value.length <= 1) return
  formItems.value = formItems.value.filter((_, idx) => idx !== i)
}

async function submitForm() {
  const aid = activeAppId.value
  const cid = activeCourseId.value
  if (!Number.isFinite(aid) || !Number.isFinite(cid)) return

  const pid = formPatientId.value === '' ? NaN : Number(formPatientId.value)
  if (!Number.isFinite(pid)) {
    toast.error('Busque e selecione o paciente na lista.')
    return
  }

  const itemsPayload = formItems.value
    .filter((it) => it.exerciseId !== '')
    .map((it) => {
      const steps = it.steps.map((s) => s.trim()).filter(Boolean)
      return {
        exerciseId: Number(it.exerciseId),
        steps: steps.map((description) => ({ description })),
        repetitions: it.repetitions.trim() || null,
        notes: it.notes.trim() || null,
      }
    })

  if (itemsPayload.some((it) => !it.steps.length)) {
    toast.error('Informe ao menos uma etapa do passo a passo em cada exercício.')
    return
  }

  if (itemsPayload.length === 0) {
    toast.error('Inclua ao menos um exercício.')
    return
  }

  const justificationTrim = formJustification.value.trim()
  if (justificationTrim.length < 2) {
    toast.error('Informe a justificativa ou observação (mínimo 2 caracteres).')
    return
  }

  if (editingId.value == null) {
    const nAct = episodeOptions.value.filter((e) => e.status === 'ACTIVE').length
    if (nAct > 1 && formCareEpisodeId.value === '') {
      toast.error('Selecione o episódio de cuidado (há mais de um episódio ativo).')
      return
    }
  }

  saving.value = true
  try {
    const nextVisit =
      formNextVisit.value.trim() === '' ? null : new Date(formNextVisit.value).toISOString()

    if (editingId.value == null) {
      const body: Record<string, unknown> = {
        patientId: pid,
        courseId: cid,
        appId: aid,
        justification: justificationTrim,
        nextVisitDate: nextVisit,
        items: itemsPayload,
      }
      if (formCareEpisodeId.value !== '') {
        body.careEpisodeId = Number(formCareEpisodeId.value)
      }
      await client.post('/prescriptions', body)
      toast.success('Prescrição criada (pendente de aprovação).')
    } else {
      const patch: Record<string, unknown> = {
        justification: justificationTrim,
        nextVisitDate: nextVisit,
        items: itemsPayload,
      }
      if (formCareEpisodeId.value !== '') {
        patch.careEpisodeId = Number(formCareEpisodeId.value)
      }
      await client.patch(`/prescriptions/${editingId.value}`, patch)
      toast.success('Prescrição atualizada.')
    }
    closeModal()
    await loadPrescriptions()
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Não foi possível salvar.'))
  } finally {
    saving.value = false
  }
}

async function approveRx(r: PrescriptionSummary) {
  const ok = await confirm.confirm({
    title: 'Aprovar prescrição',
    message: `Aprovar prescrição de ${r.patientName}?`,
    confirmText: 'Aprovar',
    cancelText: 'Cancelar',
  })
  if (!ok) return
  try {
    await client.patch(`/prescriptions/${r.id}`, { status: 'APPROVED' })
    toast.success('Prescrição aprovada.')
    await loadPrescriptions()
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Falha ao aprovar.'))
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
  saving.value = true
  try {
    await client.patch(`/prescriptions/${id}`, {
      status: 'REJECTED',
      justification: rejectJustification.value.trim(),
    })
    toast.success('Prescrição rejeitada.')
    showRejectModal.value = false
    rejectTargetId.value = null
    await loadPrescriptions()
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Falha ao rejeitar.'))
  } finally {
    saving.value = false
  }
}

async function removeRx(r: PrescriptionSummary) {
  if (r.status !== 'PENDING') {
    toast.error('Só é possível excluir prescrições pendentes.')
    return
  }
  const ok = await confirm.confirm({
    title: 'Excluir prescrição',
    message: `Excluir a prescrição pendente de ${r.patientName}?`,
    confirmText: 'Excluir',
    cancelText: 'Cancelar',
    tone: 'danger',
  })
  if (!ok) return
  try {
    await client.delete(`/prescriptions/${r.id}`)
    toast.success('Prescrição excluída.')
    await loadPrescriptions()
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Não foi possível excluir.'))
  }
}

onMounted(() => {
  applyStudentScopeFromAuth()
  void loadApps()
  if (!props.embeddedInCourse) void loadCourses()
  void loadPrescriptions()
})

watch(
  () => auth.user,
  () => applyStudentScopeFromAuth(),
)
</script>

<template>
  <div class="page">
    <div class="hero">
      <div>
        <h2 class="title">Prescrições</h2>
        <p v-if="!embeddedInCourse" class="sub">
          Protocolos por paciente com exercícios da biblioteca do curso. Fluxo:
          <strong>pendente</strong> → aprovação do professor ou coordenação.
        </p>
        <p v-else class="sub">Prescrições deste curso: vínculo paciente, exercícios e aprovação.</p>
      </div>
      <div class="stats">
        <div class="stat">
          <div class="stat-icon">
            <MaterialIcon name="pending_actions" filled />
          </div>
          <div>
            <p class="stat-label">Pendentes</p>
            <p class="stat-num">{{ listLoading ? '…' : pendingBadgeTotal }}</p>
          </div>
        </div>
        <button type="button" class="stat stat--cta" @click="openNew">
          <div class="stat-icon stat-icon--light">
            <MaterialIcon name="add" />
          </div>
          <div>
            <p class="stat-label dim">Nova</p>
            <p class="stat-cta">Prescrição</p>
          </div>
        </button>
      </div>
    </div>

    <div v-if="!embeddedInCourse" class="filter-bar">
      <div class="filter-inner">
        <div class="field">
          <label class="flbl">App</label>
          <select v-model="filterAppId" class="fsel" :disabled="isStudent">
            <option value="">Selecione…</option>
            <option v-for="a in appsData ?? []" :key="a.id" :value="a.id">{{ a.name }}</option>
          </select>
        </div>
        <div v-if="courseAutoLine?.kind === 'one'" class="field field--grow">
          <label class="flbl">Curso</label>
          <p class="fone">{{ courseAutoLine.name }}</p>
        </div>
        <div v-else-if="courseAutoLine?.kind === 'multi'" class="field">
          <label class="flbl">Curso</label>
          <select v-model="manualCourseId" class="fsel" :disabled="isStudent">
            <option v-for="c in coursesForApp" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="field">
          <label class="flbl">Status</label>
          <select v-model="filterStatus" class="fsel">
            <option value="">Todos</option>
            <option value="PENDING">Pendente</option>
            <option value="APPROVED">Aprovada</option>
            <option value="REJECTED">Rejeitada</option>
          </select>
        </div>
        <div class="field field--grow">
          <label class="flbl">Buscar</label>
          <input v-model="search" type="search" class="fin" placeholder="Paciente, estagiário…" />
        </div>
      </div>
    </div>

    <div
      v-else-if="embeddedInCourse && Number.isFinite(activeAppId) && Number.isFinite(activeCourseId)"
      class="filter-bar"
    >
      <div class="filter-inner">
        <div class="field">
          <label class="flbl">Status</label>
          <select v-model="filterStatus" class="fsel">
            <option value="">Todos</option>
            <option value="PENDING">Pendente</option>
            <option value="APPROVED">Aprovada</option>
            <option value="REJECTED">Rejeitada</option>
          </select>
        </div>
        <div class="field field--grow">
          <label class="flbl">Buscar</label>
          <input v-model="search" type="search" class="fin" placeholder="Paciente, estagiário…" />
        </div>
      </div>
    </div>

    <div class="table-wrap tonal">
      <UiConnectionRetry v-if="listFailed" @retry="loadPrescriptions" />
      <p
        v-else-if="!Number.isFinite(activeAppId) || !Number.isFinite(activeCourseId)"
        class="pad muted"
      >
        {{ embeddedInCourse ? 'Escopo do curso indisponível.' : 'Selecione app e curso.' }}
      </p>
      <UiAsyncPanel v-else :loading="listLoading" label="Carregando prescrições…">
        <table>
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Episódio</th>
              <th>Responsável</th>
              <th>Curso</th>
              <th>Exercícios</th>
              <th>Status</th>
              <th>Observações / motivo</th>
              <th>Emissão</th>
              <th class="tar">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in prescriptionsList" :key="r.id">
              <td>
                <div class="pcell">
                  <span class="sq">{{ initials(r.patientName) }}</span>
                  <div>
                    <p class="pname">{{ r.patientName }}</p>
                    <p class="pid">#{{ r.id }} · Paciente #{{ r.patientId }}</p>
                  </div>
                </div>
              </td>
              <td class="muted-sm ep-col">
                <span v-if="r.careEpisodeTitle?.trim()">{{ r.careEpisodeTitle }}</span>
                <span v-else>—</span>
              </td>
              <td>
                <p class="sname">{{ r.studentName }}</p>
                <p v-if="r.professorName" class="prof">
                  <MaterialIcon name="verified_user" size="0.85rem" />
                  {{ r.professorName }}
                </p>
              </td>
              <td>
                <span class="course-tag">{{ r.courseName }}</span>
              </td>
              <td class="muted-sm">{{ r.itemsCount }}</td>
              <td>
                <span class="pill" :class="statusClass(r.status)">
                  <span class="pdot" />
                  {{ statusLabel(r.status) }}
                </span>
              </td>
              <td class="just-col">
                <p v-if="r.justification?.trim()" class="just-text" :title="r.justification ?? undefined">
                  {{ justificationPreview(r.justification) }}
                </p>
                <span v-else class="muted-sm">—</span>
              </td>
              <td class="muted">{{ formatDate(r.createdAt) }}</td>
              <td class="tar acts">
                <div class="ui-act-row">
                  <UiIconButton
                    icon="visibility"
                    label="Ver documento / imprimir"
                    variant="doc"
                    @click="openReport(r.id)"
                  />
                  <UiIconButton
                    v-if="r.status === 'PENDING'"
                    icon="edit"
                    label="Editar"
                    @click="openEdit(r.id)"
                  />
                  <template v-if="r.status === 'PENDING' && canApprove">
                    <UiIconButton icon="check_circle" label="Aprovar" variant="success" @click="approveRx(r)" />
                    <UiIconButton icon="cancel" label="Rejeitar" variant="warn" @click="openReject(r)" />
                  </template>
                  <UiIconButton
                    v-if="r.status === 'PENDING'"
                    icon="delete"
                    label="Excluir"
                    variant="danger"
                    @click="removeRx(r)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <UiPager
          v-if="prescriptionsTotal > 0"
          v-model:page="prescriptionsPage"
          :limit="prescriptionsLimit"
          :total="prescriptionsTotal"
          :loading="listLoading"
        />
        <p v-if="!prescriptionsList.length" class="pad muted">Nenhuma prescrição neste filtro.</p>
      </UiAsyncPanel>
    </div>

    <!-- Modal criar/editar -->
    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal modal--xl">
        <h3 class="mh">{{ editingId == null ? 'Nova prescrição' : 'Editar prescrição' }}</h3>
        <p v-if="loadingDetail" class="muted">Carregando…</p>
        <form v-else class="mform" @submit.prevent="submitForm">
          <div class="field">
            <UiSearchSelect
              v-model="formPatientId"
              :options="patientSelectOptions"
              :loading="patientsSearchLoading"
              :disabled="editingId != null"
              label="Paciente"
              placeholder="Digite nome ou e-mail para buscar…"
              empty-text="Nenhum paciente encontrado."
              @search="schedulePatientSearch"
            />
          </div>
          <div v-if="editingId == null" class="field">
            <label class="mlbl">Episódio de cuidado</label>
            <select
              v-model="formCareEpisodeId"
              class="minp"
              :disabled="picksLoading || formPatientId === '' || episodeOptions.length === 0"
            >
              <option value="">Selecione…</option>
              <option v-for="e in episodeOptions" :key="e.id" :value="e.id">
                {{ e.title }}
                ·
                {{
                  e.status === 'ACTIVE'
                    ? 'Ativo'
                    : e.status === 'RESOLVED'
                      ? 'Resolvido'
                      : 'Arquivado'
                }}
                ({{ e.prescriptionCount }} rx)
              </option>
            </select>
            <p
              v-if="!picksLoading && formPatientId !== '' && episodeOptions.length === 0"
              class="muted hint"
            >
              Nenhum episódio para este paciente.
            </p>
            <p
              v-else-if="episodeOptions.filter((e) => e.status === 'ACTIVE').length > 1 && formCareEpisodeId === ''"
              class="muted hint"
            >
              Há mais de um episódio ativo: escolha explicitamente o episódio desta prescrição.
            </p>
          </div>
          <div v-else class="field">
            <label class="mlbl">Episódio de cuidado</label>
            <select
              v-model="formCareEpisodeId"
              class="minp"
              :disabled="!canChangeCareEpisode || picksLoading || episodeOptions.length === 0"
            >
              <option value="">Selecione…</option>
              <option v-for="e in episodeOptions" :key="e.id" :value="e.id">
                {{ e.title }}
              </option>
            </select>
            <p v-if="!canChangeCareEpisode" class="muted hint">
              Só é possível trocar o episódio enquanto a prescrição estiver pendente.
            </p>
          </div>
          <div class="field">
            <label class="mlbl">Justificativa / observação clínica <span class="req">*</span></label>
            <textarea
              v-model="formJustification"
              class="minp minp--area"
              rows="3"
              required
              minlength="2"
              placeholder="Descreva o racional clínico ou observações relevantes para aprovação."
            />
          </div>
          <div class="field">
            <label class="mlbl">Próxima visita (opcional)</label>
            <input v-model="formNextVisit" class="minp" type="datetime-local" />
          </div>

          <div class="items-head">
            <span class="mlbl">Exercícios</span>
            <button type="button" class="btn-add" @click="addItemRow">+ Linha</button>
          </div>
          <div v-for="(it, idx) in formItems" :key="idx" class="item-block">
            <div class="item-row item-row--head">
              <select v-model="it.exerciseId" class="minp" required>
                <option value="">Exercício…</option>
                <option v-for="ex in exercisesOptions" :key="ex.id" :value="ex.id">{{ ex.name }}</option>
              </select>
              <input v-model="it.repetitions" class="minp minp--sm" placeholder="Reps / tempo" />
              <input v-model="it.notes" class="minp" placeholder="Notas" />
              <button type="button" class="btn-rm" title="Remover exercício" @click="removeItemRow(idx)">✕</button>
            </div>
            <div class="item-steps">
              <div class="item-steps__head">
                <span class="mlbl mlbl--sm">Passo a passo</span>
                <button
                  type="button"
                  class="btn-add btn-add--sm"
                  :disabled="it.steps.length >= 20"
                  @click="addStepRow(it)"
                >
                  + Etapa
                </button>
              </div>
              <div v-for="(_step, si) in it.steps" :key="si" class="item-step-row">
                <span class="item-step-row__n">{{ si + 1 }}.</span>
                <input
                  v-model="it.steps[si]"
                  class="minp"
                  required
                  :placeholder="`Etapa ${si + 1}`"
                />
                <button
                  type="button"
                  class="btn-rm btn-rm--sm"
                  title="Remover etapa"
                  :disabled="it.steps.length <= 1"
                  @click="removeStepRow(it, si)"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
          <p v-if="picksLoading" class="muted hint">Carregando pacientes e exercícios…</p>

          <div class="mactions">
            <button type="button" class="mbtn mbtn--ghost" @click="closeModal">Cancelar</button>
            <button type="submit" class="mbtn mbtn--pri" :disabled="saving">
              {{ saving ? 'Salvando…' : 'Salvar' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Documento / relatório (impressão) -->
    <div
      v-if="showReportModal"
      class="modal-backdrop report-backdrop"
      @click.self="closeReport"
    >
      <div class="modal modal--report rx-report print-root">
        <div class="report-toolbar no-print">
          <h3 class="mh mh--report">Prescrição — documento</h3>
          <div class="report-toolbar__btns">
            <button type="button" class="mbtn mbtn--ghost" @click="closeReport">Fechar</button>
            <button type="button" class="mbtn mbtn--pri" @click="printReport">
              <MaterialIcon name="print" size="1rem" />
              Imprimir
            </button>
          </div>
        </div>
        <p v-if="reportLoading" class="muted pad">Carregando…</p>
        <div v-else-if="reportData" class="report-body">
          <header class="report-header">
            <div class="report-brand-wrap">
              <img src="/unifae_hub_transparent.png" alt="Unifae Hub" class="report-logo" />
              <span class="report-brand-text">Prescrição terapêutica</span>
            </div>
            <h1 class="report-title">Prescrição nº {{ reportData.id }}</h1>
            <p class="report-meta">
              <strong>Status:</strong> {{ statusLabel(reportData.status) }}
              · <strong>Emitida em:</strong> {{ formatDateLong(reportData.createdAt) }}
            </p>
          </header>

          <section class="report-section">
            <h2 class="report-h2">Aplicativo e curso</h2>
            <dl class="report-dl">
              <div><dt>App</dt><dd>{{ reportData.appName ?? `#${reportData.appId}` }}</dd></div>
              <div><dt>Curso</dt><dd>{{ reportData.courseName }}</dd></div>
              <div v-if="reportData.courseCoordinators?.length">
                <dt>Coordenação (cadastro)</dt>
                <dd>{{ reportData.courseCoordinators.join(', ') }}</dd>
              </div>
            </dl>
          </section>

          <section class="report-section">
            <h2 class="report-h2">Paciente (usuário do app)</h2>
            <dl class="report-dl">
              <div><dt>Nome</dt><dd>{{ reportData.patientName }}</dd></div>
              <div><dt>E-mail (login)</dt><dd>{{ reportData.patientEmail ?? '—' }}</dd></div>
              <div><dt>ID paciente</dt><dd>#{{ reportData.patientId }}</dd></div>
            </dl>
          </section>

          <section v-if="reportData.careEpisodeTitle?.trim()" class="report-section">
            <h2 class="report-h2">Episódio de cuidado</h2>
            <dl class="report-dl">
              <div>
                <dt>Título</dt>
                <dd>{{ reportData.careEpisodeTitle }}</dd>
              </div>
              <div v-if="reportData.careEpisodeStatus">
                <dt>Status do episódio</dt>
                <dd>
                  {{
                    reportData.careEpisodeStatus === 'ACTIVE'
                      ? 'Ativo'
                      : reportData.careEpisodeStatus === 'RESOLVED'
                        ? 'Resolvido'
                        : 'Arquivado'
                  }}
                </dd>
              </div>
            </dl>
          </section>

          <section class="report-section">
            <h2 class="report-h2">Responsáveis acadêmicos</h2>
            <dl class="report-dl">
              <div>
                <dt>Estagiário</dt>
                <dd>
                  {{ reportData.studentName }}
                  <template v-if="reportData.studentEmail"> — {{ reportData.studentEmail }}</template>
                </dd>
              </div>
              <div>
                <dt>Professor orientador</dt>
                <dd>
                  <template v-if="reportData.professorName">
                    {{ reportData.professorName }}
                    <template v-if="reportData.professorEmail"> — {{ reportData.professorEmail }}</template>
                  </template>
                  <template v-else>—</template>
                </dd>
              </div>
            </dl>
          </section>

          <section class="report-section">
            <h2 class="report-h2">Justificativa e planejamento</h2>
            <p class="report-block">{{ reportData.justification?.trim() || '—' }}</p>
            <dl class="report-dl report-dl--inline">
              <div>
                <dt>Próxima visita sugerida</dt>
                <dd>{{ reportData.nextVisitDate ? formatDateLong(reportData.nextVisitDate) : '—' }}</dd>
              </div>
            </dl>
          </section>

          <section class="report-section">
            <h2 class="report-h2">Exercícios prescritos ({{ reportData.items.length }})</h2>
            <div class="report-ex-list">
              <div v-for="(it, idx) in reportData.items" :key="it.id" class="report-ex">
                <h3 class="report-ex__title">{{ idx + 1 }}. {{ it.exerciseName }}</h3>
                <p v-if="it.exerciseDescription" class="report-ex__desc">{{ it.exerciseDescription }}</p>
                <p v-if="it.exerciseCatalogInstructions" class="report-ex__hint">
                  <em>Instruções do catálogo:</em> {{ it.exerciseCatalogInstructions }}
                </p>
                <dl class="report-dl report-dl--tight">
                  <div v-if="it.steps?.length">
                    <dt>Passo a passo</dt>
                    <dd>
                      <ol class="report-steps">
                        <li v-for="s in [...it.steps].sort((a, b) => a.order - b.order)" :key="s.order">
                          {{ s.text }}
                        </li>
                      </ol>
                    </dd>
                  </div>
                  <div v-else-if="it.instructions">
                    <dt>Instruções na prescrição</dt>
                    <dd>{{ it.instructions }}</dd>
                  </div>
                  <div v-if="it.repetitions">
                    <dt>Repetições / tempo</dt>
                    <dd>{{ it.repetitions }}</dd>
                  </div>
                  <div v-if="it.notes">
                    <dt>Observações</dt>
                    <dd>{{ it.notes }}</dd>
                  </div>
                </dl>
                <div v-if="it.exerciseTaxonomy?.length" class="report-tax">
                  <p class="report-tax__title">Classificação no catálogo</p>
                  <div class="report-tax__blocks">
                    <div
                      v-for="(blk, bi) in buildTaxonomyReportGroups(it.exerciseTaxonomy)"
                      :key="bi"
                      class="report-tax__block"
                    >
                      <p class="report-tax__case">
                        {{ blk.clinicalCaseName ?? 'Sem caso clínico' }}
                      </p>
                      <ul class="report-tax__lines">
                        <li v-for="(ln, li) in blk.lines" :key="li" class="report-tax__line">
                          <span class="report-tax__type">{{ ln.typeLabel }}:</span>
                          <span class="report-tax__val">{{ ln.categoriesText }}</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <footer class="report-footer">
            <p>Documento gerado pelo sistema para conferência. Validade sujeita ao fluxo de aprovação vigente.</p>
          </footer>
        </div>
      </div>
    </div>

    <!-- Rejeitar -->
    <div v-if="showRejectModal" class="modal-backdrop" @click.self="showRejectModal = false">
      <div class="modal">
        <h3 class="mh">Rejeitar prescrição</h3>
        <label class="mlbl">Motivo (obrigatório)</label>
        <textarea v-model="rejectJustification" class="minp minp--area" rows="3" />
        <div class="mactions">
          <button type="button" class="mbtn mbtn--ghost" @click="showRejectModal = false">Cancelar</button>
          <button type="button" class="mbtn mbtn--danger" :disabled="saving" @click="confirmReject">
            Rejeitar
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
.hero {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}
.title {
  margin: 0;
  font-size: 2.2rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.1;
}
.sub {
  margin: 0.35rem 0 0;
  max-width: 40rem;
  font-weight: 500;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--uf-on-surface-variant);
}
.stats {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}
.stat {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-radius: var(--uf-radius-xl);
  background: var(--uf-surface-container-lowest);
  box-shadow: var(--uf-tonal-shadow);
  border: none;
  cursor: default;
  text-align: left;
  font: inherit;
  min-width: 160px;
}
.stat--cta {
  background: var(--uf-primary);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 12px 32px rgba(13, 99, 27, 0.15);
}
.stat-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: rgba(198, 233, 190, 0.45);
  color: var(--uf-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}
.stat-icon--light {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}
.stat-label {
  margin: 0;
  font-size: 0.625rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--uf-on-surface-variant);
}
.stat--cta .stat-label.dim {
  color: rgba(255, 255, 255, 0.75);
}
.stat-num {
  margin: 0.15rem 0 0;
  font-size: 1.75rem;
  font-weight: 800;
}
.stat-cta {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
}
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  padding: 0.5rem;
  border-radius: 1rem;
  background: var(--uf-surface-container-low);
  margin-bottom: 1.25rem;
}
.filter-inner {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: flex-end;
  flex: 1;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 8rem;
}
.field--grow {
  flex: 1;
  min-width: 12rem;
}
.flbl {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--uf-on-surface-variant);
}
.fsel,
.fin {
  border: none;
  border-radius: var(--uf-radius-xl);
  padding: 0.55rem 0.85rem;
  font-family: var(--uf-font);
  font-size: 0.8125rem;
  font-weight: 600;
  background: var(--uf-surface-container-lowest);
  color: var(--uf-on-surface);
}
.fone {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
}
.tonal {
  box-shadow: var(--uf-tonal-shadow);
}
.table-wrap {
  background: var(--uf-surface-container-lowest);
  border-radius: var(--uf-radius-xl);
  overflow: auto;
}
table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  text-align: left;
  min-width: 720px;
}
thead tr {
  background: var(--uf-surface-container-low);
  font-size: 0.6875rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--uf-on-surface-variant);
}
th {
  padding: 1rem 1.25rem;
}
.tar {
  text-align: right;
}
tbody tr {
  border-top: 1px solid var(--uf-surface-container);
}
tbody tr:hover {
  background: rgba(242, 244, 245, 0.6);
}
td {
  padding: 1rem 1.25rem;
  vertical-align: middle;
}
.pcell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.sq {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--uf-radius-md);
  background: var(--uf-surface-container);
  color: var(--uf-primary);
  font-size: 0.7rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pname {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 700;
}
.pid {
  margin: 0.1rem 0 0;
  font-size: 0.625rem;
  color: var(--uf-on-surface-variant);
}
.sname {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
}
.prof {
  margin: 0.15rem 0 0;
  font-size: 0.625rem;
  color: var(--uf-primary);
  display: flex;
  align-items: center;
  gap: 0.2rem;
}
.course-tag {
  font-size: 0.625rem;
  font-weight: 800;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  background: var(--uf-surface-container);
  color: var(--uf-on-surface-variant);
}
.muted-sm {
  font-size: 0.8125rem;
  color: var(--uf-on-surface-variant);
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.625rem;
  font-weight: 800;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
}
.st-pend {
  background: #fefce8;
  color: #854d0e;
}
.st-ok {
  background: #f0fdf4;
  color: #166534;
}
.st-rej {
  background: #fef2f2;
  color: #991b1b;
}
.pdot {
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 50%;
  background: currentColor;
}
.muted {
  font-size: 0.875rem;
  color: var(--uf-on-surface-variant);
}
.pad {
  padding: 1rem 1.25rem;
  margin: 0;
}
.acts {
  white-space: nowrap;
}
.ibtn {
  padding: 0.35rem;
  margin-left: 0.15rem;
  border: none;
  border-radius: var(--uf-radius-md);
  background: transparent;
  color: var(--uf-primary);
  cursor: pointer;
  vertical-align: middle;
}
.ibtn:hover {
  background: rgba(46, 125, 50, 0.08);
}
.ibtn--ok {
  color: #166534;
}
.ibtn--no {
  color: #991b1b;
}
.ibtn--danger {
  color: #b3261e;
}
.ibtn--doc {
  color: var(--uf-on-surface-variant);
}
.ibtn--doc:hover {
  color: var(--uf-primary);
}
.just-col {
  max-width: 14rem;
  vertical-align: top;
}
.just-text {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.35;
  color: var(--uf-on-surface);
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.req {
  color: #b3261e;
  font-weight: 800;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}
.modal {
  width: 100%;
  max-width: 26rem;
  max-height: 90vh;
  overflow: auto;
  background: var(--uf-surface-container-lowest);
  border-radius: var(--uf-radius-xl);
  padding: 1.35rem;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
}
.modal--xl {
  max-width: 44rem;
}
.modal--report {
  max-width: 42rem;
  max-height: 92vh;
}
.report-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(191, 202, 186, 0.35);
}
.report-toolbar__btns {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.mh--report {
  margin: 0;
}
.report-body {
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--uf-on-surface);
}
.rx-report {
  text-align: left;
}
.report-header {
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--uf-outline-variant);
}
.report-brand-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}
.report-logo {
  height: 4rem;
  width: auto;
  object-fit: contain;
}
.report-brand-text {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--uf-on-surface-variant);
}
.report-title {
  margin: 0.35rem 0 0.25rem;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.report-meta {
  margin: 0;
  font-size: 0.82rem;
  color: var(--uf-on-surface-variant);
}
.report-section {
  margin: 1.1rem 0;
  page-break-inside: avoid;
}
.report-h2 {
  margin: 0 0 0.5rem;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--uf-primary);
  border-bottom: 1px solid rgba(13, 99, 27, 0.2);
  padding-bottom: 0.25rem;
}
.report-dl {
  margin: 0;
  display: grid;
  gap: 0.45rem 1rem;
}
.report-dl > div {
  display: grid;
  grid-template-columns: 8.5rem 1fr;
  gap: 0.5rem;
  align-items: start;
}
.report-dl--inline > div {
  grid-template-columns: 12rem 1fr;
}
.report-dl--tight > div {
  grid-template-columns: 1fr;
}
@media (max-width: 520px) {
  .report-dl > div {
    grid-template-columns: 1fr;
  }
}
.report-dl dt {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--uf-on-surface-variant);
}
.report-dl dd {
  margin: 0;
  font-weight: 600;
}
.report-block {
  margin: 0 0 0.65rem;
  padding: 0.65rem 0.85rem;
  background: var(--uf-surface-container-low);
  border-radius: var(--uf-radius-md);
  white-space: pre-wrap;
  font-size: 0.88rem;
}
.report-ex-list {
  margin: 0;
  padding: 0;
}
.report-ex {
  margin: 0.85rem 0;
  padding-bottom: 0.85rem;
  border-bottom: 1px dashed rgba(191, 202, 186, 0.5);
}
.report-ex:last-child {
  border-bottom: none;
}
.report-ex__title {
  margin: 0 0 0.35rem;
  font-size: 0.95rem;
  font-weight: 800;
}
.report-ex__desc {
  margin: 0 0 0.35rem;
  font-size: 0.82rem;
  color: var(--uf-on-surface-variant);
}
.report-ex__hint {
  margin: 0 0 0.5rem;
  font-size: 0.78rem;
  color: var(--uf-on-surface-variant);
}
.report-tax {
  margin: 0.5rem 0 0;
  padding: 0.5rem 0.65rem;
  background: var(--uf-surface-container-lowest);
  border-radius: var(--uf-radius-sm);
  border: 1px solid rgba(191, 202, 186, 0.35);
}
.report-tax__title {
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--uf-on-surface-variant);
}
.report-tax__blocks {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.report-tax__block {
  padding: 0.35rem 0 0;
  border-top: 1px dashed rgba(191, 202, 186, 0.45);
}
.report-tax__block:first-child {
  border-top: none;
  padding-top: 0;
}
.report-tax__case {
  margin: 0 0 0.25rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--uf-primary);
}
.report-tax__lines {
  margin: 0;
  padding: 0;
  list-style: none;
}
.report-tax__line {
  display: grid;
  grid-template-columns: minmax(5rem, 42%) 1fr;
  gap: 0.35rem 0.65rem;
  align-items: baseline;
  font-size: 0.78rem;
  padding: 0.15rem 0;
}
@media print {
  .report-tax__line {
    grid-template-columns: minmax(5rem, 38%) 1fr;
  }
}
.report-tax__type {
  color: var(--uf-on-surface-variant);
  font-weight: 600;
}
.report-tax__val {
  font-weight: 600;
  color: var(--uf-on-surface);
}
.report-footer {
  margin-top: 1.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--uf-outline-variant);
  font-size: 0.72rem;
  color: var(--uf-on-surface-variant);
}
.report-footer p {
  margin: 0;
}
.mh {
  margin: 0 0 1rem;
  font-size: 1.15rem;
}
.mform {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.mlbl {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--uf-on-surface-variant);
}
.minp {
  width: 100%;
  box-sizing: border-box;
  border-radius: var(--uf-radius-md);
  border: 1px solid rgba(191, 202, 186, 0.55);
  padding: 0.45rem 0.6rem;
  font-family: var(--uf-font);
  font-size: 0.88rem;
}
.minp--area {
  resize: vertical;
}
.minp--sm {
  max-width: 7rem;
}
.items-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.5rem;
}
.btn-add {
  border: none;
  background: rgba(13, 99, 27, 0.12);
  color: var(--uf-primary);
  font-weight: 700;
  font-size: 0.78rem;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  cursor: pointer;
  font-family: var(--uf-font);
}
.item-block {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.55rem 0;
  border-bottom: 1px solid rgba(191, 202, 186, 0.35);
}
.item-row {
  display: grid;
  grid-template-columns: 1fr 1fr 7rem 1fr auto;
  gap: 0.35rem;
  align-items: center;
}
.item-row--head {
  grid-template-columns: 1fr 7rem 1fr auto;
}
.item-steps {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding-left: 0.15rem;
}
.item-steps__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.mlbl--sm {
  font-size: 0.68rem;
}
.btn-add--sm {
  font-size: 0.72rem;
  padding: 0.25rem 0.5rem;
}
.item-step-row {
  display: grid;
  grid-template-columns: 1.5rem 1fr auto;
  gap: 0.35rem;
  align-items: center;
}
.item-step-row__n {
  font-weight: 700;
  font-size: 0.82rem;
  color: var(--uf-on-surface-variant);
}
.btn-rm--sm {
  width: 1.75rem;
  height: 1.75rem;
}
.report-steps {
  margin: 0.25rem 0 0;
  padding-left: 1.15rem;
}
@media (max-width: 720px) {
  .item-row,
  .item-row--head {
    grid-template-columns: 1fr;
  }
}
.btn-rm {
  border: none;
  background: rgba(179, 38, 30, 0.1);
  color: #b3261e;
  width: 2rem;
  height: 2rem;
  border-radius: 0.35rem;
  cursor: pointer;
}
.hint {
  margin: 0;
  font-size: 0.8rem;
}
.mactions {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  margin-top: 0.75rem;
}
.mbtn {
  border: none;
  border-radius: 999px;
  padding: 0.55rem 1.1rem;
  font-family: var(--uf-font);
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}
.mbtn--ghost {
  background: transparent;
  border: 1px solid rgba(191, 202, 186, 0.45);
  color: var(--uf-on-surface-variant);
}
.mbtn--pri {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: linear-gradient(90deg, var(--uf-primary), var(--uf-primary-container));
  color: #fff;
}
.mbtn--danger {
  background: #b3261e;
  color: #fff;
}
</style>

<style>
/* Impressão: só o documento da prescrição (modal aberto). */
@media print {
  body * {
    visibility: hidden !important;
  }
  .print-root,
  .print-root * {
    visibility: visible !important;
  }
  .print-root .no-print {
    display: none !important;
    visibility: hidden !important;
  }
  .print-root {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    max-width: none !important;
    box-shadow: none !important;
    background: #fff !important;
    padding: 0.6cm !important;
  }
}
</style>
