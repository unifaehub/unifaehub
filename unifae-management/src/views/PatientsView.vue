<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import axios from 'axios'
import client from '@/api/client'
import MaterialIcon from '@/components/shell/MaterialIcon.vue'
import RiskBadge from '@/components/patients/RiskBadge.vue'
import TriageForm from '@/components/patients/TriageForm.vue'
import UiAsyncPanel from '@/components/ui/UiAsyncPanel.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import UiSearchSelect, { type SearchSelectOption } from '@/components/ui/UiSearchSelect.vue'
import { matchesSearchText } from '@/utils/searchText'
import UiPager from '@/components/ui/UiPager.vue'
import { useApiRequest } from '@/composables/useApiRequest'
import { useAuthStore } from '@/stores/auth'
import { useConfirmStore } from '@/stores/confirm'
import { useToastStore } from '@/stores/toast'
import type { CourseNavigationItem } from '@/config/courseNavigation'
import type { Paged } from '@/types/pagination'

type AppRow = { id: number; name: string; active: boolean }
type CourseRow = {
  id: number
  name: string
  app: { id: number; name: string } | null
  appId?: number | null
}

type PatientRow = {
  id: number
  userId: number
  name: string
  email: string
  active: boolean
  studentId: number
  studentName: string
  professorId: number | null
  professorName: string | null
  courseId: number
  appId: number
  latestRiskLevel: 'RED' | 'YELLOW' | 'GREEN' | 'PENDING'
  createdAt: string
}

type CareEpisodeRow = {
  id: number
  patientId: number
  title: string
  description: string | null
  clinicalCaseId: number | null
  clinicalCaseName: string | null
  status: 'ACTIVE' | 'RESOLVED' | 'ARCHIVED'
  startedAt: string
  endedAt: string | null
  prescriptionCount: number
}

type PatientDetail = PatientRow & { careEpisodes: CareEpisodeRow[] }

type UserPick = { id: number; name: string; email: string }

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
const patientsPage = ref(1)
const patientsLimit = ref(20)
const patientsTotal = ref(0)
const debouncedPatientSearch = ref('')
let patientSearchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, (v) => {
  if (patientSearchTimer) clearTimeout(patientSearchTimer)
  patientSearchTimer = setTimeout(() => {
    debouncedPatientSearch.value = v.trim()
  }, 400)
})
watch(debouncedPatientSearch, () => {
  patientsPage.value = 1
})

const listLoading = ref(false)
const listFailed = ref(false)
const patientsList = ref<PatientRow[]>([])

const studentsList = ref<UserPick[]>([])
const professorsList = ref<UserPick[]>([])
const picksLoading = ref(false)
const studentSearchQuery = ref('')
const professorSearchQuery = ref('')

const studentSelectOptions = computed((): SearchSelectOption[] =>
  studentsList.value
    .filter((u) => matchesSearchText(`${u.name} ${u.email}`, studentSearchQuery.value))
    .map((u) => ({ id: u.id, label: u.name, hint: u.email })),
)

const professorSelectOptions = computed((): SearchSelectOption[] => [
  { id: '', label: 'Nenhum' },
  ...professorsList.value
    .filter((u) => matchesSearchText(`${u.name} ${u.email}`, professorSearchQuery.value))
    .map((u) => ({ id: u.id, label: u.name, hint: u.email })),
])

const showModal = ref(false)
const showTriageModal = ref(false)
const triageTarget = ref<{ id: number; name: string } | null>(null)
const editingId = ref<number | null>(null)
const saving = ref(false)

const form = ref({
  name: '',
  email: '',
  password: '',
  studentId: '' as number | '',
  professorId: '' as number | '' | null,
  active: true,
})

const patientDetailLoading = ref(false)
const careEpisodes = ref<CareEpisodeRow[]>([])
const clinicalCasesOptions = ref<{ id: number; name: string }[]>([])
const episodeSaving = ref(false)
const newEpisode = ref({
  title: '',
  description: '',
  status: 'ACTIVE' as 'ACTIVE' | 'RESOLVED' | 'ARCHIVED',
  startedAt: '',
  clinicalCaseId: '' as number | '',
})

const isStudentActor = computed(() => auth.user?.role === 'STUDENT')

/** Nó de menu «História do paciente» no curso (para link sem sair do hub do curso). */
const patientHistoryMenuNodeId = ref<number | null>(null)

async function loadPatientHistoryMenuNode() {
  patientHistoryMenuNodeId.value = null
  if (!props.embeddedInCourse || !Number.isFinite(toFiniteId(props.courseScopeId))) return
  const cid = toFiniteId(props.courseScopeId)
  try {
    const { data } = await client.get<CourseNavigationItem[]>(`/courses/${cid}/navigation`)
    const hit = data.find((i) => i.key === 'patient-history' && i.menuNodeId > 0)
    patientHistoryMenuNodeId.value = hit?.menuNodeId ?? null
  } catch {
    patientHistoryMenuNodeId.value = null
  }
}

watch(
  () => [props.embeddedInCourse, props.courseScopeId] as const,
  () => {
    void loadPatientHistoryMenuNode()
  },
  { immediate: true },
)

const canDelete = computed(() => {
  const r = auth.user?.role
  return r === 'ADMIN' || r === 'COORDINATOR' || r === 'PROFESSOR'
})
const canPickStudentProfessor = computed(() => !isStudentActor.value)

async function loadPatients() {
  const aid = activeAppId.value
  const cid = activeCourseId.value
  if (!Number.isFinite(aid) || !Number.isFinite(cid)) {
    patientsList.value = []
    patientsTotal.value = 0
    return
  }
  listLoading.value = true
  listFailed.value = false
  try {
    const params: Record<string, string | number> = {
      courseId: cid,
      appId: aid,
      page: patientsPage.value,
      limit: patientsLimit.value,
    }
    const q = debouncedPatientSearch.value.trim()
    if (q) params.q = q
    const { data } = await client.get<Paged<PatientRow>>('/patients', { params })
    patientsList.value = data.data
    patientsTotal.value = data.total
  } catch (e) {
    listFailed.value = true
    patientsList.value = []
    patientsTotal.value = 0
    if (axios.isAxiosError(e) && e.response?.status === 401) handleUnauthorized()
  } finally {
    listLoading.value = false
  }
}

async function loadPicks() {
  const aid = activeAppId.value
  const cid = activeCourseId.value
  if (!Number.isFinite(aid) || !Number.isFinite(cid)) {
    studentsList.value = []
    professorsList.value = []
    return
  }
  picksLoading.value = true
  try {
    const [st, pr] = await Promise.all([
      client.get<Paged<UserPick & { email: string }>>('/users', {
        params: { role: 'STUDENT', courseId: cid, appId: aid, page: 1, limit: 100 },
      }),
      client.get<Paged<UserPick & { email: string }>>('/users', {
        params: { role: 'PROFESSOR', courseId: cid, appId: aid, page: 1, limit: 100 },
      }),
    ])
    studentsList.value = st.data.data.map((u) => ({ id: u.id, name: u.name, email: u.email }))
    professorsList.value = pr.data.data.map((u) => ({ id: u.id, name: u.name, email: u.email }))
  } catch {
    studentsList.value = []
    professorsList.value = []
  } finally {
    picksLoading.value = false
  }
}

watch(
  () => [activeAppId.value, activeCourseId.value] as const,
  () => {
    patientsPage.value = 1
    if (canPickStudentProfessor.value) void loadPicks()
  },
)

watch(
  [patientsPage, patientsLimit, debouncedPatientSearch, activeAppId, activeCourseId],
  () => {
    void loadPatients()
  },
  { immediate: true },
)

function applyStudentScopeFromAuth() {
  if (props.embeddedInCourse) return
  const u = auth.user
  if (!u || u.role !== 'STUDENT') return
  if (u.appId != null) filterAppId.value = u.appId
  if (u.courseId != null) manualCourseId.value = u.courseId
}

function openNew() {
  editingId.value = null
  careEpisodes.value = []
  clinicalCasesOptions.value = []
  newEpisode.value = {
    title: '',
    description: '',
    status: 'ACTIVE',
    startedAt: '',
    clinicalCaseId: '',
  }
  form.value = {
    name: '',
    email: '',
    password: '',
    studentId: isStudentActor.value ? (auth.user?.id ?? '') : '',
    professorId: '',
    active: true,
  }
  if (canPickStudentProfessor.value) void loadPicks()
  showModal.value = true
}

async function loadClinicalCasesForScope() {
  const aid = activeAppId.value
  const cid = activeCourseId.value
  if (!Number.isFinite(aid) || !Number.isFinite(cid)) {
    clinicalCasesOptions.value = []
    return
  }
  try {
    const { data } = await client.get<Paged<{ id: number; name: string }>>('/clinical-cases', {
      params: { courseId: cid, appId: aid, page: 1, limit: 100 },
    })
    clinicalCasesOptions.value = data.data
  } catch {
    clinicalCasesOptions.value = []
  }
}

async function openEdit(p: PatientRow) {
  editingId.value = p.id
  form.value = {
    name: p.name,
    email: p.email,
    password: '',
    studentId: p.studentId,
    professorId: p.professorId ?? '',
    active: p.active,
  }
  if (canPickStudentProfessor.value) void loadPicks()
  careEpisodes.value = []
  showModal.value = true
  patientDetailLoading.value = true
  try {
    const { data } = await client.get<PatientDetail>(`/patients/${p.id}`)
    careEpisodes.value = data.careEpisodes ?? []
    await loadClinicalCasesForScope()
  } catch {
    careEpisodes.value = []
  } finally {
    patientDetailLoading.value = false
  }
}
function closeModal() {
  showModal.value = false
  editingId.value = null
  careEpisodes.value = []
  clinicalCasesOptions.value = []
}

function openTriage(p: PatientRow | { id: number; name: string }) {
  triageTarget.value = { id: p.id, name: p.name }
  showTriageModal.value = true
}

function onTriageSaved() {
  showTriageModal.value = false
  triageTarget.value = null
  void loadPatients()
}

async function refreshPatientEpisodes() {
  const id = editingId.value
  if (id == null) return
  try {
    const { data } = await client.get<PatientDetail>(`/patients/${id}`)
    careEpisodes.value = data.careEpisodes ?? []
  } catch {
    /* keep list */
  }
}

async function addCareEpisode() {
  const id = editingId.value
  if (id == null || !newEpisode.value.title.trim()) {
    toast.error('Informe o título do episódio.')
    return
  }
  episodeSaving.value = true
  try {
    const body: Record<string, unknown> = {
      title: newEpisode.value.title.trim(),
      status: newEpisode.value.status,
    }
    const d = newEpisode.value.description.trim()
    if (d) body.description = d
    if (newEpisode.value.startedAt.trim()) body.startedAt = newEpisode.value.startedAt.trim()
    if (newEpisode.value.clinicalCaseId !== '') {
      body.clinicalCaseId = Number(newEpisode.value.clinicalCaseId)
    }
    await client.post(`/patients/${id}/care-episodes`, body)
    newEpisode.value = {
      title: '',
      description: '',
      status: 'ACTIVE',
      startedAt: '',
      clinicalCaseId: '',
    }
    await refreshPatientEpisodes()
    toast.success('Episódio cadastrado.')
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Não foi possível criar o episódio.'))
  } finally {
    episodeSaving.value = false
  }
}

async function patchCareEpisode(epId: number, patch: Record<string, unknown>) {
  const pid = editingId.value
  if (pid == null) return
  episodeSaving.value = true
  try {
    await client.patch(`/patients/${pid}/care-episodes/${epId}`, patch)
    await refreshPatientEpisodes()
    toast.success('Episódio atualizado.')
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Não foi possível atualizar o episódio.'))
  } finally {
    episodeSaving.value = false
  }
}

function onEpisodeStatusChange(ep: CareEpisodeRow, ev: Event) {
  const el = ev.target as HTMLSelectElement
  const status = el.value as CareEpisodeRow['status']
  if (status === ep.status) return
  void patchCareEpisode(ep.id, { status })
}

async function submit() {
  if (!form.value.name.trim() || !form.value.email.trim()) return
  const aid = activeAppId.value
  const cid = activeCourseId.value
  if (!Number.isFinite(aid) || !Number.isFinite(cid)) return

  if (editingId.value == null) {
    if (!form.value.password || form.value.password.length < 6) {
      toast.error('Defina uma senha com ao menos 6 caracteres para o acesso ao app.')
      return
    }
    if (!isStudentActor.value) {
      const sid = form.value.studentId === '' ? NaN : Number(form.value.studentId)
      if (!Number.isFinite(sid)) {
        toast.error('Selecione o estagiário responsável.')
        return
      }
    }
  } else if (canPickStudentProfessor.value) {
    const sid = form.value.studentId === '' ? NaN : Number(form.value.studentId)
    if (!Number.isFinite(sid)) {
      toast.error('Selecione o estagiário responsável.')
      return
    }
  }

  saving.value = true
  try {
    if (editingId.value == null) {
      const body: Record<string, unknown> = {
        name: form.value.name.trim(),
        email: form.value.email.trim(),
        password: form.value.password,
        courseId: cid,
        appId: aid,
        active: form.value.active,
      }
      if (!isStudentActor.value) {
        body.studentId = Number(form.value.studentId)
        if (form.value.professorId !== '' && form.value.professorId != null) {
          body.professorId = Number(form.value.professorId)
        }
      }
      const { data: newPatient } = await client.post<PatientRow>('/patients', body)
      toast.success('Paciente cadastrado. Recomenda-se realizar a triagem inicial.')
      
      // Abre a triagem automaticamente após criar
      setTimeout(() => {
        openTriage({ id: newPatient.id, name: newPatient.name })
      }, 500)
    } else {
      const body: Record<string, unknown> = {
        name: form.value.name.trim(),
        email: form.value.email.trim(),
        active: form.value.active,
      }
      if (form.value.password.length >= 6) {
        body.password = form.value.password
      }
      if (canPickStudentProfessor.value) {
        body.studentId = Number(form.value.studentId)
        body.professorId =
          form.value.professorId === '' || form.value.professorId == null
            ? null
            : Number(form.value.professorId)
      }
      await client.patch(`/patients/${editingId.value}`, body)
      toast.success('Paciente atualizado.')
    }
    closeModal()
    await loadPatients()
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Não foi possível salvar.'))
  } finally {
    saving.value = false
  }
}

async function removePatient(p: PatientRow) {
  const ok = await confirm.confirm({
    title: 'Excluir paciente',
    message: `Excluir "${p.name}"? Só é permitido se não houver prescrições. O acesso ao app será revogado.`,
    confirmText: 'Excluir',
    cancelText: 'Cancelar',
    tone: 'danger',
  })
  if (!ok) return
  try {
    await client.delete(`/patients/${p.id}`)
    toast.success('Paciente removido.')
    await loadPatients()
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Não foi possível excluir.'))
  }
}

onMounted(() => {
  applyStudentScopeFromAuth()
  void loadApps()
  if (!props.embeddedInCourse) void loadCourses()
  if (canPickStudentProfessor.value) void loadPicks()
})

watch(
  () => auth.user,
  () => {
    applyStudentScopeFromAuth()
  },
)
</script>

<template>
  <div class="page">
    <header class="head" :class="{ 'head--embedded': embeddedInCourse }">
      <div>
        <h1 class="title">Pacientes</h1>
        <p v-if="!embeddedInCourse" class="sub">
          Cadastro de <strong>pacientes</strong> por app e curso. Cada paciente recebe
          <strong>usuário e senha</strong> para acessar o aplicativo (papel Paciente), vinculado a um
          <strong>estagiário</strong> e, opcionalmente, a um <strong>professor</strong>.
        </p>
        <p v-else class="sub sub--compact">
          Pacientes deste curso: credenciais para o app e vínculo com estagiário / professor.
        </p>
      </div>
      <button type="button" class="btn btn--pri" @click="openNew">
        <MaterialIcon name="person_add" size="1rem" />
        Novo paciente
      </button>
    </header>

    <div v-if="!embeddedInCourse" class="filters-bar panel tonal">
      <div class="field">
        <label class="lbl">App / curso</label>
        <select
          v-model="filterAppId"
          class="in in--sm"
          :disabled="isStudentActor"
        >
          <option value="">Selecione o app…</option>
          <option v-for="a in appsData ?? []" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
      </div>
      <div v-if="courseAutoLine?.kind === 'one'" class="course-line">
        <span class="lbl">Curso (automático)</span>
        <p class="course-auto">{{ courseAutoLine.name }}</p>
      </div>
      <div v-else-if="courseAutoLine?.kind === 'multi'" class="field">
        <label class="lbl">Curso ({{ courseAutoLine.n }} cursos neste app)</label>
        <select v-model="manualCourseId" class="in in--sm" :disabled="isStudentActor">
          <option v-for="c in coursesForApp" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <p v-else-if="filterAppId !== '' && courseAutoLine?.kind === 'none'" class="warn">
        Nenhum curso vinculado a este app.
      </p>
      <div v-if="filterAppId !== '' && effectiveCourseId !== ''" class="field field--grow">
        <label class="lbl">Buscar</label>
        <input
          v-model="search"
          class="in in--filter"
          type="search"
          placeholder="Nome, e-mail ou estagiário…"
          autocomplete="off"
        />
      </div>
    </div>

    <div
      v-else-if="embeddedInCourse && Number.isFinite(activeAppId) && Number.isFinite(activeCourseId)"
      class="filters-bar panel tonal filters-bar--embedded"
    >
      <div class="field field--grow">
        <label class="lbl">Buscar</label>
        <input
          v-model="search"
          class="in in--filter"
          type="search"
          placeholder="Nome, e-mail ou estagiário…"
          autocomplete="off"
        />
      </div>
    </div>

    <section class="panel tonal list-panel">
      <UiConnectionRetry v-if="listFailed" @retry="loadPatients" />
      <UiAsyncPanel v-else :loading="listLoading" label="Carregando pacientes…">
        <p
          v-if="!Number.isFinite(activeAppId) || !Number.isFinite(activeCourseId)"
          class="muted"
        >
          {{
            embeddedInCourse
              ? 'Não foi possível carregar o escopo do curso.'
              : 'Selecione um app com curso.'
          }}
        </p>
        <div v-else-if="!patientsList.length" class="muted">Nenhum paciente encontrado.</div>
        <div v-else class="table-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Classificação</th>
                <th>Acesso app</th>
                <th>Estagiário</th>
                <th>Professor</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in patientsList" :key="p.id">
                <td>
                  <span class="p-name">{{ p.name }}</span>
                  <span class="p-email">{{ p.email }}</span>
                </td>
                <td>
                  <RiskBadge :level="p.latestRiskLevel" label />
                </td>
                <td>
                  <span v-if="p.active" class="pill pill--on">Ativo</span>
                  <span v-else class="pill pill--off">Inativo</span>
                </td>
                <td>{{ p.studentName }}</td>
                <td>{{ p.professorName ?? '—' }}</td>
                <td class="td-actions">
                  <div class="ui-act-row">
                    <UiIconButton icon="assignment" label="Triagem" @click="openTriage(p)" />
                    <UiIconButton icon="edit" label="Editar" @click="openEdit(p)" />
                    <UiIconButton
                      v-if="
                        embeddedInCourse &&
                        patientHistoryMenuNodeId != null &&
                        Number.isFinite(activeAppId) &&
                        Number.isFinite(activeCourseId)
                      "
                      icon="history"
                      label="História clínica"
                      variant="doc"
                      :to="{
                        name: 'course-menu-dynamic',
                        params: {
                          courseId: String(activeCourseId),
                          menuNodeId: String(patientHistoryMenuNodeId),
                        },
                        query: {
                          patientId: String(p.id),
                          appId: String(activeAppId),
                          courseId: String(activeCourseId),
                        },
                      }"
                    />
                    <UiIconButton
                      v-else-if="!embeddedInCourse && Number.isFinite(activeAppId) && Number.isFinite(activeCourseId)"
                      icon="history"
                      label="História clínica"
                      variant="doc"
                      :to="{
                        name: 'patient-history',
                        query: {
                          patientId: String(p.id),
                          appId: String(activeAppId),
                          courseId: String(activeCourseId),
                        },
                      }"
                    />
                    <UiIconButton
                      v-if="canDelete"
                      icon="delete"
                      label="Excluir"
                      variant="danger"
                      @click="removePatient(p)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <UiPager
            v-if="patientsTotal > 0"
            v-model:page="patientsPage"
            :limit="patientsLimit"
            :total="patientsTotal"
            :loading="listLoading"
          />
        </div>
      </UiAsyncPanel>
    </section>

    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal modal--wide">
        <h3 class="h3">{{ editingId == null ? 'Novo paciente' : 'Editar paciente' }}</h3>
        <form class="form" @submit.prevent="submit">
          <div class="field">
            <label class="lbl">Nome completo</label>
            <input v-model="form.name" class="in in--full" required autocomplete="name" />
          </div>
          <div class="field">
            <label class="lbl">E-mail (login no app)</label>
            <input
              v-model="form.email"
              class="in in--full"
              type="email"
              required
              autocomplete="email"
            />
          </div>
          <div class="field">
            <label class="lbl">{{
              editingId == null ? 'Senha inicial' : 'Nova senha (opcional)'
            }}</label>
            <input
              v-model="form.password"
              class="in in--full"
              type="password"
              :required="editingId == null"
              :minlength="editingId == null ? 6 : undefined"
              autocomplete="new-password"
              :placeholder="editingId == null ? 'Mínimo 6 caracteres' : 'Deixe em branco para manter'"
            />
          </div>

          <template v-if="canPickStudentProfessor">
            <div class="field">
              <UiSearchSelect
                v-model="form.studentId"
                :options="studentSelectOptions"
                :loading="picksLoading"
                :disabled="picksLoading"
                label="Estagiário responsável"
                placeholder="Digite nome ou e-mail…"
                empty-text="Nenhum estagiário encontrado."
                @search="studentSearchQuery = $event"
              />
            </div>
            <div class="field">
              <UiSearchSelect
                v-model="form.professorId"
                :options="professorSelectOptions"
                :loading="picksLoading"
                :disabled="picksLoading"
                label="Professor orientador (opcional)"
                placeholder="Digite nome ou e-mail…"
                empty-text="Nenhum professor encontrado."
                @search="professorSearchQuery = $event"
              />
            </div>
          </template>
          <p v-else class="field-hint">
            O estagiário responsável será você mesmo.
          </p>

          <label class="chk-row">
            <input v-model="form.active" type="checkbox" />
            <span><strong>Acesso ativo</strong> ao aplicativo (login permitido)</span>
          </label>

          <section v-if="editingId != null" class="episodes-block">
            <h4 class="episodes-h">Episódios de cuidado</h4>
            <p class="episodes-hint">
              Linha do tempo de problemas ou fases (ex.: lombalgia, pós-operatório). As prescrições
              ficam vinculadas a um episódio.
            </p>
            <p v-if="patientDetailLoading" class="muted">Carregando episódios…</p>
            <div v-else-if="!careEpisodes.length" class="muted">Nenhum episódio além do padrão.</div>
            <div v-else class="episodes-table-wrap">
              <table class="episodes-tbl">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Status</th>
                    <th>Início</th>
                    <th>Término</th>
                    <th>Prescr.</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="ep in careEpisodes" :key="ep.id">
                    <td>
                      <span class="ep-title">{{ ep.title }}</span>
                      <span v-if="ep.clinicalCaseName" class="ep-cc muted-sm">{{
                        ep.clinicalCaseName
                      }}</span>
                    </td>
                    <td>
                      <select
                        class="in in--sm ep-select"
                        :value="ep.status"
                        :disabled="episodeSaving"
                        @change="onEpisodeStatusChange(ep, $event)"
                      >
                        <option value="ACTIVE">Ativo</option>
                        <option value="RESOLVED">Resolvido</option>
                        <option value="ARCHIVED">Arquivado</option>
                      </select>
                    </td>
                    <td class="muted-sm">{{ ep.startedAt }}</td>
                    <td class="muted-sm">{{ ep.endedAt ?? '—' }}</td>
                    <td class="muted-sm">{{ ep.prescriptionCount }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="new-episode">
              <p class="new-ep-lbl">Novo episódio</p>
              <input
                v-model="newEpisode.title"
                class="in in--full"
                placeholder="Título (ex.: Dor lombar aguda)"
                maxlength="200"
              />
              <textarea
                v-model="newEpisode.description"
                class="in in--full in--area"
                rows="2"
                placeholder="Descrição opcional"
              />
              <div class="new-ep-row">
                <div class="field">
                  <label class="lbl">Status</label>
                  <select v-model="newEpisode.status" class="in in--full">
                    <option value="ACTIVE">Ativo</option>
                    <option value="RESOLVED">Resolvido</option>
                    <option value="ARCHIVED">Arquivado</option>
                  </select>
                </div>
                <div class="field">
                  <label class="lbl">Início (AAAA-MM-DD)</label>
                  <input v-model="newEpisode.startedAt" class="in in--full" type="date" />
                </div>
                <div v-if="clinicalCasesOptions.length" class="field field--grow">
                  <label class="lbl">Caso clínico (opcional)</label>
                  <select v-model="newEpisode.clinicalCaseId" class="in in--full">
                    <option value="">Nenhum</option>
                    <option v-for="c in clinicalCasesOptions" :key="c.id" :value="c.id">
                      {{ c.name }}
                    </option>
                  </select>
                </div>
              </div>
              <button
                type="button"
                class="btn btn--ghost btn--sm"
                :disabled="episodeSaving"
                @click="addCareEpisode"
              >
                + Adicionar episódio
              </button>
            </div>
          </section>

          <div class="form-actions">
            <button type="button" class="btn btn--flat" @click="closeModal" :disabled="saving">
              Cancelar
            </button>
            <button type="submit" class="btn btn--pri" :disabled="saving">
              {{ saving ? 'Salvando...' : editingId == null ? 'Cadastrar Paciente' : 'Salvar Alterações' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showTriageModal && triageTarget" class="modal-backdrop" @click.self="showTriageModal = false">
      <div class="modal modal--wide">
        <TriageForm 
          :patient-id="triageTarget.id" 
          :patient-name="triageTarget.name" 
          @close="showTriageModal = false"
          @saved="onTriageSaved"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  font-family: var(--uf-font);
  color: var(--uf-on-surface);
}
.head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.25rem;
}
.head--embedded {
  margin-bottom: 0.85rem;
}
.title {
  margin: 0;
  font-size: 1.65rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.sub {
  margin: 0.35rem 0 0;
  max-width: 42rem;
  font-size: 0.88rem;
  line-height: 1.5;
  color: var(--uf-on-surface-variant);
}
.sub--compact {
  max-width: 36rem;
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.55rem 1.1rem;
  border-radius: 999px;
  border: none;
  font-family: var(--uf-font);
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}
.btn--pri {
  background: linear-gradient(90deg, var(--uf-primary), var(--uf-primary-container));
  color: #fff;
}
.btn--ghost {
  background: transparent;
  border: 1px solid rgba(191, 202, 186, 0.45);
  color: var(--uf-on-surface-variant);
}
.btn--sm {
  padding: 0.4rem 0.85rem;
  font-size: 0.78rem;
  margin-top: 0.5rem;
}
.episodes-block {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(191, 202, 186, 0.35);
}
.episodes-h {
  margin: 0 0 0.35rem;
  font-size: 0.95rem;
  font-weight: 800;
}
.episodes-hint {
  margin: 0 0 0.75rem;
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--uf-on-surface-variant);
}
.episodes-table-wrap {
  overflow-x: auto;
  margin-bottom: 1rem;
}
.episodes-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}
.episodes-tbl th,
.episodes-tbl td {
  text-align: left;
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid rgba(191, 202, 186, 0.35);
  vertical-align: middle;
}
.episodes-tbl th {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--uf-on-surface-variant);
}
.ep-title {
  display: block;
  font-weight: 600;
}
.ep-cc {
  display: block;
  font-size: 0.72rem;
  margin-top: 0.15rem;
}
.ep-select {
  min-width: 7.5rem;
  font-size: 0.78rem;
}
.muted-sm {
  font-size: 0.78rem;
  color: var(--uf-on-surface-variant);
}
.new-episode {
  padding: 0.85rem;
  border-radius: var(--uf-radius-md);
  background: rgba(191, 202, 186, 0.12);
}
.new-ep-lbl {
  margin: 0 0 0.5rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--uf-on-surface-variant);
}
.new-ep-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 0.5rem 0;
  align-items: flex-end;
}
.new-ep-row .field {
  min-width: 8rem;
}
.in--area {
  margin-top: 0.35rem;
  resize: vertical;
  min-height: 2.5rem;
}
.filters-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
  margin-bottom: 1rem;
  padding: 1rem 1.25rem;
}
.filters-bar--embedded {
  padding: 0.75rem 1rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 10rem;
}
.field--grow {
  flex: 1;
  min-width: 12rem;
}
.lbl {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--uf-on-surface-variant);
}
.in {
  border-radius: var(--uf-radius-md);
  border: 1px solid rgba(191, 202, 186, 0.55);
  padding: 0.45rem 0.65rem;
  font-family: var(--uf-font);
  font-size: 0.88rem;
  background: var(--uf-surface-container-lowest);
  color: var(--uf-on-surface);
}
.in--sm {
  min-width: 11rem;
}
.in--full {
  width: 100%;
  box-sizing: border-box;
}
.in--filter {
  width: 100%;
  box-sizing: border-box;
}
.course-line {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.course-auto {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 600;
}
.warn {
  margin: 0;
  font-size: 0.85rem;
  color: #b3261e;
}
.list-panel {
  padding: 1.25rem;
}
.muted {
  color: var(--uf-on-surface-variant);
  font-size: 0.88rem;
}
.table-wrap {
  overflow: auto;
}
.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}
.tbl th {
  text-align: left;
  padding: 0.5rem 0.65rem 0.5rem 0;
  border-bottom: 1px solid rgba(191, 202, 186, 0.35);
  color: var(--uf-on-surface-variant);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.tbl td {
  padding: 0.55rem 0.65rem 0.55rem 0;
  border-bottom: 1px solid rgba(191, 202, 186, 0.2);
  vertical-align: top;
}
.p-name {
  display: block;
  font-weight: 700;
}
.p-email {
  display: block;
  font-size: 0.78rem;
  color: var(--uf-on-surface-variant);
}
.pill {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
}
.pill--on {
  background: rgba(13, 99, 27, 0.12);
  color: var(--uf-primary);
}
.pill--off {
  background: rgba(0, 0, 0, 0.06);
  color: var(--uf-on-surface-variant);
}
.td-actions {
  white-space: nowrap;
  text-align: right;
}
.btn-mini {
  border: none;
  border-radius: 999px;
  padding: 0.3rem 0.55rem;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  background: rgba(13, 99, 27, 0.1);
  color: var(--uf-primary);
  font-family: var(--uf-font);
}
a.btn-mini--link {
  display: inline-block;
  text-decoration: none;
  margin-left: 0.25rem;
  vertical-align: middle;
}
.btn-mini--danger {
  color: #b3261e;
  background: rgba(179, 38, 30, 0.08);
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
  max-width: 28rem;
  max-height: 90vh;
  overflow: auto;
  background: var(--uf-surface-container-lowest);
  border-radius: var(--uf-radius-xl);
  padding: 1.5rem;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
}
.modal--wide {
  max-width: 36rem;
}
.h3 {
  margin: 0 0 1rem;
  font-size: 1.15rem;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.field-hint {
  margin: 0.15rem 0 0;
  font-size: 0.78rem;
  color: var(--uf-on-surface-variant);
  line-height: 1.4;
}
.chk-row {
  display: flex;
  gap: 0.65rem;
  align-items: flex-start;
  font-size: 0.88rem;
  cursor: pointer;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
</style>
