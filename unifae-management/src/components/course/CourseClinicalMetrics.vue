<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import client from '@/api/client'
import MaterialIcon from '@/components/shell/MaterialIcon.vue'
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import { useApiRequest } from '@/composables/useApiRequest'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  courseId: number
}>()

type DashboardOverview = {
  cards: {
    pendingPrescriptions: number
    adherenceRate: number | null
    activePatients?: number
    highRiskPatients?: number
  }
}

type DashboardTimeseries = {
  points: Array<{
    date: string
    pendingPrescriptions: number
    adherenceRate: number | null
  }>
}

const auth = useAuthStore()

const periodDays = ref<7 | 30 | 90>(30)
type DateMode = 'period' | 'range' | 'single'
const dateMode = ref<DateMode>('period')
const rangeStart = ref<string>('')
const rangeEnd = ref<string>('')
const singleDate = ref<string>('')

function handleUnauthorized() {
  auth.logout()
  window.location.href = '/login'
}

const queryParams = computed(() => {
  const params: Record<string, number | string> = { courseId: props.courseId }
  if (dateMode.value === 'period') params.periodDays = periodDays.value
  else if (dateMode.value === 'single' && singleDate.value) params.date = singleDate.value
  else if (dateMode.value === 'range' && rangeStart.value && rangeEnd.value) {
    params.startDate = rangeStart.value
    params.endDate = rangeEnd.value
  } else {
    params.periodDays = periodDays.value
  }
  return params
})

const { data, loading, failed, execute } = useApiRequest<DashboardOverview>(
  async () => {
    const { data } = await client.get<DashboardOverview>('/dashboard/overview', {
      params: queryParams.value,
    })
    return data
  },
  { onUnauthorized: handleUnauthorized },
)

const {
  data: ts,
  loading: tsLoading,
  failed: tsFailed,
  execute: tsExecute,
} = useApiRequest<DashboardTimeseries>(
  async () => {
    const { data } = await client.get<DashboardTimeseries>('/dashboard/timeseries', {
      params: queryParams.value,
    })
    return data
  },
  { onUnauthorized: handleUnauthorized },
)

const cards = computed(() => data.value?.cards ?? null)

function formatPercent(v: number | null) {
  if (v == null) return '—'
  return `${Math.round(v * 100)}%`
}

function fmtDateLabel(isoDate: string) {
  const [y, m, d] = isoDate.split('-')
  if (!y || !m || !d) return isoDate
  return `${d}/${m}`
}

const timeseriesPoints = computed(() => ts.value?.points ?? [])
const chartMaxPending = computed(() => {
  const vals = timeseriesPoints.value.map((p) => p.pendingPrescriptions)
  return Math.max(1, ...vals)
})
const adherenceLine = computed(() => {
  const pts = timeseriesPoints.value
  if (!pts.length) return ''
  const w = 520
  const h = 160
  const padX = 8
  const padY = 10
  const innerW = w - padX * 2
  const innerH = h - padY * 2
  const n = pts.length
  const xAt = (i: number) => padX + (n === 1 ? 0 : (innerW * i) / (n - 1))
  const yAt = (v: number) => padY + innerH * (1 - v)
  const coords: string[] = []
  for (let i = 0; i < n; i++) {
    const v = pts[i]?.adherenceRate
    if (v == null) continue
    coords.push(`${xAt(i).toFixed(1)},${yAt(Math.max(0, Math.min(1, v))).toFixed(1)}`)
  }
  return coords.join(' ')
})

const hasChartData = computed(() => {
  const pts = timeseriesPoints.value
  if (!pts.length) return false
  const anyPending = pts.some((p) => p.pendingPrescriptions > 0)
  const anyAdh = pts.some((p) => p.adherenceRate != null)
  return anyPending || anyAdh
})

const axisLabels = computed(() => {
  const pts = timeseriesPoints.value
  if (!pts.length) return { first: null as string | null, mid: null as string | null, last: null as string | null }
  const first = pts[0]?.date ? fmtDateLabel(pts[0].date) : null
  const midIdx = Math.floor(pts.length / 2)
  const mid = pts[midIdx]?.date ? fmtDateLabel(pts[midIdx].date) : null
  const lastPt = pts[pts.length - 1]
  const last = lastPt?.date ? fmtDateLabel(lastPt.date) : null
  return { first, mid, last }
})

function onPeriodChange(e: Event) {
  const v = Number((e.target as HTMLSelectElement).value) as 7 | 30 | 90
  periodDays.value = v
  dateMode.value = 'period'
}

function onDateModeChange(e: Event) {
  dateMode.value = (e.target as HTMLSelectElement).value as DateMode
}

function todayIsoDate() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function applySingleToday() {
  singleDate.value = todayIsoDate()
}

watch(
  () => props.courseId,
  () => {
    void execute()
    void tsExecute()
  },
)

watch(queryParams, () => {
  void execute()
  void tsExecute()
})

onMounted(() => {
  void execute()
  void tsExecute()
})
</script>

<template>
  <div class="ccm">
    <div class="ccm__filters tonal">
      <select class="pill-select" aria-label="Período" :value="String(periodDays)" @change="onPeriodChange">
        <option value="7">Últimos 7 dias</option>
        <option value="30">Últimos 30 dias</option>
        <option value="90">Últimos 90 dias</option>
      </select>
      <span class="pill-div" />
      <select class="pill-select" aria-label="Datas" :value="dateMode" @change="onDateModeChange">
        <option value="period">Período</option>
        <option value="range">Intervalo</option>
        <option value="single">Dia único</option>
      </select>
    </div>

    <div v-if="dateMode !== 'period'" class="ccm__date-row">
      <div v-if="dateMode === 'range'" class="ccm__date-inner tonal">
        <div class="field">
          <label class="lbl">De</label>
          <input v-model="rangeStart" class="in in--sm" type="date" />
        </div>
        <div class="field">
          <label class="lbl">Até</label>
          <input v-model="rangeEnd" class="in in--sm" type="date" />
        </div>
      </div>
      <div v-else class="ccm__date-inner tonal">
        <div class="field">
          <label class="lbl">Dia</label>
          <input v-model="singleDate" class="in in--sm" type="date" />
        </div>
        <button type="button" class="btn-today" @click="applySingleToday">Hoje</button>
      </div>
    </div>

    <p v-if="loading" class="muted">Carregando indicadores…</p>
    <template v-else-if="!failed">
      <div class="kpi-grid">
        <div class="kpi kpi--hover">
          <div class="kpi-top">
            <div class="kpi-icon kpi-icon--err">
              <MaterialIcon name="pending_actions" />
            </div>
            <span class="kpi-tag kpi-tag--err">Workflow</span>
          </div>
          <h3 class="kpi-label">Prescrições pendentes</h3>
          <p class="kpi-value">{{ cards?.pendingPrescriptions ?? '—' }}</p>
        </div>
        <div class="kpi kpi--hover">
          <div class="kpi-top">
            <div class="kpi-icon kpi-icon--pf">
              <MaterialIcon name="analytics" />
            </div>
            <span class="kpi-tag kpi-tag--pf">Meta</span>
          </div>
          <h3 class="kpi-label">
            Taxa de adesão
            <span
              class="tip"
              title="Cálculo: execuções COMPLETED ÷ total de execuções no período (curso atual)."
            >
              <MaterialIcon name="info" size="1rem" />
            </span>
          </h3>
          <p class="kpi-value">{{ formatPercent(cards?.adherenceRate ?? null) }}</p>
        </div>

        <!-- Novos Cards de KPI -->
        <div v-if="cards?.activePatients != null" class="kpi kpi--hover">
          <div class="kpi-top">
            <div class="kpi-icon kpi-icon--sec">
              <MaterialIcon name="directions_run" />
            </div>
            <span class="kpi-tag kpi-tag--sec">Engajamento</span>
          </div>
          <h3 class="kpi-label">Pacientes Ativos</h3>
          <p class="kpi-value">{{ cards.activePatients }}</p>
        </div>

        <div v-if="cards?.highRiskPatients != null" class="kpi kpi--hover">
          <div class="kpi-top">
            <div class="kpi-icon kpi-icon--err">
              <MaterialIcon name="warning" />
            </div>
            <span class="kpi-tag kpi-tag--err">Alerta</span>
          </div>
          <h3 class="kpi-label">Alto Risco (Vermelho)</h3>
          <p class="kpi-value">{{ cards.highRiskPatients }}</p>
        </div>
      </div>

      <section class="panel tonal">
        <div class="panel-h">
          <div>
            <h4>Evolução Temporal</h4>
            <p class="panel-sub">Volume de novas prescrições (barras) e performance de adesão (linha).</p>
          </div>
        </div>
        <div v-if="tsLoading" class="chart-placeholder">
          <div class="chart-loading">Carregando…</div>
        </div>
        <div v-else-if="tsFailed" class="chart-placeholder">
          <UiConnectionRetry @retry="tsExecute" />
        </div>
        <div v-else class="chart-placeholder">
          <div v-if="!hasChartData" class="chart-empty">Sem dados no período selecionado.</div>
          <svg
            class="chart-svg"
            viewBox="0 0 1000 200"
            preserveAspectRatio="none"
            style="overflow: visible; margin: 1rem 0;"
          >
            <!-- Barras de Volume (Fundo) -->
            <rect
              v-for="(p, i) in timeseriesPoints"
              :key="'bar-' + i"
              :x="(i / Math.max(1, timeseriesPoints.length - 1)) * 980"
              :y="200 - (p.pendingPrescriptions / (chartMaxPending || 1)) * 160"
              width="12"
              :height="(p.pendingPrescriptions / (chartMaxPending || 1)) * 160"
              fill="rgba(13, 99, 27, 0.15)"
              rx="2"
            />

            <!-- Linha de Adesão -->
            <path
              v-if="timeseriesPoints.length > 1"
              :d="'M ' + timeseriesPoints.map((p, i) => `${(i / (timeseriesPoints.length - 1)) * 980 + 6} ${200 - (p.adherenceRate ?? 0) * 160}`).join(' L ')"
              fill="none"
              stroke="#0d631b"
              stroke-width="5"
              stroke-linecap="round"
              stroke-linejoin="round"
              opacity="0.8"
            />
            
            <!-- Pontos de Adesão -->
            <circle
              v-for="(p, i) in timeseriesPoints"
              :key="'dot-' + i"
              :cx="(i / Math.max(1, timeseriesPoints.length - 1)) * 980 + 6"
              :cy="200 - (p.adherenceRate ?? 0) * 160"
              r="5"
              fill="white"
              stroke="#0d631b"
              stroke-width="2.5"
            />
          </svg>
          <div class="chart-axis">
            <span v-if="axisLabels.first">{{ axisLabels.first }}</span>
            <span v-if="axisLabels.mid">{{ axisLabels.mid }}</span>
            <span v-if="axisLabels.last">{{ axisLabels.last }}</span>
          </div>
          <div class="chart-legend">
            <span><span class="lg lg--bar" /> Volume de Novas Prescrições</span>
            <span><span class="lg lg--line" /> Taxa de Adesão (%)</span>
          </div>
        </div>
      </section>
    </template>
    <UiConnectionRetry v-else @retry="execute" />
  </div>
</template>

<style scoped>
.ccm {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.ccm__filters {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  align-self: flex-start;
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
.ccm__date-row {
  display: flex;
  justify-content: flex-start;
}
.ccm__date-inner {
  display: inline-flex;
  gap: 0.75rem;
  align-items: flex-end;
  padding: 0.75rem;
  border-radius: var(--uf-radius-xl);
}
.btn-today {
  border: none;
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  background: rgba(13, 99, 27, 0.1);
  color: var(--uf-primary);
  font-family: var(--uf-font);
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.lbl {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--uf-on-surface-variant);
}
.in {
  padding: 0.45rem 0.6rem;
  border: none;
  border-radius: var(--uf-radius-md);
  background: var(--uf-surface-container-highest);
  font-family: var(--uf-font);
}
.muted {
  color: var(--uf-on-surface-variant);
  font-size: 0.875rem;
}
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}
.kpi {
  padding: 1.25rem;
  border-radius: var(--uf-radius-xl);
  background: var(--uf-surface-container-lowest);
  box-shadow: var(--uf-tonal-shadow);
  transition: background 0.25s ease;
}
.kpi--hover:hover {
  background: var(--uf-primary);
  color: var(--uf-on-primary);
}
.kpi--hover:hover .kpi-label,
.kpi--hover:hover .kpi-value {
  color: inherit;
}
.kpi-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}
.kpi-icon {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--uf-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--uf-primary);
}
.kpi-icon--err {
  background: #ffdad6;
  color: var(--uf-error);
}
.kpi-icon--sec {
  background: var(--uf-secondary-container);
  color: var(--uf-primary);
}
.kpi-icon--pf {
  background: #a3f69c;
  color: var(--uf-primary);
}
.kpi-tag {
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: 0.25rem;
  text-transform: uppercase;
}
.kpi-tag--err {
  background: #ffdad6;
  color: var(--uf-error);
}
.kpi-tag--sec {
  background: var(--uf-secondary-container);
  color: var(--uf-primary);
}
.kpi-tag--pf {
  background: #a3f69c;
  color: var(--uf-primary);
}
.kpi--hover:hover .kpi-icon,
.kpi--hover:hover .kpi-tag {
  background: rgba(255, 255, 255, 0.2);
  color: var(--uf-on-primary);
}
.kpi-label {
  margin: 0 0 0.25rem;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--uf-on-surface-variant);
}
.kpi-value {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--uf-on-surface);
}
.tip {
  display: inline-flex;
  align-items: center;
  margin-left: 0.35rem;
  opacity: 0.85;
  cursor: help;
}
.panel {
  padding: 1.5rem;
  border-radius: var(--uf-radius-xl);
  background: var(--uf-surface-container-lowest);
  box-shadow: var(--uf-tonal-shadow);
}
.panel-h {
  margin-bottom: 1rem;
}
.panel h4 {
  margin: 0 0 0.25rem;
  font-size: 1rem;
  font-weight: 700;
}
.panel-sub {
  margin: 0;
  font-size: 0.75rem;
  color: var(--uf-on-surface-variant);
}
.chart-placeholder {
  min-height: 180px;
  position: relative;
}
.chart-svg {
  width: 100%;
  height: 160px;
}
.chart-loading,
.chart-empty {
  font-size: 0.875rem;
  color: var(--uf-on-surface-variant);
}
.chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.chart-axis {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  font-size: 0.65rem;
  color: var(--uf-on-surface-variant);
}
.chart-legend {
  margin-top: 0.5rem;
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: var(--uf-on-surface-variant);
}
.lg {
  display: inline-block;
  width: 0.85rem;
  height: 0.5rem;
  border-radius: 0.2rem;
  margin-right: 0.3rem;
  vertical-align: middle;
}
.lg--bar {
  background: rgba(13, 99, 27, 0.25);
}
.lg--line {
  height: 0.16rem;
  background: var(--uf-primary);
  border-radius: 999px;
}
.tonal {
  box-shadow: var(--uf-tonal-shadow);
}
</style>
