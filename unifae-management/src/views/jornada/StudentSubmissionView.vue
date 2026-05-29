<script setup lang="ts">
import client from '@/api/client'
import { ref, watch, onMounted, computed } from 'vue'

type Integrante = { ra: string; nome: string | null; checking: boolean; notFound: boolean }
type WorkStatus = {
  id: number; titulo: string; cursoTrabalho: string; status: string
  dataSubmissao: string; arquivoUrl: string | null
  categoria: string; tipoTrabalho: string | null
  alunoNome: string
  integrantes: { ra: string; nome: string }[] | null
  tipoSubmissao: 'manual' | 'arquivo' | null
  motivo?: string | null
}
type Professor = { id: number; name: string; email: string; cursoBase?: string | null }
type Coorientador =
  | { tipo: 'interno'; professorId: number; nome: string; email: string }
  | { tipo: 'externo'; professorId?: never; nome: string; email: string }
type SecaoConfig = { id: string; titulo: string; ordem: number; obrigatorio: boolean }
type HistoryWork = { id: number; titulo: string; status: string; dataSubmissao: string; motivo?: string | null; tipoSubmissao?: string }

// ── Integrantes ──────────────────────────────────────────────────────
const integrantes = ref<Integrante[]>([{ ra: '', nome: null, checking: false, notFound: false }])

// ── Dados do trabalho ────────────────────────────────────────────────
const titulo        = ref('')
const cursoTrabalho = ref('')
const categoria     = ref('Jornada de Evidências')
const tipoTrabalho  = ref('')

// ── Modo de envio ────────────────────────────────────────────────────
const tipoSubmissao = ref<'manual' | 'arquivo'>('arquivo')

// ── Arquivos ──────────────────────────────────────────────────────────
const arquivo      = ref<File | null>(null)
const apresentacao = ref<File | null>(null)

// ── Config pública ───────────────────────────────────────────────────
const secoesConfig    = ref<SecaoConfig[]>([])
const secoesFilled    = ref<Record<string, string>>({})
const submissaoAberta = ref(true)

async function fetchPublicConfig() {
  try {
    const { data } = await client.get('/evidence-journey/public/config')
    secoesConfig.value = data.secoesResumo ?? []
    submissaoAberta.value = data.submissaoAberta ?? true
    // Init secoesFilled with empty strings for all sections
    const filled: Record<string, string> = {}
    for (const s of secoesConfig.value) filled[s.id] = ''
    secoesFilled.value = filled
  } catch { /* silencioso */ }
}

// ── Cursos (para filtro de professor) ────────────────────────────────
type Course = { id: number; name: string }
const courses      = ref<Course[]>([])
const courseFilter = ref<number | ''>('')

// ── Professores ──────────────────────────────────────────────────────
const professors       = ref<Professor[]>([])
const professorsLoad   = ref(false)
const professorSearch  = ref('')
const professorsFiltered = computed(() => {
  let list = professors.value
  if (courseFilter.value !== '') {
    const course = courses.value.find(c => c.id === courseFilter.value)
    if (course) {
      const name = course.name.toLowerCase()
      list = list.filter(p => p.cursoBase && p.cursoBase.toLowerCase().includes(name))
    }
  }
  const q = professorSearch.value.toLowerCase().trim()
  if (q) list = list.filter(p => p.name.toLowerCase().includes(q))
  return list
})

async function fetchProfessors() {
  if (professors.value.length) return
  professorsLoad.value = true
  try {
    const [profRes, courseRes] = await Promise.allSettled([
      client.get<Professor[]>('/evidence-journey/public/professors'),
      client.get<Course[]>('/evidence-journey/public/courses'),
    ])
    if (profRes.status === 'fulfilled')   professors.value = profRes.value.data
    if (courseRes.status === 'fulfilled') courses.value    = courseRes.value.data
  } catch { /* silencioso */ }
  finally { professorsLoad.value = false }
}

watch(tipoSubmissao, (v) => { if (v === 'manual') fetchProfessors() })
onMounted(() => {
  fetchPublicConfig()
  // Cursos são usados tanto no filtro de professor quanto no campo Curso do trabalho
  client.get<Course[]>('/evidence-journey/public/courses')
    .then(({ data }) => { courses.value = data })
    .catch(() => {})
})

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
const history    = ref<HistoryWork[]>([])

async function fetchHistory(ra: string) {
  try {
    const { data } = await client.get(`/evidence-journey/public/works/history/${encodeURIComponent(ra)}`)
    history.value = data
  } catch { /* silencioso */ }
}

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
    errorMsg.value = 'O arquivo do resumo não pode ultrapassar 3 MB.'
    ;(e.target as HTMLInputElement).value = ''
    arquivo.value = null
    return
  }
  errorMsg.value = ''
  arquivo.value = f
}

function onApresentacao(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0] ?? null
  if (f && f.size > 10 * 1024 * 1024) {
    errorMsg.value = 'O arquivo de apresentação não pode ultrapassar 10 MB.'
    ;(e.target as HTMLInputElement).value = ''
    apresentacao.value = null
    return
  }
  errorMsg.value = ''
  apresentacao.value = f
}

// ── Lookup de RA ─────────────────────────────────────────────────────
const raTimers: (ReturnType<typeof setTimeout> | null)[] = []

function onRaInput(idx: number) {
  const item = integrantes.value[idx]!
  if (raTimers[idx]) clearTimeout(raTimers[idx]!)
  item.nome = null; item.notFound = false
  if (idx === 0) { history.value = [] }
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
    if (idx === 0) {
      myWork.value = data ?? null
      hasWork.value = !!data
      if (data?.alunoNome) fetchHistory(ra)
    }
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
    if (!orientadorPayload()) { errorMsg.value = 'Selecione ou informe o orientador.'; return }
    if (!palavrasChave.value.trim()) { errorMsg.value = 'Preencha as Palavras-chave.'; return }
    for (const s of secoesConfig.value.filter(s => s.obrigatorio)) {
      if (!secoesFilled.value[s.id]?.trim()) {
        errorMsg.value = `Preencha a seção "${s.titulo}".`; return
      }
    }
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

    // Apresentação sempre opcional, em qualquer modo
    if (apresentacao.value) form.append('apresentacao', apresentacao.value)

    if (tipoSubmissao.value === 'arquivo') {
      if (arquivo.value) form.append('arquivo', arquivo.value)
    } else {
      const orient = orientadorPayload()
      if (orient) form.append('orientador', JSON.stringify(orient))
      const coOrients = coorientadoresPayload()
      if (coOrients.length) form.append('coorientadores', JSON.stringify(coOrients))
      // Build dynamic sections
      const secoesPayload = secoesConfig.value
        .filter(s => secoesFilled.value[s.id]?.trim())
        .map(s => ({ secao: s.titulo, conteudo: secoesFilled.value[s.id]!.trim() }))
      form.append('resumoSecoes', JSON.stringify(secoesPayload))
      form.append('palavrasChave', palavrasChave.value.trim())
      form.append('referencias',   referencias.value.trim())
    }

    const { data } = await client.post<WorkStatus>('/evidence-journey/public/works', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    myWork.value = data; hasWork.value = true
    // Limpar
    titulo.value = ''; cursoTrabalho.value = ''; tipoTrabalho.value = ''; arquivo.value = null; apresentacao.value = null
    orientadorId.value = ''; orientadorNome.value = ''; orientadorEmail.value = ''
    coorientadores.value = []
    palavrasChave.value = ''; referencias.value = ''
    resumoIntroducao.value = ''; resumoObjetivos.value = ''; resumoMetodo.value = ''
    resumoResultados.value = ''; resumoConclusoes.value = ''
    const cleared: Record<string, string> = {}
    for (const s of secoesConfig.value) cleared[s.id] = ''
    secoesFilled.value = cleared
    // Refresh history
    const primaryRa = integrantes.value[0]?.ra.trim()
    if (primaryRa) fetchHistory(primaryRa)
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

    <!-- ── Aviso período submissão ──────────────────────────────────── -->
    <div v-if="!submissaoAberta" class="alert alert--warn">
      O período de submissão de trabalhos não está aberto no momento.
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
      <p v-if="myWork.motivo && myWork.status === 'Reprovado'" class="motivo-text">
        <strong>Motivo da reprovação:</strong> {{ myWork.motivo }}
      </p>
      <p v-if="myWork.status === 'Reprovado'" class="resubmit-hint">
        Seu trabalho foi reprovado. Corrija e reenvie abaixo.
      </p>
    </section>

    <!-- ── Histórico de envios ───────────────────────────────────────── -->
    <section v-if="history.length > 1" class="card mb">
      <h3 class="card__title">Histórico de envios</h3>
      <div class="history-list">
        <div v-for="h in history" :key="h.id" class="history-row">
          <div class="history-info">
            <p class="history-titulo">{{ h.titulo }}</p>
            <p class="history-meta">
              {{ new Date(h.dataSubmissao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
              <span v-if="h.tipoSubmissao" class="badge-tipo" :class="h.tipoSubmissao === 'manual' ? 'badge-tipo--manual' : 'badge-tipo--arquivo'">
                {{ h.tipoSubmissao === 'manual' ? 'Formulário' : 'Arquivo' }}
              </span>
            </p>
            <p v-if="h.motivo && h.status === 'Reprovado'" class="history-motivo">Motivo: {{ h.motivo }}</p>
          </div>
          <span class="ws-badge" :style="{ color: statusColor(h.status), background: statusBg(h.status) }">{{ h.status }}</span>
        </div>
      </div>
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
            <select v-model="cursoTrabalho" class="input-field" :disabled="submitting">
              <option value="">Selecionar curso…</option>
              <option v-for="c in courses" :key="c.id" :value="c.name">{{ c.name }}</option>
            </select>
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
            <template v-else>
              <div class="prof-filters">
                <select v-model="courseFilter" class="input-field" :disabled="submitting">
                  <option value="">Todos os cursos</option>
                  <option v-for="c in courses" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
                <input v-model="professorSearch" type="text" class="input-field" placeholder="Buscar por nome…" :disabled="submitting" />
              </div>
              <select class="input-field" :disabled="submitting"
                :value="orientadorId"
                @change="onOrientadorSelect(+($event.target as HTMLSelectElement).value || '')"
              >
                <option value="">— Selecionar professor —</option>
                <option v-for="p in professorsFiltered" :key="p.id" :value="p.id">
                  {{ p.name }}{{ p.cursoBase ? ` (${p.cursoBase})` : '' }}
                </option>
              </select>
            </template>
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
              <div class="prof-filters">
                <select v-model="courseFilter" class="input-field" :disabled="submitting">
                  <option value="">Todos os cursos</option>
                  <option v-for="c in courses" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
                <input v-model="professorSearch" type="text" class="input-field" placeholder="Buscar por nome…" :disabled="submitting" />
              </div>
              <select class="input-field" :disabled="submitting || professorsLoad"
                :value="co.professorId"
                @change="onCoorientadorProfSelect(idx, +($event.target as HTMLSelectElement).value || '')"
              >
                <option value="">— Selecionar professor —</option>
                <option v-for="p in professorsFiltered" :key="p.id" :value="p.id">
                  {{ p.name }}{{ p.cursoBase ? ` (${p.cursoBase})` : '' }}
                </option>
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

          <!-- Seções do resumo dinâmicas -->
          <div class="manual-divider">Seções do resumo</div>
          <template v-if="secoesConfig.length">
            <div v-for="s in secoesConfig" :key="s.id" class="form-group">
              <label>{{ s.titulo }} <span v-if="s.obrigatorio">*</span></label>
              <textarea v-model="secoesFilled[s.id]" class="input-field textarea" rows="4"
                :placeholder="`Preencha: ${s.titulo}`" :disabled="submitting" />
            </div>
          </template>
          <template v-else>
            <!-- Fallback: campos fixos para compatibilidade -->
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
          </template>

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

        <!-- Apresentação — opcional em qualquer modo -->
        <div class="apresentacao-block">
          <div class="manual-divider">Arquivo de apresentação <span class="field-hint" style="font-size:.75rem;text-transform:none;letter-spacing:0">(opcional)</span></div>
          <p class="section-desc">Slides, PDF ou outro material que auxilie os avaliadores durante a apresentação. Máx. 10 MB.</p>
          <div class="form-group">
            <input type="file" accept=".pdf,.ppt,.pptx,.key,.odp" @change="onApresentacao" class="file-input-native" :disabled="submitting" />
            <p class="file-hint" v-if="apresentacao">📎 {{ apresentacao.name }}</p>
          </div>
        </div>

        <!-- Aviso de notificações -->
        <div class="notify-info">
          📧 Ao submeter, um e-mail de confirmação será enviado automaticamente para todos os integrantes, orientador(es) e coordenação.
        </div>
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
.alert--ok   { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
.alert--err  { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
.prof-filters { display: flex; gap: .4rem; margin-bottom: .35rem; flex-wrap: wrap; }
.prof-filters .input-field { flex: 1; min-width: 140px; }
.apresentacao-block { margin-top: .25rem; }
.notify-info { font-size: .82rem; color: #1d4ed8; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: .6rem .9rem; margin-top: .75rem; }
.alert--warn { background: #fef9c3; color: #92400e; border: 1px solid #fde68a; }
.motivo-text { font-size: .85rem; color: #991b1b; margin: .5rem 0 0; background: #fee2e2; padding: .4rem .65rem; border-radius: 6px; }
.history-list { display: flex; flex-direction: column; gap: .5rem; }
.history-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; padding: .5rem .65rem; border: 1px solid #e5e7eb; border-radius: 7px; }
.history-info { flex: 1; min-width: 0; }
.history-titulo { font-size: .87rem; font-weight: 600; margin: 0 0 .15rem; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.history-meta { font-size: .78rem; color: #6b7280; margin: 0 0 .15rem; display: flex; align-items: center; gap: .4rem; flex-wrap: wrap; }
.history-motivo { font-size: .78rem; color: #991b1b; margin: .1rem 0 0; }
</style>
