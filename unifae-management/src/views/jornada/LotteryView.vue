<script setup lang="ts">
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import UiAsyncPanel from '@/components/ui/UiAsyncPanel.vue'
import client from '@/api/client'
import { ref, watch } from 'vue'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'

type RoomRow = {
  id: number
  dataEvento: string
  trabalho: { id: number; titulo: string; cursoTrabalho: string; aluno: { name: string } | null }
  professorLider: { id: number; name: string }
  banca: { professor: { id: number; name: string } }[]
  fechada: boolean
}

const toast = useToastStore()
const confirm = useConfirmStore()

const dataEvento = ref('')
const running = ref(false)

const rooms = ref<RoomRow[]>([])
const loading = ref(false)
const failed = ref(false)

async function reloadRooms() {
  if (!dataEvento.value) {
    rooms.value = []
    return
  }
  loading.value = true
  failed.value = false
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
  if (!dataEvento.value) {
    toast.error('Informe a data do evento.')
    return
  }
  const ok = await confirm.confirm({
    message: rooms.value?.length
      ? `Já existe um sorteio para ${dataEvento.value}. Deseja regenerar? O sorteio anterior será apagado.`
      : `Executar sorteio para ${dataEvento.value}?`,
    tone: rooms.value?.length ? 'danger' : 'default',
  })
  if (!ok) return
  running.value = true
  try {
    const { data } = await client.post('/evidence-journey/lottery/run', { dataEvento: dataEvento.value })
    toast.success(`Sorteio concluído: ${data.roomsCreated} sala(s) criada(s).`)
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
    <h2 class="lottery-view__title">Sorteio de Bancas</h2>

    <div class="lottery-view__controls">
      <label class="label">Data do evento</label>
      <input v-model="dataEvento" type="date" class="input-field" />
      <button class="btn btn--primary" :disabled="running || !dataEvento" @click="runLottery">
        <span v-if="running">Executando…</span>
        <span v-else>{{ rooms?.length ? 'Regenerar Sorteio' : 'Executar Sorteio' }}</span>
      </button>
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
            <span v-if="r.fechada" class="badge badge--closed">Fechada</span>
          </div>
          <p class="room-card__title">{{ r.trabalho?.titulo }}</p>
          <p class="room-card__curso">{{ r.trabalho?.cursoTrabalho }} · {{ r.trabalho?.aluno?.name ?? '—' }}</p>
          <div class="room-card__banca">
            <p class="room-card__banca-label">Banca:</p>
            <ul class="room-card__banca-list">
              <li v-for="rp in r.banca" :key="rp.professor.id">
                {{ rp.professor.name }}
                <span v-if="rp.professor.id === r.professorLider.id" class="leader-tag">(Líder)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </UiAsyncPanel>
  </div>
</template>

<style scoped>
.lottery-view { padding: 1.5rem; }
.lottery-view__title { font-size: 1.4rem; font-weight: 700; margin: 0 0 1.25rem; }
.lottery-view__controls { display: flex; align-items: flex-end; gap: .75rem; flex-wrap: wrap; margin-bottom: 1rem; }
.lottery-view__summary { margin-bottom: 1rem; }
.label { font-size: .8rem; font-weight: 600; color: #6b7280; text-transform: uppercase; display: block; margin-bottom: .3rem; }
.input-field { padding: .45rem .75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: .9rem; }
.btn { padding: .5rem 1.1rem; border: none; border-radius: 6px; cursor: pointer; font-size: .9rem; font-weight: 600; }
.btn--primary { background: var(--color-primary, #0d631b); color: #fff; }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.summary-badge { background: #e8f5e9; color: #166534; padding: .3rem .8rem; border-radius: 12px; font-size: .85rem; font-weight: 600; }
.empty-state { text-align: center; padding: 3rem; color: #9ca3af; }
.rooms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
.room-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 1.1rem; background: #fff; }
.room-card--closed { opacity: .7; background: #f9fafb; }
.room-card__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: .5rem; }
.room-card__id { font-weight: 700; font-size: .9rem; color: var(--color-primary, #0d631b); }
.room-card__title { font-weight: 600; font-size: .95rem; margin: 0 0 .2rem; }
.room-card__curso { font-size: .82rem; color: #6b7280; margin: 0 0 .75rem; }
.room-card__banca-label { font-size: .78rem; font-weight: 600; text-transform: uppercase; color: #9ca3af; margin: 0 0 .3rem; }
.room-card__banca-list { margin: 0; padding: 0 0 0 1rem; font-size: .87rem; }
.room-card__banca-list li { margin-bottom: .15rem; }
.leader-tag { background: #fef9c3; color: #854d0e; font-size: .75rem; padding: .1rem .4rem; border-radius: 8px; margin-left: .3rem; }
.badge--closed { background: #f3f4f6; color: #6b7280; padding: .2rem .6rem; border-radius: 8px; font-size: .78rem; }
</style>
