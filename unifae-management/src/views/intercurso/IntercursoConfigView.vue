<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import client from '@/api/client'

type Config = {
  eventoNome: string | null
  eventoLocal: string | null
  edicao: string | null
  descricao: string | null
  datasEvento: string[] | null
  inscricaoInicio: string | null
  inscricaoFim: string | null
  certificadoUrl: string | null
}

const original  = ref<Config | null>(null)
const form      = ref<Config>({
  eventoNome: null, eventoLocal: null, edicao: null, descricao: null,
  datasEvento: [], inscricaoInicio: null, inscricaoFim: null, certificadoUrl: null,
})
const loading   = ref(false)
const saving    = ref(false)
const feedback  = ref<{ type: 'ok' | 'err'; msg: string } | null>(null)
const newDate   = ref('')

const hasChanges = computed(() => JSON.stringify(form.value) !== JSON.stringify(original.value))

async function load() {
  loading.value = true
  try {
    const { data } = await client.get<Config>('/intercurso/config')
    original.value = { ...data, datasEvento: data.datasEvento ?? [] }
    form.value     = { ...data, datasEvento: [...(data.datasEvento ?? [])] }
  } catch { feedback.value = { type: 'err', msg: 'Erro ao carregar configurações.' } }
  finally  { loading.value = false }
}

function addDate() {
  if (!newDate.value) return
  if (!form.value.datasEvento?.includes(newDate.value)) {
    form.value.datasEvento = [...(form.value.datasEvento ?? []), newDate.value].sort()
  }
  newDate.value = ''
}

function removeDate(d: string) {
  form.value.datasEvento = form.value.datasEvento?.filter((x) => x !== d) ?? []
}

async function save() {
  saving.value  = true
  feedback.value = null
  try {
    const { data } = await client.put<Config>('/intercurso/config', form.value)
    original.value = { ...data, datasEvento: data.datasEvento ?? [] }
    form.value     = { ...data, datasEvento: [...(data.datasEvento ?? [])] }
    feedback.value = { type: 'ok', msg: 'Configurações salvas com sucesso.' }
  } catch { feedback.value = { type: 'err', msg: 'Erro ao salvar configurações.' } }
  finally  { saving.value = false }
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

onMounted(load)
</script>

<template>
  <div class="config-view">
    <h1 class="config-view__title">Configurações do Intercurso</h1>

    <div v-if="loading" class="loading-msg">Carregando…</div>

    <form v-else class="config-form" @submit.prevent="save">
      <!-- Identidade do evento -->
      <fieldset class="form-section">
        <legend class="form-section__title">Identidade do Evento</legend>

        <label class="field">
          <span class="field__label">Nome do Evento</span>
          <input v-model="form.eventoNome" class="field__input" placeholder="Ex.: Intercurso UNIFAE 2025" />
        </label>

        <label class="field">
          <span class="field__label">Edição</span>
          <input v-model="form.edicao" class="field__input" placeholder="Ex.: 5ª Edição" />
        </label>

        <label class="field">
          <span class="field__label">Local</span>
          <input v-model="form.eventoLocal" class="field__input" placeholder="Ex.: Campus UNIFAE — Bloco B" />
        </label>

        <label class="field">
          <span class="field__label">Descrição pública</span>
          <textarea v-model="form.descricao" class="field__textarea" rows="4" placeholder="Apresentação do evento exibida no app público…" />
        </label>
      </fieldset>

      <!-- Datas do evento -->
      <fieldset class="form-section">
        <legend class="form-section__title">Datas do Evento</legend>
        <div class="date-add-row">
          <input type="date" v-model="newDate" class="field__input field__input--date" />
          <button type="button" class="btn-secondary" @click="addDate">Adicionar Data</button>
        </div>
        <div v-if="form.datasEvento?.length" class="date-chips">
          <span v-for="d in form.datasEvento" :key="d" class="date-chip">
            {{ formatDate(d) }}
            <button type="button" class="date-chip__remove" @click="removeDate(d)">×</button>
          </span>
        </div>
        <p v-else class="no-dates">Nenhuma data adicionada.</p>
      </fieldset>

      <!-- Inscrições -->
      <fieldset class="form-section">
        <legend class="form-section__title">Período de Inscrições</legend>
        <div class="row-2">
          <label class="field">
            <span class="field__label">Início</span>
            <input type="date" v-model="form.inscricaoInicio" class="field__input" />
          </label>
          <label class="field">
            <span class="field__label">Fim</span>
            <input type="date" v-model="form.inscricaoFim" class="field__input" />
          </label>
        </div>
      </fieldset>

      <!-- Certificados -->
      <fieldset class="form-section">
        <legend class="form-section__title">Certificados</legend>
        <label class="field">
          <span class="field__label">URL do sistema de certificados</span>
          <input v-model="form.certificadoUrl" class="field__input" placeholder="https://sis.fae.br:8080/eventos" />
        </label>
        <p class="field__hint">Participantes serão redirecionados para esta URL ao usarem a palavra-chave no app.</p>
      </fieldset>

      <!-- Feedback -->
      <div v-if="feedback" :class="['feedback', feedback.type === 'ok' ? 'feedback--ok' : 'feedback--err']">
        {{ feedback.msg }}
      </div>

      <div class="form-actions">
        <button type="submit" class="btn-primary" :disabled="saving || !hasChanges">
          {{ saving ? 'Salvando…' : 'Salvar Configurações' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.config-view { padding: 2rem; max-width: 800px; }
.config-view__title { font-size: 1.5rem; font-weight: 700; margin: 0 0 1.5rem; color: #111; }
.loading-msg { color: #6b7280; }

.config-form { display: flex; flex-direction: column; gap: 1.5rem; }
.form-section { border: 1px solid #e5e7eb; border-radius: 10px; padding: 1.25rem 1.5rem; }
.form-section__title { font-size: .85rem; font-weight: 700; text-transform: uppercase; color: #6b7280; letter-spacing: .04em; padding: 0 .5rem; }

.field { display: flex; flex-direction: column; gap: .4rem; margin-top: .75rem; }
.field:first-of-type { margin-top: 0; }
.field__label { font-size: .82rem; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: .03em; }
.field__input { border: 1px solid #d1d5db; border-radius: 7px; padding: .55rem .75rem; font-size: .95rem; color: #111; }
.field__input:focus { outline: none; border-color: #1d4ed8; box-shadow: 0 0 0 3px rgba(29,78,216,.12); }
.field__input--date { max-width: 200px; }
.field__textarea { border: 1px solid #d1d5db; border-radius: 7px; padding: .55rem .75rem; font-size: .93rem; color: #111; resize: vertical; font-family: inherit; }
.field__hint { font-size: .8rem; color: #9ca3af; margin-top: .4rem; }

.row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

.date-add-row { display: flex; gap: .75rem; align-items: center; margin-bottom: .75rem; flex-wrap: wrap; }
.date-chips { display: flex; flex-wrap: wrap; gap: .5rem; }
.date-chip { display: inline-flex; align-items: center; gap: .4rem; background: #dbeafe; color: #1e40af; border-radius: 20px; padding: .25rem .75rem; font-size: .82rem; font-weight: 600; }
.date-chip__remove { background: none; border: none; cursor: pointer; color: #1e40af; font-size: 1rem; line-height: 1; padding: 0; }
.no-dates { font-size: .87rem; color: #9ca3af; }

.btn-primary { background: #1d4ed8; color: #fff; border: none; border-radius: 8px; padding: .6rem 1.4rem; font-size: .95rem; font-weight: 700; cursor: pointer; }
.btn-primary:hover:not(:disabled) { background: #1e40af; }
.btn-primary:disabled { opacity: .5; cursor: default; }
.btn-secondary { background: #fff; border: 1px solid #d1d5db; border-radius: 8px; padding: .55rem 1rem; font-size: .9rem; font-weight: 600; cursor: pointer; color: #374151; }
.btn-secondary:hover { background: #f9fafb; }

.feedback { padding: .75rem 1rem; border-radius: 8px; font-size: .9rem; font-weight: 600; }
.feedback--ok  { background: #f0fdf4; color: #166534; }
.feedback--err { background: #fef2f2; color: #dc2626; }

.form-actions { display: flex; justify-content: flex-end; }
</style>
