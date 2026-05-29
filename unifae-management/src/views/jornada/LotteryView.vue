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

// ── Preview automático ────────────────────────────────────────────────────
type PreviewItem = { tipo: string; trabalhos: number; salas: number; capacidade: number }
type Preview = {
  totalWorks: number
  profsDisponiveis: number
  totalSalasNecessarias: number
  hallsConfiguradas: number
  porTipo: PreviewItem[]
}
const preview        = ref<Preview | null>(null)
const loadingPreview = ref(false)

async function loadPreview() {
  if (!dataEvento.value) { preview.value = null; return }
  loadingPreview.value = true
  try {
    const { data } = await client.get<Preview>(`/evidence-journey/lottery/preview?dataEvento=${dataEvento.value}`)
    preview.value = data
  } catch { preview.value = null }
  finally { loadingPreview.value = false }
}

// ── Salas ─────────────────────────────────────────────────────────────────
type RoomRow = {
  id: number
  dataEvento: string
  tipoSala: string | null
  hall: { nome: string; andar: string | null } | null
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

watch(dataEvento, () => { reloadRooms(); loadPreview() })

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
    const { data } = await client.post('/evidence-journey/lottery/run', { dataEvento: dataEvento.value })
    toast.success(data.message ?? `Sorteio concluído: ${data.roomsCreated} sala(s).`)
    reloadRooms()
    loadPreview()
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

    <!-- ── Preview automático ────────────────────────────────────────────── -->
    <div v-if="dataEvento" class="preview-card">
      <div class="preview-header">
        <span class="preview-title">📊 Cálculo automático</span>
        <span v-if="loadingPreview" class="preview-loading">Calculando…</span>
      </div>

      <template v-if="preview && !loadingPreview">
        <div class="preview-summary">
          <div class="ps-item">
            <span class="ps-num">{{ preview.totalWorks }}</span>
            <span class="ps-label">Trabalhos aprovados</span>
          </div>
          <div class="ps-item">
            <span class="ps-num">{{ preview.totalSalasNecessarias }}</span>
            <span class="ps-label">Salas necessárias</span>
          </div>
          <div class="ps-item">
            <span class="ps-num">{{ preview.hallsConfiguradas }}</span>
            <span class="ps-label">Salas cadastradas</span>
          </div>
          <div class="ps-item">
            <span class="ps-num">{{ preview.profsDisponiveis }}</span>
            <span class="ps-label">Profs disponíveis</span>
          </div>
        </div>

        <div v-if="preview.porTipo.length" class="preview-table-wrap">
          <table class="preview-table">
            <thead>
              <tr><th>Tipo</th><th>Trabalhos</th><th>Salas usadas</th><th>Capacidade total</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in preview.porTipo" :key="row.tipo">
                <td><span class="tipo-badge">{{ row.tipo }}</span></td>
                <td>{{ row.trabalhos }}</td>
                <td>{{ row.salas }}</td>
                <td :class="{ 'cap-warn': row.capacidade < row.trabalhos }">
                  {{ row.capacidade > 0 ? row.capacidade : '∞ (virtual)' }}
                  <span v-if="row.capacidade < row.trabalhos && row.capacidade > 0" class="warn-icon" title="Capacidade insuficiente — adicione mais salas deste tipo">⚠️</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p v-if="preview.hallsConfiguradas === 0" class="preview-hint">
          ℹ️ Nenhuma sala física cadastrada. O sorteio criará salas virtuais automaticamente.
          Configure salas em <strong>Configurações → Setores e Salas</strong> para melhor controle.
        </p>
      </template>
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
            <div>
              <span class="room-card__id">
                {{ r.hall ? `Sala ${r.hall.nome}` : `Sala #${r.id}` }}
              </span>
              <span v-if="r.hall?.andar" class="room-card__hall"> · {{ r.hall.andar }}</span>
            </div>
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
.btn { padding: .5rem 1.1rem; border: none; border-radius: 6px; cursor: pointer; font-size: .9rem; font-weight: 600; }
.btn--primary { background: var(--color-primary, #0d631b); color: #fff; }
.btn:disabled { opacity: .6; cursor: not-allowed; }

/* Preview */
.preview-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 1.25rem; background: #fafafa; }
.preview-header { display: flex; align-items: center; gap: .75rem; margin-bottom: .75rem; }
.preview-title { font-size: .9rem; font-weight: 700; }
.preview-loading { font-size: .82rem; color: #9ca3af; }
.preview-summary { display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: .75rem; }
.ps-item { display: flex; flex-direction: column; align-items: center; min-width: 80px; }
.ps-num { font-size: 1.6rem; font-weight: 900; color: #0d631b; }
.ps-label { font-size: .72rem; text-transform: uppercase; font-weight: 600; color: #6b7280; text-align: center; }
.preview-table-wrap { overflow-x: auto; }
.preview-table { width: 100%; border-collapse: collapse; font-size: .85rem; }
.preview-table th { background: #f3f4f6; padding: .4rem .6rem; text-align: left; font-size: .76rem; text-transform: uppercase; color: #6b7280; font-weight: 700; }
.preview-table td { padding: .4rem .6rem; border-bottom: 1px solid #f3f4f6; }
.tipo-badge { background: #ede9fe; color: #5b21b6; padding: .15rem .55rem; border-radius: 8px; font-size: .78rem; font-weight: 600; }
.cap-warn td { color: #dc2626; }
.warn-icon { margin-left: .3rem; }
.preview-hint { font-size: .82rem; color: #6b7280; margin: .75rem 0 0; padding: .5rem .75rem; background: #fffbeb; border-radius: 6px; border: 1px solid #fde68a; }

.summary-badge { background: #e8f5e9; color: #166534; padding: .3rem .8rem; border-radius: 12px; font-size: .85rem; font-weight: 600; }
.empty-state { text-align: center; padding: 3rem; color: #9ca3af; }
.rooms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
.room-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 1.1rem; background: #fff; }
.room-card--closed { opacity: .7; background: #f9fafb; }
.room-card__header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: .6rem; flex-wrap: wrap; gap: .25rem; }
.room-card__id { font-weight: 700; font-size: .9rem; color: var(--color-primary, #0d631b); }
.room-card__hall { font-size: .8rem; color: #6b7280; margin-left: .4rem; }
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
