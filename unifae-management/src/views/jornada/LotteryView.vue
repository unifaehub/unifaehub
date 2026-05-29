<script setup lang="ts">
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import UiAsyncPanel from '@/components/ui/UiAsyncPanel.vue'
import client from '@/api/client'
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'

const router  = useRouter()
const toast   = useToastStore()
const confirm = useConfirmStore()

// ── Tipos de sala disponíveis ─────────────────────────────────────────────
type TipoSala = 'Geral' | 'Mostra de Jogos' | 'Desenvolvimento Prático' | 'Artigo / TCC' | 'Iniciação Científica'
const TIPOS_SALA: { value: TipoSala; label: string; maxPadrao: number; hint: string }[] = [
  { value: 'Geral',                   label: 'Geral',                   maxPadrao: 10, hint: 'Aceita todos os tipos de trabalho' },
  { value: 'Mostra de Jogos',         label: 'Mostra de Jogos',         maxPadrao: 10, hint: 'Somente trabalhos de Mostra de Jogos (ex.: auditório)' },
  { value: 'Desenvolvimento Prático', label: 'Desenvolvimento Prático', maxPadrao:  5, hint: 'Demanda mais tempo — máx 5 trabalhos por padrão' },
  { value: 'Artigo / TCC',            label: 'Artigo / TCC',            maxPadrao: 10, hint: 'Trabalhos de TCC e Pesquisa' },
  { value: 'Iniciação Científica',    label: 'Iniciação Científica',    maxPadrao: 10, hint: 'Trabalhos de IC' },
]

type TipoConfig = { tipo: TipoSala; quantidade: number; maxTrabalhos: number }
const usarTiposSala  = ref(false)
const tiposConfig    = ref<TipoConfig[]>([])

function addTipo() {
  const tipo = TIPOS_SALA[0]!
  tiposConfig.value.push({ tipo: tipo.value, quantidade: 1, maxTrabalhos: tipo.maxPadrao })
}
function removeTipo(idx: number) {
  tiposConfig.value.splice(idx, 1)
}
function onTipoChange(idx: number) {
  const cfg = tiposConfig.value[idx]
  if (!cfg) return
  const found = TIPOS_SALA.find((t) => t.value === cfg.tipo)
  if (found) cfg.maxTrabalhos = found.maxPadrao
}

// ── Salas ─────────────────────────────────────────────────────────────────
type RoomRow = {
  id: number
  dataEvento: string
  tipoSala: TipoSala | null
  professorLider: { id: number; name: string }
  banca: { professor: { id: number; name: string } }[]
  works: { id: number; ordem: number; trabalho: { id: number; titulo: string; cursoTrabalho: string; aluno: { name: string } | null } }[]
  fechada: boolean
}

const dataEvento = ref('')
const running    = ref(false)
const rooms      = ref<RoomRow[]>([])
const loading    = ref(false)
const failed     = ref(false)

async function reloadRooms() {
  if (!dataEvento.value) { rooms.value = []; return }
  loading.value = true; failed.value = false
  try {
    const { data } = await client.get<RoomRow[]>(`/evidence-journey/lottery/rooms?dataEvento=${dataEvento.value}`)
    rooms.value = data
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

watch(dataEvento, reloadRooms)

async function runLottery() {
  if (!dataEvento.value) { toast.error('Informe a data do evento.'); return }

  const ok = await confirm.confirm({
    message: rooms.value?.length
      ? `Já existe um sorteio para ${dataEvento.value}. Deseja executar novamente? O sorteio anterior será apagado.`
      : `Executar sorteio para ${dataEvento.value}?`,
    tone: rooms.value?.length ? 'danger' : 'default',
  })
  if (!ok) return

  running.value = true
  try {
    const payload: { dataEvento: string; tiposSala?: TipoConfig[] } = { dataEvento: dataEvento.value }
    if (usarTiposSala.value && tiposConfig.value.length) {
      payload.tiposSala = tiposConfig.value
    }
    const { data } = await client.post('/evidence-journey/lottery/run', payload)
    toast.success(data.message ?? `Sorteio concluído: ${data.roomsCreated} sala(s).`)
    reloadRooms()
  } catch (err: any) {
    toast.error(err?.response?.data?.message ?? 'Erro ao executar sorteio.')
  } finally {
    running.value = false
  }
}
</script>

<template>
  <div class="lottery-view">
    <button class="btn-back" @click="router.push({ name: 'jornada-dashboard' })">← Voltar à Jornada</button>
    <h2 class="lottery-view__title">Sorteio de Bancas</h2>

    <!-- ── Controles principais ─────────────────────────────────────────── -->
    <div class="lottery-view__controls">
      <div class="ctrl-group">
        <label class="label">Data do evento</label>
        <input v-model="dataEvento" type="date" class="input-field" />
      </div>
      <button class="btn btn--primary" :disabled="running || !dataEvento" @click="runLottery">
        <span v-if="running">Executando…</span>
        <span v-else>{{ rooms?.length ? 'Executar Novamente' : 'Executar Sorteio' }}</span>
      </button>
    </div>

    <!-- ── Configuração de tipos de sala (opcional) ──────────────────────── -->
    <div class="tipos-card">
      <div class="tipos-header" @click="usarTiposSala = !usarTiposSala">
        <span class="tipos-title">⚙️ Configuração de tipos de sala</span>
        <span class="tipos-toggle">{{ usarTiposSala ? '▲ Ocultar' : '▼ Expandir' }}</span>
      </div>

      <div v-if="usarTiposSala" class="tipos-body">
        <p class="tipos-hint">
          Configure como os trabalhos serão distribuídos por tipo de sala.
          Se não configurado, todos os trabalhos são distribuídos em salas <strong>Geral</strong> (máx 10 por sala).
        </p>

        <div v-for="(cfg, idx) in tiposConfig" :key="idx" class="tipo-row">
          <select v-model="cfg.tipo" class="select-field" @change="onTipoChange(idx)">
            <option v-for="t in TIPOS_SALA" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
          <div class="tipo-sub">
            <label class="sub-label">Qtd de salas</label>
            <input v-model.number="cfg.quantidade" type="number" min="1" max="20" class="input-field input-sm" />
          </div>
          <div class="tipo-sub">
            <label class="sub-label">Máx trabalhos/sala</label>
            <input v-model.number="cfg.maxTrabalhos" type="number" min="1" max="20" class="input-field input-sm" />
          </div>
          <span class="tipo-hint">{{ TIPOS_SALA.find(t => t.value === cfg.tipo)?.hint }}</span>
          <button class="btn-icon-danger" @click="removeTipo(idx)" title="Remover">×</button>
        </div>

        <button class="btn btn--outline btn--sm" @click="addTipo">+ Adicionar tipo de sala</button>
      </div>
    </div>

    <div v-if="rooms?.length" class="lottery-view__summary">
      <span class="summary-badge">{{ rooms.length }} sala(s) para {{ dataEvento }}</span>
    </div>

    <UiConnectionRetry v-if="failed" @retry="reloadRooms" />

    <UiAsyncPanel :loading="loading">
      <div v-if="!dataEvento" class="empty-state">Selecione uma data para visualizar o sorteio.</div>

      <div v-else-if="!rooms?.length && !loading" class="empty-state">
        Nenhum sorteio executado para esta data.
      </div>

      <div v-else class="rooms-grid">
        <div v-for="r in rooms ?? []" :key="r.id" class="room-card" :class="{ 'room-card--closed': r.fechada }">
          <div class="room-card__header">
            <span class="room-card__id">Sala #{{ r.id }}</span>
            <div class="room-card__badges">
              <span v-if="r.tipoSala && r.tipoSala !== 'Geral'" class="badge badge--tipo">{{ r.tipoSala }}</span>
              <span v-if="r.fechada" class="badge badge--closed">Fechada</span>
            </div>
          </div>

          <div class="room-card__works">
            <p class="room-card__works-label">{{ r.works?.length ?? 0 }} trabalho(s)</p>
            <div v-for="rw in r.works ?? []" :key="rw.id" class="work-item">
              <span class="work-num">{{ rw.ordem }}.</span>
              <div>
                <p class="work-titulo">{{ rw.trabalho?.titulo }}</p>
                <p class="work-curso">{{ rw.trabalho?.cursoTrabalho }} · {{ rw.trabalho?.aluno?.name ?? '—' }}</p>
              </div>
            </div>
          </div>

          <div class="room-card__banca">
            <p class="room-card__banca-label">Banca:</p>
            <ul class="room-card__banca-list">
              <li v-for="rp in r.banca" :key="rp.professor.id">
                {{ rp.professor.name }}
                <span v-if="rp.professor.id === r.professorLider?.id" class="leader-tag">(Líder)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </UiAsyncPanel>
  </div>
</template>

<style scoped>
.btn-back { background: none; border: none; cursor: pointer; color: var(--color-primary, #0d631b); font-size: .85rem; font-weight: 600; padding: 0; margin-bottom: 1rem; display: inline-block; }
.btn-back:hover { text-decoration: underline; }
.lottery-view { padding: 1.5rem; }
.lottery-view__title { font-size: 1.4rem; font-weight: 700; margin: 0 0 1.25rem; }
.lottery-view__controls { display: flex; align-items: flex-end; gap: .75rem; flex-wrap: wrap; margin-bottom: 1rem; }
.ctrl-group { display: flex; flex-direction: column; gap: .3rem; }
.lottery-view__summary { margin-bottom: 1rem; }
.label { font-size: .8rem; font-weight: 600; color: #6b7280; text-transform: uppercase; display: block; margin-bottom: .3rem; }
.input-field { padding: .45rem .75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: .9rem; }
.input-sm { width: 70px; }
.select-field { padding: .45rem .75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: .9rem; flex: 1; min-width: 160px; }
.btn { padding: .5rem 1.1rem; border: none; border-radius: 6px; cursor: pointer; font-size: .9rem; font-weight: 600; }
.btn--primary { background: var(--color-primary, #0d631b); color: #fff; }
.btn--outline { background: #fff; border: 1px solid #d1d5db; }
.btn--sm { font-size: .8rem; padding: .3rem .7rem; margin-top: .75rem; }
.btn:disabled { opacity: .6; cursor: not-allowed; }

/* Tipos de sala */
.tipos-card { border: 1px solid #e5e7eb; border-radius: 10px; margin-bottom: 1rem; overflow: hidden; }
.tipos-header { display: flex; justify-content: space-between; align-items: center; padding: .75rem 1rem; cursor: pointer; background: #f9fafb; user-select: none; }
.tipos-title { font-size: .9rem; font-weight: 600; }
.tipos-toggle { font-size: .8rem; color: #6b7280; }
.tipos-body { padding: 1rem; background: #fff; }
.tipos-hint { font-size: .83rem; color: #6b7280; margin: 0 0 .75rem; }
.tipo-row { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; padding: .5rem 0; border-bottom: 1px solid #f3f4f6; }
.tipo-row:last-of-type { border-bottom: none; }
.tipo-sub { display: flex; flex-direction: column; gap: .2rem; }
.sub-label { font-size: .72rem; font-weight: 600; color: #6b7280; white-space: nowrap; }
.tipo-hint { flex: 1; font-size: .78rem; color: #9ca3af; min-width: 120px; }
.btn-icon-danger { background: none; border: none; cursor: pointer; font-size: 1.2rem; color: #dc2626; font-weight: 700; padding: 0 .3rem; }

.summary-badge { background: #e8f5e9; color: #166534; padding: .3rem .8rem; border-radius: 12px; font-size: .85rem; font-weight: 600; }
.empty-state { text-align: center; padding: 3rem; color: #9ca3af; }
.rooms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
.room-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 1.1rem; background: #fff; }
.room-card--closed { opacity: .7; background: #f9fafb; }
.room-card__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: .6rem; }
.room-card__id { font-weight: 700; font-size: .9rem; color: var(--color-primary, #0d631b); }
.room-card__badges { display: flex; gap: .3rem; flex-wrap: wrap; }
.badge--tipo { background: #ede9fe; color: #5b21b6; font-size: .72rem; padding: .15rem .5rem; border-radius: 8px; font-weight: 600; }
.badge--closed { background: #f3f4f6; color: #6b7280; padding: .2rem .6rem; border-radius: 8px; font-size: .78rem; }
.room-card__works { margin-bottom: .75rem; }
.room-card__works-label { font-size: .72rem; font-weight: 700; text-transform: uppercase; color: #9ca3af; margin: 0 0 .4rem; }
.work-item { display: flex; gap: .4rem; align-items: flex-start; margin-bottom: .35rem; }
.work-num { font-size: .8rem; font-weight: 700; color: #9ca3af; min-width: 16px; }
.work-titulo { font-weight: 600; font-size: .88rem; margin: 0; }
.work-curso { font-size: .78rem; color: #6b7280; margin: 1px 0 0; }
.room-card__banca-label { font-size: .72rem; font-weight: 600; text-transform: uppercase; color: #9ca3af; margin: 0 0 .3rem; }
.room-card__banca-list { margin: 0; padding: 0 0 0 1rem; font-size: .87rem; }
.room-card__banca-list li { margin-bottom: .15rem; }
.leader-tag { background: #fef9c3; color: #854d0e; font-size: .75rem; padding: .1rem .4rem; border-radius: 8px; margin-left: .3rem; }
</style>
