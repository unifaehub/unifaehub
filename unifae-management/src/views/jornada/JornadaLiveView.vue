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

// ── State ─────────────────────────────────────────────────────────────────
const today  = new Date().toISOString().slice(0, 10)
const rooms  = ref<RoomStatus[]>([])
const loading = ref(false)
const lastUpdated = ref<Date | null>(null)
let timer: ReturnType<typeof setInterval> | null = null

// ── Computed ──────────────────────────────────────────────────────────────
const summary = computed(() => ({
  total:      rooms.value.length,
  completos:  rooms.value.filter((r) => r.evaluationStatus.geral === 'completo').length,
  parciais:   rooms.value.filter((r) => r.evaluationStatus.geral === 'parcial').length,
  naoIniciados: rooms.value.filter((r) => r.evaluationStatus.geral === 'nao_iniciado').length,
  fechadas:   rooms.value.filter((r) => r.fechada).length,
}))

const todayFormatted = computed(() =>
  new Date(today + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
)

// ── Data ─────────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  try {
    // Usa endpoint público (sem auth)
    const { data } = await client.get(
      `/evidence-journey/public/rooms-status?dataEvento=${today}`,
    )
    rooms.value = data
    lastUpdated.value = new Date()
  } catch { /* silencioso no projetor */ }
  finally { loading.value = false }
}

// ── Helpers ───────────────────────────────────────────────────────────────
function roomLabel(r: RoomStatus) {
  return r.hall ? `Sala ${r.hall.nome}` : `Sala #${r.id}`
}
function andar(r: RoomStatus) {
  return r.hall?.andar ?? null
}
function geralClass(g: RoomStatus['evaluationStatus']['geral']) {
  return { completo: 'geral--ok', parcial: 'geral--parcial', nao_iniciado: 'geral--none' }[g] ?? ''
}
function geralIcon(g: RoomStatus['evaluationStatus']['geral']) {
  return { completo: '✅', parcial: '⏳', nao_iniciado: '🔴' }[g] ?? ''
}
function formatTime(d: Date | null) {
  return d ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'
}

onMounted(() => {
  load()
  timer = setInterval(load, 30_000) // atualiza a cada 30 s
})
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<template>
  <div class="live-view">
    <!-- ── Cabeçalho ─────────────────────────────────────────────────────── -->
    <header class="live-header">
      <div class="live-header__brand">
        <span class="live-header__title">🎓 Jornada de Evidências e Mostra de Jogos</span>
        <span class="live-header__date">{{ todayFormatted }}</span>
      </div>
      <div class="live-header__status">
        <span class="live-dot" :class="{ 'live-dot--pulse': !loading }"></span>
        <span class="live-text">Ao vivo · atualizado às {{ formatTime(lastUpdated) }}</span>
      </div>
    </header>

    <!-- ── Sumário ───────────────────────────────────────────────────────── -->
    <div v-if="rooms.length" class="summary-row">
      <div class="s-chip s-chip--total">{{ summary.total }} Salas</div>
      <div class="s-chip s-chip--ok">✅ {{ summary.completos }} Concluídas</div>
      <div class="s-chip s-chip--par">⏳ {{ summary.parciais }} Em andamento</div>
      <div class="s-chip s-chip--none">🔴 {{ summary.naoIniciados }} Não iniciadas</div>
      <div class="s-chip s-chip--closed">🔒 {{ summary.fechadas }} Fechadas</div>
    </div>

    <!-- ── Grid de salas ─────────────────────────────────────────────────── -->
    <div v-if="rooms.length" class="rooms-grid">
      <div
        v-for="r in rooms"
        :key="r.id"
        class="room-card"
        :class="{
          'room-card--ok':     r.evaluationStatus.geral === 'completo',
          'room-card--par':    r.evaluationStatus.geral === 'parcial',
          'room-card--none':   r.evaluationStatus.geral === 'nao_iniciado',
          'room-card--closed': r.fechada,
        }"
      >
        <!-- Cabeçalho da sala -->
        <div class="rc-head">
          <div>
            <span class="rc-name">{{ roomLabel(r) }}</span>
            <span v-if="andar(r)" class="rc-andar"> · {{ andar(r) }}</span>
          </div>
          <span class="rc-status-icon">{{ geralIcon(r.evaluationStatus.geral) }}</span>
        </div>

        <!-- Tipo de sala -->
        <div v-if="r.tipoSala && r.tipoSala !== 'Geral'" class="rc-tipo">{{ r.tipoSala }}</div>

        <!-- Trabalhos -->
        <div class="rc-works">
          <div v-for="rw in r.works ?? []" :key="rw.id" class="rc-work-item">
            <span class="rc-work-num">{{ rw.ordem }}.</span>
            <div>
              <div class="rc-work-titulo">{{ rw.trabalho?.titulo }}</div>
              <div class="rc-work-curso">{{ rw.trabalho?.cursoTrabalho }}</div>
            </div>
          </div>
        </div>

        <!-- Status de avaliação -->
        <div class="rc-eval-row">
          <div class="rc-eval-block" :class="`rc-eval--${r.evaluationStatus.resumo.overall}`">
            <span class="rc-eval-label">Resumo</span>
            <span class="rc-eval-count">{{ r.evaluationStatus.resumo.done }}/{{ r.evaluationStatus.resumo.total }}</span>
          </div>
          <div class="rc-eval-block" :class="`rc-eval--${r.evaluationStatus.apresentacao.overall}`">
            <span class="rc-eval-label">Apresentação</span>
            <span class="rc-eval-count">{{ r.evaluationStatus.apresentacao.done }}/{{ r.evaluationStatus.apresentacao.total }}</span>
          </div>
        </div>

        <!-- Banca -->
        <div class="rc-banca">
          <span v-for="rp in r.banca" :key="rp.professor.id" class="rc-banca-name">
            {{ rp.professor.name }}{{ rp.professor.id === r.professorLider?.id ? ' 👑' : '' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Estado vazio -->
    <div v-else-if="!loading" class="empty-state">
      <p class="empty-text">Nenhuma sala encontrada para hoje.</p>
      <p class="empty-hint">Execute o sorteio para iniciar o evento.</p>
    </div>

    <div v-if="loading && !rooms.length" class="loading-state">Carregando salas…</div>
  </div>
</template>

<style scoped>
/* ── Layout ─────────────────────────────────────────────────────────────── */
.live-view    { min-height: 100vh; background: #0a0f1a; color: #f1f5f9; padding: 1.5rem; font-family: 'Segoe UI', Arial, sans-serif; }

/* ── Header ─────────────────────────────────────────────────────────────── */
.live-header  { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #1e293b; }
.live-header__brand { display: flex; flex-direction: column; gap: .25rem; }
.live-header__title { font-size: 1.4rem; font-weight: 800; color: #4ade80; }
.live-header__date  { font-size: .95rem; color: #94a3b8; }
.live-header__status { display: flex; align-items: center; gap: .5rem; font-size: .85rem; color: #94a3b8; }
.live-dot     { width: 10px; height: 10px; border-radius: 50%; background: #4ade80; }
.live-dot--pulse { animation: pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.85)} }

/* ── Summary ─────────────────────────────────────────────────────────────── */
.summary-row  { display: flex; gap: .75rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
.s-chip       { padding: .4rem 1rem; border-radius: 20px; font-size: .85rem; font-weight: 700; }
.s-chip--total  { background: #1e293b; color: #cbd5e1; }
.s-chip--ok     { background: #14532d; color: #86efac; }
.s-chip--par    { background: #713f12; color: #fde68a; }
.s-chip--none   { background: #7f1d1d; color: #fca5a5; }
.s-chip--closed { background: #312e81; color: #a5b4fc; }

/* ── Grid ────────────────────────────────────────────────────────────────── */
.rooms-grid   { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }

/* ── Room card ───────────────────────────────────────────────────────────── */
.room-card        { border-radius: 12px; border: 2px solid #1e293b; background: #111827; overflow: hidden; }
.room-card--ok    { border-color: #166534; }
.room-card--par   { border-color: #92400e; }
.room-card--none  { border-color: #7f1d1d; }
.room-card--closed{ border-color: #312e81; opacity: .75; }

.rc-head    { display: flex; justify-content: space-between; align-items: center; padding: .75rem 1rem; background: #1e293b; }
.rc-name    { font-size: 1rem; font-weight: 800; color: #4ade80; }
.rc-andar   { font-size: .82rem; color: #64748b; }
.rc-status-icon { font-size: 1.2rem; }
.rc-tipo    { font-size: .72rem; font-weight: 700; color: #a78bfa; background: #1e1b4b; padding: .2rem .6rem; margin: .3rem 1rem 0; border-radius: 6px; display: inline-block; }

.rc-works   { padding: .5rem 1rem; border-bottom: 1px solid #1e293b; }
.rc-work-item { display: flex; gap: .4rem; align-items: flex-start; margin-bottom: .3rem; }
.rc-work-num  { font-size: .78rem; color: #64748b; font-weight: 700; min-width: 16px; }
.rc-work-titulo { font-size: .85rem; color: #e2e8f0; font-weight: 600; }
.rc-work-curso  { font-size: .75rem; color: #64748b; }

.rc-eval-row   { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #1e293b; }
.rc-eval-block { padding: .5rem .75rem; }
.rc-eval-block + .rc-eval-block { border-left: 1px solid #1e293b; }
.rc-eval-label { font-size: .68rem; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; }
.rc-eval-count { font-size: 1.1rem; font-weight: 800; display: block; }
.rc-eval--completo     .rc-eval-count { color: #4ade80; }
.rc-eval--parcial      .rc-eval-count { color: #fbbf24; }
.rc-eval--nao_iniciado .rc-eval-count { color: #f87171; }

.rc-banca      { padding: .5rem 1rem; display: flex; flex-wrap: wrap; gap: .3rem; }
.rc-banca-name { font-size: .75rem; background: #1e293b; border-radius: 20px; padding: .15rem .55rem; color: #cbd5e1; }

/* ── Empty/Loading ─────────────────────────────────────────────────────── */
.empty-state   { text-align: center; padding: 4rem; }
.empty-text    { font-size: 1.2rem; color: #94a3b8; font-weight: 600; }
.empty-hint    { font-size: .9rem; color: #475569; margin-top: .5rem; }
.loading-state { text-align: center; padding: 3rem; color: #64748b; }
</style>
