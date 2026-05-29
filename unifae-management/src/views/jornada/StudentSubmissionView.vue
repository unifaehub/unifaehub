<script setup lang="ts">
import client from '@/api/client'
import { ref, watch } from 'vue'

type WorkStatus = {
  id: number; titulo: string; cursoTrabalho: string; status: string
  dataSubmissao: string; arquivoUrl: string | null
  categoria: string; tipoTrabalho: string | null
  alunoNome: string
}

// Formulário
const ra            = ref('')
const titulo        = ref('')
const cursoTrabalho = ref('')
const categoria     = ref('Jornada de Evidências')
const tipoTrabalho  = ref('')
const arquivo       = ref<File | null>(null)
const submitting    = ref(false)
const checking      = ref(false)

// Estado
const myWork    = ref<WorkStatus | null>(null)
const hasWork   = ref(false)
const errorMsg  = ref('')
const successMsg = ref('')

const CATEGORIAS = ['Jornada de Evidências', 'Mostra de Jogos']
const TIPOS      = ['Pesquisa', 'TCC', 'Iniciação Científica', 'Desenvolvimento Prático']

function onArquivo(e: Event) {
  arquivo.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

function statusColor(s: string) {
  if (s === 'Aprovado')  return '#166534'
  if (s === 'Reprovado') return '#991b1b'
  return '#92400e'
}
function statusBg(s: string) {
  if (s === 'Aprovado')  return '#dcfce7'
  if (s === 'Reprovado') return '#fee2e2'
  return '#fef9c3'
}

let raTimer: ReturnType<typeof setTimeout> | null = null
watch(ra, (val) => {
  if (raTimer) clearTimeout(raTimer)
  myWork.value = null
  hasWork.value = false
  errorMsg.value = ''
  if (val.trim().length < 3) return
  raTimer = setTimeout(() => checkRa(val.trim()), 600)
})

async function checkRa(raVal: string) {
  checking.value = true
  try {
    const { data } = await client.get(`/evidence-journey/public/works/${encodeURIComponent(raVal)}`)
    if (data) {
      myWork.value = data
      hasWork.value = true
    } else {
      myWork.value = null
      hasWork.value = false
    }
  } catch {
    myWork.value = null
    hasWork.value = false
  } finally { checking.value = false }
}

async function submitWork() {
  errorMsg.value = ''
  successMsg.value = ''
  if (!ra.value.trim()) { errorMsg.value = 'Informe seu RA.'; return }
  if (!titulo.value.trim() || !cursoTrabalho.value.trim()) {
    errorMsg.value = 'Título e curso são obrigatórios.'
    return
  }
  submitting.value = true
  try {
    const form = new FormData()
    form.append('ra', ra.value.trim())
    form.append('titulo', titulo.value.trim())
    form.append('cursoTrabalho', cursoTrabalho.value.trim())
    form.append('categoria', categoria.value)
    if (tipoTrabalho.value) form.append('tipoTrabalho', tipoTrabalho.value)
    if (arquivo.value) form.append('arquivo', arquivo.value)

    const { data } = await client.post<WorkStatus>('/evidence-journey/public/works', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    myWork.value = data
    hasWork.value = true
    successMsg.value = hasWork.value ? 'Trabalho reenviado para análise!' : 'Trabalho submetido com sucesso!'
    titulo.value = ''; cursoTrabalho.value = ''; tipoTrabalho.value = ''; arquivo.value = null
    successMsg.value = 'Trabalho submetido com sucesso! Aguarde a análise da coordenação.'
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.message ?? 'Erro ao submeter trabalho.'
  } finally { submitting.value = false }
}
</script>

<template>
  <div class="sub-view">
    <div class="sub-header">
      <div>
        <h1 class="sub-title">Jornada de Evidências e Mostra de Jogos</h1>
        <p class="sub-subtitle">Submissão de trabalhos — sem necessidade de login</p>
      </div>
    </div>

    <!-- ── RA do aluno ───────────────────────────────────────────────── -->
    <section class="card mb">
      <h3 class="card__title">Identificação</h3>
      <div class="form-group">
        <label>Seu RA (Registro Acadêmico) *</label>
        <input
          v-model="ra"
          type="text"
          class="input-field"
          placeholder="Ex.: 2024001"
          :disabled="submitting"
        />
        <p v-if="checking" class="hint hint--loading">Buscando aluno…</p>
        <p v-else-if="myWork" class="hint hint--ok">✅ Aluno identificado: {{ myWork.alunoNome }}</p>
        <p v-else-if="ra.length >= 3 && !checking" class="hint hint--warn">RA não encontrado. Verifique ou consulte a coordenação.</p>
      </div>
    </section>

    <!-- ── Trabalho já submetido ───────────────────────────────────── -->
    <section v-if="hasWork && myWork" class="card mb">
      <h3 class="card__title">Trabalho registrado</h3>
      <div class="work-status-card">
        <div class="ws-info">
          <p class="ws-titulo">{{ myWork.titulo }}</p>
          <p class="ws-meta">
            {{ myWork.cursoTrabalho }}
            <span v-if="myWork.tipoTrabalho"> · {{ myWork.tipoTrabalho }}</span>
            · {{ myWork.categoria }}
          </p>
          <p class="ws-date">
            Submetido em {{ new Date(myWork.dataSubmissao).toLocaleDateString('pt-BR') }}
          </p>
        </div>
        <span
          class="ws-badge"
          :style="{ color: statusColor(myWork.status), background: statusBg(myWork.status) }"
        >{{ myWork.status }}</span>
      </div>
      <p v-if="myWork.status === 'Reprovado'" class="resubmit-hint">
        Seu trabalho foi reprovado. Corrija e reenvie abaixo.
      </p>
    </section>

    <!-- ── Mensagens ─────────────────────────────────────────────── -->
    <div v-if="successMsg" class="alert alert--ok">{{ successMsg }}</div>
    <div v-if="errorMsg"   class="alert alert--err">{{ errorMsg }}</div>

    <!-- ── Formulário ──────────────────────────────────────────── -->
    <section v-if="!hasWork || myWork?.status === 'Reprovado'" class="card">
      <h3 class="card__title">{{ hasWork ? 'Reenviar trabalho' : 'Submeter trabalho' }}</h3>

      <div class="form-group">
        <label>Título do trabalho *</label>
        <input v-model="titulo" type="text" class="input-field" placeholder="Título completo do trabalho" maxlength="500" />
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label>Curso *</label>
          <input v-model="cursoTrabalho" type="text" class="input-field" placeholder="Ex.: Ciência da Computação" />
        </div>
        <div class="form-group">
          <label>Categoria</label>
          <select v-model="categoria" class="input-field">
            <option v-for="c in CATEGORIAS" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
      </div>

      <div v-if="categoria === 'Jornada de Evidências'" class="form-group">
        <label>Tipo de trabalho</label>
        <select v-model="tipoTrabalho" class="input-field">
          <option value="">Selecionar…</option>
          <option v-for="t in TIPOS" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>

      <div class="form-group">
        <label>Arquivo do resumo (PDF, opcional)</label>
        <input type="file" accept=".pdf,.doc,.docx" @change="onArquivo" class="file-input-native" />
        <p class="file-hint" v-if="arquivo">📎 {{ arquivo.name }}</p>
      </div>

      <button
        class="btn btn--primary"
        :disabled="submitting || !ra.trim() || checking"
        @click="submitWork"
      >
        {{ submitting ? 'Enviando…' : (hasWork ? 'Reenviar trabalho' : 'Submeter trabalho') }}
      </button>
    </section>

    <section v-else-if="myWork?.status !== 'Reprovado'" class="card card--info">
      <p class="info-text">
        {{ myWork?.status === 'Pendente'
            ? '⏳ Seu trabalho está aguardando análise da coordenação.'
            : '✅ Seu trabalho foi aprovado e está registrado para o evento.' }}
      </p>
    </section>
  </div>
</template>

<style scoped>
.sub-view   { padding: 1.5rem; max-width: 800px; margin: 0 auto; }
.sub-header { margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid #0d631b; }
.sub-title  { font-size: 1.4rem; font-weight: 800; color: #0d631b; margin: 0 0 .25rem; }
.sub-subtitle { font-size: .9rem; color: #6b7280; margin: 0; }
.card   { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 1.25rem; }
.card--info { background: #f0fdf4; border-color: #bbf7d0; }
.mb   { margin-bottom: 1.5rem; }
.card__title { font-size: 1rem; font-weight: 600; margin: 0 0 .75rem; }
.work-status-card { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.ws-titulo { font-weight: 700; font-size: .95rem; margin: 0 0 .25rem; color: #111; }
.ws-meta   { font-size: .83rem; color: #6b7280; margin: 0 0 .2rem; }
.ws-date   { font-size: .78rem; color: #9ca3af; margin: 0; }
.ws-badge  { padding: .3rem .85rem; border-radius: 20px; font-size: .82rem; font-weight: 700; white-space: nowrap; }
.resubmit-hint { font-size: .85rem; color: #991b1b; margin: .75rem 0 0; background: #fee2e2; padding: .5rem .75rem; border-radius: 6px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
@media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
.form-group { display: flex; flex-direction: column; gap: .3rem; margin-bottom: .75rem; font-size: .87rem; }
.form-group label { font-weight: 600; font-size: .8rem; color: #374151; }
.input-field { padding: .45rem .75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: .9rem; }
.file-input-native { font-size: .87rem; }
.file-hint { font-size: .8rem; color: #0d631b; margin: .25rem 0 0; }
.btn  { padding: .5rem 1.1rem; border: none; border-radius: 6px; cursor: pointer; font-size: .9rem; font-weight: 600; }
.btn--primary { background: var(--color-primary, #0d631b); color: #fff; }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.info-text { font-size: .9rem; color: #166534; margin: 0; }
.hint { font-size: .8rem; margin: .2rem 0 0; }
.hint--ok      { color: #166534; }
.hint--warn    { color: #92400e; }
.hint--loading { color: #6b7280; }
.alert { padding: .65rem 1rem; border-radius: 8px; font-size: .88rem; font-weight: 600; margin-bottom: 1rem; }
.alert--ok  { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
.alert--err { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
</style>
