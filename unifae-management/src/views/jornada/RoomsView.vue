<script setup lang="ts">
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import client from '@/api/client'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// ── Types ─────────────────────────────────────────────────────────────────────
type PendingProf = { id: number; name: string }
type EvalSection = {
  total: number
  done: number
  pending: PendingProf[]
  overall: 'completo' | 'parcial' | 'nao_iniciado' | 'sem_perguntas'
}
type RoomStatus = {
  id: number
  dataEvento: string
  fechada: boolean
  trabalho: { id: number; titulo: string; cursoTrabalho: string; aluno: { name: string } | null } | null
  professorLider: { id: number; name: string } | null
  banca: { professor: { id: number; name: string } }[]
  evaluationStatus: {
    resumo:       EvalSection
    apresentacao: EvalSection
    geral: 'completo' | 'parcial' | 'nao_iniciado'
  }
}

// ── State ─────────────────────────────────────────────────────────────────────
const dataEvento   = ref('')
const rooms        = ref<RoomStatus[]>([])
const loading      = ref(false)
const failed       = ref(false)
const lastUpdated  = ref<Date | null>(null)
const expandedRoom = ref<number | null>(null)
let   timer: ReturnType<typeof setInterval> | null = null

// ── Computed ──────────────────────────────────────────────────────────────────
const summary = computed(() => {
  const total     = rooms.value.length
  const completos = rooms.value.filter((r) => r.evaluationStatus.geral === 'completo').length
  const parciais  = rooms.value.filter((r) => r.evaluationStatus.geral === 'parcial').length
  const naoIniciados = rooms.value.filter((r) => r.evaluationStatus.geral === 'nao_iniciado').length
  const fechadas  = rooms.value.filter((r) => r.fechada).length
  return { total, completos, parciais, naoIniciados, fechadas }
})

// ── Data ──────────────────────────────────────────────────────────────────────
async function load() {
  if (!dataEvento.value) { rooms.value = []; return }
  loading.value = true; failed.value = false
  try {
    const { data } = await client.get(`/evidence-journey/lottery/rooms/status?dataEvento=${dataEvento.value}`)
    rooms.value    = data
    lastUpdated.value = new Date()
  } catch { failed.value = true }
  finally { loading.value = false }
}

function printReport() {
  // Abrir janela de impressão com HTML formatado para PDF
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return

  const eventDate = new Date(dataEvento.value + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const rows = rooms.value.map((r, i) => `
    <tr style="page-break-inside:avoid">
      <td style="font-weight:700;vertical-align:top;padding:10px 8px;border:1px solid #ccc">#${r.id}</td>
      <td style="padding:10px 8px;border:1px solid #ccc">
        <div style="font-weight:700;margin-bottom:4px">${r.trabalho?.titulo ?? '—'}</div>
        <div style="color:#555;font-size:12px">${r.trabalho?.cursoTrabalho ?? ''} · Aluno: ${r.trabalho?.aluno?.name ?? '—'}</div>
      </td>
      <td style="padding:10px 8px;border:1px solid #ccc;vertical-align:top">
        ${(r.banca ?? []).map((rp) =>
          `<div>${rp.professor.name}${r.professorLider?.id === rp.professor.id ? ' 👑' : ''}</div>`
        ).join('')}
      </td>
      <td style="padding:10px 8px;border:1px solid #ccc;text-align:center;vertical-align:top">
        <span style="background:${r.fechada ? '#e0e7ff' : '#dcfce7'};padding:3px 10px;border-radius:12px;font-size:12px">
          ${r.fechada ? '🔒 Fechada' : '✅ Aberta'}
        </span>
      </td>
    </tr>
  `).join('')

  win.document.write(`
    <!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <title>Relatório de Salas — ${eventDate}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; font-size: 13px; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      h2 { font-size: 14px; color: #555; font-weight: normal; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #0d631b; color: #fff; padding: 8px; text-align: left; font-size: 12px; }
      tr:nth-child(even) td { background: #f9f9f9; }
      @media print { @page { size: A4; margin: 1.5cm; } }
    </style>
    </head><body>
    <h1>🎓 Jornada Científica e Mostra de Jogos</h1>
    <h2>Relatório de Bancas — ${eventDate}</h2>
    <table>
      <thead><tr>
        <th style="width:60px">Sala</th>
        <th>Trabalho</th>
        <th style="width:220px">Banca</th>
        <th style="width:90px">Status</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:24px;font-size:11px;color:#888">
      Gerado em ${new Date().toLocaleString('pt-BR')} · ${rooms.value.length} sala(s)
    </div>
    <script>window.onload = () => { window.print(); }<\/script>
    </body></html>
  `)
  win.document.close()
}

function startTimer() {
  stopTimer()
  if (!dataEvento.value) return
  timer = setInterval(() => load(), 30_000) // atualiza a cada 30s
}

function stopTimer() {
  if (timer) { clearInterval(timer); timer = null }
}

watch(dataEvento, () => { load(); startTimer() })
onMounted(() => startTimer())
onUnmounted(() => stopTimer())

// ── Helpers ───────────────────────────────────────────────────────────────────
function overallLabel(s: EvalSection['overall'] | 'sem_perguntas'): string {
  if (s === 'completo')     return '✅ Completo'
  if (s === 'parcial')      return '⏳ Parcial'
  if (s === 'nao_iniciado') return '🔴 Não iniciado'
  return '—'
}
function overallClass(s: string) {
  if (s === 'completo')     return 'badge--complete'
  if (s === 'parcial')      return 'badge--partial'
  if (s === 'nao_iniciado') return 'badge--none'
  return ''
}
function geralLabel(s: RoomStatus['evaluationStatus']['geral']) {
  if (s === 'completo')     return '✅ Todas as avaliações entregues'
  if (s === 'parcial')      return '⏳ Avaliações em andamento'
  return '🔴 Nenhuma avaliação iniciada'
}
function formatTime(d: Date | null) {
  if (!d) return '—'
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
</script>

<template>
  <div class="rooms-view">
    <button class="btn-back" @click="router.push({ name: 'jornada-dashboard' })">← Voltar à Jornada</button>
    <h2 class="rooms-view__title">Salas e Bancas — Acompanhamento ao Vivo</h2>

    <div class="rooms-view__toolbar">
      <div class="filter-group">
        <label class="label">Data do evento</label>
        <input v-model="dataEvento" type="date" class="input-field" />
      </div>
      <div v-if="dataEvento" class="live-indicator">
        <span class="live-dot" :class="{ 'live-dot--loading': loading }"></span>
        <span class="live-text">Ao vivo · atualizado às {{ formatTime(lastUpdated) }}</span>
        <button class="btn-refresh" :disabled="loading" @click="load">↻</button>
      </div>
      <button v-if="rooms.length" class="btn-pdf" @click="printReport">🖨️ Exportar PDF</button>
    </div>

    <div v-if="!dataEvento" class="empty-state">Selecione uma data para ver as salas.</div>
    <UiConnectionRetry v-else-if="failed && !rooms.length" @retry="load" />

    <template v-else-if="rooms.length || loading">
      <!-- ── Sumário ──────────────────────────────────────────────────── -->
      <div v-if="!loading && rooms.length" class="summary-bar">
        <div class="summary-item summary-item--total">
          <span class="si-num">{{ summary.total }}</span>
          <span class="si-label">Salas</span>
        </div>
        <div class="summary-item summary-item--complete">
          <span class="si-num">{{ summary.completos }}</span>
          <span class="si-label">Completas</span>
        </div>
        <div class="summary-item summary-item--partial">
          <span class="si-num">{{ summary.parciais }}</span>
          <span class="si-label">Parciais</span>
        </div>
        <div class="summary-item summary-item--none">
          <span class="si-num">{{ summary.naoIniciados }}</span>
          <span class="si-label">Não iniciadas</span>
        </div>
        <div class="summary-item summary-item--closed">
          <span class="si-num">{{ summary.fechadas }}</span>
          <span class="si-label">Fechadas</span>
        </div>
      </div>

      <!-- ── Cards de salas ─────────────────────────────────────────── -->
      <div v-if="loading && !rooms.length" class="loading-state">Carregando salas…</div>

      <div class="rooms-grid">
        <div
          v-for="r in rooms"
          :key="r.id"
          class="room-card"
          :class="{
            'room-card--complete': r.evaluationStatus.geral === 'completo',
            'room-card--partial':  r.evaluationStatus.geral === 'parcial',
            'room-card--none':     r.evaluationStatus.geral === 'nao_iniciado',
            'room-card--closed':   r.fechada,
          }"
        >
          <!-- Cabeçalho da sala -->
          <div class="room-card__header" @click="expandedRoom = expandedRoom === r.id ? null : r.id">
            <div class="room-card__left">
              <span class="room-card__id">Sala #{{ r.id }}</span>
              <span v-if="r.fechada" class="badge badge--closed">🔒 Fechada</span>
            </div>
            <span class="room-card__expand">{{ expandedRoom === r.id ? '▲' : '▼' }}</span>
          </div>

          <!-- Trabalho + status geral -->
          <div class="room-card__work">
            <p class="room-card__titulo" :title="r.trabalho?.titulo">{{ r.trabalho?.titulo ?? '—' }}</p>
            <p class="room-card__curso">{{ r.trabalho?.cursoTrabalho }} · {{ r.trabalho?.aluno?.name ?? '—' }}</p>
          </div>

          <div class="room-card__geral">{{ geralLabel(r.evaluationStatus.geral) }}</div>

          <!-- Status Resumo / Apresentação -->
          <div class="eval-row">
            <div class="eval-block" :class="overallClass(r.evaluationStatus.resumo.overall)">
              <span class="eval-label">Resumo</span>
              <span class="eval-count">{{ r.evaluationStatus.resumo.done }}/{{ r.evaluationStatus.resumo.total }}</span>
              <span class="eval-badge">{{ overallLabel(r.evaluationStatus.resumo.overall) }}</span>
            </div>
            <div class="eval-block" :class="overallClass(r.evaluationStatus.apresentacao.overall)">
              <span class="eval-label">Apresentação</span>
              <span class="eval-count">{{ r.evaluationStatus.apresentacao.done }}/{{ r.evaluationStatus.apresentacao.total }}</span>
              <span class="eval-badge">{{ overallLabel(r.evaluationStatus.apresentacao.overall) }}</span>
            </div>
          </div>

          <!-- Detalhes expandidos -->
          <div v-if="expandedRoom === r.id" class="room-card__details">
            <div class="detail-section">
              <p class="detail-title">Banca</p>
              <ul class="detail-list">
                <li v-for="rp in r.banca" :key="rp.professor.id">
                  {{ rp.professor.name }}
                  <span v-if="rp.professor.id === r.professorLider?.id" class="tag-lider">Líder</span>
                </li>
              </ul>
            </div>

            <!-- Pendentes Resumo -->
            <div v-if="r.evaluationStatus.resumo.pending.length" class="detail-section detail-section--warn">
              <p class="detail-title">⚠️ Resumo — faltam avaliações</p>
              <ul class="detail-list">
                <li v-for="p in r.evaluationStatus.resumo.pending" :key="p.id">{{ p.name }}</li>
              </ul>
            </div>

            <!-- Pendentes Apresentação -->
            <div v-if="r.evaluationStatus.apresentacao.pending.length" class="detail-section detail-section--warn">
              <p class="detail-title">⚠️ Apresentação — faltam avaliações</p>
              <ul class="detail-list">
                <li v-for="p in r.evaluationStatus.apresentacao.pending" :key="p.id">{{ p.name }}</li>
              </ul>
            </div>

            <div v-if="!r.evaluationStatus.resumo.pending.length && !r.evaluationStatus.apresentacao.pending.length && !r.fechada"
                 class="detail-section detail-section--ok">
              <p>✅ Todos os professores entregaram as avaliações.</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else-if="dataEvento && !loading" class="empty-state">Nenhuma sala para esta data.</div>
  </div>
</template>

<style scoped>
.btn-back { background: none; border: none; cursor: pointer; color: var(--color-primary, #0d631b); font-size: .85rem; font-weight: 600; padding: 0; margin-bottom: 1rem; display: inline-block; }
.btn-back:hover { text-decoration: underline; }
.rooms-view { padding: 1.5rem; }
.rooms-view__title { font-size: 1.4rem; font-weight: 700; margin: 0 0 1.25rem; }
.rooms-view__toolbar { display: flex; align-items: flex-end; gap: 1.5rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
.filter-group { display: flex; flex-direction: column; gap: .3rem; }
.label { font-size: .78rem; font-weight: 600; color: #6b7280; text-transform: uppercase; }
.input-field { padding: .45rem .75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: .9rem; }

/* Live indicator */
.live-indicator { display: flex; align-items: center; gap: .5rem; font-size: .82rem; color: #6b7280; }
.live-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; animation: pulse 2s infinite; }
.live-dot--loading { background: #f59e0b; animation: none; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
.btn-refresh { background: none; border: 1px solid #d1d5db; border-radius: 6px; padding: .2rem .55rem; cursor: pointer; font-size: .9rem; }
.btn-refresh:hover { background: #f9fafb; }
.btn-refresh:disabled { opacity: .5; cursor: not-allowed; }
.btn-pdf { background: #0d631b; color: #fff; border: none; border-radius: 8px; padding: .4rem .9rem; font-size: .85rem; font-weight: 600; cursor: pointer; white-space: nowrap; }
.btn-pdf:hover { background: #065f17; }

/* Summary */
.summary-bar { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.summary-item { display: flex; flex-direction: column; align-items: center; padding: .6rem 1.1rem; border-radius: 8px; min-width: 80px; }
.summary-item--total    { background: #f3f4f6; }
.summary-item--complete { background: #dcfce7; }
.summary-item--partial  { background: #fef3c7; }
.summary-item--none     { background: #fee2e2; }
.summary-item--closed   { background: #e0e7ff; }
.si-num   { font-size: 1.5rem; font-weight: 800; }
.si-label { font-size: .72rem; text-transform: uppercase; font-weight: 600; color: #6b7280; margin-top: 2px; }

/* Grid */
.rooms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; }
.room-card { border-radius: 10px; border: 2px solid #e5e7eb; background: #fff; overflow: hidden; transition: box-shadow .15s; }
.room-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.06); }
.room-card--complete { border-color: #86efac; }
.room-card--partial  { border-color: #fcd34d; }
.room-card--none     { border-color: #fca5a5; }
.room-card--closed   { border-color: #a5b4fc; opacity: .85; }

.room-card__header { display: flex; justify-content: space-between; align-items: center; padding: .75rem 1rem; background: #f9fafb; cursor: pointer; user-select: none; }
.room-card__left   { display: flex; align-items: center; gap: .5rem; }
.room-card__id     { font-weight: 700; font-size: .95rem; color: #0d631b; }
.room-card__expand { font-size: .8rem; color: #9ca3af; }

.room-card__work   { padding: .6rem 1rem .3rem; }
.room-card__titulo { font-size: .9rem; font-weight: 600; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.room-card__curso  { font-size: .78rem; color: #6b7280; margin: 2px 0 0; }

.room-card__geral  { padding: .2rem 1rem .5rem; font-size: .8rem; color: #555; }

.eval-row   { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-top: 1px solid #f3f4f6; }
.eval-block { padding: .6rem .75rem; display: flex; flex-direction: column; gap: 2px; }
.eval-block + .eval-block { border-left: 1px solid #f3f4f6; }
.eval-label { font-size: .72rem; font-weight: 700; text-transform: uppercase; color: #9ca3af; }
.eval-count { font-size: 1.1rem; font-weight: 800; }
.eval-badge { font-size: .75rem; }
.badge--complete { background: #f0fdf4; }
.badge--partial  { background: #fffbeb; }
.badge--none     { background: #fef2f2; }
.badge--closed   { background: #e0e7ff; color: #4338ca; }

/* Details */
.room-card__details { padding: .75rem 1rem; border-top: 1px solid #f3f4f6; background: #fafafa; }
.detail-section { margin-bottom: .6rem; }
.detail-section--warn { background: #fffbeb; border-radius: 6px; padding: .4rem .6rem; }
.detail-section--ok   { color: #16a34a; font-size: .85rem; }
.detail-title { font-size: .78rem; font-weight: 700; color: #374151; margin: 0 0 .3rem; }
.detail-list  { margin: 0; padding-left: 1.2rem; font-size: .82rem; color: #374151; }
.detail-list li { margin-bottom: 2px; }
.tag-lider { background: #dcfce7; color: #166534; border-radius: 4px; padding: 0 .4rem; font-size: .7rem; font-weight: 700; margin-left: .3rem; }

/* Empty / loading */
.empty-state   { text-align: center; padding: 3rem; color: #9ca3af; }
.loading-state { text-align: center; padding: 2rem; color: #9ca3af; }
</style>
