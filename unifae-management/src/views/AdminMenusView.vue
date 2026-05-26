<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import axios from 'axios'
import client from '@/api/client'
import MaterialIcon from '@/components/shell/MaterialIcon.vue'
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import { useApiRequest } from '@/composables/useApiRequest'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import type { Paged } from '@/types/pagination'

type MenuNodeRow = {
  id: number
  parentId: number | null
  key: string
  label: string
  icon: string | null
  routeName: string | null
  includeInNewCourses: boolean
}

type CourseOpt = { id: number; name: string }

type CourseMenuState = {
  course: { id: number; name: string; active: boolean }
  catalog: MenuNodeRow[]
  links: Array<{
    menuNodeId: number
    enabled: boolean
    sortOrder: number
    key: string
    label: string
  }>
}

const auth = useAuthStore()
const toast = useToastStore()
const confirm = useConfirmStore()

function apiErrorMessage(err: unknown, fallback: string) {
  if (!axios.isAxiosError(err)) return fallback
  const m = err.response?.data as { message?: string | string[] } | undefined
  const raw = m?.message
  if (Array.isArray(raw)) return raw.join(' ')
  if (typeof raw === 'string' && raw.trim()) return raw
  return fallback
}
const tab = ref<'catalog' | 'course'>('catalog')

const { data: catalogData, loading: catLoading, failed: catFailed, execute: loadCatalog } = useApiRequest<MenuNodeRow[]>(
  async () => {
    const { data } = await client.get<MenuNodeRow[]>('/admin/menu-nodes')
    return data
  },
  {
    onUnauthorized: () => {
      auth.logout()
      window.location.href = '/login'
    },
  },
)

const { data: coursesData, execute: loadCourses } = useApiRequest<CourseOpt[]>(async () => {
  const { data } = await client.get<Paged<{ id: number; name: string }>>('/courses', {
    params: { page: 1, limit: 100 },
  })
  return data.data.map((c) => ({ id: c.id, name: c.name }))
})

const selectedCourseId = ref<number | ''>('')
const courseState = ref<CourseMenuState | null>(null)
const courseLoading = ref(false)
const courseFailed = ref(false)
const savingCourse = ref(false)

/** Linhas editáveis ao carregar um curso */
const courseLinkRows = ref<
  Array<
    MenuNodeRow & {
      enabled: boolean
      sortOrder: number
    }
  >
>([])

const catalogSorted = computed(() => {
  const rows = catalogData.value ?? []
  return [...rows].sort((a, b) => a.id - b.id)
})

function parentLabel(parentId: number | null) {
  if (parentId == null) return '—'
  const p = (catalogData.value ?? []).find((n) => n.id === parentId)
  return p ? `${p.label} (${p.key})` : `#${parentId}`
}

async function fetchCourseState() {
  const id = selectedCourseId.value
  if (id === '' || !Number.isFinite(Number(id))) {
    courseState.value = null
    return
  }
  courseLoading.value = true
  courseFailed.value = false
  try {
    const { data } = await client.get<CourseMenuState>(`/admin/courses/${id}/menu-links`)
    courseState.value = data
    const linkByNode = new Map(data.links.map((l) => [l.menuNodeId, l]))
    courseLinkRows.value = data.catalog.map((n) => {
      const l = linkByNode.get(n.id)
      return {
        ...n,
        enabled: l ? l.enabled : false,
        sortOrder: l ? l.sortOrder : n.id * 10,
      }
    })
  } catch (e: unknown) {
    courseFailed.value = true
    courseState.value = null
    toast.error(apiErrorMessage(e, 'Não foi possível carregar os vínculos deste curso.'))
  } finally {
    courseLoading.value = false
  }
}

watch(selectedCourseId, () => {
  void fetchCourseState()
})

const showCreate = ref(false)
const editingId = ref<number | null>(null)
const form = ref({
  parentId: '' as number | '' | 'null',
  key: '',
  label: '',
  icon: '',
  routeName: '',
  includeInNewCourses: true,
})
const saving = ref(false)

function openCreate() {
  editingId.value = null
  form.value = {
    parentId: 'null',
    key: '',
    label: '',
    icon: '',
    routeName: '',
    includeInNewCourses: true,
  }
  showCreate.value = true
}

function openEdit(n: MenuNodeRow) {
  editingId.value = n.id
  form.value = {
    parentId: n.parentId === null ? 'null' : n.parentId,
    key: n.key,
    label: n.label,
    icon: n.icon ?? '',
    routeName: n.routeName ?? '',
    includeInNewCourses: n.includeInNewCourses,
  }
  showCreate.value = true
}

function closeForm() {
  showCreate.value = false
  editingId.value = null
}

async function submitForm() {
  if (!form.value.key.trim() || !form.value.label.trim()) return
  saving.value = true
  try {
    const parentRaw = form.value.parentId
    const parentId =
      parentRaw === 'null' || parentRaw === '' ? null : typeof parentRaw === 'number' ? parentRaw : Number(parentRaw)
    const payload = {
      parentId,
      key: form.value.key.trim(),
      label: form.value.label.trim(),
      icon: form.value.icon.trim() || null,
      routeName: form.value.routeName.trim() || null,
      includeInNewCourses: form.value.includeInNewCourses,
    }
    if (editingId.value == null) {
      await client.post('/admin/menu-nodes', payload)
      toast.success('Nó criado com sucesso.')
    } else {
      await client.patch(`/admin/menu-nodes/${editingId.value}`, payload)
      toast.success('Nó atualizado com sucesso.')
    }
    closeForm()
    await loadCatalog()
    if (selectedCourseId.value !== '') await fetchCourseState()
  } catch {
    toast.error('Erro ao salvar o nó. Tente novamente.')
  } finally {
    saving.value = false
  }
}

async function removeNode(n: MenuNodeRow) {
  const ok = await confirm.confirm({
    title: 'Excluir nó',
    message: `Excluir o nó "${n.label}" (${n.key})? Subitens devem ser removidos antes.`,
    confirmText: 'Excluir',
    cancelText: 'Cancelar',
    tone: 'danger',
  })
  if (!ok) return
  try {
    await client.delete(`/admin/menu-nodes/${n.id}`)
    toast.success('Nó excluído com sucesso.')
    await loadCatalog()
    if (selectedCourseId.value !== '') await fetchCourseState()
  } catch {
    toast.error('Erro ao excluir o nó. Verifique se não há subitens e tente novamente.')
  }
}

async function saveCourseLinks() {
  const id = selectedCourseId.value
  if (id === '' || !courseState.value) return
  const items = courseLinkRows.value.map((r) => ({
    menuNodeId: r.id,
    enabled: r.enabled,
    sortOrder: r.sortOrder,
  }))
  items.sort((a, b) => a.sortOrder - b.sortOrder)
  savingCourse.value = true
  try {
    await client.put(`/admin/courses/${id}/menu-links`, { items })
    await fetchCourseState()
    await loadCourses()
    toast.success('Vínculos salvos com sucesso.')
    // Recarrega para refletir imediatamente o menu lateral atualizado.
    window.setTimeout(() => window.location.reload(), 700)
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, 'Erro ao salvar vínculos. Tente novamente.'))
  } finally {
    savingCourse.value = false
  }
}

onMounted(() => {
  void loadCatalog()
  void loadCourses()
})
</script>

<template>
  <div class="page">
    <header class="head">
      <div>
        <h1 class="title">Menus do hub</h1>
        <p class="sub">Catálogo global de nós e vínculos por curso (somente administrador).</p>
      </div>
    </header>

    <div class="tabs tonal">
      <button type="button" :class="['tab', tab === 'catalog' && 'tab--on']" @click="tab = 'catalog'">
        Catálogo de nós
      </button>
      <button type="button" :class="['tab', tab === 'course' && 'tab--on']" @click="tab = 'course'">
        Por curso
      </button>
    </div>

    <section v-show="tab === 'catalog'" class="panel tonal">
      <div class="panel-head">
        <h2 class="h2">Nós de menu</h2>
        <button type="button" class="btn btn--pri" @click="openCreate">
          <MaterialIcon name="add" size="1rem" />
          Novo nó
        </button>
      </div>
      <p v-if="catLoading" class="muted">Carregando…</p>
      <UiConnectionRetry v-else-if="catFailed" @retry="loadCatalog" />
      <div v-else class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>ID</th>
              <th>Chave</th>
              <th>Rótulo</th>
              <th>Pai</th>
              <th>Rota Vue</th>
              <th>Novo curso</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="n in catalogSorted" :key="n.id">
              <td>{{ n.id }}</td>
              <td><code>{{ n.key }}</code></td>
              <td>{{ n.label }}</td>
              <td class="muted small">{{ parentLabel(n.parentId) }}</td>
              <td class="muted small">{{ n.routeName ?? '— (dinâmico)' }}</td>
              <td>{{ n.includeInNewCourses ? 'Sim' : 'Não' }}</td>
              <td class="td-actions">
                <div class="ui-act-row">
                  <UiIconButton icon="edit" label="Editar" @click="openEdit(n)" />
                  <UiIconButton icon="delete" label="Excluir" variant="danger" @click="removeNode(n)" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-show="tab === 'course'" class="panel tonal">
      <h2 class="h2">Vínculos curso ↔ nós</h2>
      <p class="lead">
        Marque quais itens aparecem no menu lateral daquele curso. Submenus só aparecem se o pai também estiver ativo. Ao salvar, a ordem é ajustada automaticamente: itens de primeiro nível em dezenas (10, 20, 30…), e filhos em sequência logo após o pai (ex.: pai 30 → filhos 31, 32…).
      </p>
      <div class="field-row">
        <label class="lbl">Curso</label>
        <select v-model="selectedCourseId" class="in">
          <option value="">Selecione…</option>
          <option v-for="c in coursesData ?? []" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <p v-if="courseLoading" class="muted">Carregando…</p>
      <UiConnectionRetry v-else-if="courseFailed" @retry="fetchCourseState" />
      <template v-else-if="courseState && selectedCourseId !== ''">
        <p class="course-name">
          <strong>{{ courseState.course.name }}</strong>
          <span :class="['badge', !courseState.course.active && 'badge--off']">
            {{ courseState.course.active ? 'ativo' : 'inativo' }}
          </span>
        </p>
        <div class="table-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>Ativo</th>
                <th>Ordem</th>
                <th>Chave</th>
                <th>Rótulo</th>
                <th>Pai</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in courseLinkRows" :key="row.id">
                <td>
                  <input v-model="row.enabled" type="checkbox" />
                </td>
                <td>
                  <input v-model.number="row.sortOrder" type="number" class="in in--sm" />
                </td>
                <td><code>{{ row.key }}</code></td>
                <td>{{ row.label }}</td>
                <td class="muted small">{{ parentLabel(row.parentId) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <button type="button" class="btn btn--pri" :disabled="savingCourse" @click="saveCourseLinks">
          {{ savingCourse ? 'Salvando…' : 'Salvar vínculos' }}
        </button>
      </template>
    </section>

    <div v-if="showCreate" class="modal-backdrop" @click.self="closeForm">
      <div class="modal">
        <h3 class="h3">{{ editingId == null ? 'Novo nó' : 'Editar nó' }}</h3>
        <form class="form" @submit.prevent="submitForm">
          <div class="field">
            <label class="lbl">Pai (opcional)</label>
            <select v-model="form.parentId" class="in">
              <option :value="'null'">— Raiz —</option>
              <option
                v-for="n in catalogSorted.filter((x) => x.id !== editingId)"
                :key="n.id"
                :value="n.id"
              >
                {{ n.label }} ({{ n.key }})
              </option>
            </select>
          </div>
          <div class="field">
            <label class="lbl">Chave (slug)</label>
            <input v-model="form.key" class="in" required />
          </div>
          <div class="field">
            <label class="lbl">Rótulo</label>
            <input v-model="form.label" class="in" required />
          </div>
          <div class="field">
            <label class="lbl">Ícone (Material)</label>
            <input v-model="form.icon" class="in" placeholder="ex.: science" />
          </div>
          <div class="field">
            <label class="lbl">Nome da rota Vue</label>
            <input v-model="form.routeName" class="in" placeholder="vazio = /curso/:id/n/:menuNodeId" />
          </div>
          <label class="chk">
            <input v-model="form.includeInNewCourses" type="checkbox" />
            Incluir em novos cursos
          </label>
          <div class="modal-actions">
            <button type="button" class="btn btn--ghost" @click="closeForm">Cancelar</button>
            <button type="submit" class="btn btn--pri" :disabled="saving">{{ saving ? 'Salvando…' : 'Confirmar' }}</button>
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
  max-width: 960px;
}
.head {
  margin-bottom: 1.25rem;
}
.title {
  margin: 0;
  font-size: 2rem;
  font-weight: 800;
}
.sub {
  margin: 0.35rem 0 0;
  color: var(--uf-on-surface-variant);
  font-size: 0.9rem;
}
.tabs {
  display: inline-flex;
  gap: 0.25rem;
  padding: 0.25rem;
  border-radius: 999px;
  margin-bottom: 1.25rem;
}
.tab {
  border: none;
  background: transparent;
  padding: 0.5rem 1.1rem;
  border-radius: 999px;
  font-family: var(--uf-font);
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  color: var(--uf-on-surface-variant);
}
.tab--on {
  background: var(--uf-primary);
  color: var(--uf-on-primary);
}
.panel {
  padding: 1.5rem;
  border-radius: var(--uf-radius-xl);
  background: var(--uf-surface-container-lowest);
  box-shadow: var(--uf-tonal-shadow);
}
.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}
.h2 {
  margin: 0;
  font-size: 1.1rem;
}
.h3 {
  margin: 0 0 1rem;
  font-size: 1rem;
}
.lead {
  font-size: 0.88rem;
  color: var(--uf-on-surface-variant);
  line-height: 1.5;
  margin: 0 0 1rem;
}
.field-row {
  max-width: 420px;
  margin-bottom: 1rem;
}
.lbl {
  display: block;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  margin-bottom: 0.35rem;
  color: var(--uf-on-surface-variant);
}
.in {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: none;
  border-radius: var(--uf-radius-md);
  background: var(--uf-surface-container-low);
  font-family: var(--uf-font);
  box-sizing: border-box;
}
.in--sm {
  width: 5rem;
  padding: 0.35rem 0.5rem;
  font-size: 0.85rem;
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.55rem 1.1rem;
  border-radius: 999px;
  border: none;
  font-family: var(--uf-font);
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}
.btn--pri {
  background: linear-gradient(90deg, var(--uf-primary), var(--uf-primary-container));
  color: #fff;
}
.btn--ghost {
  background: transparent;
  border: 1px solid rgba(191, 202, 186, 0.45);
  color: var(--uf-on-surface-variant);
}
.table-wrap {
  overflow: auto;
  margin-bottom: 1rem;
}
.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}
.tbl th,
.tbl td {
  padding: 0.5rem 0.45rem;
  text-align: left;
  border-bottom: 1px solid rgba(191, 202, 186, 0.2);
}
.tbl th {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--uf-on-surface-variant);
}
.muted {
  color: var(--uf-on-surface-variant);
}
.small {
  font-size: 0.75rem;
}
.td-actions {
  white-space: nowrap;
}
.btn-mini {
  border: none;
  border-radius: 999px;
  padding: 0.3rem 0.55rem;
  margin-right: 0.35rem;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  background: rgba(13, 99, 27, 0.1);
  color: var(--uf-primary);
}
.btn-mini--danger {
  color: #b3261e;
  background: rgba(179, 38, 30, 0.08);
}
.course-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1rem;
}
.badge {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 0.15rem 0.45rem;
  border-radius: 0.25rem;
  background: rgba(46, 125, 50, 0.12);
  color: var(--uf-primary);
}
.badge--off {
  background: var(--uf-surface-container-low);
  color: var(--uf-on-surface-variant);
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
  max-width: 480px;
  padding: 1.25rem;
  border-radius: var(--uf-radius-xl);
  background: var(--uf-surface-container-lowest);
  outline: 1px solid var(--uf-outline-variant);
  box-shadow: var(--uf-tonal-shadow);
}
.form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.chk {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.tonal {
  box-shadow: var(--uf-tonal-shadow);
}
code {
  font-size: 0.78rem;
}
</style>
