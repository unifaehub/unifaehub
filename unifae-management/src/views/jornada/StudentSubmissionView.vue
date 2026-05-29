<script setup lang="ts">
import client from '@/api/client'
import { ref, watch } from 'vue'

type Integrante = { ra: string; nome: string | null; checking: boolean; notFound: boolean }
type WorkStatus = {
  id: number; titulo: string; cursoTrabalho: string; status: string
  dataSubmissao: string; arquivoUrl: string | null
  categoria: string; tipoTrabalho: string | null
  alunoNome: string
  integrantes: { ra: string; nome: string }[] | null
}

// Integrantes (N campos dinâmicos)
const integrantes = ref<Integrante[]>([{ ra: '', nome: null, checking: false, notFound: false }])

// Formulário
const titulo        = ref('')
const cursoTrabalho = ref('')
const categoria     = ref('Jornada de Evidências')
const tipoTrabalho  = ref('')
const arquivo       = ref<File | null>(null)
const submitting    = ref(false)

// Estado
const myWork    = ref<WorkStatus | null>(null)
const hasWork   = ref(false)
const errorMsg  = ref('')
const successMsg = ref('')

const CATEGORIAS = ['Jornada de Evidências', 'Mostra de Jogos']
const TIPOS      = ['Pesquisa', 'TCC', 'Iniciação Científica', 'Desenvolvimento Prático']

function onArquivo(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0] ?? null
  if (f && f.size > 3 * 1024 * 1024) {
    errorMsg.value = 'O arquivo não pode ultrapassar 3 MB.'
    ;(e.target as HTMLInputElement).value = ''
    arquivo.value = null
    return
  }
  errorMsg.value = ''
  arquivo.value = f
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

// Debounce por integrante
const raTimers: (ReturnType<typeof setTimeout> | null)[] = []

function onRaInput(idx: number) {
  const item = integrantes.value[idx]!
  if (raTimers[idx]) clearTimeout(raTimers[idx]!)
  item.nome = null
  item.notFound = false
  myWork.value = null
  hasWork.value = false
  errorMsg.value = ''
  const ra = item.ra.trim()
  if (ra.length < 3) return
  raTimers[idx] = setTimeout(() => lookupRa(idx, ra), 600)
}

async function lookupRa(idx: number, ra: string) {
  const item = integrantes.value[idx]!
  item.checking = true
  try {
    const { data } = await client.get(`/evidence-journey/public/works/${encodeURIComponent(ra)}`)
    item.nome = data?.alunoNome ?? null
    item.notFound = !data?.alunoNome
    // Primeiro integrante — checar trabalho existente
    if (idx === 0 && data) {
      myWork.value = data
      hasWork.value = true
    } else if (idx === 0) {
      myWork.value = null
      hasWork.value = false
    }
  } catch {
    item.nome = null
    item.notFound = true
  } finally { item.checking = false }
}

// Lookup de nome sem trabalho (integrantes extras)
async function lookupNomeExtra(idx: number, ra: string) {
  const item = integrantes.value[idx]!
  item.checking = true
  try {
    // Usa o mesmo endpoint — retorna null se não tem trabalho, mas o nome vem junto
    const { data } = await client.get(`/evidence-journey/public/works/${encodeURIComponent(ra)}`)
    // Se tem trabalho ou não, apenas precisamos saber se o RA existe; a API retorna null quando não existe
    // Para integrantes extras, buscamos o nome via endpoint de verificação de RA
    item.nome = data?.alunoNome ?? null
    item.notFound = item.nome === null
  } catch {
    item.nome = null
    item.notFound = true
  } finally { item.checking = false }
}

watch(
  integrantes,
  (list) => {
    list.forEach((item, idx) => {
      if (idx > 0 && item.ra.trim().length >= 3 && item.nome === null && !item.checking) {
        if (raTimers[idx]) clearTimeout(raTimers[idx]!)
        raTimers[idx] = setTimeout(() => lookupNomeExtra(idx, item.ra.trim()), 600)
      }
    })
  },
  { deep: true },
)

function addIntegrante() {
  integrantes.value.push({ ra: '', nome: null, checking: false, notFound: false })
}

function removeIntegrante(idx: number) {
  if (integrantes.value.length === 1) return
  integrantes.value.splice(idx, 1)
}

async function submitWork() {
  errorMsg.value = ''
  successMsg.value = ''
  const validRas = integrantes.value.map((i) => i.ra.trim()).filter(Boolean)
  if (!validRas.length) { errorMsg.value = 'Informe ao menos um RA.'; return }
  if (!titulo.value.trim() || !cursoTrabalho.value.trim()) {
    errorMsg.value = 'Título e curso são obrigatórios.'
    return
  }
  // Verificar se todos têm nome (identificados)
  for (const item of integrantes.value) {
    if (item.ra.trim() && !item.nome) {
      errorMsg.value = `RA "${item.ra}" não identificado. Verifique antes de enviar.`
      return
    }
  }

  submitting.value = true
  try {
    const form = new FormData()
    validRas.forEach((ra) => form.append('ras', ra))
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
    titulo.value = ''; cursoTrabalho.value = ''; tipoTrabalho.value = ''; arquivo.value = null
    successMsg.value = 'Trabalho submetido com sucesso! Aguarde a análise da coordenação.'
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.message ?? 'Erro ao submeter trabalho.'
  } finally { submitting.value = false }
}

const primaryIdentified = () => {
  const first = integrantes.value[0]
  return first && first.ra.trim().length >= 3 && !!first.nome
}
</script>

<template>
  <div class="sub-view">
    <div class="sub-header">
      <h1 class="sub-title">Jornada de Evidências e Mostra de Jogos</h1>
      <p class="sub-subtitle">Submissão de trabalhos</p>
    </div>

    <!-- ── Integrantes ───────────────────────────────────────────────── -->
    <section class="card mb">
      <h3 class="card__title">Integrantes do grupo</h3>

      <div
        v-for="(item, idx) in integrantes"
        :key="idx"
        class="integrante-row"
      >
        <div class="integrante-field">
          <label>{{ idx === 0 ? 'RA do responsável *' : `RA do integrante ${idx + 1}` }}</label>
          <input
            v-model="item.ra"
            type="text"
            class="input-field"
            :placeholder="idx === 0 ? 'Ex.: 2024001' : 'Ex.: 2024002'"
            :disabled="submitting"
            @input="onRaInput(idx)"
          />
          <p v-if="item.checking"    class="hint hint--loading">Buscando…</p>
          <p v-else-if="item.nome"   class="hint hint--ok">✅ {{ item.nome }}</p>
          <p v-else-if="item.notFound && item.ra.length >= 3" class="hint hint--warn">RA não encontrado</p>
        </div>
        <button
          v-if="integrantes.length > 1"
          class="btn-remove"
          title="Remover"
          :disabled="submitting"
          @click="removeIntegrante(idx)"
        >×</button>
      </div>

      <button class="btn btn--secondary btn--sm" :disabled="submitting" @click="addIntegrante">
        + Adicionar integrante
      </button>
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
          <p v-if="myWork.integrantes?.length" class="ws-meta">
            Integrantes: {{ myWork.integrantes.map(i => i.nome).join(', ') }}
          </p>
          <p class="ws-date">
            Submetido em {{ new Date(myWork.dataSubmissao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
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
      <h3 class="card__title">{{ hasWork ? 'Reenviar trabalho' : 'Dados do trabalho' }}</h3>

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
        <label>Arquivo do resumo (PDF, máx. 3 MB)</label>
        <input type="file" accept=".pdf,.doc,.docx" @change="onArquivo" class="file-input-native" />
        <p class="file-hint" v-if="arquivo">📎 {{ arquivo.name }}</p>
      </div>

      <button
        class="btn btn--primary"
        :disabled="submitting || !primaryIdentified()"
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

/* Integrantes */
.integrante-row  { display: flex; align-items: flex-start; gap: .5rem; margin-bottom: .75rem; }
.integrante-field { flex: 1; display: flex; flex-direction: column; gap: .25rem; font-size: .87rem; }
.integrante-field label { font-weight: 600; font-size: .8rem; color: #374151; }
.btn-remove { margin-top: 1.4rem; background: none; border: 1px solid #fca5a5; border-radius: 6px; color: #dc2626; cursor: pointer; font-size: .95rem; padding: .3rem .55rem; flex-shrink: 0; }
.btn-remove:hover { background: #fee2e2; }

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

.btn { padding: .5rem 1.1rem; border: none; border-radius: 6px; cursor: pointer; font-size: .9rem; font-weight: 600; }
.btn--primary   { background: var(--color-primary, #0d631b); color: #fff; }
.btn--secondary { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
.btn--sm { font-size: .82rem; padding: .35rem .8rem; }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.info-text { font-size: .9rem; color: #166534; margin: 0; }
.hint { font-size: .78rem; margin: .15rem 0 0; }
.hint--ok      { color: #166534; }
.hint--warn    { color: #92400e; }
.hint--loading { color: #6b7280; }
.alert { padding: .65rem 1rem; border-radius: 8px; font-size: .88rem; font-weight: 600; margin-bottom: 1rem; }
.alert--ok  { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
.alert--err { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
</style>
