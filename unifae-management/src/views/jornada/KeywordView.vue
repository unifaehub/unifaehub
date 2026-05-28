<script setup lang="ts">
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import UiAsyncPanel from '@/components/ui/UiAsyncPanel.vue'
import client from '@/api/client'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useApiRequest } from '@/composables/useApiRequest'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'

const router = useRouter()

type KeywordRow = { id: number; palavra: string; dataAgendamento: string; horaInicio: string }

const toast = useToastStore()
const confirm = useConfirmStore()
const saving = ref(false)
const newPalavra = ref('')
const newData = ref('')
const newHora = ref('09:00')

const { data, loading, failed, execute } = useApiRequest<KeywordRow[]>(async () => {
  const { data } = await client.get('/evidence-journey/keywords')
  return data
})
execute()

async function create() {
  if (!newPalavra.value.trim() || !newData.value || !newHora.value) {
    toast.error('Preencha todos os campos.')
    return
  }
  saving.value = true
  try {
    await client.post('/evidence-journey/keywords', {
      palavra: newPalavra.value.trim(),
      dataAgendamento: newData.value,
      horaInicio: newHora.value,
    })
    toast.success('Palavra-chave agendada.')
    newPalavra.value = ''
    newData.value = ''
    newHora.value = '09:00'
    execute()
  } catch { toast.error('Erro ao agendar palavra-chave.') }
  finally { saving.value = false }
}

async function remove(id: number) {
  const ok = await confirm.confirm({ message: 'Excluir esta palavra-chave?', tone: 'danger' })
  if (!ok) return
  try {
    await client.delete(`/evidence-journey/keywords/${id}`)
    toast.success('Palavra-chave excluída.')
    execute()
  } catch { toast.error('Erro ao excluir.') }
}
</script>

<template>
  <div class="keyword-view">
    <button class="btn-back" @click="router.push({ name: 'jornada-dashboard' })">← Voltar à Jornada</button>
    <h2 class="keyword-view__title">Agendamento de Palavras-Chave</h2>
    <p class="keyword-view__desc">A palavra-chave atual é exibida no app mobile dos professores ao pressionar "Atualizar".</p>

    <div class="keyword-form">
      <div class="form-group">
        <label>Palavra-chave</label>
        <input v-model="newPalavra" class="input-field" placeholder="Ex.: Fisioterapia Neurológica" />
      </div>
      <div class="form-group">
        <label>Data</label>
        <input v-model="newData" type="date" class="input-field" />
      </div>
      <div class="form-group">
        <label>Hora de início</label>
        <input v-model="newHora" type="time" class="input-field" />
      </div>
      <button class="btn btn--primary" :disabled="saving" @click="create">
        {{ saving ? 'Salvando…' : 'Agendar' }}
      </button>
    </div>

    <UiConnectionRetry v-if="failed" @retry="execute" />
    <UiAsyncPanel :loading="loading">
      <table class="data-table">
        <thead><tr><th>Palavra-chave</th><th>Data</th><th>Hora Início</th><th>Ações</th></tr></thead>
        <tbody>
          <tr v-for="kw in data ?? []" :key="kw.id">
            <td><strong>{{ kw.palavra }}</strong></td>
            <td>{{ new Date(kw.dataAgendamento + 'T00:00:00').toLocaleDateString('pt-BR') }}</td>
            <td>{{ kw.horaInicio }}</td>
            <td><button class="btn-icon-sm" @click="remove(kw.id)">🗑</button></td>
          </tr>
          <tr v-if="!loading && !data?.length">
            <td colspan="4" class="empty-row">Nenhuma palavra-chave agendada.</td>
          </tr>
        </tbody>
      </table>
    </UiAsyncPanel>
  </div>
</template>

<style scoped>
.btn-back { background: none; border: none; cursor: pointer; color: var(--color-primary, #0d631b); font-size: .85rem; font-weight: 600; padding: 0; margin-bottom: 1rem; display: inline-block; }
.btn-back:hover { text-decoration: underline; }
.keyword-view { padding: 1.5rem; }
.keyword-view__title { font-size: 1.4rem; font-weight: 700; margin: 0 0 .35rem; }
.keyword-view__desc { color: #6b7280; font-size: .9rem; margin: 0 0 1.5rem; }
.keyword-form { display: flex; align-items: flex-end; gap: .75rem; flex-wrap: wrap; padding: 1.25rem; background: #f9fafb; border-radius: 10px; margin-bottom: 1.5rem; }
.form-group { display: flex; flex-direction: column; gap: .3rem; }
.form-group label { font-size: .78rem; font-weight: 600; color: #374151; text-transform: uppercase; }
.input-field { padding: .45rem .75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: .9rem; min-width: 160px; }
.btn { padding: .5rem 1.1rem; border: none; border-radius: 6px; cursor: pointer; font-size: .9rem; font-weight: 600; align-self: flex-end; }
.btn--primary { background: var(--color-primary, #0d631b); color: #fff; }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.data-table { width: 100%; border-collapse: collapse; font-size: .9rem; }
.data-table th, .data-table td { padding: .55rem .75rem; border-bottom: 1px solid #f3f4f6; text-align: left; }
.data-table th { background: #f9fafb; font-weight: 600; font-size: .78rem; text-transform: uppercase; color: #6b7280; }
.empty-row { text-align: center; color: #9ca3af; padding: 2rem; }
.btn-icon-sm { background: none; border: none; cursor: pointer; font-size: 1rem; }
</style>
