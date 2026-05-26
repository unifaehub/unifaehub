<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import client from '@/api/client'
import MaterialIcon from '@/components/shell/MaterialIcon.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import { useConfirmStore } from '@/stores/confirm'
import { useToastStore } from '@/stores/toast'

type TermRow = {
  id: number
  title: string | null
  version: string
  active: boolean
  courseId: number | null
  appId: number
  createdAt: string
  createdBy: { id: number; name: string; email: string } | null
  updatedAt: string | null
  updatedBy: { id: number; name: string; email: string } | null
  contentPreview: string
}

type TermDetail = {
  id: number
  title: string | null
  version: string
  content: string
  active: boolean
  courseId: number | null
  appId: number
  createdAt: string
  createdBy: { id: number; name: string; email: string } | null
  updatedAt: string | null
  updatedBy: { id: number; name: string; email: string } | null
}

const route = useRoute()
const toast = useToastStore()
const confirm = useConfirmStore()

const courseId = computed(() => Number(route.params.courseId))

const rows = ref<TermRow[]>([])
const loading = ref(false)
/** Primeira versão do curso: API exige nascer ativa (checkbox “ativo agora” não aparece). */
const isFirstConsentTerm = computed(() => !loading.value && rows.value.length === 0)
/** Espelha a regra da API: próximo `0.N` com base nas versões já listadas. */
const nextVersionPreview = computed(() => {
  let max = 0
  let found = false
  for (const r of rows.value) {
    const m = r.version.match(/^0\.(\d+)$/)
    if (m) {
      found = true
      const n = parseInt(m[1]!, 10)
      if (!Number.isNaN(n) && n > max) max = n
    }
  }
  return found ? `0.${max + 1}` : '0.1'
})
const detail = ref<TermDetail | null>(null)
const showCreate = ref(false)

/** Modal: não pode ficar sem termo ativo (ver doDeactivate / applyKeepActiveChoice). */
const keepActiveModal = ref<
  | null
  | { mode: 'only'; message: string }
  | { mode: 'choose'; candidates: TermRow[]; selectedId: number }
>(null)

const formTitle = ref('')
const formContent = ref('')
const formActive = ref(false)

function apiErr(e: unknown, fb: string) {
  if (axios.isAxiosError(e)) {
    const m = e.response?.data as { message?: string | string[] }
    const raw = m?.message
    if (Array.isArray(raw)) return raw.join(' ')
    if (typeof raw === 'string') return raw
  }
  return fb
}

async function load() {
  if (!Number.isFinite(courseId.value)) return
  loading.value = true
  try {
    const { data } = await client.get<TermRow[]>(`/courses/${courseId.value}/consent-terms`)
    rows.value = data
  } catch (e) {
    toast.error(apiErr(e, 'Não foi possível carregar os termos.'))
    rows.value = []
  } finally {
    loading.value = false
  }
}

async function openDetail(id: number) {
  try {
    const { data } = await client.get<TermDetail>(
      `/courses/${courseId.value}/consent-terms/${id}`,
    )
    detail.value = data
  } catch (err) {
    toast.error(apiErr(err, 'Não foi possível abrir o termo.'))
  }
}

function closeDetail() {
  detail.value = null
}

async function doActivate(id: number) {
  const ok = await confirm.confirm({
    title: 'Ativar termo',
    message:
      'Somente um termo pode ficar ativo por curso. O atual será desativado automaticamente. Confirma?',
    confirmText: 'Ativar',
  })
  if (!ok) return
  try {
    await client.patch(`/courses/${courseId.value}/consent-terms/${id}`, { active: true })
    toast.success('Termo ativado.')
    await load()
    if (detail.value?.id === id) await openDetail(id)
  } catch (e) {
    toast.error(apiErr(e, 'Falha ao ativar.'))
  }
}

function closeKeepActiveModal() {
  keepActiveModal.value = null
}

async function doDeactivate(id: number) {
  const row = rows.value.find((r) => r.id === id)
  if (!row?.active) return

  const inactiveOthers = rows.value.filter((r) => !r.active)
  if (inactiveOthers.length === 0) {
    keepActiveModal.value = {
      mode: 'only',
      message:
        'É obrigatório manter pelo menos um termo ativo neste curso. Cadastre outra versão antes de desativar esta.',
    }
    return
  }
  keepActiveModal.value = {
    mode: 'choose',
    candidates: inactiveOthers,
    selectedId: inactiveOthers[0]!.id,
  }
}

async function applyKeepActiveChoice() {
  const m = keepActiveModal.value
  if (!m || m.mode !== 'choose') return
  try {
    await client.patch(`/courses/${courseId.value}/consent-terms/${m.selectedId}`, {
      active: true,
    })
    toast.success('Termo ativo atualizado. A versão anterior foi desativada automaticamente.')
    closeKeepActiveModal()
    await load()
    if (detail.value) await openDetail(detail.value.id)
  } catch (e) {
    toast.error(apiErr(e, 'Falha ao definir o termo ativo.'))
  }
}

async function submitCreate() {
  if (!formContent.value.trim()) {
    toast.error('O conteúdo é obrigatório.')
    return
  }
  try {
    const { data } = await client.post<TermDetail>(`/courses/${courseId.value}/consent-terms`, {
      title: formTitle.value.trim() || null,
      content: formContent.value,
      active: isFirstConsentTerm.value ? true : formActive.value,
    })
    toast.success(`Termo criado (versão ${data.version}).`)
    showCreate.value = false
    formTitle.value = ''
    formContent.value = ''
    formActive.value = false
    await load()
  } catch (e) {
    toast.error(apiErr(e, 'Falha ao criar termo.'))
  }
}

onMounted(() => void load())
watch(courseId, () => {
  rows.value = []
  void load()
})
</script>

<template>
  <div class="page">
    <header class="head">
      <div>
        <h2 class="title">Termos de consentimento</h2>
        <p class="lead">
          Textos exibidos aos usuários do curso (ex.: app). Apenas <strong>um termo ativo</strong> por curso.
          Novas versões recebem número automático (<span class="mono">0.1</span>, <span class="mono">0.2</span>…).
          Troca de versão ativa exige novo aceite dos usuários.
        </p>
      </div>
      <button type="button" class="btn-primary" @click="showCreate = !showCreate">
        <MaterialIcon name="add" size="1.1rem" />
        Novo termo
      </button>
    </header>

    <section v-if="showCreate" class="card tonal create-panel">
      <h3 class="h3">Cadastrar versão</h3>
      <label class="field field--block">
        <span>Título (opcional)</span>
        <input v-model="formTitle" type="text" placeholder="Ex.: Termo de tratamento 2026" />
      </label>
      <p class="muted small version-hint">
        Próxima versão (automática, sem duplicar neste curso):
        <span class="mono">{{ nextVersionPreview }}</span>
      </p>
      <label class="field field--block">
        <span>Conteúdo (HTML permitido)</span>
        <textarea v-model="formContent" rows="10" placeholder="<p>…</p>" />
      </label>
      <p v-if="isFirstConsentTerm" class="muted small first-term-note">
        Esta é a <strong>primeira</strong> versão do curso: ela será cadastrada <strong>ativa</strong> (obrigatório).
      </p>
      <label v-else class="check">
        <input v-model="formActive" type="checkbox" />
        <span>Definir como termo ativo agora</span>
      </label>
      <div class="row">
        <button type="button" class="btn-primary" @click="submitCreate">Salvar</button>
        <button type="button" class="btn-ghost" @click="showCreate = false">Cancelar</button>
      </div>
    </section>

    <section class="card tonal">
      <p v-if="loading" class="muted">Carregando…</p>
      <p v-else-if="!rows.length" class="muted">Nenhum termo cadastrado neste curso.</p>
      <div v-else class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Versão</th>
              <th>Título</th>
              <th>Status</th>
              <th>Criação</th>
              <th>Última alteração</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id">
              <td class="mono">{{ r.version }}</td>
              <td>{{ r.title || '—' }}</td>
              <td>
                <span :class="['badge', r.active ? 'badge--on' : 'badge--off']">
                  {{ r.active ? 'Ativo' : 'Inativo' }}
                </span>
              </td>
              <td class="small meta-stack">
                <div>{{ r.createdBy?.name ?? '—' }}</div>
                <div class="muted">{{ new Date(r.createdAt).toLocaleString('pt-BR') }}</div>
              </td>
              <td class="small meta-stack">
                <div>{{ r.updatedBy?.name ?? '—' }}</div>
                <div class="muted">
                  {{ r.updatedAt ? new Date(r.updatedAt).toLocaleString('pt-BR') : '—' }}
                </div>
              </td>
              <td class="actions">
                <div class="ui-act-row">
                  <UiIconButton icon="visibility" label="Ver detalhes" variant="doc" @click="openDetail(r.id)" />
                  <UiIconButton
                    v-if="!r.active"
                    icon="check_circle"
                    label="Ativar"
                    variant="success"
                    @click="doActivate(r.id)"
                  />
                  <UiIconButton
                    v-else
                    icon="block"
                    label="Desativar"
                    variant="danger"
                    @click="doDeactivate(r.id)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <Teleport to="body">
      <div
        v-if="keepActiveModal"
        class="modal-root"
        role="dialog"
        aria-modal="true"
        aria-labelledby="keep-active-title"
        @click.self="closeKeepActiveModal"
      >
        <div class="modal">
          <header class="modal-head">
            <h3 id="keep-active-title">Termo ativo obrigatório</h3>
            <button type="button" class="icon-btn" aria-label="Fechar" @click="closeKeepActiveModal">
              <MaterialIcon name="close" />
            </button>
          </header>
          <div class="modal-body">
            <template v-if="keepActiveModal.mode === 'only'">
              <p class="modal-lead">{{ keepActiveModal.message }}</p>
            </template>
            <template v-else>
              <p class="modal-lead">
                Pelo menos um termo deve permanecer ativo. Escolha qual versão deve ficar ativa; a que está
                ativa hoje será desativada automaticamente.
              </p>
              <fieldset class="radio-list">
                <legend>Manter ativa a versão</legend>
                <label v-for="c in keepActiveModal.candidates" :key="c.id" class="radio-row">
                  <input v-model="keepActiveModal.selectedId" type="radio" name="keep-active" :value="c.id" />
                  <span>
                    <span class="mono">{{ c.version }}</span>
                    <span class="muted"> — {{ c.title || 'Sem título' }}</span>
                  </span>
                </label>
              </fieldset>
            </template>
          </div>
          <footer class="modal-foot modal-foot--split">
            <template v-if="keepActiveModal.mode === 'only'">
              <button type="button" class="btn-primary" @click="closeKeepActiveModal">Entendi</button>
            </template>
            <template v-else>
              <button type="button" class="btn-ghost" @click="closeKeepActiveModal">Cancelar</button>
              <button type="button" class="btn-primary" @click="applyKeepActiveChoice">Confirmar</button>
            </template>
          </footer>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="detail" class="modal-root" role="dialog" aria-modal="true" @click.self="closeDetail">
        <div class="modal">
          <header class="modal-head">
            <h3>Termo v{{ detail.version }}</h3>
            <button type="button" class="icon-btn" aria-label="Fechar" @click="closeDetail">
              <MaterialIcon name="close" />
            </button>
          </header>
          <p v-if="detail.title" class="modal-sub">{{ detail.title }}</p>
          <p class="muted small status-line">
            {{ detail.active ? 'Ativo' : 'Inativo' }}
          </p>
          <dl class="term-meta">
            <dt>Criado por</dt>
            <dd>{{ detail.createdBy?.name ?? '—' }}</dd>
            <dt>Criado em</dt>
            <dd>{{ new Date(detail.createdAt).toLocaleString('pt-BR') }}</dd>
            <dt>Última alteração por</dt>
            <dd>{{ detail.updatedBy?.name ?? '—' }}</dd>
            <dt>Última alteração em</dt>
            <dd>
              {{ detail.updatedAt ? new Date(detail.updatedAt).toLocaleString('pt-BR') : '—' }}
            </dd>
          </dl>
          <div class="modal-body consent-html" v-html="detail.content" />
          <footer class="modal-foot">
            <button type="button" class="btn-ghost" @click="closeDetail">Fechar</button>
          </footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  font-family: var(--uf-font);
  color: var(--uf-on-surface);
}
.head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}
.title {
  margin: 0 0 0.35rem;
  font-size: 1.25rem;
  font-weight: 800;
}
.lead {
  margin: 0;
  max-width: 42rem;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--uf-on-surface-variant);
}
.card {
  padding: 1.25rem;
  border-radius: var(--uf-radius-xl);
  background: var(--uf-surface-container-lowest);
  box-shadow: var(--uf-tonal-shadow);
}
.tonal {
  box-shadow: var(--uf-tonal-shadow);
}
.create-panel .h3 {
  margin: 0 0 1rem;
  font-size: 1rem;
}
.version-hint {
  margin: 0 0 1rem;
  line-height: 1.5;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.8rem;
  font-weight: 600;
}
.field--block {
  margin-bottom: 0.75rem;
}
.field input,
.field textarea {
  font: inherit;
  padding: 0.5rem 0.65rem;
  border-radius: var(--uf-radius-md);
  border: 1px solid var(--uf-outline-variant);
  background: var(--uf-surface);
  color: inherit;
}
.check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}
.first-term-note {
  margin: 0 0 1rem;
  line-height: 1.5;
}
.row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.btn-primary,
.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  font: inherit;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  border: none;
}
.btn-primary {
  background: var(--uf-primary);
  color: var(--uf-on-primary);
}
.btn-ghost {
  background: transparent;
  color: var(--uf-primary);
}
.muted {
  color: var(--uf-on-surface-variant);
}
.small {
  font-size: 0.8rem;
}
.mono {
  font-family: ui-monospace, monospace;
  font-size: 0.85rem;
}
.table-wrap {
  overflow-x: auto;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.table th,
.table td {
  text-align: left;
  padding: 0.65rem 0.5rem;
  border-bottom: 1px solid var(--uf-outline-variant);
}
.table th {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--uf-on-surface-variant);
}
.badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}
.badge--on {
  background: rgba(46, 125, 50, 0.15);
  color: var(--uf-primary);
}
.badge--off {
  background: var(--uf-surface-container-high);
  color: var(--uf-on-surface-variant);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: flex-end;
}
.btn-link {
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--uf-primary);
  cursor: pointer;
  text-decoration: underline;
}
.btn-link.danger {
  color: #b3261e;
}
.modal-root {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.45);
}
.modal {
  width: min(640px, 100%);
  max-height: min(90vh, 720px);
  display: flex;
  flex-direction: column;
  background: var(--uf-surface);
  border-radius: var(--uf-radius-xl);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.2);
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--uf-outline-variant);
}
.modal-head h3 {
  margin: 0;
  font-size: 1.05rem;
}
.icon-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--uf-on-surface-variant);
  display: flex;
  padding: 0.25rem;
}
.modal-sub {
  margin: 0;
  padding: 0.5rem 1.25rem 0;
  font-weight: 600;
}
.status-line {
  margin: 0;
  padding: 0.35rem 1.25rem 0;
}
.term-meta {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.35rem 1rem;
  margin: 0;
  padding: 0.75rem 1.25rem;
  font-size: 0.8rem;
  border-bottom: 1px solid var(--uf-outline-variant);
}
.term-meta dt {
  margin: 0;
  color: var(--uf-on-surface-variant);
  font-weight: 600;
}
.term-meta dd {
  margin: 0;
}
.meta-stack {
  line-height: 1.35;
  vertical-align: top;
}
.meta-stack > div:first-child {
  font-weight: 600;
  font-size: 0.8125rem;
}
.modal-body {
  padding: 1rem 1.25rem;
  overflow: auto;
  flex: 1;
  line-height: 1.55;
  font-size: 0.9rem;
}
.modal-foot {
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--uf-outline-variant);
}
.modal-foot--split {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: flex-end;
}
.modal-lead {
  margin: 0 0 1rem;
  font-size: 0.9rem;
  line-height: 1.55;
  color: var(--uf-on-surface);
}
.radio-list {
  margin: 0;
  padding: 0;
  border: none;
  min-inline-size: 0;
}
.radio-list legend {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--uf-on-surface-variant);
  margin-bottom: 0.5rem;
}
.radio-row {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.5rem 0;
  font-size: 0.875rem;
  cursor: pointer;
  border-bottom: 1px solid var(--uf-outline-variant);
}
.radio-row:last-child {
  border-bottom: none;
}
.radio-row input {
  margin-top: 0.2rem;
}
</style>

<style>
/* conteúdo HTML do termo (sem scoped) */
.consent-html p {
  margin: 0 0 0.75rem;
}
</style>
