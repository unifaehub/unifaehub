<script setup lang="ts">
import client from '@/api/client'
import { ref, computed, onMounted, onUnmounted } from 'vue'

// ── Types (mesmos do RoomsView) ────────────────────────────────────────────
type PendingProf = { id: number; name: string }
type EvalSection = {
  total: number; done: number; pending: PendingProf[]
  overall: 'completo' | 'parcial' | 'nao_iniciado' | 'sem_perguntas'
}
type RoomStatus = {
  id: number; dataEvento: string; fechada: boolean
  hall: { id: number; nome: string; andar: string | null } | null
  tipoSala: string | null
  works: { id: number; ordem: number; trabalho: { titulo: string; cursoTrabalho: string; aluno: { name: string } | null } }[]
  professorLider: { id: number; name: string } | null
  banca: { professor: { id: number; name: string } }[]
  evaluationStatus: { resumo: EvalSection; apresentacao: EvalSection; geral: 'completo' | 'parcial' | 'nao_iniciado' }
}

// ── State — data sempre = hoje ────────────────────────────────────────────
const today     = new Date().toISOString().slice(0, 10)
const rooms     = ref<RoomStatus[]>([])
const loading   = ref(false)
const lastUpdated = ref<Date | null>(null)
let timer: ReturnType<typeof setInterval> | null = null

const summary = computed(() => ({
  total:        rooms.value.length,
  completos:    rooms.value.filter((r) => r.evaluationStatus.geral === 'completo').length,
  parciais:     rooms.value.filter((r) => r.evaluationStatus.geral === 'parcial').length,
  naoIniciados: rooms.value.filter((r) => r.evaluationStatus.geral === 'nao_iniciado').length,
  fechadas:     rooms.value.filter((r) => r.fechada).length,
}))

const todayFormatted = computed(() =>
  new Date(today + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
)

/** Auditório primeiro, depois por nome (numérico/alfa). */
function sortRooms(list: RoomStatus[]): RoomStatus[] {
  return [...list].sort((a, b) => {
    const na = a.hall?.nome ?? `#${a.id}`
    const nb = b.hall?.nome ?? `#${b.id}`
    const isAudA = /audit[oó]rio/i.test(na)
    const isAudB = /audit[oó]rio/i.test(nb)
    if (isAudA && !isAudB) return -1
    if (!isAudA && isAudB) return  1
    return na.localeCompare(nb, 'pt-BR', { numeric: true })
  })
}

async function load() {
  loading.value = true
  try {
    const { data } = await client.get(
      `/evidence-journey/public/rooms-status?dataEvento=${today}`,
    )
    rooms.value = sortRooms(data)
    lastUpdated.value = new Date()
  } catch { /* silencioso */ }
  finally { loading.value = false }
}

// ── Helpers (idênticos ao RoomsView) ─────────────────────────────────────
function roomLabel(r: RoomStatus) {
  if (!r.hall) return `Sala #${r.id}`
  // Sala específica (Auditório, Lab, etc.) → mostra o nome da sala física
  // Sala genérica (Geral) → mostra o número/nome normalmente
  return `Sala ${r.hall.nome}`
}

function firstName(fullName: string) {
  return fullName.split(' ')[0] ?? fullName
}
function overallLabel(s: EvalSection['overall']): string {
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
  return d ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'
}

/** Professor entregou resumo + apresentação para todos os trabalhos da sala. */
function profDone(r: RoomStatus, profId: number): boolean {
  if (r.evaluationStatus.geral === 'nao_iniciado') return false
  const inResumo = r.evaluationStatus.resumo.pending.some((p) => p.id === profId)
  const inApres  = r.evaluationStatus.apresentacao.pending.some((p) => p.id === profId)
  return !inResumo && !inApres
}

onMounted(() => { load(); timer = setInterval(load, 30_000) })
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<template>
  <div class="rooms-view">
    <!-- ── Cabeçalho ──────────────────────────────────────────────────── -->
    <div class="rooms-view__toolbar">
      <div class="event-info">
        <h2 class="rooms-view__title">🎓 Jornada de Evidências e Mostra de Jogos</h2>
        <p class="event-date">{{ todayFormatted }}</p>
      </div>
      <div class="live-indicator">
        <span class="live-dot" :class="{ 'live-dot--loading': loading }"></span>
        <span class="live-text">Ao vivo · atualizado às {{ formatTime(lastUpdated) }}</span>
        <button class="btn-refresh" :disabled="loading" @click="load">↻</button>
      </div>
    </div>

    <template v-if="rooms.length || loading">
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

      <div v-if="loading && !rooms.length" class="loading-state">Carregando salas…</div>

      <!-- ── Cards de salas ─────────────────────────────────────────── -->
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
          <!-- Cabeçalho -->
          <div class="room-card__header">
            <div class="room-card__left">
              <span class="room-card__id">
                {{ roomLabel(r) }}
                <span v-if="r.hall?.andar" class="room-card__andar"> · {{ r.hall.andar }}</span>
              </span>
              <span v-if="r.fechada" class="badge badge--closed">🔒 Fechada</span>
            </div>
          </div>

          <!-- Tipo de sala -->
          <div
            v-if="r.tipoSala"
            class="room-card__tipo"
            :class="{ 'room-card__tipo--geral': r.tipoSala === 'Geral' }"
          >{{ r.tipoSala }}</div>

          <!-- Status geral -->
          <div class="room-card__geral">{{ geralLabel(r.evaluationStatus.geral) }}</div>

          <!-- Trabalhos -->
          <div class="room-card__works">
            <div v-for="rw in r.works ?? []" :key="rw.id" class="work-item">
              <span class="work-num">{{ rw.ordem }}.</span>
              <div>
                <div class="work-titulo">{{ rw.trabalho?.titulo }}</div>
                <div class="work-curso">{{ rw.trabalho?.cursoTrabalho }} · {{ rw.trabalho?.aluno ? firstName(rw.trabalho.aluno.name) : '—' }}</div>
              </div>
            </div>
          </div>

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

          <!-- Banca — apenas primeiro nome; chip verde quando completou -->
          <div class="room-card__banca-row">
            <span
              v-for="rp in r.banca"
              :key="rp.professor.id"
              class="banca-chip"
              :class="{ 'banca-chip--done': profDone(r, rp.professor.id) }"
              :title="`${rp.professor.name}${profDone(r, rp.professor.id) ? ' — Avaliações entregues ✅' : ' — Aguardando envio'}`"
            >
              {{ firstName(rp.professor.name) }}{{ rp.professor.id === r.professorLider?.id ? ' 👑' : '' }}
              <span v-if="profDone(r, rp.professor.id)" class="chip-check">✓</span>
            </span>
          </div>
        </div>
      </div>
    </template>

    <div v-else-if="!loading" class="empty-state">Nenhuma sala encontrada para hoje. Execute o sorteio para iniciar o evento.</div>
  </div>
</template>

<style scoped>
/* ── Base (idêntico ao RoomsView) ────────────────────────────────────────── */
.rooms-view { padding: 1.5rem; background: #f8fafc; min-height: 100vh; }
.rooms-view__toolbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
.event-info  { display: flex; flex-direction: column; gap: .2rem; }
.rooms-view__title { font-size: 1.3rem; font-weight: 700; margin: 0; color: #111; }
.event-date  { font-size: .88rem; color: #6b7280; margin: 0; }

/* Live indicator */
.live-indicator { display: flex; align-items: center; gap: .5rem; font-size: .82rem; color: #6b7280; }
.live-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; animation: pulse 2s infinite; }
.live-dot--loading { background: #f59e0b; animation: none; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
.btn-refresh { background: none; border: 1px solid #d1d5db; border-radius: 6px; padding: .2rem .55rem; cursor: pointer; font-size: .9rem; }
.btn-refresh:disabled { opacity: .5; cursor: not-allowed; }

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
.room-card { border-radius: 10px; border: 2px solid #e5e7eb; background: #fff; overflow: hidden; }
.room-card--complete { border-color: #86efac; }
.room-card--partial  { border-color: #fcd34d; }
.room-card--none     { border-color: #fca5a5; }
.room-card--closed   { border-color: #a5b4fc; opacity: .85; }

.room-card__header { display: flex; justify-content: space-between; align-items: center; padding: .75rem 1rem; background: #f9fafb; }
.room-card__left   { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
.room-card__id     { font-weight: 700; font-size: .95rem; color: #0d631b; }
.room-card__andar  { font-size: .8rem; color: #6b7280; font-weight: 400; }
.room-card__tipo          { font-size: .72rem; font-weight: 700; color: #5b21b6; background: #ede9fe; padding: .15rem .6rem; margin: .3rem 1rem 0; border-radius: 8px; display: inline-block; }
.room-card__tipo--geral   { color: #374151; background: #f3f4f6; }
.room-card__geral  { padding: .25rem 1rem .4rem; font-size: .8rem; color: #555; }

/* Trabalhos */
.room-card__works { padding: .4rem 1rem .6rem; border-top: 1px solid #f3f4f6; }
.work-item  { display: flex; gap: .4rem; align-items: flex-start; margin-bottom: .25rem; }
.work-num   { font-size: .78rem; color: #9ca3af; font-weight: 700; min-width: 16px; }
.work-titulo { font-size: .88rem; font-weight: 600; color: #111; }
.work-curso  { font-size: .75rem; color: #6b7280; }

/* Eval */
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

/* Banca */
.room-card__banca-row { display: flex; flex-wrap: wrap; gap: .3rem; padding: .5rem 1rem; border-top: 1px solid #f3f4f6; }
.banca-chip           { font-size: .75rem; background: #f3f4f6; border-radius: 20px; padding: .15rem .55rem; color: #374151; display: flex; align-items: center; gap: .25rem; transition: background .2s, color .2s; }
.banca-chip--done     { background: #dcfce7; color: #166534; border: 1px solid #86efac; font-weight: 600; }
.chip-check           { font-size: .7rem; font-weight: 700; }

/* Empty/loading */
.empty-state   { text-align: center; padding: 3rem; color: #9ca3af; }
.loading-state { text-align: center; padding: 2rem; color: #9ca3af; }
</style>
