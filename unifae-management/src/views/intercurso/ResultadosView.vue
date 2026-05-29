<script setup lang="ts">
import { ref, onMounted } from 'vue'
import client from '@/api/client'

type Modalidade = { id: number; nome: string }
type Equipe     = { id: number; nome: string; cursoRepresentante: string }
type Resultado  = {
  id: number; equipeId: number; modalidadeId: number
  posicao: number | null; pontuacao: string | null; observacao: string | null
  equipe: { nome: string; cursoRepresentante: string } | null
  modalidade: { nome: string } | null
}

const resultados  = ref<Resultado[]>([])
const modalidades = ref<Modalidade[]>([])
const equipes     = ref<Equipe[]>([])
const loading     = ref(false)
const feedback    = ref<{ type: 'ok' | 'err'; msg: string } | null>(null)

const form = ref({ equipeId: '', modalidadeId: '', posicao: '', pontuacao: '', observacao: '' })
const saving = ref(false)

async function load() {
  loading.value = true
  try {
    const [resRes, modRes, eqRes] = await Promise.all([
      client.get<Resultado[]>('/intercurso/resultados'),
      client.get<Modalidade[]>('/intercurso/modalidades'),
      client.get<{ items: Equipe[] }>('/intercurso/equipes', { params: { status: 'Aprovada', limit: '500' } }),
    ])
    resultados.value  = resRes.data
    modalidades.value = modRes.data
    equipes.value     = eqRes.data.items
  } catch { feedback.value = { type: 'err', msg: 'Erro ao carregar resultados.' } }
  finally  { loading.value = false }
}

async function submit() {
  if (!form.value.equipeId || !form.value.modalidadeId) {
    feedback.value = { type: 'err', msg: 'Selecione equipe e modalidade.' }
    return
  }
  saving.value = true
  feedback.value = null
  try {
    await client.post('/intercurso/resultados', {
      equipeId:    Number(form.value.equipeId),
      modalidadeId: Number(form.value.modalidadeId),
      posicao:     form.value.posicao     ? Number(form.value.posicao)    : null,
      pontuacao:   form.value.pontuacao   ? Number(form.value.pontuacao)  : null,
      observacao:  form.value.observacao  || null,
    })
    feedback.value = { type: 'ok', msg: 'Resultado salvo.' }
    form.value = { equipeId: '', modalidadeId: '', posicao: '', pontuacao: '', observacao: '' }
    await load()
  } catch (e: any) {
    feedback.value = { type: 'err', msg: e?.response?.data?.message ?? 'Erro ao salvar.' }
  } finally { saving.value = false }
}

async function remove(id: number) {
  if (!confirm('Remover este resultado?')) return
  try {
    await client.delete(`/intercurso/resultados/${id}`)
    feedback.value = { type: 'ok', msg: 'Resultado removido.' }
    await load()
  } catch { feedback.value = { type: 'err', msg: 'Erro ao remover.' } }
}

function posLabel(p: number | null) {
  if (!p) return '—'
  return p === 1 ? '🥇 1º' : p === 2 ? '🥈 2º' : p === 3 ? '🥉 3º' : `${p}º`
}

onMounted(load)
</script>

<template>
  <div class="view">
    <div class="view__header">
      <div>
        <h1 class="view__title">Resultados</h1>
        <p class="view__subtitle">Lançar posições e pontuações por modalidade</p>
      </div>
    </div>

    <!-- Formulário de lançamento -->
    <div class="form-card">
      <h2 class="form-card__title">Lançar / Atualizar Resultado</h2>
      <div class="row-form">
        <label class="field">
          <span class="field__label">Equipe *</span>
          <select v-model="form.equipeId" class="field__input">
            <option value="">Selecione a equipe…</option>
            <option v-for="e in equipes" :key="e.id" :value="String(e.id)">{{ e.nome }} ({{ e.cursoRepresentante }})</option>
          </select>
        </label>
        <label class="field">
          <span class="field__label">Modalidade *</span>
          <select v-model="form.modalidadeId" class="field__input">
            <option value="">Selecione a modalidade…</option>
            <option v-for="m in modalidades" :key="m.id" :value="String(m.id)">{{ m.nome }}</option>
          </select>
        </label>
        <label class="field">
          <span class="field__label">Posição</span>
          <input type="number" v-model="form.posicao" class="field__input" placeholder="1" min="1" />
        </label>
        <label class="field">
          <span class="field__label">Pontuação</span>
          <input type="number" v-model="form.pontuacao" class="field__input" placeholder="0.00" step="0.01" />
        </label>
      </div>
      <label class="field" style="margin-top:.5rem">
        <span class="field__label">Observação</span>
        <input v-model="form.observacao" class="field__input" placeholder="Opcional…" />
      </label>

      <div v-if="feedback" :class="['feedback', feedback.type === 'ok' ? 'feedback--ok' : 'feedback--err']">
        {{ feedback.msg }}
      </div>
      <div class="form-actions">
        <button class="btn-primary" @click="submit" :disabled="saving">
          {{ saving ? 'Salvando…' : 'Salvar Resultado' }}
        </button>
      </div>
    </div>

    <!-- Tabela de resultados -->
    <div v-if="loading" class="loading-msg">Carregando…</div>
    <div v-else-if="!resultados.length" class="empty-msg">Nenhum resultado lançado.</div>

    <div v-else class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Modalidade</th>
            <th>Equipe</th>
            <th>Curso</th>
            <th>Posição</th>
            <th>Pontuação</th>
            <th>Observação</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in resultados" :key="r.id">
            <td><strong>{{ r.modalidade?.nome ?? '—' }}</strong></td>
            <td>{{ r.equipe?.nome ?? '—' }}</td>
            <td>{{ r.equipe?.cursoRepresentante ?? '—' }}</td>
            <td class="pos-cell">{{ posLabel(r.posicao) }}</td>
            <td>{{ r.pontuacao ? Number(r.pontuacao).toFixed(2) : '—' }}</td>
            <td class="obs-cell">{{ r.observacao ?? '—' }}</td>
            <td><button class="btn-sm btn-sm--danger" @click="remove(r.id)">Remover</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.view { padding: 2rem; }
.view__header { margin-bottom: 1.5rem; }
.view__title { font-size: 1.5rem; font-weight: 700; margin: 0 0 .25rem; color: #111; }
.view__subtitle { font-size: .87rem; color: #6b7280; margin: 0; }

.form-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
.form-card__title { font-size: 1.05rem; font-weight: 700; margin: 0 0 1rem; }
.row-form { display: grid; grid-template-columns: 2fr 2fr 1fr 1fr; gap: 1rem; }

.field { display: flex; flex-direction: column; gap: .35rem; }
.field__label { font-size: .78rem; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: .03em; }
.field__input { border: 1px solid #d1d5db; border-radius: 7px; padding: .5rem .7rem; font-size: .93rem; }
.field__input:focus { outline: none; border-color: #1d4ed8; box-shadow: 0 0 0 3px rgba(29,78,216,.12); }

.feedback { padding: .65rem .9rem; border-radius: 7px; font-size: .88rem; font-weight: 600; margin-top: .75rem; }
.feedback--ok  { background: #f0fdf4; color: #166534; }
.feedback--err { background: #fef2f2; color: #dc2626; }

.form-actions { display: flex; justify-content: flex-end; margin-top: 1rem; }
.btn-primary { background: #1d4ed8; color: #fff; border: none; border-radius: 8px; padding: .55rem 1.2rem; font-size: .9rem; font-weight: 700; cursor: pointer; }
.btn-primary:hover:not(:disabled) { background: #1e40af; }
.btn-primary:disabled { opacity: .5; cursor: default; }

.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: .9rem; }
.table th { text-align: left; padding: .6rem .75rem; font-size: .75rem; font-weight: 700; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
.table td { padding: .65rem .75rem; border-bottom: 1px solid #f3f4f6; }
.pos-cell { font-weight: 700; }
.obs-cell { font-size: .85rem; color: #6b7280; max-width: 200px; }

.btn-sm { border: 1px solid #d1d5db; background: #fff; border-radius: 6px; padding: .25rem .65rem; font-size: .8rem; cursor: pointer; }
.btn-sm--danger { color: #dc2626; border-color: #fca5a5; }
.btn-sm--danger:hover { background: #fef2f2; }

.loading-msg, .empty-msg { color: #6b7280; padding: 1rem 0; }
</style>
