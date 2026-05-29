<script setup lang="ts">
import { ref, onMounted } from 'vue'
import client from '@/api/client'

type Modalidade = {
  id: number; nome: string; descricao: string | null; maxEquipes: number | null
  maxMembros: number; ativo: boolean; ordem: number
}

const list      = ref<Modalidade[]>([])
const loading   = ref(false)
const feedback  = ref<{ type: 'ok' | 'err'; msg: string } | null>(null)
const showForm  = ref(false)
const saving    = ref(false)
const editingId = ref<number | null>(null)

const blank = (): Omit<Modalidade, 'id'> => ({
  nome: '', descricao: null, maxEquipes: null, maxMembros: 5, ativo: true, ordem: 0,
})
const form = ref(blank())

async function load() {
  loading.value = true
  try {
    const { data } = await client.get<Modalidade[]>('/intercurso/modalidades')
    list.value = data
  } catch { feedback.value = { type: 'err', msg: 'Erro ao carregar modalidades.' } }
  finally  { loading.value = false }
}

function openNew() {
  editingId.value = null
  form.value = blank()
  showForm.value = true
}

function openEdit(m: Modalidade) {
  editingId.value = m.id
  form.value = { nome: m.nome, descricao: m.descricao, maxEquipes: m.maxEquipes, maxMembros: m.maxMembros, ativo: m.ativo, ordem: m.ordem }
  showForm.value = true
}

async function submit() {
  if (!form.value.nome.trim()) return
  saving.value = true
  feedback.value = null
  try {
    if (editingId.value) {
      await client.patch(`/intercurso/modalidades/${editingId.value}`, form.value)
    } else {
      await client.post('/intercurso/modalidades', form.value)
    }
    feedback.value = { type: 'ok', msg: 'Modalidade salva com sucesso.' }
    showForm.value = false
    await load()
  } catch (e: any) {
    feedback.value = { type: 'err', msg: e?.response?.data?.message ?? 'Erro ao salvar.' }
  } finally { saving.value = false }
}

async function remove(id: number) {
  if (!confirm('Remover esta modalidade? Equipes vinculadas não serão excluídas.')) return
  try {
    await client.delete(`/intercurso/modalidades/${id}`)
    await load()
    feedback.value = { type: 'ok', msg: 'Modalidade removida.' }
  } catch (e: any) {
    feedback.value = { type: 'err', msg: e?.response?.data?.message ?? 'Erro ao remover.' }
  }
}

onMounted(load)
</script>

<template>
  <div class="view">
    <div class="view__header">
      <div>
        <h1 class="view__title">Modalidades</h1>
        <p class="view__subtitle">Categorias de competição do Intercurso</p>
      </div>
      <button class="btn-primary" @click="openNew">+ Nova Modalidade</button>
    </div>

    <div v-if="feedback" :class="['feedback', feedback.type === 'ok' ? 'feedback--ok' : 'feedback--err']">
      {{ feedback.msg }}
    </div>

    <!-- Formulário inline -->
    <div v-if="showForm" class="form-card">
      <h2 class="form-card__title">{{ editingId ? 'Editar Modalidade' : 'Nova Modalidade' }}</h2>

      <label class="field">
        <span class="field__label">Nome *</span>
        <input v-model="form.nome" class="field__input" placeholder="Ex.: Debate Científico" />
      </label>

      <label class="field">
        <span class="field__label">Descrição</span>
        <textarea v-model="form.descricao" class="field__textarea" rows="3" />
      </label>

      <div class="row-3">
        <label class="field">
          <span class="field__label">Máx. equipes</span>
          <input type="number" v-model.number="form.maxEquipes" class="field__input" min="1" placeholder="Sem limite" />
        </label>
        <label class="field">
          <span class="field__label">Máx. membros/equipe</span>
          <input type="number" v-model.number="form.maxMembros" class="field__input" min="1" />
        </label>
        <label class="field">
          <span class="field__label">Ordem exibição</span>
          <input type="number" v-model.number="form.ordem" class="field__input" min="0" />
        </label>
      </div>

      <label class="field field--check">
        <input type="checkbox" v-model="form.ativo" />
        <span class="field__label">Ativa (visível no app público)</span>
      </label>

      <div class="form-actions">
        <button class="btn-secondary" @click="showForm = false">Cancelar</button>
        <button class="btn-primary" @click="submit" :disabled="saving">
          {{ saving ? 'Salvando…' : 'Salvar' }}
        </button>
      </div>
    </div>

    <!-- Lista -->
    <div v-if="loading" class="loading-msg">Carregando…</div>
    <div v-else-if="!list.length" class="empty-msg">Nenhuma modalidade cadastrada.</div>

    <div v-else class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Ord</th>
            <th>Nome</th>
            <th>Máx. Equipes</th>
            <th>Máx. Membros</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in list" :key="m.id">
            <td>{{ m.ordem }}</td>
            <td>
              <strong>{{ m.nome }}</strong>
              <p v-if="m.descricao" class="row-desc">{{ m.descricao }}</p>
            </td>
            <td>{{ m.maxEquipes ?? '—' }}</td>
            <td>{{ m.maxMembros }}</td>
            <td>
              <span :class="['status-badge', m.ativo ? 'status-badge--ativo' : 'status-badge--inativo']">
                {{ m.ativo ? 'Ativa' : 'Inativa' }}
              </span>
            </td>
            <td class="actions-cell">
              <button class="btn-sm" @click="openEdit(m)">Editar</button>
              <button class="btn-sm btn-sm--danger" @click="remove(m.id)">Remover</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.view { padding: 2rem; }
.view__header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap; }
.view__title { font-size: 1.5rem; font-weight: 700; margin: 0 0 .25rem; color: #111; }
.view__subtitle { font-size: .87rem; color: #6b7280; margin: 0; }

.feedback { padding: .75rem 1rem; border-radius: 8px; font-size: .9rem; font-weight: 600; margin-bottom: 1rem; }
.feedback--ok  { background: #f0fdf4; color: #166534; }
.feedback--err { background: #fef2f2; color: #dc2626; }

.form-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: .75rem; }
.form-card__title { font-size: 1.05rem; font-weight: 700; margin: 0 0 .5rem; }

.field { display: flex; flex-direction: column; gap: .35rem; }
.field--check { flex-direction: row; align-items: center; gap: .5rem; }
.field__label { font-size: .8rem; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: .03em; }
.field__input { border: 1px solid #d1d5db; border-radius: 7px; padding: .5rem .7rem; font-size: .95rem; }
.field__input:focus { outline: none; border-color: #1d4ed8; box-shadow: 0 0 0 3px rgba(29,78,216,.12); }
.field__textarea { border: 1px solid #d1d5db; border-radius: 7px; padding: .5rem .7rem; font-size: .93rem; resize: vertical; font-family: inherit; }

.row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; }

.form-actions { display: flex; justify-content: flex-end; gap: .75rem; margin-top: .5rem; }

.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: .9rem; }
.table th { text-align: left; padding: .6rem .75rem; font-size: .75rem; font-weight: 700; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
.table td { padding: .65rem .75rem; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
.row-desc { font-size: .8rem; color: #6b7280; margin: .2rem 0 0; }

.status-badge { font-size: .75rem; font-weight: 700; padding: .2rem .55rem; border-radius: 20px; }
.status-badge--ativo   { background: #dcfce7; color: #166534; }
.status-badge--inativo { background: #f3f4f6; color: #6b7280; }

.actions-cell { white-space: nowrap; }
.btn-sm { border: 1px solid #d1d5db; background: #fff; border-radius: 6px; padding: .25rem .65rem; font-size: .8rem; cursor: pointer; margin-left: .3rem; }
.btn-sm:hover { background: #f9fafb; }
.btn-sm--danger { color: #dc2626; border-color: #fca5a5; }
.btn-sm--danger:hover { background: #fef2f2; }

.btn-primary { background: #1d4ed8; color: #fff; border: none; border-radius: 8px; padding: .55rem 1.2rem; font-size: .9rem; font-weight: 700; cursor: pointer; }
.btn-primary:hover:not(:disabled) { background: #1e40af; }
.btn-primary:disabled { opacity: .5; cursor: default; }
.btn-secondary { background: #fff; border: 1px solid #d1d5db; border-radius: 8px; padding: .55rem 1rem; font-size: .9rem; font-weight: 600; cursor: pointer; }
.btn-secondary:hover { background: #f9fafb; }

.loading-msg, .empty-msg { color: #6b7280; padding: 1rem 0; }
</style>
