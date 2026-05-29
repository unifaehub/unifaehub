<script setup lang="ts">
import { ref, onMounted } from 'vue'
import client from '@/api/client'

type Keyword = { id: number; palavra: string; dataAgendamento: string; horaInicio: string }

const list    = ref<Keyword[]>([])
const loading = ref(false)
const saving  = ref(false)
const feedback = ref<{ type: 'ok' | 'err'; msg: string } | null>(null)

const form = ref({ palavra: '', dataAgendamento: '', horaInicio: '' })

async function load() {
  loading.value = true
  try {
    const { data } = await client.get<Keyword[]>('/intercurso/keywords')
    list.value = data
  } catch { feedback.value = { type: 'err', msg: 'Erro ao carregar palavras-chave.' } }
  finally  { loading.value = false }
}

async function create() {
  if (!form.value.palavra.trim() || !form.value.dataAgendamento || !form.value.horaInicio) {
    feedback.value = { type: 'err', msg: 'Preencha todos os campos.' }
    return
  }
  saving.value = true
  feedback.value = null
  try {
    await client.post('/intercurso/keywords', form.value)
    form.value = { palavra: '', dataAgendamento: '', horaInicio: '' }
    feedback.value = { type: 'ok', msg: 'Palavra-chave agendada.' }
    await load()
  } catch (e: any) {
    feedback.value = { type: 'err', msg: e?.response?.data?.message ?? 'Erro ao criar.' }
  } finally { saving.value = false }
}

async function remove(id: number) {
  if (!confirm('Remover esta palavra-chave?')) return
  try {
    await client.delete(`/intercurso/keywords/${id}`)
    feedback.value = { type: 'ok', msg: 'Palavra-chave removida.' }
    await load()
  } catch { feedback.value = { type: 'err', msg: 'Erro ao remover.' } }
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

function isPast(kw: Keyword): boolean {
  const today = new Date().toISOString().split('T')[0]
  if (kw.dataAgendamento < today) return true
  if (kw.dataAgendamento > today) return false
  const now = new Date().toTimeString().substring(0, 5)
  return kw.horaInicio.substring(0, 5) < now
}

onMounted(load)
</script>

<template>
  <div class="view">
    <div class="view__header">
      <div>
        <h1 class="view__title">Palavras-Chave</h1>
        <p class="view__subtitle">Agendar palavras-chave para certificados do Intercurso</p>
      </div>
    </div>

    <!-- Formulário -->
    <div class="form-card">
      <h2 class="form-card__title">Agendar Palavra-Chave</h2>
      <div class="row-form">
        <label class="field">
          <span class="field__label">Palavra-Chave *</span>
          <input v-model="form.palavra" class="field__input" placeholder="Ex.: INTERCURSO2025" />
        </label>
        <label class="field">
          <span class="field__label">Data *</span>
          <input type="date" v-model="form.dataAgendamento" class="field__input" />
        </label>
        <label class="field">
          <span class="field__label">Hora de Início *</span>
          <input type="time" v-model="form.horaInicio" class="field__input" />
        </label>
      </div>

      <p class="hint">
        A palavra-chave fica ativa a partir da hora configurada e expira às 23:00 do mesmo dia.
        Participantes usam a palavra para obter certificados via o app.
      </p>

      <div v-if="feedback" :class="['feedback', feedback.type === 'ok' ? 'feedback--ok' : 'feedback--err']">
        {{ feedback.msg }}
      </div>

      <div class="form-actions">
        <button class="btn-primary" @click="create" :disabled="saving">
          {{ saving ? 'Agendando…' : 'Agendar' }}
        </button>
      </div>
    </div>

    <!-- Lista -->
    <div v-if="loading" class="loading-msg">Carregando…</div>
    <div v-else-if="!list.length" class="empty-msg">Nenhuma palavra-chave agendada.</div>

    <div v-else class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Palavra</th>
            <th>Data</th>
            <th>Hora de início</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="k in list" :key="k.id" :class="{ 'row--past': isPast(k) }">
            <td><strong class="keyword-text">{{ k.palavra }}</strong></td>
            <td>{{ formatDate(k.dataAgendamento) }}</td>
            <td>{{ k.horaInicio }}</td>
            <td>
              <span :class="['status-badge', isPast(k) ? 'badge--past' : 'badge--future']">
                {{ isPast(k) ? 'Expirada' : 'Agendada' }}
              </span>
            </td>
            <td><button class="btn-sm btn-sm--danger" @click="remove(k.id)">Remover</button></td>
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
.row-form { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 1rem; }

.field { display: flex; flex-direction: column; gap: .35rem; }
.field__label { font-size: .78rem; font-weight: 700; color: #374151; text-transform: uppercase; }
.field__input { border: 1px solid #d1d5db; border-radius: 7px; padding: .5rem .7rem; font-size: .93rem; }
.field__input:focus { outline: none; border-color: #1d4ed8; }

.hint { font-size: .82rem; color: #6b7280; margin: .75rem 0 0; padding: .6rem .75rem; background: #f8fafc; border-radius: 7px; }

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
.row--past td { opacity: .55; }

.keyword-text { font-family: monospace; font-size: 1rem; color: #1d4ed8; letter-spacing: .04em; }
.status-badge { font-size: .75rem; font-weight: 700; padding: .2rem .6rem; border-radius: 20px; }
.badge--future { background: #dbeafe; color: #1e40af; }
.badge--past   { background: #f3f4f6; color: #6b7280; }

.btn-sm { border: 1px solid #d1d5db; background: #fff; border-radius: 6px; padding: .25rem .65rem; font-size: .8rem; cursor: pointer; }
.btn-sm--danger { color: #dc2626; border-color: #fca5a5; }
.btn-sm--danger:hover { background: #fef2f2; }

.loading-msg, .empty-msg { color: #6b7280; padding: 1rem 0; }
</style>
