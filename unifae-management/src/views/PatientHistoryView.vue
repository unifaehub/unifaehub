<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import client from '@/api/client'
import MaterialIcon from '@/components/shell/MaterialIcon.vue'
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import { useApiRequest } from '@/composables/useApiRequest'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import type { Paged } from '@/types/pagination'

const props = withDefaults(
  defineProps<{
    embeddedInCourse?: boolean
    courseAppId?: number
    courseScopeId?: number
  }>(),
  { embeddedInCourse: false },
)

type AppRow = { id: number; name: string; active: boolean }
type CourseRow = {
  id: number
  name: string
  app: { id: number; name: string } | null
}

type PatientOpt = { id: number; name: string; email: string }

type TimelineEvent = {
  kind: string
  at: string
  title: string
  narrative: string
  detail: Record<string, unknown>
}

type TimelineResponse = {
  patient: {
    id: number
    name: string
    email: string
    courseName: string | null
    appName: string | null
    currentStudent: { id: number; name: string; email: string } | null
    currentProfessor: { id: number; name: string; email: string } | null
  }
  courseCoordinators: { id: number; name: string; email: string }[]
  range: { from: string | null; to: string | null }
  events: TimelineEvent[]
}

const auth = useAuthStore()
const toast = useToastStore()
const route = useRoute()

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
const patientId = ref<number | ''>('')
const dateFrom = ref('')
const dateTo = ref('')

const timeline = ref<TimelineResponse | null>(null)
const loading = ref(false)
const failed = ref(false)

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

function toFiniteId(v: unknown): number {
  if (v == null || v === '') return NaN
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : NaN
}

const routeCourseId = computed(() => toFiniteId(route.params.courseId))

const activeAppId = computed((): number => {
  if (props.embeddedInCourse) return toFiniteId(props.courseAppId)
  const v = filterAppId.value
  return v === '' ? NaN : v
})

const activeCourseId = computed((): number => {
  if (props.embeddedInCourse) {
    const fromProp = toFiniteId(props.courseScopeId)
    if (Number.isFinite(fromProp)) return fromProp
    return routeCourseId.value
  }
  const v = effectiveCourseId.value
  return v === '' ? NaN : v
})

const patientQuery = ref('')
const patientResults = ref<PatientOpt[]>([])
const selectedPatient = ref<PatientOpt | null>(null)
const patientPickerOpen = ref(false)
const patientSearchLoading = ref(false)
let patientSearchDebounce: ReturnType<typeof setTimeout> | null = null
let patientBlurTimer: ReturnType<typeof setTimeout> | null = null

function cancelPatientBlurTimer() {
  if (patientBlurTimer != null) {
    clearTimeout(patientBlurTimer)
    patientBlurTimer = null
  }
}

function formatPatientLabel(p: PatientOpt) {
  return `${p.name} — ${p.email}`
}

const isStudentActor = computed(() => auth.user?.role === 'STUDENT')

watch(coursesForApp, (list) => {
  if (props.embeddedInCourse) return
  if (list.length > 1 && manualCourseId.value === '') {
    const first = list[0]
    if (first) manualCourseId.value = first.id
  }
})

function clearPatientPicker() {
  cancelPatientBlurTimer()
  patientPickerOpen.value = false
  patientId.value = ''
  selectedPatient.value = null
  patientQuery.value = ''
  patientResults.value = []
}

async function fetchPatientSummary(id: number) {
  try {
    const { data } = await client.get<{ id: number; name: string; email: string }>(`/patients/${id}`)
    const row: PatientOpt = { id: data.id, name: data.name, email: data.email }
    selectedPatient.value = row
    patientQuery.value = formatPatientLabel(row)
  } catch {
    selectedPatient.value = null
    patientQuery.value = ''
  }
}

function schedulePatientSearch() {
  if (patientSearchDebounce) clearTimeout(patientSearchDebounce)
  patientSearchDebounce = setTimeout(() => {
    patientSearchDebounce = null
    void runPatientSearch()
  }, 280)
}

async function runPatientSearch() {
  // Não exige patientPickerOpen: o blur (ex.: ao clicar nas datas) fecha o dropdown antes
  // do debounce terminar e a busca nunca rodava — resultados ficavam sempre vazios.
  const aid = activeAppId.value
  const cid = activeCourseId.value
  if (!Number.isFinite(aid) || !Number.isFinite(cid)) {
    patientResults.value = []
    return
  }
  const q = patientQuery.value.trim()
  if (q.length < 1) {
    patientResults.value = []
    return
  }
  patientSearchLoading.value = true
  try {
    const { data } = await client.get<Paged<PatientOpt>>('/patients', {
      params: { courseId: cid, appId: aid, page: 1, limit: 80, q },
    })
    const rows = Array.isArray(data?.data) ? data.data : []
    patientResults.value = rows.map((p) => ({ id: p.id, name: p.name, email: p.email }))
  } catch {
    patientResults.value = []
  } finally {
    patientSearchLoading.value = false
  }
}

function onPatientInput(e: Event) {
  cancelPatientBlurTimer()
  const v = (e.target as HTMLInputElement).value
  // Após escolher um paciente o dropdown fecha, mas o foco costuma ficar no input.
  // Sem novo `focus`, patientPickerOpen permanecia false e a lista sumia mesmo com busca OK.
  patientPickerOpen.value = true
  patientQuery.value = v
  if (selectedPatient.value && v.trim() !== formatPatientLabel(selectedPatient.value)) {
    selectedPatient.value = null
    patientId.value = ''
  }
  schedulePatientSearch()
}

function onPatientFocus(e: FocusEvent) {
  cancelPatientBlurTimer()
  patientPickerOpen.value = true
  const el = e.target as HTMLInputElement
  void nextTick(() => {
    try {
      el.select()
    } catch {
      /* ignore */
    }
  })
  if (patientQuery.value.trim().length >= 1) {
    void runPatientSearch()
  }
  schedulePatientSearch()
}

function onPatientBlur() {
  cancelPatientBlurTimer()
  patientBlurTimer = window.setTimeout(() => {
    patientBlurTimer = null
    patientPickerOpen.value = false
    if (selectedPatient.value) {
      patientQuery.value = formatPatientLabel(selectedPatient.value)
    }
  }, 180)
}

function pickPatient(p: PatientOpt) {
  cancelPatientBlurTimer()
  selectedPatient.value = p
  patientId.value = p.id
  patientQuery.value = formatPatientLabel(p)
  patientResults.value = []
  patientPickerOpen.value = false
}

async function loadTimeline() {
  const pid = patientId.value === '' ? NaN : Number(patientId.value)
  if (!Number.isFinite(pid)) {
    timeline.value = null
    return
  }
  loading.value = true
  failed.value = false
  try {
    const params: Record<string, string> = { patientId: String(pid) }
    if (dateFrom.value.trim()) params.from = dateFrom.value.trim().slice(0, 10)
    if (dateTo.value.trim()) params.to = dateTo.value.trim().slice(0, 10)
    const { data } = await client.get<TimelineResponse>('/reports/patient-timeline', { params })
    timeline.value = data
  } catch (e) {
    failed.value = true
    timeline.value = null
    toast.error(apiErrorMessage(e, 'Não foi possível carregar a linha do tempo.'))
  } finally {
    loading.value = false
  }
}

function applyStudentScopeFromAuth() {
  if (props.embeddedInCourse) return
  const u = auth.user
  if (!u || u.role !== 'STUDENT') return
  if (u.appId != null) filterAppId.value = u.appId
  if (u.courseId != null) manualCourseId.value = u.courseId
}

function kindIcon(kind: string) {
  if (kind === 'patient_account_created' || kind === 'patient_enrolled') return 'person'
  if (kind === 'assignment_changed') return 'swap_horiz'
  if (kind === 'care_episode_started' || kind === 'care_episode_closed') return 'timeline'
  if (kind === 'prescription_created') return 'assignment_add'
  if (kind === 'prescription_decided') return 'gavel'
  if (kind === 'exercise_day') return 'fitness_center'
  if (kind === 'patient_triage') return 'fact_check'
  return 'event'
}

function formatWhen(iso: string) {
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

watch([activeAppId, activeCourseId], () => {
  clearPatientPicker()
})

watch(patientId, () => {
  void loadTimeline()
})

function parseQueryNum(v: unknown): number {
  const x = Array.isArray(v) ? v[0] : v
  const n = Number(x)
  return Number.isFinite(n) ? n : NaN
}

onMounted(async () => {
  applyStudentScopeFromAuth()
  if (!props.embeddedInCourse) {
    const appQ = parseQueryNum(route.query.appId)
    const courseQ = parseQueryNum(route.query.courseId)
    if (Number.isFinite(appQ)) filterAppId.value = appQ
    if (Number.isFinite(courseQ)) manualCourseId.value = courseQ
    await loadApps()
    await loadCourses()
  }
  const patientQ = parseQueryNum(route.query.patientId)
  if (Number.isFinite(patientQ)) {
    patientId.value = patientQ
    await fetchPatientSummary(patientQ)
  }
})

watch(
  () => route.query.patientId,
  (q) => {
    const pre = toFiniteId(Array.isArray(q) ? q[0] : q)
    if (Number.isFinite(pre)) {
      patientId.value = pre
      void fetchPatientSummary(pre)
    }
  },
)
</script>

<template>
  <div class="page">
    <header class="head" :class="{ 'head--embedded': embeddedInCourse }">
      <div>
        <h1 class="title">História do paciente</h1>
        <p v-if="!embeddedInCourse" class="sub">
          Linha do tempo com cadastro, vínculos acadêmicos, episódios de cuidado, prescrições, decisões
          (quem aprovou/rejeitou) e dias com prática de exercícios. Contexto da
          <strong>coordenação do curso</strong> aparece no painel ao lado da narrativa.
        </p>
        <p v-else class="sub sub--compact">
          Linha do tempo neste curso: use o paciente e o intervalo de datas abaixo.
        </p>
      </div>
    </header>

    <div v-if="!embeddedInCourse" class="filters panel tonal">
      <div class="field">
        <label class="lbl">App</label>
        <select v-model="filterAppId" class="in" :disabled="isStudentActor">
          <option value="">Selecione…</option>
          <option v-for="a in appsData ?? []" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
      </div>
      <div v-if="coursesForApp.length > 1" class="field field--grow">
        <label class="lbl">Curso</label>
        <select v-model="manualCourseId" class="in" :disabled="isStudentActor">
          <option v-for="c in coursesForApp" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <div class="field field--grow patient-combo">
        <label class="lbl">Paciente</label>
        <div class="combo">
          <input
            :value="patientQuery"
            type="text"
            class="in combo__input"
            placeholder="Digite para buscar por nome ou e-mail"
            autocomplete="off"
            :disabled="!Number.isFinite(activeAppId) || !Number.isFinite(activeCourseId)"
            @input="onPatientInput"
            @focus="onPatientFocus"
            @blur="onPatientBlur"
          />
          <button
            v-if="patientId !== ''"
            type="button"
            class="combo__clear"
            aria-label="Limpar paciente"
            @mousedown.prevent
            @click="clearPatientPicker"
          >
            ×
          </button>
          <ul v-show="patientPickerOpen" class="combo__list" role="listbox">
            <li v-if="patientSearchLoading" class="combo__hint">Buscando…</li>
            <li v-else-if="patientQuery.trim().length < 1" class="combo__hint">
              Digite para filtrar a lista de pacientes.
            </li>
            <li v-else-if="!patientResults.length" class="combo__hint">Nenhum paciente encontrado.</li>
            <li
              v-for="p in patientResults"
              :key="p.id"
              class="combo__opt"
              role="option"
              @mousedown.prevent
              @click="pickPatient(p)"
            >
              {{ p.name }}
              <span class="combo__email">{{ p.email }}</span>
            </li>
          </ul>
        </div>
      </div>
      <div class="field">
        <label class="lbl">De (opcional)</label>
        <input v-model="dateFrom" class="in" type="date" @change="loadTimeline" />
      </div>
      <div class="field">
        <label class="lbl">Até (opcional)</label>
        <input v-model="dateTo" class="in" type="date" @change="loadTimeline" />
      </div>
      <div class="field field--actions">
        <button
          type="button"
          class="btn btn--pri"
          :disabled="!Number.isFinite(patientId === '' ? NaN : Number(patientId)) || loading"
          @click="loadTimeline"
        >
          Atualizar
        </button>
      </div>
    </div>

    <div v-else class="filters panel tonal filters--embedded">
      <div class="field field--grow patient-combo">
        <label class="lbl">Paciente</label>
        <div class="combo">
          <input
            :value="patientQuery"
            type="text"
            class="in combo__input"
            placeholder="Digite para buscar por nome ou e-mail"
            autocomplete="off"
            :disabled="!Number.isFinite(activeAppId) || !Number.isFinite(activeCourseId)"
            @input="onPatientInput"
            @focus="onPatientFocus"
            @blur="onPatientBlur"
          />
          <button
            v-if="patientId !== ''"
            type="button"
            class="combo__clear"
            aria-label="Limpar paciente"
            @mousedown.prevent
            @click="clearPatientPicker"
          >
            ×
          </button>
          <ul v-show="patientPickerOpen" class="combo__list" role="listbox">
            <li v-if="patientSearchLoading" class="combo__hint">Buscando…</li>
            <li v-else-if="patientQuery.trim().length < 1" class="combo__hint">
              Digite para filtrar a lista de pacientes.
            </li>
            <li v-else-if="!patientResults.length" class="combo__hint">Nenhum paciente encontrado.</li>
            <li
              v-for="p in patientResults"
              :key="p.id"
              class="combo__opt"
              role="option"
              @mousedown.prevent
              @click="pickPatient(p)"
            >
              {{ p.name }}
              <span class="combo__email">{{ p.email }}</span>
            </li>
          </ul>
        </div>
      </div>
      <div class="field">
        <label class="lbl">De</label>
        <input v-model="dateFrom" class="in" type="date" @change="loadTimeline" />
      </div>
      <div class="field">
        <label class="lbl">Até</label>
        <input v-model="dateTo" class="in" type="date" @change="loadTimeline" />
      </div>
      <div class="field field--actions">
        <button
          type="button"
          class="btn btn--pri"
          :disabled="!Number.isFinite(patientId === '' ? NaN : Number(patientId)) || loading"
          @click="loadTimeline"
        >
          Atualizar
        </button>
      </div>
    </div>

    <p v-if="loading" class="muted pad">Montando a história…</p>
    <UiConnectionRetry v-else-if="failed" @retry="loadTimeline" />

    <div v-else-if="timeline" class="layout">
      <aside class="side panel tonal">
        <h2 class="side-h">Paciente</h2>
        <p class="side-name">{{ timeline.patient.name }}</p>
        <p class="side-meta">{{ timeline.patient.email }}</p>
        <p class="side-meta">{{ timeline.patient.courseName }} · {{ timeline.patient.appName }}</p>
        <div v-if="timeline.patient.currentStudent" class="side-block">
          <span class="side-lbl">Estagiário (atual)</span>
          <p>{{ timeline.patient.currentStudent.name }}</p>
        </div>
        <div v-if="timeline.patient.currentProfessor" class="side-block">
          <span class="side-lbl">Professor (atual)</span>
          <p>{{ timeline.patient.currentProfessor.name }}</p>
        </div>
        <h3 class="side-h2">Coordenação (curso)</h3>
        <ul v-if="timeline.courseCoordinators.length" class="coord-list">
          <li v-for="c in timeline.courseCoordinators" :key="c.id">
            {{ c.name }}
            <span class="coord-mail">{{ c.email }}</span>
          </li>
        </ul>
        <p v-else class="muted-sm">Nenhum coordenador vinculado ao curso.</p>
        <p v-if="timeline.range.from || timeline.range.to" class="range-hint">
          Filtro:
          <template v-if="timeline.range.from">de {{ timeline.range.from }}</template>
          <template v-if="timeline.range.to"> até {{ timeline.range.to }}</template>
        </p>
      </aside>

      <section class="story">
        <h2 class="story-h">Narrativa cronológica</h2>
        <p v-if="!timeline.events.length" class="muted">Nenhum evento neste período.</p>
        <ol v-else class="timeline">
          <li v-for="(ev, idx) in timeline.events" :key="`${ev.kind}-${ev.at}-${idx}`" class="tl-item">
            <div class="tl-icon" :class="`tl-icon--${ev.kind.split('_')[0]}`">
              <MaterialIcon :name="kindIcon(ev.kind)" size="1.1rem" />
            </div>
            <div class="tl-body">
              <p class="tl-time">{{ formatWhen(ev.at) }}</p>
              <p class="tl-title">{{ ev.title }}</p>
              <p class="tl-narrative">{{ ev.narrative }}</p>
            </div>
          </li>
        </ol>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page {
  font-family: var(--uf-font);
  color: var(--uf-on-surface);
  max-width: 72rem;
  margin: 0 auto;
}
.head {
  margin-bottom: 1.25rem;
}
.head--embedded {
  margin-bottom: 0.85rem;
}
.sub--compact {
  max-width: 36rem;
}
.filters--embedded {
  margin-bottom: 1rem;
}
.title {
  margin: 0;
  font-size: 1.65rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.sub {
  margin: 0.4rem 0 0;
  max-width: 44rem;
  font-size: 0.88rem;
  line-height: 1.55;
  color: var(--uf-on-surface-variant);
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
  padding: 1rem 1.2rem;
  margin-bottom: 1rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 10rem;
}
.field--grow {
  flex: 1;
  min-width: 14rem;
}
.field--actions {
  justify-content: flex-end;
}
.patient-combo {
  position: relative;
  z-index: 5;
}
.combo {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 0.25rem;
}
.combo__input {
  flex: 1;
  min-width: 0;
}
.combo__clear {
  flex-shrink: 0;
  width: 2rem;
  border-radius: var(--uf-radius-md);
  border: 1px solid rgba(191, 202, 186, 0.55);
  background: var(--uf-surface-container-low);
  color: var(--uf-on-surface-variant);
  font-size: 1.15rem;
  line-height: 1;
  cursor: pointer;
  font-family: var(--uf-font);
}
.combo__clear:hover {
  background: var(--uf-surface-container-high);
  color: var(--uf-on-surface);
}
.combo__list {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 4px);
  margin: 0;
  padding: 0.35rem 0;
  list-style: none;
  max-height: 14rem;
  overflow-y: auto;
  border-radius: var(--uf-radius-md);
  border: 1px solid rgba(191, 202, 186, 0.65);
  background: var(--uf-surface-container-lowest);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 100;
}
.combo__hint {
  padding: 0.5rem 0.75rem;
  font-size: 0.82rem;
  color: var(--uf-on-surface-variant);
}
.combo__opt {
  padding: 0.45rem 0.75rem;
  font-size: 0.86rem;
  cursor: pointer;
  line-height: 1.35;
}
.combo__opt:hover {
  background: rgba(191, 202, 186, 0.25);
}
.combo__email {
  display: block;
  font-size: 0.78rem;
  color: var(--uf-on-surface-variant);
}
.lbl {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--uf-on-surface-variant);
}
.in {
  border-radius: var(--uf-radius-md);
  border: 1px solid rgba(191, 202, 186, 0.55);
  padding: 0.45rem 0.65rem;
  font-size: 0.88rem;
  background: var(--uf-surface-container-lowest);
  color: var(--uf-on-surface);
}
.btn {
  border: none;
  border-radius: 999px;
  padding: 0.55rem 1.2rem;
  font-weight: 700;
  font-size: 0.82rem;
  cursor: pointer;
  font-family: var(--uf-font);
}
.btn--pri {
  background: linear-gradient(90deg, var(--uf-primary), var(--uf-primary-container));
  color: #fff;
}
.pad {
  padding: 0.75rem 0;
}
.layout {
  display: grid;
  grid-template-columns: minmax(14rem, 18rem) 1fr;
  gap: 1.25rem;
  align-items: start;
}
@media (max-width: 800px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
.side {
  padding: 1rem 1.15rem;
  position: sticky;
  top: 0.75rem;
}
.side-h {
  margin: 0 0 0.5rem;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--uf-on-surface-variant);
}
.side-h2 {
  margin: 1rem 0 0.35rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--uf-on-surface-variant);
}
.side-name {
  margin: 0;
  font-weight: 800;
  font-size: 1.05rem;
}
.side-meta {
  margin: 0.25rem 0 0;
  font-size: 0.82rem;
  color: var(--uf-on-surface-variant);
}
.side-block {
  margin-top: 0.75rem;
}
.side-lbl {
  display: block;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--uf-on-surface-variant);
  margin-bottom: 0.15rem;
}
.coord-list {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.82rem;
}
.coord-mail {
  display: block;
  font-size: 0.75rem;
  color: var(--uf-on-surface-variant);
}
.muted-sm {
  font-size: 0.82rem;
  color: var(--uf-on-surface-variant);
}
.range-hint {
  margin: 1rem 0 0;
  font-size: 0.75rem;
  color: var(--uf-on-surface-variant);
}
.story-h {
  margin: 0 0 1rem;
  font-size: 1.1rem;
  font-weight: 800;
}
.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  border-left: 2px solid rgba(191, 202, 186, 0.5);
  margin-left: 0.85rem;
}
.tl-item {
  position: relative;
  padding: 0 0 1.35rem 1.5rem;
}
.tl-icon {
  position: absolute;
  left: -0.85rem;
  top: 0;
  width: 1.65rem;
  height: 1.65rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--uf-surface-container-high);
  border: 2px solid rgba(191, 202, 186, 0.65);
  color: var(--uf-primary);
}
.tl-time {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--uf-on-surface-variant);
}
.tl-title {
  margin: 0.2rem 0 0.25rem;
  font-weight: 700;
  font-size: 0.95rem;
}
.tl-narrative {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.5;
  color: var(--uf-on-surface);
}
</style>
