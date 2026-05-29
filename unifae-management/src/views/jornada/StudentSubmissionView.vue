<script setup lang="ts">
import client from '@/api/client'
import { ref, onMounted } from 'vue'
import { useToastStore } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth'
import UiAsyncPanel from '@/components/ui/UiAsyncPanel.vue'

const toast = useToastStore()
const auth  = useAuthStore()

type Work = {
  id: number; titulo: string; cursoTrabalho: string; status: string
  dataSubmissao: string; arquivoUrl: string | null
  categoria: string; tipoTrabalho: string | null
}

// Formulário
const titulo        = ref('')
const cursoTrabalho = ref('')
const categoria     = ref('Jornada de Evidências')
const tipoTrabalho  = ref('')
const arquivo       = ref<File | null>(null)
const submitting    = ref(false)

// Estado atual do trabalho
const myWork    = ref<Work | null>(null)
const loading   = ref(false)
const hasWork   = ref(false)

const CATEGORIAS = ['Jornada de Evidências', 'Mostra de Jogos']
const TIPOS = ['Pesquisa', 'TCC', 'Iniciação Científica', 'Desenvolvimento Prático']

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

async function loadMyWork() {
  loading.value = true
  try {
    const { data } = await client.get('/evidence-journey/works?limit=1')
    const item = data.items?.[0] ?? null
    if (item && item.aluno?.id === auth.user?.id) {
      myWork.value = item
      hasWork.value = true
    }
  } catch { /* silencioso */ }
  finally { loading.value = false }
}

async function submitWork() {
  if (!titulo.value.trim() || !cursoTrabalho.value.trim()) {
    toast.error('Título e curso são obrigatórios.')
    return
  }
  submitting.value = true
  try {
    const form = new FormData()
    form.append('titulo', titulo.value.trim())
    form.append('cursoTrabalho', cursoTrabalho.value.trim())
    form.append('categoria', categoria.value)
    if (tipoTrabalho.value) form.append('tipoTrabalho', tipoTrabalho.value)
    if (arquivo.value) form.append('arquivo', arquivo.value)

    const endpoint = hasWork.value ? '/evidence-journey/works/resubmit' : '/evidence-journey/works'
    await client.post(endpoint, form, { headers: { 'Content-Type': 'multipart/form-data' } })

    toast.success(hasWork.value ? 'Trabalho reenviado para análise.' : 'Trabalho submetido com sucesso!')
    titulo.value = ''; cursoTrabalho.value = ''; tipoTrabalho.value = ''; arquivo.value = null
    await loadMyWork()
  } catch (e: any) {
    toast.error(e?.response?.data?.message ?? 'Erro ao submeter trabalho.')
  } finally { submitting.value = false }
}

onMounted(loadMyWork)
</script>

<template>
  <div class="sub-view">
    <div class="sub-header">
      <div>
        <h1 class="sub-title">Jornada de Evidências e Mostra de Jogos</h1>
        <p class="sub-subtitle">Submissão de trabalhos — {{ auth.user?.name }}</p>
      </div>
    </div>

    <UiAsyncPanel :loading="loading">
      <!-- ── Trabalho já submetido ────────────────────────────────────── -->
      <section v-if="hasWork && myWork" class="card mb">
        <h3 class="card__title">Meu trabalho</h3>
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
          >
            {{ myWork.status }}
          </span>
        </div>
        <p v-if="myWork.status === 'Reprovado'" class="resubmit-hint">
          Seu trabalho foi reprovado. Você pode corrigir e reenviar abaixo.
        </p>
      </section>

      <!-- ── Formulário ──────────────────────────────────────────────── -->
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

        <div class="form-group" v-if="categoria === 'Jornada de Evidências'">
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

        <button class="btn btn--primary" :disabled="submitting" @click="submitWork">
          {{ submitting ? 'Enviando…' : (hasWork ? 'Reenviar trabalho' : 'Submeter trabalho') }}
        </button>
      </section>

      <section v-else class="card card--info">
        <p class="info-text">
          {{ myWork?.status === 'Pendente'
              ? '⏳ Seu trabalho está aguardando análise da coordenação. Você receberá uma notificação.'
              : '✅ Seu trabalho foi aprovado e está registrado para o evento.' }}
        </p>
      </section>
    </UiAsyncPanel>
  </div>
</template>

<style scoped>
.sub-view   { padding: 1.5rem; max-width: 800px; }
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
</style>
