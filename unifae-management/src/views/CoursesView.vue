<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import axios from 'axios'
import client from '@/api/client'
import MaterialIcon from '@/components/shell/MaterialIcon.vue'
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiPager from '@/components/ui/UiPager.vue'
import { useApiRequest } from '@/composables/useApiRequest'
import type { Paged } from '@/types/pagination'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

type AppRow = { id: number; name: string; active: boolean }
type CourseRow = {
  id: number
  name: string
  active: boolean
  appId: number | null
  caseContextLabel?: string | null
  app?: AppRow | null
  navigation?: unknown
}

const search = ref('')
const activeFilter = ref<'all' | 'active' | 'inactive'>('all')
const appFilter = ref<number | '' | '__none__'>('')

const newName = ref('')
const newActive = ref(true)
const newAppId = ref<number | ''>('')
const creating = ref(false)
const updatingId = ref<number | null>(null)

const auth = useAuthStore()
const toast = useToastStore()
const isAdmin = computed(() => auth.user?.role === 'ADMIN')

const newCaseContextLabel = ref('')

const showEditCourse = ref(false)
const editCourseForm = ref({ id: 0, name: '', caseContextLabel: '', active: true })
const savingCourse = ref(false)

function apiErrorMessage(err: unknown, fallback: string) {
  if (!axios.isAxiosError(err)) return fallback
  const m = err.response?.data as { message?: string | string[] } | undefined
  const raw = m?.message
  if (Array.isArray(raw)) return raw.join(' ')
  if (typeof raw === 'string' && raw.trim()) return raw
  return fallback
}

function openEditCourse(c: CourseRow) {
  editCourseForm.value = {
    id: c.id,
    name: c.name,
    caseContextLabel: c.caseContextLabel ?? '',
    active: c.active,
  }
  showEditCourse.value = true
}

function closeEditCourse() {
  showEditCourse.value = false
}

async function submitEditCourse() {
  if (!editCourseForm.value.name.trim()) return
  savingCourse.value = true
  try {
    await client.patch(`/courses/${editCourseForm.value.id}`, {
      name: editCourseForm.value.name.trim(),
      active: editCourseForm.value.active,
      caseContextLabel: editCourseForm.value.caseContextLabel.trim() || null,
    })
    toast.success('Curso atualizado.')
    closeEditCourse()
    await execute()
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, 'Não foi possível salvar o curso.'))
  } finally {
    savingCourse.value = false
  }
}

const { data: apps, loading: appsLoading, failed: appsFailed, execute: loadApps } = useApiRequest<AppRow[]>(async () => {
  const { data } = await client.get<Paged<AppRow>>('/apps', { params: { page: 1, limit: 100 } })
  return data.data
})

const page = ref(1)
const limit = ref(20)
const debouncedSearch = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, (v) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    debouncedSearch.value = v.trim()
  }, 400)
})

watch([debouncedSearch, activeFilter, appFilter], () => {
  page.value = 1
})

const { data: coursesPage, loading, failed, execute } = useApiRequest<Paged<CourseRow>>(async () => {
  const params: Record<string, string | number> = { page: page.value, limit: limit.value }
  const q = debouncedSearch.value.trim()
  if (q) params.q = q
  if (activeFilter.value === 'active') params.active = 'true'
  if (activeFilter.value === 'inactive') params.active = 'false'
  if (appFilter.value !== '') {
    params.appId = appFilter.value === '__none__' ? '__none__' : appFilter.value
  }
  const { data } = await client.get<Paged<CourseRow>>('/courses', { params })
  return data
})

watch([page, limit, debouncedSearch, activeFilter, appFilter], () => {
  void execute()
})

const rows = computed(() => coursesPage.value?.data ?? [])
const listTotal = computed(() => coursesPage.value?.total ?? 0)

async function createCourse() {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    await client.post('/courses', {
      name: newName.value.trim(),
      active: newActive.value,
      appId: newAppId.value === '' ? undefined : newAppId.value,
      caseContextLabel: newCaseContextLabel.value.trim() || undefined,
    })
    newName.value = ''
    newCaseContextLabel.value = ''
    newActive.value = true
    newAppId.value = ''
    await execute()
  } finally {
    creating.value = false
  }
}

async function toggleActive(c: CourseRow) {
  updatingId.value = c.id
  try {
    await client.patch(`/courses/${c.id}`, { active: !c.active })
    await execute()
  } finally {
    updatingId.value = null
  }
}

onMounted(() => {
  void loadApps()
  void execute()
})
</script>

<template>
  <div class="page">
    <header class="head">
      <div>
        <h1 class="title">Cursos</h1>
        <p class="sub">Cadastro multi-curso por aplicativo (Fisioterapia, Medicina, Odontologia…).</p>
      </div>
    </header>

    <div class="grid">
      <section class="panel tonal">
        <h2 class="h2">Novo curso</h2>
        <form class="form" @submit.prevent="createCourse">
          <div class="field">
            <label class="lbl">Nome</label>
            <input v-model="newName" class="in" placeholder="Ex: Fisioterapia" />
          </div>

          <div class="field">
            <label class="lbl">App (opcional)</label>
            <select v-model="newAppId" class="in" :disabled="appsLoading || appsFailed">
              <option value="">Sem app</option>
              <option v-for="a in apps ?? []" :key="a.id" :value="a.id">{{ a.name }}</option>
            </select>
          </div>

          <div class="field">
            <label class="lbl">Rótulo para contextos (opcional)</label>
            <input
              v-model="newCaseContextLabel"
              class="in"
              placeholder="Ex.: Caso clínico, Cenário jurídico…"
            />
            <p class="field-hint">Usado na tela Categorias para nomear agrupamentos do curso.</p>
          </div>

          <label class="chk">
            <input v-model="newActive" type="checkbox" />
            Ativo
          </label>

          <button type="submit" class="btn" :disabled="creating || !newName.trim()">
            <MaterialIcon name="add" />
            {{ creating ? 'Criando…' : 'Criar curso' }}
          </button>
        </form>
      </section>

      <section class="panel tonal">
        <div class="list-head">
          <div>
            <h2 class="h2">Cursos cadastrados</h2>
            <p class="sub2">Filtre por nome, status e app.</p>
          </div>
          <button type="button" class="btn btn--ghost" @click="execute">
            <MaterialIcon name="refresh" />
            Atualizar
          </button>
        </div>

        <div class="filters">
          <div class="field">
            <label class="lbl">Buscar</label>
            <input v-model="search" class="in in--sm" placeholder="Nome do curso…" />
          </div>
          <div class="field">
            <label class="lbl">Status</label>
            <select v-model="activeFilter" class="in in--sm">
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
          <div class="field">
            <label class="lbl">App</label>
            <select v-model="appFilter" class="in in--sm" :disabled="appsLoading || appsFailed">
              <option value="">Todos</option>
              <option value="__none__">Sem app</option>
              <option v-for="a in apps ?? []" :key="a.id" :value="a.id">{{ a.name }}</option>
            </select>
          </div>
        </div>

        <p v-if="loading" class="muted">Carregando…</p>
        <UiConnectionRetry v-else-if="failed" @retry="execute" />
        <ul v-else class="list">
          <li v-for="c in rows" :key="c.id" class="item">
            <div class="left">
              <div>
                <span class="name">{{ c.name }}</span>
                <p class="meta">
                  App:
                  <strong>{{ c.app?.name ?? (c.appId == null ? 'Sem app' : `#${c.appId}`) }}</strong>
                </p>
                <p class="meta meta--2">
                  Contexto na UI:
                  <strong>{{ c.caseContextLabel?.trim() || '— (padrão: Caso clínico)' }}</strong>
                </p>
              </div>
            </div>
            <div class="right ui-act-row">
              <span :class="['badge', !c.active && 'badge--off']">{{ c.active ? 'ativo' : 'inativo' }}</span>
              <UiIconButton v-if="isAdmin" icon="edit" label="Editar" @click="openEditCourse(c)" />
              <UiIconButton
                v-if="isAdmin"
                :icon="c.active ? 'block' : 'check_circle'"
                :label="c.active ? 'Desativar' : 'Ativar'"
                :variant="c.active ? 'warn' : 'success'"
                :disabled="updatingId === c.id"
                @click="toggleActive(c)"
              />
            </div>
          </li>
          <li v-if="!rows.length" class="empty">Nenhum curso encontrado.</li>
        </ul>
        <UiPager v-if="!loading && !failed && listTotal > 0" v-model:page="page" :limit="limit" :total="listTotal" />
      </section>
    </div>

    <div v-if="showEditCourse" class="modal-backdrop" @click.self="closeEditCourse">
      <div class="modal">
        <h3 class="h3">Editar curso</h3>
        <form class="form" @submit.prevent="submitEditCourse">
          <div class="field">
            <label class="lbl">Nome</label>
            <input v-model="editCourseForm.name" class="in" required />
          </div>
          <div class="field">
            <label class="lbl">Rótulo para contextos na UI</label>
            <input
              v-model="editCourseForm.caseContextLabel"
              class="in"
              placeholder="Ex.: Caso clínico, Cenário jurídico…"
            />
            <p class="field-hint">Vazio = texto padrão na tela Categorias.</p>
          </div>
          <label class="chk">
            <input v-model="editCourseForm.active" type="checkbox" />
            Ativo
          </label>
          <div class="modal-actions">
            <button type="button" class="btn btn--ghost" @click="closeEditCourse">Cancelar</button>
            <button type="submit" class="btn" :disabled="savingCourse">
              {{ savingCourse ? 'Salvando…' : 'Salvar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  font-family: var(--uf-font);
  color: var(--uf-on-surface);
}
.head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.title {
  margin: 0;
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.sub {
  margin: 0.35rem 0 0;
  color: var(--uf-on-surface-variant);
  max-width: 36rem;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 1.5rem;
}
@media (max-width: 980px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
.panel {
  padding: 1.5rem;
  border-radius: var(--uf-radius-xl);
  background: var(--uf-surface-container-lowest);
}
.tonal {
  box-shadow: var(--uf-tonal-shadow);
}
.h2 {
  margin: 0 0 0.75rem;
  font-size: 1.05rem;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.lbl {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--uf-on-surface-variant);
}
.in {
  width: 100%;
  box-sizing: border-box;
  padding: 0.6rem 0.75rem;
  font-family: var(--uf-font);
  font-size: 0.9rem;
  background: var(--uf-surface-container-highest);
  border: none;
  border-radius: var(--uf-radius-md);
  outline: 1px solid var(--uf-outline-variant);
}
.in--sm {
  padding: 0.45rem 0.6rem;
  font-size: 0.85rem;
}
.chk {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.85rem;
  color: var(--uf-on-surface-variant);
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.65rem 1.1rem;
  border: none;
  border-radius: 999px;
  font-family: var(--uf-font);
  font-weight: 800;
  font-size: 0.8125rem;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(90deg, var(--uf-primary), var(--uf-primary-container));
  box-shadow: 0 8px 24px rgba(13, 99, 27, 0.18);
}
.btn--ghost {
  background: rgba(13, 99, 27, 0.08);
  color: var(--uf-primary);
  box-shadow: none;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
}
.list-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}
.sub2 {
  margin: 0.15rem 0 0;
  font-size: 0.8rem;
  color: var(--uf-on-surface-variant);
}
.filters {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: 1fr 180px 220px;
  gap: 0.75rem;
}
@media (max-width: 980px) {
  .filters {
    grid-template-columns: 1fr;
  }
}
.muted {
  margin-top: 1rem;
  color: var(--uf-on-surface-variant);
}
.list {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0.9rem;
  border-radius: var(--uf-radius-xl);
  outline: 1px solid rgba(191, 202, 186, 0.25);
}
.left {
  min-width: 0;
}
.right {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
}
.name {
  font-weight: 800;
}
.btn-mini {
  border: none;
  border-radius: 999px;
  padding: 0.35rem 0.65rem;
  font-family: var(--uf-font);
  font-size: 0.75rem;
  font-weight: 800;
  cursor: pointer;
  color: var(--uf-primary);
  background: rgba(13, 99, 27, 0.08);
}
.btn-mini:hover {
  background: rgba(13, 99, 27, 0.14);
}
.btn-mini:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-mini--positive {
  color: #1b5e20;
  background: rgba(46, 125, 50, 0.16);
}
.btn-mini--positive:hover:not(:disabled) {
  background: rgba(46, 125, 50, 0.24);
}
.btn-mini--warn {
  color: #b3261e;
  background: rgba(211, 47, 47, 0.12);
}
.btn-mini--warn:hover:not(:disabled) {
  background: rgba(211, 47, 47, 0.2);
}
.meta {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: var(--uf-on-surface-variant);
}
.meta strong {
  color: var(--uf-on-surface);
}
.meta--2 {
  margin-top: 0.15rem;
}
.field-hint {
  margin: 0.2rem 0 0;
  font-size: 0.72rem;
  color: var(--uf-on-surface-variant);
  line-height: 1.35;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 100;
}
.modal {
  width: 100%;
  max-width: 420px;
  padding: 1.25rem;
  border-radius: var(--uf-radius-xl);
  background: var(--uf-surface-container-lowest);
  outline: 1px solid var(--uf-outline-variant);
  box-shadow: var(--uf-tonal-shadow);
}
.h3 {
  margin: 0 0 1rem;
  font-size: 1rem;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.75rem;
}
.badge {
  font-size: 0.625rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 0.15rem 0.45rem;
  border-radius: 0.25rem;
  background: rgba(46, 125, 50, 0.12);
  color: var(--uf-primary-container);
}
.badge--off {
  background: var(--uf-surface-container-low);
  color: var(--uf-on-surface-variant);
}
.empty {
  color: var(--uf-on-surface-variant);
  font-style: italic;
}
</style>
