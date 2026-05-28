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

type Question = {
  id: number
  textoPergunta: string
  tipo: 'Resumo' | 'Apresentação'
  ordem: number
  ativo: boolean
}

const toast = useToastStore()
const confirm = useConfirmStore()

const showForm = ref(false)
const saving = ref(false)
const editId = ref<number | null>(null)
const formTexto = ref('')
const formTipo = ref<'Resumo' | 'Apresentação'>('Resumo')
const formOrdem = ref(0)
const formAtivo = ref(true)

const { data: questions, loading, failed, execute } = useApiRequest<Question[]>(async () => {
  const { data } = await client.get('/evidence-journey/questions')
  return data
})
execute()

function openCreate() {
  editId.value = null
  formTexto.value = ''
  formTipo.value = 'Resumo'
  formOrdem.value = 0
  formAtivo.value = true
  showForm.value = true
}

function openEdit(q: Question) {
  editId.value = q.id
  formTexto.value = q.textoPergunta
  formTipo.value = q.tipo
  formOrdem.value = q.ordem
  formAtivo.value = q.ativo
  showForm.value = true
}

async function save() {
  if (!formTexto.value.trim()) { toast.error('Texto é obrigatório.'); return }
  saving.value = true
  const payload = { textoPergunta: formTexto.value.trim(), tipo: formTipo.value, ordem: formOrdem.value, ativo: formAtivo.value }
  try {
    if (editId.value) {
      await client.patch(`/evidence-journey/questions/${editId.value}`, payload)
      toast.success('Pergunta atualizada.')
    } else {
      await client.post('/evidence-journey/questions', payload)
      toast.success('Pergunta criada.')
    }
    showForm.value = false
    execute()
  } catch { toast.error('Erro ao salvar pergunta.') }
  finally { saving.value = false }
}

async function remove(id: number) {
  const ok = await confirm.confirm({ message: 'Excluir esta pergunta?', tone: 'danger' })
  if (!ok) return
  try {
    await client.delete(`/evidence-journey/questions/${id}`)
    toast.success('Pergunta excluída.')
    execute()
  } catch { toast.error('Erro ao excluir.') }
}
</script>

<template>
  <div class="questions-view">
    <button class="btn-back" @click="router.push({ name: 'jornada-dashboard' })">← Voltar à Jornada</button>
    <div class="questions-view__header">
      <h2 class="questions-view__title">Perguntas Dinâmicas</h2>
      <button class="btn btn--primary" @click="openCreate">+ Nova Pergunta</button>
    </div>

    <!-- Form modal -->
    <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
      <div class="modal">
        <h3 class="modal__title">{{ editId ? 'Editar' : 'Nova' }} Pergunta</h3>
        <div class="form-group">
          <label>Texto da pergunta</label>
          <textarea v-model="formTexto" class="textarea-field" rows="3" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Tipo</label>
            <select v-model="formTipo" class="select-field">
              <option value="Resumo">Resumo</option>
              <option value="Apresentação">Apresentação</option>
            </select>
          </div>
          <div class="form-group">
            <label>Ordem</label>
            <input v-model.number="formOrdem" type="number" class="input-field" min="0" />
          </div>
          <div class="form-group form-group--check">
            <label><input type="checkbox" v-model="formAtivo" /> Ativa</label>
          </div>
        </div>
        <div class="modal__actions">
          <button class="btn btn--ghost" @click="showForm = false">Cancelar</button>
          <button class="btn btn--primary" :disabled="saving" @click="save">{{ saving ? 'Salvando…' : 'Salvar' }}</button>
        </div>
      </div>
    </div>

    <UiConnectionRetry v-if="failed" @retry="execute" />
    <UiAsyncPanel :loading="loading">
      <table class="data-table">
        <thead><tr><th>Texto</th><th>Tipo</th><th>Ordem</th><th>Ativa</th><th>Ações</th></tr></thead>
        <tbody>
          <tr v-for="q in questions ?? []" :key="q.id">
            <td class="td-text">{{ q.textoPergunta }}</td>
            <td><span class="tipo-badge" :class="'tipo--' + (q.tipo === 'Resumo' ? 'resumo' : 'apres')">{{ q.tipo }}</span></td>
            <td>{{ q.ordem }}</td>
            <td>{{ q.ativo ? '✅' : '❌' }}</td>
            <td>
              <button class="btn-icon-sm" @click="openEdit(q)">✏️</button>
              <button class="btn-icon-sm" @click="remove(q.id)">🗑</button>
            </td>
          </tr>
          <tr v-if="!loading && !questions?.length">
            <td colspan="5" class="empty-row">Nenhuma pergunta cadastrada.</td>
          </tr>
        </tbody>
      </table>
    </UiAsyncPanel>
  </div>
</template>

<style scoped>
.btn-back { background: none; border: none; cursor: pointer; color: var(--color-primary, #0d631b); font-size: .85rem; font-weight: 600; padding: 0; margin-bottom: 1rem; display: inline-block; }
.btn-back:hover { text-decoration: underline; }
.questions-view { padding: 1.5rem; }
.questions-view__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
.questions-view__title { font-size: 1.4rem; font-weight: 700; margin: 0; }
.data-table { width: 100%; border-collapse: collapse; font-size: .9rem; }
.data-table th, .data-table td { padding: .55rem .75rem; border-bottom: 1px solid #f3f4f6; text-align: left; }
.data-table th { background: #f9fafb; font-weight: 600; font-size: .78rem; text-transform: uppercase; color: #6b7280; }
.td-text { max-width: 400px; }
.tipo-badge { padding: .2rem .6rem; border-radius: 10px; font-size: .78rem; font-weight: 600; }
.tipo--resumo { background: #e0f2fe; color: #0369a1; }
.tipo--apres { background: #fce7f3; color: #9d174d; }
.empty-row { text-align: center; color: #9ca3af; padding: 2rem; }
.btn { padding: .45rem 1rem; border: none; border-radius: 6px; cursor: pointer; font-size: .88rem; font-weight: 600; }
.btn--primary { background: var(--color-primary, #0d631b); color: #fff; }
.btn--ghost { background: #f3f4f6; color: #374151; }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.btn-icon-sm { background: none; border: none; cursor: pointer; font-size: 1rem; padding: .1rem .25rem; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: #fff; border-radius: 12px; padding: 1.75rem; width: 100%; max-width: 520px; }
.modal__title { font-size: 1.1rem; font-weight: 700; margin: 0 0 1.25rem; }
.modal__actions { display: flex; justify-content: flex-end; gap: .5rem; margin-top: 1.25rem; }
.form-group { margin-bottom: .9rem; }
.form-group label { display: block; font-size: .82rem; font-weight: 600; color: #374151; margin-bottom: .3rem; }
.form-group--check label { display: flex; align-items: center; gap: .4rem; }
.form-row { display: flex; gap: .75rem; }
.textarea-field { width: 100%; padding: .5rem .75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: .9rem; resize: vertical; box-sizing: border-box; }
.input-field, .select-field { width: 100%; padding: .45rem .75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: .9rem; box-sizing: border-box; }
</style>
