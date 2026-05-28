<script setup lang="ts">
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import UiAsyncPanel from '@/components/ui/UiAsyncPanel.vue'
import client from '@/api/client'
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useApiRequest } from '@/composables/useApiRequest'

const router = useRouter()

type RoomRow = {
  id: number
  dataEvento: string
  trabalho: { id: number; titulo: string; cursoTrabalho: string; aluno: { name: string } | null }
  professorLider: { id: number; name: string }
  banca: { professor: { id: number; name: string } }[]
  fechada: boolean
}

const dataEvento = ref('')

const { data: rooms, loading, failed, execute } = useApiRequest<RoomRow[]>(async () => {
  if (!dataEvento.value) return []
  const { data } = await client.get(`/evidence-journey/lottery/rooms?dataEvento=${dataEvento.value}`)
  return data
})

watch(dataEvento, execute)
</script>

<template>
  <div class="rooms-view">
    <button class="btn-back" @click="router.push({ name: 'jornada-dashboard' })">← Voltar à Jornada</button>
    <h2 class="rooms-view__title">Salas e Bancas</h2>

    <div class="rooms-view__filter">
      <label class="label">Data do evento</label>
      <input v-model="dataEvento" type="date" class="input-field" />
    </div>

    <div v-if="!dataEvento" class="empty-state">Selecione uma data para ver as salas.</div>

    <UiConnectionRetry v-else-if="failed" @retry="execute" />

    <UiAsyncPanel v-else :loading="loading">
      <div v-if="!rooms?.length && !loading" class="empty-state">Nenhuma sala para esta data.</div>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Sala</th>
            <th>Trabalho</th>
            <th>Curso</th>
            <th>Aluno</th>
            <th>Líder</th>
            <th>Banca</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rooms ?? []" :key="r.id">
            <td><strong>#{{ r.id }}</strong></td>
            <td class="td-title">{{ r.trabalho?.titulo }}</td>
            <td>{{ r.trabalho?.cursoTrabalho }}</td>
            <td>{{ r.trabalho?.aluno?.name ?? '—' }}</td>
            <td>{{ r.professorLider?.name }}</td>
            <td>
              <span v-for="(rp, i) in r.banca" :key="rp.professor.id">
                {{ rp.professor.name }}{{ i < r.banca.length - 1 ? ', ' : '' }}
              </span>
            </td>
            <td>
              <span v-if="r.fechada" class="badge badge--closed">Fechada</span>
              <span v-else class="badge badge--open">Aberta</span>
            </td>
          </tr>
        </tbody>
      </table>
    </UiAsyncPanel>
  </div>
</template>

<style scoped>
.btn-back { background: none; border: none; cursor: pointer; color: var(--color-primary, #0d631b); font-size: .85rem; font-weight: 600; padding: 0; margin-bottom: 1rem; display: inline-block; }
.btn-back:hover { text-decoration: underline; }
.rooms-view { padding: 1.5rem; }
.rooms-view__title { font-size: 1.4rem; font-weight: 700; margin: 0 0 1.25rem; }
.rooms-view__filter { display: flex; align-items: flex-end; gap: .75rem; margin-bottom: 1.25rem; }
.label { font-size: .8rem; font-weight: 600; color: #6b7280; text-transform: uppercase; display: block; margin-bottom: .3rem; }
.input-field { padding: .45rem .75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: .9rem; }
.empty-state { text-align: center; padding: 3rem; color: #9ca3af; }
.data-table { width: 100%; border-collapse: collapse; font-size: .88rem; }
.data-table th, .data-table td { padding: .55rem .75rem; border-bottom: 1px solid #f3f4f6; text-align: left; }
.data-table th { background: #f9fafb; font-weight: 600; font-size: .78rem; text-transform: uppercase; color: #6b7280; }
.td-title { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.badge { padding: .2rem .6rem; border-radius: 10px; font-size: .78rem; font-weight: 600; }
.badge--closed { background: #f3f4f6; color: #6b7280; }
.badge--open { background: #dcfce7; color: #166534; }
</style>
