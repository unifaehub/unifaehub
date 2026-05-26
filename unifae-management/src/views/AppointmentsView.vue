<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import axios from 'axios'
import client from '@/api/client'
import UiAsyncPanel from '@/components/ui/UiAsyncPanel.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiSearchSelect, { type SearchSelectOption } from '@/components/ui/UiSearchSelect.vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { matchesSearchText } from '@/utils/searchText'

const props = defineProps<{
  embeddedInCourse?: boolean
  courseAppId?: number
  courseScopeId?: number
}>()

const auth = useAuthStore()
const toast = useToastStore()

type PatientOpt = { id: number; name: string }
type LocationOpt = { id: number; name: string }
type ProfessionalOpt = { id: number; name: string; role: string; isSelf: boolean }

type CalendarEvent = {
  id: number
  patientId: number
  patientName: string
  professionalUserId: number
  professionalName: string
  professionalRole: string | null
  scheduledAt: string
  endsAt: string
  durationMinutes: number
  modality: 'IN_PERSON' | 'ONLINE'
  status: string
  careLocationId: number | null
  careLocationName: string | null
  careLocationAddress: string | null
  meetUrl: string | null
  notes: string | null
}

type DayColumn = {
  date: string
  label: string
  shortLabel: string
  isToday: boolean
  events: CalendarEvent[]
}

const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const showDetail = ref(false)
const detailEvent = ref<CalendarEvent | null>(null)
const weekStart = ref('')
const weekEnd = ref('')
const viewMode = ref<'SELF' | 'TEAM' | 'ALL'>('SELF')
const events = ref<CalendarEvent[]>([])
const myEvents = ref<CalendarEvent[]>([])
const followEvents = ref<CalendarEvent[]>([])
const professionals = ref<ProfessionalOpt[]>([])
const filterProfessionalId = ref<number | ''>('')
const followProfessionalId = ref<number | ''>('')
const adminProfSearchQuery = ref('')
const followProfSearchQuery = ref('')
const patientsLoading = ref(false)

const patients = ref<PatientOpt[]>([])
const locations = ref<LocationOpt[]>([])

const formPatientId = ref<number | ''>('')
const formScheduledAt = ref('')
const formModality = ref<'IN_PERSON' | 'ONLINE'>('IN_PERSON')
const formLocationId = ref<number | ''>('')
const formDuration = ref(50)
const formNotes = ref('')
const formAutoMeet = ref(true)

const appId = computed(() => {
  const v = props.courseAppId
  return v != null && Number.isFinite(Number(v)) ? Number(v) : NaN
})
const courseId = computed(() => {
  const v = props.courseScopeId
  return v != null && Number.isFinite(Number(v)) ? Number(v) : NaN
})

const userRole = computed(() => auth.user?.role ?? null)
const isAdmin = computed(() => userRole.value === 'ADMIN')
const isCoordinator = computed(() => userRole.value === 'COORDINATOR')
const isTeamViewer = computed(() => isAdmin.value || isCoordinator.value)

const scopeHint = computed(() => {
  if (isCoordinator.value) {
    return 'Sua agenda aparece primeiro. Use a seção abaixo para acompanhar um estagiário ou outro profissional da equipe.'
  }
  if (viewMode.value === 'SELF') return 'Exibindo apenas seus agendamentos.'
  if (viewMode.value === 'TEAM') return 'Filtre por profissional ou veja todas as agendas do curso.'
  return 'Filtre por profissional ou veja todas as agendas do curso.'
})

const followProfessionals = computed(() =>
  professionals.value.filter((p) => !p.isSelf && p.role === 'STUDENT'),
)

const adminProfessionalOptions = computed((): SearchSelectOption[] =>
  professionals.value
    .filter((p) => matchesSearchText(p.name, adminProfSearchQuery.value))
    .map((p) => ({
      id: p.id,
      label: `${p.name} (${roleLabel(p.role)})${p.isSelf ? ' — você' : ''}`,
    })),
)

const followProfessionalOptions = computed((): SearchSelectOption[] =>
  followProfessionals.value
    .filter((p) => matchesSearchText(p.name, followProfSearchQuery.value))
    .map((p) => ({
      id: p.id,
      label: `${p.name} (${roleLabel(p.role)})`,
    })),
)

const patientSelectOptions = computed((): SearchSelectOption[] =>
  patients.value.map((p) => ({ id: p.id, label: p.name })),
)

function apiError(err: unknown, fallback: string) {
  if (!axios.isAxiosError(err)) return fallback
  const m = err.response?.data as { message?: string | string[] } | undefined
  const raw = m?.message
  if (Array.isArray(raw)) return raw.join(' ')
  if (typeof raw === 'string' && raw.trim()) return raw
  return fallback
}

function roleLabel(role: string | null) {
  if (role === 'PROFESSOR') return 'Fisioterapeuta'
  if (role === 'COORDINATOR') return 'Coordenação'
  if (role === 'STUDENT') return 'Estagiário'
  if (role === 'ADMIN') return 'Administrador'
  return role ?? '—'
}

function statusLabel(status: string) {
  if (status === 'SCHEDULED') return 'Agendado'
  if (status === 'COMPLETED') return 'Realizado'
  if (status === 'CANCELLED') return 'Cancelado'
  return status
}

function modalityLabel(modality: string) {
  return modality === 'ONLINE' ? 'Online' : 'Presencial'
}

function mondayKey(d = new Date()) {
  const x = new Date(d)
  const dow = x.getDay()
  const offset = dow === 0 ? -6 : 1 - dow
  x.setDate(x.getDate() + offset)
  x.setHours(12, 0, 0, 0)
  return x.toISOString().slice(0, 10)
}

function shiftWeek(delta: number) {
  const base = new Date(`${weekStart.value || mondayKey()}T12:00:00`)
  base.setDate(base.getDate() + delta * 7)
  weekStart.value = mondayKey(base)
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}

function formatWeekRange() {
  if (!weekStart.value || !weekEnd.value) return ''
  const a = new Date(`${weekStart.value}T12:00:00`).toLocaleDateString('pt-BR')
  const b = new Date(`${weekEnd.value}T12:00:00`).toLocaleDateString('pt-BR')
  return `${a} — ${b}`
}

function buildDayColumns(source: CalendarEvent[]): DayColumn[] {
  if (!weekStart.value) return []
  const start = new Date(`${weekStart.value}T12:00:00`)
  const today = new Date().toISOString().slice(0, 10)
  const weekdayShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const weekdayLong = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const date = d.toISOString().slice(0, 10)
    const dow = d.getDay()
    const dayEvents = source
      .filter((ev) => ev.scheduledAt.slice(0, 10) === date)
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    return {
      date,
      label: weekdayLong[dow] ?? '—',
      shortLabel: weekdayShort[dow] ?? '—',
      isToday: date === today,
      events: dayEvents,
    }
  })
}

const dayColumns = computed(() => buildDayColumns(events.value))
const myDayColumns = computed(() => buildDayColumns(myEvents.value))
const followDayColumns = computed(() => buildDayColumns(followEvents.value))

function weekRangeParams() {
  const end = new Date(`${weekStart.value}T12:00:00`)
  end.setDate(end.getDate() + 7)
  return {
    from: `${weekStart.value}T00:00:00.000Z`,
    to: end.toISOString(),
  }
}

async function fetchCalendar(professionalUserId?: number) {
  const range = weekRangeParams()
  const { data } = await client.get<{
    from: string
    to: string
    viewMode: 'SELF' | 'TEAM' | 'ALL'
    professionals: ProfessionalOpt[]
    events: CalendarEvent[]
  }>('/appointments/calendar', {
    params: {
      appId: appId.value,
      courseId: courseId.value,
      from: range.from,
      to: range.to,
      professionalUserId,
    },
  })
  return data
}

async function loadCalendar() {
  if (!Number.isFinite(appId.value) || !Number.isFinite(courseId.value)) return
  loading.value = true
  try {
    if (isCoordinator.value && auth.user?.id) {
      const myData = await fetchCalendar(auth.user.id)
      weekEnd.value = myData.to
      viewMode.value = myData.viewMode
      professionals.value = myData.professionals
      myEvents.value = myData.events

      if (followProfessionalId.value !== '') {
        const followData = await fetchCalendar(Number(followProfessionalId.value))
        followEvents.value = followData.events
      } else {
        followEvents.value = []
      }
      events.value = []
      return
    }

    const profId =
      filterProfessionalId.value === '' ? undefined : Number(filterProfessionalId.value)
    const data = await fetchCalendar(profId)
    weekEnd.value = data.to
    viewMode.value = data.viewMode
    professionals.value = data.professionals
    events.value = data.events
    myEvents.value = []
    followEvents.value = []
  } catch (e) {
    toast.error(apiError(e, 'Não foi possível carregar o calendário.'))
  } finally {
    loading.value = false
  }
}

let patientSearchTimer: ReturnType<typeof setTimeout> | null = null

async function searchPatients(query = '') {
  if (!Number.isFinite(appId.value) || !Number.isFinite(courseId.value)) return
  patientsLoading.value = true
  try {
    const { data } = await client.get<{ data: { id: number; name: string }[] }>('/patients', {
      params: {
        appId: appId.value,
        courseId: courseId.value,
        page: 1,
        limit: 50,
        q: query.trim() || undefined,
      },
    })
    patients.value = data.data.map((p) => ({ id: p.id, name: p.name }))
  } catch {
    patients.value = []
  } finally {
    patientsLoading.value = false
  }
}

function schedulePatientSearch(query: string) {
  if (patientSearchTimer) clearTimeout(patientSearchTimer)
  patientSearchTimer = setTimeout(() => void searchPatients(query), 280)
}

async function loadPicks() {
  if (!Number.isFinite(appId.value) || !Number.isFinite(courseId.value)) return
  try {
    const [, lRes] = await Promise.all([
      searchPatients(''),
      client.get<{ id: number; name: string }[]>('/care-locations', {
        params: { appId: appId.value, courseId: courseId.value },
      }),
    ])
    locations.value = lRes.data.map((l) => ({ id: l.id, name: l.name }))
  } catch {
    locations.value = []
  }
}

function onPatientSearch(query: string) {
  schedulePatientSearch(query)
}

function openNew() {
  formPatientId.value = ''
  formScheduledAt.value = ''
  formModality.value = 'IN_PERSON'
  formLocationId.value = ''
  formDuration.value = 50
  formNotes.value = ''
  formAutoMeet.value = true
  showModal.value = true
  void loadPicks()
}

function openDetail(ev: CalendarEvent) {
  detailEvent.value = ev
  showDetail.value = true
}

watch(filterProfessionalId, () => void loadCalendar())
watch(followProfessionalId, () => void loadCalendar())

async function submit() {
  const pid = formPatientId.value === '' ? NaN : Number(formPatientId.value)
  if (!Number.isFinite(pid)) {
    toast.error('Busque e selecione o paciente na lista.')
    return
  }
  if (!formScheduledAt.value) {
    toast.error('Informe data e hora.')
    return
  }
  const scheduledAt = new Date(formScheduledAt.value)
  if (Number.isNaN(scheduledAt.getTime())) {
    toast.error('Data/hora inválida.')
    return
  }

  saving.value = true
  try {
    await client.post('/appointments', {
      patientId: pid,
      scheduledAt: scheduledAt.toISOString(),
      modality: formModality.value,
      durationMinutes: formDuration.value,
      careLocationId:
        formModality.value === 'IN_PERSON' && formLocationId.value !== ''
          ? Number(formLocationId.value)
          : undefined,
      autoCreateMeet: formModality.value === 'ONLINE' ? formAutoMeet.value : false,
      notes: formNotes.value.trim() || null,
    })
    toast.success('Agendamento criado.')
    showModal.value = false
    await loadCalendar()
  } catch (e) {
    toast.error(apiError(e, 'Não foi possível agendar.'))
  } finally {
    saving.value = false
  }
}

async function cancelEvent(id: number) {
  try {
    await client.post(`/appointments/${id}/cancel`)
    toast.success('Agendamento cancelado.')
    showDetail.value = false
    detailEvent.value = null
    await loadCalendar()
  } catch (e) {
    toast.error(apiError(e, 'Não foi possível cancelar.'))
  }
}

watch(weekStart, () => void loadCalendar())

onMounted(() => {
  weekStart.value = mondayKey()
  void loadCalendar()
})
</script>

<template>
  <section class="panel cal">
    <header class="cal__head">
      <div>
        <h2 class="h2">Agenda</h2>
        <p class="muted">{{ scopeHint }}</p>
      </div>
      <button type="button" class="btn btn--pri" @click="openNew">Novo agendamento</button>
    </header>

    <div class="cal__toolbar">
      <div class="cal__nav">
        <button type="button" class="btn btn--ghost" @click="shiftWeek(-1)">← Semana anterior</button>
        <button type="button" class="btn btn--ghost" @click="weekStart = mondayKey()">Esta semana</button>
        <button type="button" class="btn btn--ghost" @click="shiftWeek(1)">Próxima semana →</button>
      </div>
      <p class="cal__range">{{ formatWeekRange() }}</p>

      <div v-if="isAdmin" class="cal__filter">
        <UiSearchSelect
          v-model="filterProfessionalId"
          :options="adminProfessionalOptions"
          label="Profissional"
          placeholder="Digite o nome para filtrar…"
          empty-text="Nenhum profissional encontrado."
          @search="adminProfSearchQuery = $event"
        />
        <button
          v-if="filterProfessionalId !== ''"
          type="button"
          class="btn btn--ghost btn--sm"
          @click="filterProfessionalId = ''; adminProfSearchQuery = ''"
        >
          Ver todos no escopo
        </button>
      </div>
    </div>

    <UiAsyncPanel :loading="loading" label="Carregando calendário…">
  <template v-if="isCoordinator">
    <h3 class="cal__section-title">Minha agenda</h3>
    <div class="cal__grid">
      <div
        v-for="day in myDayColumns"
        :key="'my-' + day.date"
        class="cal__day"
        :class="{ 'cal__day--today': day.isToday }"
      >
        <header class="cal__day-head">
          <span class="cal__dow">{{ day.shortLabel }}</span>
          <span class="cal__date">{{
            new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          }}</span>
          <span v-if="day.isToday" class="cal__today">Hoje</span>
        </header>
        <p v-if="!day.events.length" class="cal__empty">Sem consultas</p>
        <article
          v-for="ev in day.events"
          :key="ev.id"
          class="cal__card"
          :class="`cal__card--${ev.modality.toLowerCase()}`"
        >
          <time class="cal__time">{{ formatTime(ev.scheduledAt) }}</time>
          <p class="cal__patient">{{ ev.patientName }}</p>
          <p class="cal__meta">
            <span v-if="ev.modality === 'ONLINE'">Online</span>
            <span v-else>{{ ev.careLocationName ?? 'Presencial' }}</span>
            · {{ ev.durationMinutes }} min
          </p>
          <p v-if="ev.status === 'CANCELLED'" class="cal__cancelled">Cancelado</p>
          <div class="cal__actions ui-act-row">
            <UiIconButton icon="visibility" label="Ver detalhes" variant="doc" @click="openDetail(ev)" />
            <UiIconButton v-if="ev.meetUrl" icon="videocam" label="Abrir Google Meet" variant="primary" :href="ev.meetUrl" />
            <UiIconButton
              v-if="ev.status === 'SCHEDULED'"
              icon="event_busy"
              label="Cancelar agendamento"
              variant="danger"
              @click="cancelEvent(ev.id)"
            />
          </div>
        </article>
      </div>
    </div>

    <section class="cal__follow">
      <h3 class="cal__section-title">Acompanhar estagiário</h3>
      <UiSearchSelect
        v-model="followProfessionalId"
        :options="followProfessionalOptions"
        label="Buscar estagiário por nome"
        placeholder="Digite o nome do estagiário…"
        empty-text="Nenhum estagiário encontrado."
        @search="followProfSearchQuery = $event"
      />
      <p v-if="!followProfessionals.length" class="combo__hint muted">
        Nenhum estagiário vinculado a este curso.
      </p>

      <p v-if="followProfessionalId === ''" class="muted pad">
        Selecione um estagiário acima para ver a agenda dele nesta semana.
      </p>
      <div v-else class="cal__grid">
        <div
          v-for="day in followDayColumns"
          :key="'follow-' + day.date"
          class="cal__day"
          :class="{ 'cal__day--today': day.isToday }"
        >
          <header class="cal__day-head">
            <span class="cal__dow">{{ day.shortLabel }}</span>
            <span class="cal__date">{{
              new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            }}</span>
          </header>
          <p v-if="!day.events.length" class="cal__empty">Sem consultas</p>
          <article
            v-for="ev in day.events"
            :key="ev.id"
            class="cal__card"
            :class="`cal__card--${ev.modality.toLowerCase()}`"
          >
            <time class="cal__time">{{ formatTime(ev.scheduledAt) }}</time>
            <p class="cal__patient">{{ ev.patientName }}</p>
            <p class="cal__prof">
              {{ ev.professionalName }}
              <span class="cal__role">({{ roleLabel(ev.professionalRole) }})</span>
            </p>
            <p class="cal__meta">
              <span v-if="ev.modality === 'ONLINE'">Online</span>
              <span v-else>{{ ev.careLocationName ?? 'Presencial' }}</span>
            </p>
            <div class="cal__actions ui-act-row">
              <UiIconButton icon="visibility" label="Ver detalhes" variant="doc" @click="openDetail(ev)" />
            </div>
          </article>
        </div>
      </div>
    </section>
  </template>

    <div v-else class="cal__grid">
      <div v-for="day in dayColumns" :key="day.date" class="cal__day" :class="{ 'cal__day--today': day.isToday }">
        <header class="cal__day-head">
          <span class="cal__dow">{{ day.shortLabel }}</span>
          <span class="cal__date">{{
            new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          }}</span>
          <span v-if="day.isToday" class="cal__today">Hoje</span>
        </header>
        <p v-if="!day.events.length" class="cal__empty">Sem consultas</p>
        <article
          v-for="ev in day.events"
          :key="ev.id"
          class="cal__card"
          :class="`cal__card--${ev.modality.toLowerCase()}`"
        >
          <time class="cal__time">{{ formatTime(ev.scheduledAt) }}</time>
          <p class="cal__patient">{{ ev.patientName }}</p>
          <p v-if="isTeamViewer" class="cal__prof">
            {{ ev.professionalName }}
            <span class="cal__role">({{ roleLabel(ev.professionalRole) }})</span>
          </p>
          <p class="cal__meta">
            <span v-if="ev.modality === 'ONLINE'">Online</span>
            <span v-else>{{ ev.careLocationName ?? 'Presencial' }}</span>
            · {{ ev.durationMinutes }} min
          </p>
          <p v-if="ev.status === 'CANCELLED'" class="cal__cancelled">Cancelado</p>
          <div class="cal__actions ui-act-row">
            <UiIconButton icon="visibility" label="Ver detalhes" variant="doc" @click="openDetail(ev)" />
            <UiIconButton v-if="ev.meetUrl" icon="videocam" label="Abrir Google Meet" variant="primary" :href="ev.meetUrl" />
            <UiIconButton
              v-if="ev.status === 'SCHEDULED'"
              icon="event_busy"
              label="Cancelar agendamento"
              variant="danger"
              @click="cancelEvent(ev.id)"
            />
          </div>
        </article>
      </div>
    </div>
    </UiAsyncPanel>

    <div v-if="showDetail && detailEvent" class="modal-backdrop" @click.self="showDetail = false">
      <div class="modal modal--wide">
        <h3 class="mh">Detalhes do agendamento</h3>
        <dl class="detail">
          <dt>Paciente</dt>
          <dd>{{ detailEvent.patientName }}</dd>
          <dt>Profissional</dt>
          <dd>{{ detailEvent.professionalName }} ({{ roleLabel(detailEvent.professionalRole) }})</dd>
          <dt>Início</dt>
          <dd>{{ formatDateTime(detailEvent.scheduledAt) }}</dd>
          <dt>Término</dt>
          <dd>{{ formatDateTime(detailEvent.endsAt) }}</dd>
          <dt>Duração</dt>
          <dd>{{ detailEvent.durationMinutes }} minutos</dd>
          <dt>Modalidade</dt>
          <dd>{{ modalityLabel(detailEvent.modality) }}</dd>
          <dt>Status</dt>
          <dd>{{ statusLabel(detailEvent.status) }}</dd>
          <template v-if="detailEvent.modality === 'IN_PERSON'">
            <dt>Local</dt>
            <dd>
              <strong>{{ detailEvent.careLocationName ?? '—' }}</strong>
              <p v-if="detailEvent.careLocationAddress" class="detail__sub">{{ detailEvent.careLocationAddress }}</p>
            </dd>
          </template>
          <template v-else>
            <dt>Link da consulta</dt>
            <dd>
              <a v-if="detailEvent.meetUrl" :href="detailEvent.meetUrl" target="_blank" rel="noopener">{{
                detailEvent.meetUrl
              }}</a>
              <span v-else class="muted">Link não informado</span>
            </dd>
          </template>
          <dt v-if="detailEvent.notes">Observações</dt>
          <dd v-if="detailEvent.notes">{{ detailEvent.notes }}</dd>
        </dl>
        <div class="mactions">
          <a
            v-if="detailEvent.meetUrl && detailEvent.status === 'SCHEDULED'"
            :href="detailEvent.meetUrl"
            target="_blank"
            rel="noopener"
            class="mbtn mbtn--ghost"
          >
            Abrir Meet
          </a>
          <button
            v-if="detailEvent.status === 'SCHEDULED'"
            type="button"
            class="mbtn mbtn--danger"
            @click="cancelEvent(detailEvent.id)"
          >
            Cancelar agendamento
          </button>
          <button type="button" class="mbtn mbtn--pri" @click="showDetail = false">Fechar</button>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <div class="modal">
        <h3 class="mh">Novo agendamento</h3>
        <form class="mform" @submit.prevent="submit">
          <UiSearchSelect
            v-model="formPatientId"
            :options="patientSelectOptions"
            :loading="patientsLoading"
            label="Paciente"
            placeholder="Digite o nome para buscar…"
            empty-text="Nenhum paciente encontrado."
            @search="onPatientSearch"
          />
          <label class="mlbl">Data e hora</label>
          <input v-model="formScheduledAt" class="minp" type="datetime-local" required />
          <label class="mlbl">Modalidade</label>
          <select v-model="formModality" class="minp">
            <option value="IN_PERSON">Presencial</option>
            <option value="ONLINE">Online (Meet)</option>
          </select>
          <template v-if="formModality === 'IN_PERSON'">
            <label class="mlbl">Local</label>
            <select v-model="formLocationId" class="minp" required>
              <option value="">Selecione…</option>
              <option v-for="l in locations" :key="l.id" :value="l.id">{{ l.name }}</option>
            </select>
            <p v-if="!locations.length" class="hint muted">
              Nenhum local vinculado a este curso. O administrador cadastra em Locais de atendimento.
            </p>
          </template>
          <template v-else>
            <label class="chk">
              <input v-model="formAutoMeet" type="checkbox" />
              Criar link Google Meet automaticamente
            </label>
          </template>
          <label class="mlbl">Duração (min)</label>
          <input v-model.number="formDuration" class="minp" type="number" min="15" max="240" />
          <label class="mlbl">Observações</label>
          <textarea v-model="formNotes" class="minp minp--area" rows="2" />
          <div class="mactions">
            <button type="button" class="mbtn mbtn--ghost" @click="showModal = false">Cancelar</button>
            <button type="submit" class="mbtn mbtn--pri" :disabled="saving">
              {{ saving ? 'Salvando…' : 'Agendar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.cal__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}
.cal__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 1rem;
}
.cal__nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.cal__range {
  margin: 0;
  font-weight: 600;
  font-size: 0.9rem;
}
.cal__section-title {
  margin: 1.25rem 0 0.75rem;
  font-size: 1rem;
  font-weight: 700;
}
.cal__follow {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(191, 202, 186, 0.45);
}
.cal__filter {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 260px;
}
.cal__filter--combo {
  position: relative;
}
.combo {
  position: relative;
}
.combo__clear {
  position: absolute;
  right: 0.35rem;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  color: var(--uf-on-surface-variant);
  padding: 0 0.25rem;
}
.combo__list {
  position: absolute;
  z-index: 20;
  left: 0;
  right: 0;
  top: calc(100% + 2px);
  margin: 0;
  padding: 0.25rem 0;
  list-style: none;
  max-height: 14rem;
  overflow-y: auto;
  background: var(--uf-surface);
  border: 1px solid rgba(191, 202, 186, 0.55);
  border-radius: var(--uf-radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.combo__opt {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 0.45rem 0.65rem;
  font-size: 0.85rem;
  cursor: pointer;
  font-family: var(--uf-font);
}
.combo__opt:hover {
  background: rgba(13, 99, 27, 0.08);
}
.combo__hint {
  font-size: 0.78rem;
  margin: 0;
}
.combo__empty {
  display: block;
  padding: 0.45rem 0.65rem;
  font-size: 0.82rem;
  color: var(--uf-on-surface-variant);
}
.mlbl {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--uf-on-surface-variant);
}
.minp {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(191, 202, 186, 0.55);
  border-radius: var(--uf-radius-md);
  padding: 0.45rem 0.6rem;
  font-family: var(--uf-font);
}
.cal__grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.5rem;
  overflow-x: auto;
}
@media (max-width: 1100px) {
  .cal__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 640px) {
  .cal__grid {
    grid-template-columns: 1fr;
  }
}
.cal__day {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(191, 202, 186, 0.45);
  border-radius: var(--uf-radius-md);
  min-height: 8rem;
  display: flex;
  flex-direction: column;
}
.cal__day--today {
  border-color: var(--uf-primary);
  box-shadow: 0 0 0 1px rgba(13, 99, 27, 0.15);
}
.cal__day-head {
  padding: 0.45rem 0.5rem;
  border-bottom: 1px solid rgba(191, 202, 186, 0.35);
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: baseline;
}
.cal__dow {
  font-weight: 700;
  font-size: 0.82rem;
}
.cal__date {
  font-size: 0.78rem;
  color: var(--uf-on-surface-variant);
}
.cal__today {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--uf-primary);
  margin-left: auto;
}
.cal__empty {
  margin: 0.5rem;
  font-size: 0.78rem;
  color: var(--uf-on-surface-variant);
}
.cal__card {
  margin: 0.35rem 0.4rem;
  padding: 0.45rem 0.5rem;
  border-radius: 0.35rem;
  background: rgba(13, 99, 27, 0.06);
  border-left: 3px solid var(--uf-primary);
  font-size: 0.78rem;
}
.cal__card--online {
  border-left-color: #1565c0;
  background: rgba(21, 101, 192, 0.06);
}
.cal__time {
  font-weight: 700;
  display: block;
}
.cal__patient {
  margin: 0.2rem 0 0;
  font-weight: 600;
}
.cal__prof,
.cal__meta {
  margin: 0.15rem 0 0;
  color: var(--uf-on-surface-variant);
}
.cal__role {
  font-size: 0.72rem;
}
.cal__cancelled {
  color: #b3261e;
  font-weight: 700;
  margin: 0.2rem 0 0;
}
.cal__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.35rem;
}
.cal__link {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--uf-primary);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
}
.cal__link--danger {
  color: #b3261e;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.modal {
  background: var(--uf-surface);
  border-radius: var(--uf-radius-lg);
  padding: 1.25rem;
  width: min(520px, 94vw);
  max-height: 90vh;
  overflow-y: auto;
}
.modal--wide {
  width: min(560px, 94vw);
}
.mh {
  margin: 0 0 1rem;
  font-size: 1.1rem;
}
.detail {
  display: grid;
  grid-template-columns: 8rem 1fr;
  gap: 0.5rem 1rem;
  margin: 0 0 1rem;
  font-size: 0.88rem;
}
.detail dt {
  font-weight: 700;
  color: var(--uf-on-surface-variant);
  margin: 0;
}
.detail dd {
  margin: 0;
}
.detail__sub {
  margin: 0.25rem 0 0;
  color: var(--uf-on-surface-variant);
  font-size: 0.82rem;
}
.mform {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.minp--area {
  resize: vertical;
}
.chk {
  font-size: 0.85rem;
  display: flex;
  gap: 0.4rem;
  align-items: center;
}
.mactions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.mbtn {
  border: none;
  border-radius: 999px;
  padding: 0.5rem 1rem;
  font-weight: 700;
  cursor: pointer;
  font-family: var(--uf-font);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}
.mbtn--ghost {
  background: transparent;
  color: var(--uf-primary);
}
.mbtn--pri {
  background: var(--uf-primary);
  color: #fff;
}
.mbtn--danger {
  background: #b3261e;
  color: #fff;
}
.hint {
  font-size: 0.78rem;
  margin: 0;
}
</style>
