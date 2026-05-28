<script setup lang="ts">
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import UiAsyncPanel from '@/components/ui/UiAsyncPanel.vue'
import client from '@/api/client'
import { ref, watch } from 'vue'
import { useApiRequest } from '@/composables/useApiRequest'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'

type Professor = {
  id: number
  name: string
  email: string
  registroFuncional: string | null
  cursoBase: string | null
}

type Availability = {
  id: number
  professorId: number
  dataEvento: string
  professor: { id: number; name: string }
}

const toast = useToastStore()
const confirm = useConfirmStore()

const filterDate = ref('')
const newProfessorId = ref<number | ''>('')
const newDataEvento = ref('')
const adding = ref(false)

const { data: professors, loading: loadingProfs, failed: failedProfs, execute: reloadProfs } = useApiRequest<Professor[]>(async () => {
  const { data } = await client.get('/evidence-journey/professors')
  return data
})

const { data: availabilities, loading: loadingAvail, failed: failedAvail, execute: reloadAvail } = useApiRequest<Availability[]>(async () => {
  const params = filterDate.value ? `?dataEvento=${filterDate.value}` : ''
  const { data } = await client.get(`/evidence-journey/professors/availabilities${params}`)
  return data
})

reloadProfs()
watch(filterDate, reloadAvail, { immediate: true })

async function addAvailability() {
  if (!newProfessorId.value || !newDataEvento.value) {
    toast.error('Selecione professor e data.')
    return
  }
  adding.value = true
  try {
    await client.post('/evidence-journey/professors/availabilities', {
      professorId: Number(newProfessorId.value),
      dataEvento: newDataEvento.value,
    })
    toast.success('Disponibilidade adicionada.')
    newProfessorId.value = ''
    newDataEvento.value = ''
    reloadAvail()
  } catch {
    toast.error('Erro ao adicionar disponibilidade.')
  } finally {
    adding.value = false
  }
}

async function removeAvailability(id: number) {
  const ok = await confirm.confirm({ message: 'Remover disponibilidade deste professor?', tone: 'danger' })
  if (!ok) return
  try {
    await client.delete(`/evidence-journey/professors/availabilities/${id}`)
    toast.success('Disponibilidade removida.')
    reloadAvail()
  } catch {
    toast.error('Erro ao remover disponibilidade.')
  }
}
</script>

<template>
  <div class="profs-view">
    <h2 class="profs-view__title">Professores e Disponibilidades</h2>

    <div class="profs-view__grid">
      <!-- Lista de professores -->
      <section class="card">
        <h3 class="card__title">Professores cadastrados</h3>
        <UiConnectionRetry v-if="failedProfs" @retry="reloadProfs" />
        <UiAsyncPanel :loading="loadingProfs">
          <table class="data-table">
            <thead>
              <tr><th>Nome</th><th>E-mail</th><th>Reg. Funcional</th><th>Curso Base</th></tr>
            </thead>
            <tbody>
              <tr v-for="p in professors ?? []" :key="p.id">
                <td>{{ p.name }}</td>
                <td>{{ p.email }}</td>
                <td>{{ p.registroFuncional ?? '—' }}</td>
                <td>{{ p.cursoBase ?? '—' }}</td>
              </tr>
              <tr v-if="!loadingProfs && !professors?.length">
                <td colspan="4" class="empty-row">Nenhum professor encontrado.</td>
              </tr>
            </tbody>
          </table>
        </UiAsyncPanel>
      </section>

      <!-- Disponibilidades -->
      <section class="card">
        <h3 class="card__title">Disponibilidades por data</h3>

        <div class="avail-form">
          <select v-model="newProfessorId" class="select-field">
            <option value="">Selecionar professor…</option>
            <option v-for="p in professors ?? []" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
          <input v-model="newDataEvento" type="date" class="input-field" />
          <button class="btn btn--primary" :disabled="adding" @click="addAvailability">
            {{ adding ? 'Adicionando…' : 'Adicionar' }}
          </button>
        </div>

        <div class="avail-filter">
          <label>Filtrar por data:</label>
          <input v-model="filterDate" type="date" class="input-field input-field--sm" />
          <button v-if="filterDate" class="btn-link" @click="filterDate = ''">Limpar</button>
        </div>

        <UiConnectionRetry v-if="failedAvail" @retry="reloadAvail" />
        <UiAsyncPanel :loading="loadingAvail">
          <table class="data-table">
            <thead><tr><th>Professor</th><th>Data</th><th></th></tr></thead>
            <tbody>
              <tr v-for="a in availabilities ?? []" :key="a.id">
                <td>{{ a.professor.name }}</td>
                <td>{{ new Date(a.dataEvento + 'T00:00:00').toLocaleDateString('pt-BR') }}</td>
                <td><button class="btn-icon-sm" @click="removeAvailability(a.id)">🗑</button></td>
              </tr>
              <tr v-if="!loadingAvail && !availabilities?.length">
                <td colspan="3" class="empty-row">Nenhuma disponibilidade cadastrada.</td>
              </tr>
            </tbody>
          </table>
        </UiAsyncPanel>
      </section>
    </div>
  </div>
</template>

<style scoped>
.profs-view { padding: 1.5rem; }
.profs-view__title { font-size: 1.4rem; font-weight: 700; margin: 0 0 1.25rem; }
.profs-view__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
@media (max-width: 900px) { .profs-view__grid { grid-template-columns: 1fr; } }
.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 1.25rem; }
.card__title { font-size: 1rem; font-weight: 600; margin: 0 0 1rem; }
.avail-form { display: flex; gap: .5rem; flex-wrap: wrap; margin-bottom: 1rem; }
.avail-filter { display: flex; align-items: center; gap: .5rem; margin-bottom: .75rem; font-size: .85rem; }
.input-field { padding: .45rem .75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: .9rem; }
.input-field--sm { padding: .3rem .6rem; }
.select-field { padding: .45rem .75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: .9rem; flex: 1; min-width: 140px; }
.btn { padding: .4rem .9rem; border: none; border-radius: 6px; cursor: pointer; font-size: .85rem; font-weight: 600; }
.btn--primary { background: var(--color-primary, #0d631b); color: #fff; }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.btn-link { background: none; border: none; cursor: pointer; color: var(--color-primary, #0d631b); font-size: .85rem; text-decoration: underline; }
.btn-icon-sm { background: none; border: none; cursor: pointer; font-size: 1rem; }
.data-table { width: 100%; border-collapse: collapse; font-size: .87rem; }
.data-table th, .data-table td { padding: .5rem .6rem; border-bottom: 1px solid #f3f4f6; text-align: left; }
.data-table th { font-weight: 600; font-size: .78rem; text-transform: uppercase; color: #6b7280; }
.empty-row { text-align: center; color: #9ca3af; padding: 1.5rem; }
</style>
