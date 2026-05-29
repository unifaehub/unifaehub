<script setup lang="ts">
import client from '@/api/client'
import { ref, watch, onMounted } from 'vue'

type Integrante = { ra: string; nome: string | null; checking: boolean; notFound: boolean }
type WorkStatus = {
  id: number; titulo: string; cursoTrabalho: string; status: string
  dataSubmissao: string; arquivoUrl: string | null
  categoria: string; tipoTrabalho: string | null
  alunoNome: string
  integrantes: { ra: string; nome: string }[] | null
  tipoSubmissao: 'manual' | 'arquivo' | null
}
type Professor = { id: number; name: string; email: string }
type Coorientador =
  | { tipo: 'interno'; professorId: number; nome: string; email: string }
  | { tipo: 'externo'; professorId?: never; nome: string; email: string }

// ── Integrantes ──────────────────────────────────────────────────────
const integrantes = ref<Integrante[]>([{ ra: '', nome: null, checking: false, notFound: false }])

// ── Dados do trabalho ────────────────────────────────────────────────
const titulo        = ref('')
const cursoTrabalho = ref('')
const categoria     = ref('Jornada de Evidências')
const tipoTrabalho  = ref('')

// ── Modo de envio ────────────────────────────────────────────────────
const tipoSubmissao = ref<'manual' | 'arquivo'>('arquivo')

// ── Modo arquivo ─────────────────────────────────────────────────────
const arquivo = ref<File | null>(null)

// ── Professores ──────────────────────────────────────────────────────
const professors     = ref<Professor[]>([])
const professorsLoad = ref(false)

async function fetchProfessors() {
  if (professors.value.length) return
  professorsLoad.value = true
  try {
    const { data } = await client.get<Professor[]>('/evidence-journey/public/professors')
    professors.value = data
  } catch { /* silencioso */ }
  finally { professorsLoad.value = false }
}

watch(tipoSubmissao, (v) => { if (v === 'manual') fetchProfessors() })
onMounted(() => { /* pré-carrega se já em modo manual */ })

// ── Orientador ───────────────────────────────────────────────────────
const orientadorId    = ref<number | ''>('')   // '' = nenhum selecionado
const orientadorNome  = ref('')                 // só para externo (campo manual)
const orientadorEmail = ref('')

function onOrientadorSelect(id: number | '') {
  orientadorId.value = id
  if (id !== '') {
    const p = professors.value.find((p) => p.id === id)
    if (p) { orientadorNome.value = p.name; orientadorEmail.value = p.email }
  } else {
    orientadorNome.value = ''; orientadorEmail.value = ''
  }
}

function orientadorPayload(): { professorId?: number; nome: string; email: string } | null {
  if (orientadorId.value !== '') {
    const p = professors.value.find((p) => p.id === orientadorId.value)
    if (p) return { professorId: p.id, nome: p.name, email: p.email }
  }
  if (orientadorNome.value.trim()) {
    return { nome: orientadorNome.value.trim(), email: orientadorEmail.value.trim() }
  }
  return null
}

// ── Co-orientadores ──────────────────────────────────────────────────
const coorientadores = ref<{ tipo: 'interno' | 'externo'; professorId: number | ''; nome: string; email: string }[]>([])

function addCoorientador() {
  coorientadores.value.push({ tipo: 'interno', professorId: '', nome: '', email: '' })
}
function removeCoorientador(idx: number) {
  coorientadores.value.splice(idx, 1)
}
function onCoorientadorProfSelect(idx: number, id: number | '') {
  const co = coorientadores.value[idx]!
  co.professorId = id
  if (id !== '') {
    const p = professors.value.find((p) => p.id === id)
    if (p) { co.nome = p.name; co.email = p.email }
  } else {
    co.nome = ''; co.email = ''
  }
}
function onCoorientadorTipoChange(idx: number) {
  const co = coorientadores.value[idx]!
  co.professorId = ''; co.nome = ''; co.email = ''
}

function coorientadoresPayload(): Coorientador[] {
  return coorientadores.value
    .filter((co) => {
      if (co.tipo === 'interno') return co.professorId !== ''
      return co.nome.trim() !== ''
    })
    .map((co) => {
      if (co.tipo === 'interno') {
        const p = professors.value.find((p) => p.id === co.professorId)!
        return { tipo: 'interno' as const, professorId: p.id, nome: p.name, email: p.email }
      }
      return { tipo: 'externo' as const, nome: co.nome.trim(), email: co.email.trim() }
    })
}

// ── Campos do resumo manual ──────────────────────────────────────────
const resumoIntroducao = ref('')
const resumoObjetivos  = ref('')
const resumoMetodo     = ref('')
const resumoResultados = ref('')
const resumoConclusoes = ref('')
const palavrasChave    = ref('')
const referencias      = ref('')

// ── Estado geral ─────────────────────────────────────────────────────
const myWork     = ref<WorkStatus | null>(null)
const hasWork    = ref(false)
const submitting = ref(false)
const errorMsg   = ref('')
const successMsg = ref('')

const CATEGORIAS = ['Jornada de Evidências', 'Mostra de Jogos']
const TIPOS      = ['Pesquisa', 'TCC', 'Iniciação Científica', 'Desenvolvimento Prático']

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

// ── Lookup de RA ─────────────────────────────────────────────────────
const raTimers: (ReturnType<typeof setTimeout> | null)[] = []

function onRaInput(idx: number) {
  const item = integrantes.value[idx]!
  if (raTimers[idx]) clearTimeout(raTimers[idx]!)
  item.nome = null; item.notFound = false
  myWork.value = null; hasWork.value = false; errorMsg.value = ''
  const ra = item.ra.trim()
  if (ra.length < 3) return
  raTimers[idx] = setTimeout(() => lookupRa(idx, ra), 600)
}

async function lookupRa(idx: number, ra: string) {
  const item = integrantes.value[idx]!
  item.checking = true
  try {
    const { data } = await client.get(`/evidence-journey/public/works/${encodeURIComponent(ra)}`)
    item.nome     = data?.alunoNome ?? null
    item.notFound = !data?.alunoNome
    if (idx === 0) { myWork.value = data ?? null; hasWork.value = !!data }
  } catch {
    item.nome = null; item.notFound = true
  } finally { item.checking = false }
}

async function lookupNomeExtra(idx: number, ra: string) {
  const item = integrantes.value[idx]!
  item.checking = true
  try {
    const { data } = await client.get(`/evidence-journey/public/works/${encodeURIComponent(ra)}`)
    item.nome = data?.alunoNome ?? null; item.notFound = item.nome === null
  } catch {
    item.nome = null; item.notFound = true
  } finally { item.checking = false }
}

watch(integrantes, (list) => {
  list.forEach((item, idx) => {
    if (idx > 0 && item.ra.trim().length >= 3 && item.nome === null && !item.checking) {
      if (raTimers[idx]) clearTimeout(raTimers[idx]!)
      raTimers[idx] = setTimeout(() => lookupNomeExtra(idx, item.ra.trim()), 600)
    }
  })
}, { deep: true })

function addIntegrante() {
  integrantes.value.push({ ra: '', nome: null, checking: false, notFound: false })
}
function removeIntegrante(idx: number) {
  if (integrantes.value.length === 1) return
  integrantes.value.splice(idx, 1)
}

const primaryIdentified = () => {
  const first = integrantes.value[0]
  return first && first.ra.trim().length >= 3 && !!first.nome
}

// ── Submit ────────────────────────────────────────────────────────────
async function submitWork() {
  errorMsg.value = ''; successMsg.value = ''
  const validRas = integrantes.value.map((i) => i.ra.trim()).filter(Boolean)
  if (!validRas.length) { errorMsg.value = 'Informe ao menos um RA.'; return }
  if (!titulo.value.trim() || !cursoTrabalho.value.trim()) {
    errorMsg.value = 'Título e curso são obrigatórios.'; return
  }
  for (const item of integrantes.value) {
    if (item.ra.trim() && !item.nome) {
      errorMsg.value = `RA "${item.ra}" não identificado.`; return
    }
  }
  if (tipoSubmissao.value === 'manual') {
    if (!orientadorPayload())              { errorMsg.value = 'Selecione ou informe o orientador.'; return }
    if (!resumoIntroducao.value.trim())    { errorMsg.value = 'Preencha a Introdução.'; return }
    if (!resumoObjetivos.value.trim())     { errorMsg.value = 'Preencha os Objetivos.'; return }
    if (!resumoMetodo.value.trim())        { errorMsg.value = 'Preencha o Método.'; return }
    if (!resumoResultados.value.trim())    { errorMsg.value = 'Preencha os Resultados.'; return }
    if (!resumoConclusoes.value.trim())    { errorMsg.value = 'Preencha as Conclusões.'; return }
    if (!palavrasChave.value.trim())       { errorMsg.value = 'Preencha as Palavras-chave.'; return }
  }

  submitting.value = true
  try {
    const form = new FormData()
    validRas.forEach((ra) => form.append('ras', ra))
    form.append('titulo', titulo.value.trim())
    form.append('cursoTrabalho', cursoTrabalho.value.trim())
    form.append('categoria', categoria.value)
    form.append('tipoSubmissao', tipoSubmissao.value)
    if (tipoTrabalho.value) form.append('tipoTrabalho', tipoTrabalho.value)

    if (tipoSubmissao.value === 'arquivo') {
      if (arquivo.value) form.append('arquivo', arquivo.value)
    } else {
      const orient = orientadorPayload()
      if (orient) form.append('orientador', JSON.stringify(orient))
      const coOrients = coorientadoresPayload()
      if (coOrients.length) form.append('coorientadores', JSON.stringify(coOrients))
      form.append('resumoIntroducao', resumoIntroducao.value.trim())
      form.append('resumoObjetivos',  resumoObjetivos.value.trim())
      form.append('resumoMetodo',     resumoMetodo.value.trim())
      form.append('resumoResultados', resumoResultados.value.trim())
      form.append('resumoConclusoes', resumoConclusoes.value.trim())
      form.append('palavrasChave',    palavrasChave.value.trim())
      form.append('referencias',      referencias.value.trim())
    }

    const { data } = await client.post<WorkStatus>('/evidence-journey/public/works', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    myWork.value = data; hasWork.value = true
    // Limpar
    titulo.value = ''; cursoTrabalho.value = ''; tipoTrabalho.value = ''; arquivo.value = null
    orientadorId.value = ''; orientadorNome.value = ''; orientadorEmail.value = ''
    coorientadores.value = []
    resumoIntroducao.value = ''; resumoObjetivos.value = ''; resumoMetodo.value = ''
    resumoResultados.value = ''; resumoConclusoes.value = ''; palavrasChave.value = ''; referencias.value = ''
    successMsg.value = 'Trabalho submetido com sucesso! Aguarde a análise da coordenação.'
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.message ?? 'Erro ao submeter trabalho.'
  } finally { submitting.value = false }
}
</script>

<template>
  <div class="sub-view">
    <div class="sub-header">
      <h1 class="sub-title">Jornada de Evidências e Mostra de Jogos</h1>
      <p class="sub-subtitle">Submissão de trabalhos</p>
    </div>

    <!-- ── Integrantes ─────────────────────────────────────────────── -->
    <section class="card mb">
      <h3 class="card__title">Integrantes do grupo</h3>
      <div v-for="(item, idx) in integrantes" :key="idx" class="integrante-row">
        <div class="integrante-field">
          <label>{{ idx === 0 ? 'RA do responsável *' : `RA do integrante ${idx + 1}` }}</label>
          <input v-model="item.ra" type="text" class="input-field"
            :placeholder="idx === 0 ? 'Ex.: 2024001' : 'Ex.: 2024002'"
            :disabled="submitting" @input="onRaInput(idx)" />
          <p v-if="item.checking"   class="hint hint--loading">Buscando…</p>
          <p v-else-if="item.nome"  class="hint hint--ok">✅ {{ item.nome }}</p>
          <p v-else-if="item.notFound && item.ra.length >= 3" class="hint hint--warn">RA não encontrado</p>
        </div>
        <button v-if="integrantes.length > 1" class="btn-remove" title="Remover"
          :disabled="submitting" @click="removeIntegrante(idx)">×</button>
      </div>
      <button class="btn btn--secondary btn--sm" :disabled="submitting" @click="addIntegrante">
        + Adicionar integrante
      </button>
    </section>

    <!-- ── Trabalho já submetido ──────────────────────────────────── -->
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
          <p class="ws-meta">
            Envio:
            <span class="badge-tipo" :class="myWork.tipoSubmissao === 'manual' ? 'badge-tipo--manual' : 'badge-tipo--arquivo'">
              {{ myWork.tipoSubmissao === 'manual' ? 'Formulário manual' : 'Arquivo' }}
            </span>
          </p>
          <p class="ws-date">
            Submetido em {{ new Date(myWork.dataSubmissao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
          </p>
        </div>
        <span class="ws-badge" :style="{ color: statusColor(myWork.status), background: statusBg(myWork.status) }">{{ myWork.status }}</span>
      </div>
      <p v-if="myWork.status === 'Reprovado'" class="resubmit-hint">
        Seu trabalho foi reprovado. Corrija e reenvie abaixo.
      </p>
    </section>

    <!-- ── Mensagens ──────────────────────────────────────────────── -->
    <div v-if="successMsg" class="alert alert--ok">{{ successMsg }}</div>
    <div v-if="errorMsg"   class="alert alert--err">{{ errorMsg }}</div>

    <!-- ── Formulário principal ───────────────────────────────────── -->
    <template v-if="!hasWork || myWork?.status === 'Reprovado'">

      <!-- Dados do trabalho -->
      <section class="card mb">
        <h3 class="card__title">{{ hasWork ? 'Reenviar trabalho' : 'Dados do trabalho' }}</h3>
        <div class="form-group">
          <label>Título do trabalho *</label>
          <input v-model="titulo" type="text" class="input-field" placeholder="Título completo do trabalho" maxlength="500" :disabled="submitting" />
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>Curso *</label>
            <input v-model="cursoTrabalho" type="text" class="input-field" placeholder="Ex.: Engenharia de Software" :disabled="submitting" />
          </div>
          <div class="form-group">
            <label>Categoria</label>
            <select v-model="categoria" class="input-field" :disabled="submitting">
              <option v-for="c in CATEGORIAS" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
        </div>
        <div v-if="categoria === 'Jornada de Evidências'" class="form-group">
          <label>Tipo de trabalho</label>
          <select v-model="tipoTrabalho" class="input-field" :disabled="submitting">
            <option value="">Selecionar…</option>
            <option v-for="t in TIPOS" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
      </section>

      <!-- Modo de envio -->
      <section class="card mb">
        <h3 class="card__title">Resumo do trabalho</h3>
        <p class="section-desc">Escolha como deseja enviar o resumo:</p>
        <div class="radio-group">
          <label class="radio-option" :class="{ 'radio-option--active': tipoSubmissao === 'arquivo' }">
            <input type="radio" v-model="tipoSubmissao" value="arquivo" :disabled="submitting" />
            <div class="radio-content">
              <span class="radio-title">Enviar arquivo pronto</span>
              <span class="radio-desc">Você já preparou o arquivo seguindo o modelo do evento (PDF, DOC ou DOCX, máx. 3 MB)</span>
            </div>
          </label>
          <label class="radio-option" :class="{ 'radio-option--active': tipoSubmissao === 'manual' }">
            <input type="radio" v-model="tipoSubmissao" value="manual" :disabled="submitting" />
            <div class="radio-content">
              <span class="radio-title">Preencher o resumo aqui</span>
              <span class="radio-desc">Preencha os campos abaixo e o sistema gera o arquivo no formato correto do evento</span>
            </div>
          </label>
        </div>

        <!-- MODO ARQUIVO -->
        <div v-if="tipoSubmissao === 'arquivo'" class="form-group mt">
          <label>Arquivo do resumo (PDF, DOC ou DOCX — máx. 3 MB)</label>
          <input type="file" accept=".pdf,.doc,.docx" @change="onArquivo" class="file-input-native" :disabled="submitting" />
          <p class="file-hint" v-if="arquivo">📎 {{ arquivo.name }}</p>
        </div>

        <!-- MODO MANUAL -->
        <template v-if="tipoSubmissao === 'manual'">

          <!-- Orientador -->
          <div class="manual-divider">Orientador *</div>
          <div class="form-group">
            <label>Selecione o orientador</label>
            <div v-if="professorsLoad" class="hint hint--loading">Carregando professores…</div>
            <select v-else class="input-field" :disabled="submitting"
              :value="orientadorId"
              @change="onOrientadorSelect(+($event.target as HTMLSelectElement).value || '')"
            >
              <option value="">— Selecionar professor —</option>
              <option v-for="p in professors" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <p v-if="orientadorId !== ''" class="hint hint--ok">
              ✅ {{ professors.find(p => p.id === orientadorId)?.email }}
            </p>
          </div>

          <!-- Co-orientadores -->
          <div class="manual-divider">
            Co-orientadores
            <button class="btn-add-co" :disabled="submitting" @click="addCoorientador">+ Adicionar</button>
          </div>

          <div v-for="(co, idx) in coorientadores" :key="idx" class="co-card">
            <div class="co-card__header">
              <span class="co-card__label">Co-orientador {{ idx + 1 }}</span>
              <div class="co-tipo-toggle">
                <button class="co-tipo-btn" :class="{ active: co.tipo === 'interno' }"
                  :disabled="submitting" @click="co.tipo = 'interno'; onCoorientadorTipoChange(idx)">
                  Universidade
                </button>
                <button class="co-tipo-btn" :class="{ active: co.tipo === 'externo' }"
                  :disabled="submitting" @click="co.tipo = 'externo'; onCoorientadorTipoChange(idx)">
                  Externo
                </button>
              </div>
              <button class="btn-remove btn-remove--co" title="Remover" :disabled="submitting"
                @click="removeCoorientador(idx)">×</button>
            </div>

            <!-- Interno: selecionar professor -->
            <div v-if="co.tipo === 'interno'" class="form-group mb-0">
              <select class="input-field" :disabled="submitting || professorsLoad"
                :value="co.professorId"
                @change="onCoorientadorProfSelect(idx, +($event.target as HTMLSelectElement).value || '')"
              >
                <option value="">— Selecionar professor —</option>
                <option v-for="p in professors" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
              <p v-if="co.professorId !== ''" class="hint hint--ok">
                ✅ {{ professors.find(p => p.id === co.professorId)?.email }}
              </p>
            </div>

            <!-- Externo: nome + email -->
            <div v-else class="form-grid mb-0">
              <div class="form-group mb-0">
                <label>Nome completo (com titulação)</label>
                <input v-model="co.nome" type="text" class="input-field"
                  placeholder="Ex.: Prof. Dr. João Silva" :disabled="submitting" />
              </div>
              <div class="form-group mb-0">
                <label>E-mail</label>
                <input v-model="co.email" type="email" class="input-field"
                  placeholder="ex@instituicao.edu.br" :disabled="submitting" />
              </div>
            </div>
          </div>

          <p v-if="!coorientadores.length" class="co-empty">Nenhum co-orientador adicionado.</p>

          <!-- Seções do resumo -->
          <div class="manual-divider">Seções do resumo</div>
          <div class="form-group">
            <label>Introdução *</label>
            <textarea v-model="resumoIntroducao" class="input-field textarea" rows="4"
              placeholder="Contextualize o problema, justifique a pesquisa e apresente as lacunas existentes na literatura." :disabled="submitting" />
          </div>
          <div class="form-group">
            <label>Objetivos *</label>
            <textarea v-model="resumoObjetivos" class="input-field textarea" rows="3"
              placeholder="Descreva o objetivo geral e os objetivos específicos do trabalho." :disabled="submitting" />
          </div>
          <div class="form-group">
            <label>Método *</label>
            <textarea v-model="resumoMetodo" class="input-field textarea" rows="3"
              placeholder="Descreva a metodologia utilizada: tipo de pesquisa, coleta e análise de dados." :disabled="submitting" />
          </div>
          <div class="form-group">
            <label>Resultados *</label>
            <textarea v-model="resumoResultados" class="input-field textarea" rows="4"
              placeholder="Apresente os principais resultados e descobertas do trabalho." :disabled="submitting" />
          </div>
          <div class="form-group">
            <label>Conclusões *</label>
            <textarea v-model="resumoConclusoes" class="input-field textarea" rows="3"
              placeholder="Resuma as conclusões e as implicações práticas ou teóricas do trabalho." :disabled="submitting" />
          </div>

          <div class="manual-divider">Palavras-chave e referências</div>
          <div class="form-group">
            <label>Palavras-chave * <span class="field-hint">(separadas por vírgula — mínimo 3)</span></label>
            <input v-model="palavrasChave" type="text" class="input-field"
              placeholder="Ex.: Segurança Cibernética, Honeypot, Detecção de Intrusão" maxlength="500" :disabled="submitting" />
          </div>
          <div class="form-group">
            <label>Referências Bibliográficas <span class="field-hint">(uma por linha)</span></label>
            <textarea v-model="referencias" class="input-field textarea" rows="5"
              placeholder="SOBRENOME, Nome. Título da obra. Local: Editora, Ano." :disabled="submitting" />
          </div>
        </template>
      </section>

      <button class="btn btn--primary" :disabled="submitting || !primaryIdentified()" @click="submitWork">
        {{ submitting ? 'Enviando…' : (hasWork ? 'Reenviar trabalho' : 'Submeter trabalho') }}
      </button>
    </template>

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

.card        { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 1.25rem; }
.card--info  { background: #f0fdf4; border-color: #bbf7d0; }
.mb          { margin-bottom: 1.25rem; }
.mb-0        { margin-bottom: 0; }
.mt          { margin-top: .75rem; }
.card__title { font-size: 1rem; font-weight: 600; margin: 0 0 .75rem; }
.section-desc { font-size: .85rem; color: #6b7280; margin: 0 0 .75rem; }

/* Integrantes */
.integrante-row   { display: flex; align-items: flex-start; gap: .5rem; margin-bottom: .75rem; }
.integrante-field { flex: 1; display: flex; flex-direction: column; gap: .25rem; font-size: .87rem; }
.integrante-field label { font-weight: 600; font-size: .8rem; color: #374151; }
.btn-remove { margin-top: 1.4rem; background: none; border: 1px solid #fca5a5; border-radius: 6px; color: #dc2626; cursor: pointer; font-size: .95rem; padding: .3rem .55rem; flex-shrink: 0; }
.btn-remove--co { margin-top: 0; }
.btn-remove:hover { background: #fee2e2; }

/* Work status */
.work-status-card { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.ws-titulo { font-weight: 700; font-size: .95rem; margin: 0 0 .25rem; color: #111; }
.ws-meta   { font-size: .83rem; color: #6b7280; margin: 0 0 .2rem; }
.ws-date   { font-size: .78rem; color: #9ca3af; margin: 0; }
.ws-badge  { padding: .3rem .85rem; border-radius: 20px; font-size: .82rem; font-weight: 700; white-space: nowrap; }
.badge-tipo { display: inline-block; padding: .15rem .55rem; border-radius: 12px; font-size: .75rem; font-weight: 600; }
.badge-tipo--manual  { background: #eff6ff; color: #1d4ed8; }
.badge-tipo--arquivo { background: #faf5ff; color: #7c3aed; }
.resubmit-hint { font-size: .85rem; color: #991b1b; margin: .75rem 0 0; background: #fee2e2; padding: .5rem .75rem; border-radius: 6px; }

/* Radio modo de envio */
.radio-group  { display: flex; flex-direction: column; gap: .6rem; }
.radio-option { display: flex; align-items: flex-start; gap: .75rem; padding: .75rem 1rem; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: border-color .15s, background .15s; }
.radio-option--active { border-color: #0d631b; background: #f0fdf4; }
.radio-option input[type="radio"] { margin-top: .2rem; flex-shrink: 0; accent-color: #0d631b; }
.radio-content { display: flex; flex-direction: column; gap: .15rem; }
.radio-title   { font-size: .9rem; font-weight: 600; color: #111; }
.radio-desc    { font-size: .8rem; color: #6b7280; }

/* Manual — divisores e co-orientadores */
.manual-divider { display: flex; align-items: center; gap: .75rem; font-size: .78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #0d631b; margin: 1.1rem 0 .6rem; padding-bottom: .3rem; border-bottom: 1px solid #d1fae5; }
.btn-add-co { background: none; border: 1px solid #86efac; border-radius: 12px; color: #166534; cursor: pointer; font-size: .75rem; font-weight: 700; padding: .15rem .6rem; margin-left: auto; }
.btn-add-co:hover { background: #f0fdf4; }

.co-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: .85rem 1rem; margin-bottom: .75rem; display: flex; flex-direction: column; gap: .6rem; }
.co-card__header { display: flex; align-items: center; gap: .5rem; }
.co-card__label { font-size: .8rem; font-weight: 600; color: #374151; }
.co-tipo-toggle { display: flex; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; margin-left: auto; }
.co-tipo-btn { background: none; border: none; padding: .25rem .7rem; font-size: .78rem; cursor: pointer; color: #6b7280; }
.co-tipo-btn.active { background: #0d631b; color: #fff; font-weight: 600; }
.co-empty { font-size: .83rem; color: #9ca3af; margin: .25rem 0 .5rem; }

/* Form */
.textarea { resize: vertical; font-family: inherit; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
@media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
.form-group { display: flex; flex-direction: column; gap: .3rem; margin-bottom: .75rem; font-size: .87rem; }
.form-group label { font-weight: 600; font-size: .8rem; color: #374151; }
.field-hint { font-weight: 400; color: #9ca3af; }
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
