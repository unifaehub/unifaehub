<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import axios from 'axios'
import client from '@/api/client'
import MaterialIcon from '@/components/shell/MaterialIcon.vue'
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiPager from '@/components/ui/UiPager.vue'
import { useApiRequest } from '@/composables/useApiRequest'
import { useAuthStore } from '@/stores/auth'
import { useConfirmStore } from '@/stores/confirm'
import { useToastStore } from '@/stores/toast'
import type { Paged } from '@/types/pagination'

type AppRow = { id: number; name: string; active: boolean }
type CourseRow = {
  id: number
  name: string
  caseContextLabel?: string | null
  app: { id: number; name: string } | null
}

type ClinicalCaseRow = {
  id: number
  name: string
  description: string | null
  courseId: number
  appId: number
}

type CategoryTypeDefRow = {
  id: number
  courseId: number
  key: string
  label: string
  description: string | null
  sortOrder: number
}

type CategoryRow = {
  id: number
  name: string
  categoryTypeDefinitionId: number
  clinicalCaseId: number | null
  parentId: number | null
  sortOrder: number
  courseId: number
  appId: number
  isLeafLevel?: boolean
  categoryTypeDefinition?: { id: number; key: string; label: string }
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

function handleUnauthorized() {
  auth.logout()
  window.location.href = '/login'
}

const filterAppId = ref<number | ''>('')
/** Só usado quando o app tem mais de um curso. */
const manualCourseId = ref<number | ''>('')

const { data: appsData, execute: loadApps } = useApiRequest<AppRow[]>(
  async () => {
    const { data } = await client.get<Paged<AppRow>>('/apps', {
      params: { page: 1, limit: 100, active: 'true' },
    })
    return data.data
  },
  { onUnauthorized: handleUnauthorized },
)

const { data: coursesData, execute: loadCourses } = useApiRequest<CourseRow[]>(
  async () => {
    const { data } = await client.get<Paged<CourseRow>>('/courses', { params: { page: 1, limit: 100 } })
    return data.data
  },
  { onUnauthorized: handleUnauthorized },
)

const coursesForApp = computed(() => {
  const aid = filterAppId.value
  const list = coursesData.value ?? []
  if (aid === '') return []
  return list.filter((c) => c.app?.id === aid).sort((a, b) => a.name.localeCompare(b.name))
})

const effectiveCourseId = computed(() => {
  const list = coursesForApp.value
  if (list.length === 0) return '' as number | ''
  const first = list[0]!
  if (list.length === 1) return first.id
  const m = manualCourseId.value
  if (m !== '' && list.some((c) => c.id === m)) return m
  return first.id
})

type CourseAutoLine =
  | { kind: 'none' }
  | { kind: 'one'; name: string }
  | { kind: 'multi'; n: number }

const courseAutoLine = computed((): CourseAutoLine => {
  const list = coursesForApp.value
  if (list.length === 0) return { kind: 'none' }
  if (list.length === 1) return { kind: 'one', name: list[0]!.name }
  return { kind: 'multi', n: list.length }
})

const effectiveCourse = computed((): CourseRow | null => {
  const cid = effectiveCourseId.value
  if (cid === '') return null
  return coursesForApp.value.find((c) => c.id === cid) ?? null
})

/** Apenas um painel expandido por vez (tipos + categorias do mesmo caso). */
const expandedCaseId = ref<number | ''>('')

function toggleCaseExpand(id: number) {
  if (expandedCaseId.value === id) {
    expandedCaseId.value = ''
    selectedCaseId.value = ''
  } else {
    expandedCaseId.value = id
    selectedCaseId.value = id
  }
}

const casesLoading = ref(false)
const casesFailed = ref(false)
const casesList = ref<ClinicalCaseRow[]>([])
const casesTotal = ref(0)

const contextSearch = ref('')
const debouncedContextSearch = ref('')
let contextSearchTimer: ReturnType<typeof setTimeout> | null = null
watch(contextSearch, (v) => {
  if (contextSearchTimer) clearTimeout(contextSearchTimer)
  contextSearchTimer = setTimeout(() => {
    debouncedContextSearch.value = v.trim()
  }, 350)
})
watch(debouncedContextSearch, () => {
  casesPage.value = 1
})

const casesPage = ref(1)
const casesPerPage = ref(20)

async function loadCases() {
  const aid = filterAppId.value
  const cid = effectiveCourseId.value
  if (aid === '' || cid === '') {
    casesList.value = []
    casesTotal.value = 0
    return
  }
  casesLoading.value = true
  casesFailed.value = false
  try {
    const params: Record<string, string | number> = {
      appId: aid,
      courseId: cid,
      page: casesPage.value,
      limit: casesPerPage.value,
    }
    const q = debouncedContextSearch.value.trim()
    if (q) params.q = q
    const { data } = await client.get<Paged<ClinicalCaseRow>>('/clinical-cases', { params })
    casesList.value = data.data
    casesTotal.value = data.total
  } catch {
    casesFailed.value = true
    casesList.value = []
    casesTotal.value = 0
  } finally {
    casesLoading.value = false
  }
}

const selectedCaseId = ref<number | ''>('')

const typeDefsLoading = ref(false)
const typeDefsFailed = ref(false)
const typeDefsList = ref<CategoryTypeDefRow[]>([])

async function loadTypeDefs() {
  const cid = effectiveCourseId.value
  if (cid === '' || !Number.isFinite(Number(cid))) {
    typeDefsList.value = []
    return
  }
  typeDefsLoading.value = true
  typeDefsFailed.value = false
  try {
    const { data } = await client.get<CategoryTypeDefRow[]>('/category-types', {
      params: { courseId: cid },
    })
    typeDefsList.value = data
  } catch {
    typeDefsFailed.value = true
    typeDefsList.value = []
  } finally {
    typeDefsLoading.value = false
  }
}

const catLoading = ref(false)
const catFailed = ref(false)
const categoryRows = ref<CategoryRow[]>([])

async function loadCategories() {
  const sid = selectedCaseId.value
  if (sid === '' || !Number.isFinite(Number(sid))) {
    categoryRows.value = []
    return
  }
  catLoading.value = true
  catFailed.value = false
  try {
    const { data } = await client.get<CategoryRow[]>('/categories', {
      params: { clinicalCaseId: sid },
    })
    categoryRows.value = data
  } catch {
    catFailed.value = true
    categoryRows.value = []
  } finally {
    catLoading.value = false
  }
}

watch(filterAppId, () => {
  manualCourseId.value = ''
  selectedCaseId.value = ''
  expandedCaseId.value = ''
})

watch([filterAppId, effectiveCourseId], () => {
  if (contextSearchTimer) clearTimeout(contextSearchTimer)
  selectedCaseId.value = ''
  expandedCaseId.value = ''
  contextSearch.value = ''
  debouncedContextSearch.value = ''
  casesPage.value = 1
})

watch(casesPerPage, () => {
  casesPage.value = 1
})

watch([casesPage, casesPerPage, debouncedContextSearch, filterAppId, effectiveCourseId], () => {
  void loadCases()
})

watch(casesList, (list) => {
  const ids = new Set(list.map((c) => c.id))
  const ex = expandedCaseId.value
  if (ex !== '' && !ids.has(Number(ex))) {
    expandedCaseId.value = ''
    selectedCaseId.value = ''
  }
})

watch(coursesForApp, (list) => {
  if (list.length > 1 && manualCourseId.value === '') {
    const first = list[0]
    if (first) manualCourseId.value = first.id
  }
})

watch(selectedCaseId, () => {
  void loadCategories()
})

watch(effectiveCourseId, () => {
  void loadTypeDefs()
})

function orderedTreeWithDepth(rows: CategoryRow[]): Array<CategoryRow & { depth: number }> {
  const byParent = new Map<number | 'root', CategoryRow[]>()
  for (const r of rows) {
    const k = r.parentId == null ? 'root' : r.parentId
    if (!byParent.has(k)) byParent.set(k, [])
    byParent.get(k)!.push(r)
  }
  for (const [, list] of byParent) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
  }
  const out: Array<CategoryRow & { depth: number }> = []
  function walk(pk: number | 'root', depth: number) {
    for (const r of byParent.get(pk) ?? []) {
      out.push({ ...r, depth })
      walk(r.id, depth + 1)
    }
  }
  walk('root', 0)
  return out
}

const categoriesDisplay = computed(() => orderedTreeWithDepth(categoryRows.value))

function typeLabelRow(row: CategoryRow) {
  return row.categoryTypeDefinition?.label ?? `#${row.categoryTypeDefinitionId}`
}

function depthPrefix(depth: number) {
  return '\u00A0'.repeat(depth * 3)
}

/* ——— Casos ——— */
const showCaseModal = ref(false)
const editingCaseId = ref<number | null>(null)
const caseForm = ref({ name: '', description: '' })
const savingCase = ref(false)

function openNewCase() {
  if (filterAppId.value === '' || effectiveCourseId.value === '') {
    toast.error('Selecione um app com curso vinculado antes de criar um contexto.')
    return
  }
  editingCaseId.value = null
  caseForm.value = { name: '', description: '' }
  showCaseModal.value = true
}

function openEditCase(c: ClinicalCaseRow) {
  editingCaseId.value = c.id
  caseForm.value = { name: c.name, description: c.description ?? '' }
  showCaseModal.value = true
  expandedCaseId.value = c.id
  selectedCaseId.value = c.id
}

function closeCaseModal() {
  showCaseModal.value = false
  editingCaseId.value = null
}

async function submitCase() {
  if (!caseForm.value.name.trim()) return
  savingCase.value = true
  try {
    const cid = effectiveCourseId.value
    const aid = filterAppId.value
    if (cid === '' || aid === '') return
    if (editingCaseId.value == null) {
      await client.post('/clinical-cases', {
        name: caseForm.value.name.trim(),
        description: caseForm.value.description.trim() || null,
        courseId: cid,
        appId: aid,
      })
      toast.success('Contexto criado.')
    } else {
      await client.patch(`/clinical-cases/${editingCaseId.value}`, {
        name: caseForm.value.name.trim(),
        description: caseForm.value.description.trim() || null,
      })
      toast.success('Contexto atualizado.')
    }
    closeCaseModal()
    await loadCases()
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, 'Erro ao salvar o contexto.'))
  } finally {
    savingCase.value = false
  }
}

async function removeCase(c: ClinicalCaseRow) {
  const ok = await confirm.confirm({
    title: 'Excluir contexto',
    message: `Excluir "${c.name}"? Só é permitido se não houver categorias vinculadas.`,
    confirmText: 'Excluir',
    cancelText: 'Cancelar',
    tone: 'danger',
  })
  if (!ok) return
  try {
    await client.delete(`/clinical-cases/${c.id}`)
    toast.success('Contexto excluído.')
    if (selectedCaseId.value === c.id) selectedCaseId.value = ''
    await loadCases()
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, 'Não foi possível excluir o contexto.'))
  }
}

/* ——— Tipos (catálogo compartilhado) ——— */
const showTypeModal = ref(false)
const editingTypeId = ref<number | null>(null)
const typeForm = ref({ key: '', label: '', description: '', sortOrder: 0 })
const savingType = ref(false)

function openNewType() {
  if (effectiveCourseId.value === '') {
    toast.error('Selecione app e curso para gerenciar os tipos.')
    return
  }
  editingTypeId.value = null
  typeForm.value = { key: '', label: '', description: '', sortOrder: typeDefsList.value.length * 10 }
  showTypeModal.value = true
}

function openEditType(t: CategoryTypeDefRow) {
  editingTypeId.value = t.id
  typeForm.value = {
    key: t.key,
    label: t.label,
    description: t.description ?? '',
    sortOrder: t.sortOrder,
  }
  showTypeModal.value = true
}

function closeTypeModal() {
  showTypeModal.value = false
  editingTypeId.value = null
}

async function submitType() {
  if (!typeForm.value.key.trim() || !typeForm.value.label.trim()) return
  const courseId = effectiveCourseId.value
  if (courseId === '') return
  savingType.value = true
  try {
    if (editingTypeId.value == null) {
      await client.post('/category-types', {
        courseId: courseId as number,
        key: typeForm.value.key.trim(),
        label: typeForm.value.label.trim(),
        description: typeForm.value.description.trim() || null,
        sortOrder: typeForm.value.sortOrder,
      })
      toast.success('Tipo cadastrado.')
    } else {
      await client.patch(`/category-types/${editingTypeId.value}`, {
        key: typeForm.value.key.trim(),
        label: typeForm.value.label.trim(),
        description: typeForm.value.description.trim() || null,
        sortOrder: typeForm.value.sortOrder,
      })
      toast.success('Tipo atualizado.')
    }
    closeTypeModal()
    await loadTypeDefs()
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, 'Erro ao salvar o tipo.'))
  } finally {
    savingType.value = false
  }
}

async function removeType(t: CategoryTypeDefRow) {
  const ok = await confirm.confirm({
    title: 'Excluir tipo',
    message: `Excluir o tipo "${t.label}" (${t.key})? Só é permitido se nenhuma categoria estiver usando-o.`,
    confirmText: 'Excluir',
    cancelText: 'Cancelar',
    tone: 'danger',
  })
  if (!ok) return
  try {
    await client.delete(`/category-types/${t.id}`)
    toast.success('Tipo excluído.')
    await loadTypeDefs()
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, 'Não foi possível excluir.'))
  }
}

/* ——— Categorias ——— */
const showCatModal = ref(false)
const editingCatId = ref<number | null>(null)
const catForm = ref({
  name: '',
  categoryTypeDefinitionId: '' as number | '',
  parentId: '' as number | '' | 'null',
  sortOrder: 0,
  isLeafLevel: false,
})
const savingCat = ref(false)

const parentOptions = computed(() => {
  const rows = categoryRows.value
  const ex = editingCatId.value
  return orderedTreeWithDepth(rows).filter((r) => {
    if (ex != null && r.id === ex) return false
    if (r.isLeafLevel) return false
    return true
  })
})

function openNewCategory() {
  if (selectedCaseId.value === '') {
    toast.error('Expanda um contexto para editar a árvore de categorias.')
    return
  }
  if (!typeDefsList.value.length) {
    toast.error('Cadastre ao menos um tipo no card Tipos do contexto antes de criar categorias.')
    return
  }
  editingCatId.value = null
  catForm.value = {
    name: '',
    categoryTypeDefinitionId: typeDefsList.value[0]?.id ?? '',
    parentId: 'null',
    sortOrder: 0,
    isLeafLevel: false,
  }
  showCatModal.value = true
}

function openEditCategory(n: CategoryRow) {
  editingCatId.value = n.id
  catForm.value = {
    name: n.name,
    categoryTypeDefinitionId: n.categoryTypeDefinitionId,
    parentId: n.parentId == null ? 'null' : n.parentId,
    sortOrder: n.sortOrder,
    isLeafLevel: n.isLeafLevel ?? false,
  }
  showCatModal.value = true
}

function closeCatModal() {
  showCatModal.value = false
  editingCatId.value = null
}

async function submitCategory() {
  if (!catForm.value.name.trim() || selectedCaseId.value === '') return
  if (catForm.value.categoryTypeDefinitionId === '') {
    toast.error('Selecione o tipo de classificação.')
    return
  }
  const sid = selectedCaseId.value as number
  savingCat.value = true
  try {
    const parentRaw = catForm.value.parentId
    const parentId =
      parentRaw === 'null' || parentRaw === '' ? null : typeof parentRaw === 'number' ? parentRaw : Number(parentRaw)
    const tid = catForm.value.categoryTypeDefinitionId as number
    if (editingCatId.value == null) {
      await client.post('/categories', {
        name: catForm.value.name.trim(),
        clinicalCaseId: sid,
        categoryTypeDefinitionId: tid,
        parentId,
        sortOrder: catForm.value.sortOrder,
      })
      toast.success('Categoria criada com sucesso.')
    } else {
      await client.patch(`/categories/${editingCatId.value}`, {
        name: catForm.value.name.trim(),
        categoryTypeDefinitionId: tid,
        parentId,
        sortOrder: catForm.value.sortOrder,
        isLeafLevel: catForm.value.isLeafLevel,
      })
      toast.success('Categoria atualizada com sucesso.')
    }
    closeCatModal()
    await loadCategories()
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, 'Erro ao salvar a categoria.'))
  } finally {
    savingCat.value = false
  }
}

async function removeCategory(n: CategoryRow) {
  const ok = await confirm.confirm({
    title: 'Excluir categoria',
    message: `Excluir "${n.name}"? É necessário não haver subcategorias nem exercícios vinculados.`,
    confirmText: 'Excluir',
    cancelText: 'Cancelar',
    tone: 'danger',
  })
  if (!ok) return
  try {
    await client.delete(`/categories/${n.id}`)
    toast.success('Categoria excluída.')
    await loadCategories()
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, 'Não foi possível excluir.'))
  }
}

onMounted(() => {
  void loadApps()
  void loadCourses()
})
</script>

<template>
  <div class="page">
    <header class="head">
      <div>
        <h1 class="title">Categorias</h1>
        <p class="sub">
          Por curso: <strong>tipos</strong> (catálogo único), <strong>contextos</strong> e a <strong>árvore de
          categorias</strong> em cada contexto. Rótulos do curso em Cursos.
        </p>
      </div>
    </header>

    <div class="filters-bar panel tonal">
      <div class="field">
        <label class="lbl">App / curso</label>
        <select v-model="filterAppId" class="in in--sm">
          <option value="">Selecione o app…</option>
          <option v-for="a in appsData ?? []" :key="a.id" :value="a.id">{{ a.name }}</option>
        </select>
      </div>
      <div v-if="courseAutoLine?.kind === 'one'" class="course-line">
        <span class="lbl">Curso (automático)</span>
        <p class="course-auto">{{ courseAutoLine.name }}</p>
      </div>
      <div v-else-if="courseAutoLine?.kind === 'multi'" class="field">
        <label class="lbl">Curso (este app tem {{ courseAutoLine.n }} cursos)</label>
        <select v-model="manualCourseId" class="in in--sm">
          <option v-for="c in coursesForApp" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <p v-else-if="filterAppId !== '' && courseAutoLine?.kind === 'none'" class="warn">
        Nenhum curso vinculado a este app. Cadastre o curso em Cursos.
      </p>
    </div>

    <div
      class="contexts-types-layout"
      :class="{ 'contexts-types-layout--split': filterAppId !== '' && effectiveCourseId !== '' }"
    >
      <section
        v-if="filterAppId !== '' && effectiveCourseId !== ''"
        class="panel tonal types-course-panel"
      >
        <div class="panel-head panel-head--wrap">
          <div>
            <h2 class="h2">Tipos do contexto</h2>
            <p class="hint">
              Catálogo único para <strong>{{ effectiveCourse?.name ?? '—' }}</strong> — vale para todos os contextos
              abaixo.
            </p>
          </div>
          <button type="button" class="btn btn--pri" @click="openNewType">
            <MaterialIcon name="add" size="1rem" />
            Novo tipo
          </button>
        </div>
        <p v-if="typeDefsLoading" class="muted">Carregando…</p>
        <UiConnectionRetry v-else-if="typeDefsFailed" @retry="loadTypeDefs" />
        <div v-else class="table-wrap">
          <table class="tbl tbl--compact">
            <thead>
              <tr>
                <th>Chave</th>
                <th>Rótulo</th>
                <th>Ordem</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in typeDefsList" :key="t.id">
                <td><code>{{ t.key }}</code></td>
                <td>{{ t.label }}</td>
                <td>{{ t.sortOrder }}</td>
                <td class="td-actions">
                  <div class="ui-act-row">
                    <UiIconButton icon="edit" label="Editar" @click="openEditType(t)" />
                    <UiIconButton icon="delete" label="Excluir" variant="danger" @click="removeType(t)" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="!typeDefsList.length" class="muted pad">Nenhum tipo cadastrado.</p>
        </div>
      </section>

      <section class="panel tonal case-section">
      <div class="panel-head panel-head--wrap">
        <div>
          <h2 class="h2">Contextos</h2>
          <p v-if="effectiveCourse" class="hint">
            <strong>{{ effectiveCourse.name }}</strong>
            <span v-if="effectiveCourse.caseContextLabel?.trim()" class="hint-sep">
              · {{ effectiveCourse.caseContextLabel.trim() }}
            </span>
          </p>
        </div>
        <button
          type="button"
          class="btn btn--pri"
          :disabled="filterAppId === '' || effectiveCourseId === ''"
          @click="openNewCase"
        >
          <MaterialIcon name="add" size="1rem" />
          Novo contexto
        </button>
      </div>
      <p v-if="casesLoading" class="muted">Carregando…</p>
      <UiConnectionRetry v-else-if="casesFailed" @retry="loadCases" />
      <template v-else>
        <p v-if="filterAppId === '' || effectiveCourseId === ''" class="muted">Selecione um app.</p>
        <template v-else-if="casesTotal > 0 || debouncedContextSearch.trim()">
          <div class="case-toolbar">
            <div class="field field--grow">
              <label class="lbl">Buscar contextos</label>
              <input
                v-model="contextSearch"
                class="in in--filter"
                type="search"
                placeholder="Nome ou descrição…"
                autocomplete="off"
              />
            </div>
            <div class="field">
              <label class="lbl">Por página</label>
              <select v-model.number="casesPerPage" class="in in--sm in--filter">
                <option :value="10">10</option>
                <option :value="20">20</option>
                <option :value="50">50</option>
              </select>
            </div>
          </div>
          <p v-if="!casesList.length && !casesLoading" class="muted">Nenhum contexto corresponde ao filtro.</p>
          <div v-if="casesList.length" class="case-cards">
          <article
            v-for="c in casesList"
            :key="c.id"
            class="case-card"
            :class="{ 'case-card--open': expandedCaseId === c.id }"
          >
            <div class="case-card__header" @click="toggleCaseExpand(c.id)">
              <MaterialIcon
                class="case-card__chev"
                name="expand_more"
                size="1.35rem"
                aria-hidden="true"
              />
              <div class="case-card__main">
                <h3 class="case-card__title">{{ c.name }}</h3>
                <p v-if="c.description" class="case-card__desc">{{ c.description }}</p>
              </div>
              <div class="case-card__actions ui-act-row" @click.stop>
                <UiIconButton icon="edit" label="Editar" @click="openEditCase(c)" />
                <UiIconButton icon="delete" label="Excluir" variant="danger" @click="removeCase(c)" />
              </div>
            </div>

            <div v-if="expandedCaseId === c.id" class="case-card__body">
              <section class="case-card__block">
                <div class="panel-head panel-head--inner">
                  <h4 class="h4">Categorias (árvore)</h4>
                  <button
                    type="button"
                    class="btn btn--pri btn--sm"
                    :disabled="selectedCaseId === ''"
                    @click="openNewCategory"
                  >
                    <MaterialIcon name="add" size="1rem" />
                    Nova categoria
                  </button>
                </div>
                <p v-if="catLoading" class="muted">Carregando…</p>
                <UiConnectionRetry v-else-if="catFailed" @retry="loadCategories" />
                <div v-else class="table-wrap">
                  <table class="tbl">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Tipo</th>
                        <th>Ordem</th>
                        <th>FINAL</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in categoriesDisplay" :key="row.id">
                        <td>
                          <span class="tree-indent" :style="{ paddingLeft: `calc(${row.depth} * 0.85rem)` }">
                            <span v-if="row.depth > 0" class="tree-mark" aria-hidden="true">└</span>
                            {{ row.name }}
                          </span>
                        </td>
                        <td>
                          <span class="badge-type">{{ typeLabelRow(row) }}</span>
                          <span v-if="row.categoryTypeDefinition?.key" class="key-hint"
                            >({{ row.categoryTypeDefinition.key }})</span
                          >
                        </td>
                        <td>{{ row.sortOrder }}</td>
                        <td>
                          <span v-if="row.isLeafLevel" class="leaf-badge">Sim</span>
                          <span v-else class="muted-td">—</span>
                        </td>
                        <td class="td-actions">
                          <div class="ui-act-row">
                            <UiIconButton icon="edit" label="Editar" @click="openEditCategory(row)" />
                            <UiIconButton icon="delete" label="Excluir" variant="danger" @click="removeCategory(row)" />
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <p v-if="!categoriesDisplay.length" class="muted pad">Nenhuma categoria neste contexto.</p>
                </div>
              </section>
            </div>
          </article>
          </div>
          <UiPager
            v-if="casesTotal > 0"
            v-model:page="casesPage"
            :limit="casesPerPage"
            :total="casesTotal"
            :loading="casesLoading"
          />
        </template>
        <p v-else class="muted">Nenhum contexto neste curso.</p>
      </template>
    </section>
    </div>

    <div v-if="showCaseModal" class="modal-backdrop" @click.self="closeCaseModal">
      <div class="modal">
        <h3 class="h3">{{ editingCaseId == null ? 'Novo contexto' : 'Editar contexto' }}</h3>
        <form class="form" @submit.prevent="submitCase">
          <div class="field">
            <label class="lbl">Nome</label>
            <input v-model="caseForm.name" class="in" required />
          </div>
          <div class="field">
            <label class="lbl">Descrição (opcional)</label>
            <textarea v-model="caseForm.description" class="in in--area" rows="3" />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn--ghost" @click="closeCaseModal">Cancelar</button>
            <button type="submit" class="btn btn--pri" :disabled="savingCase">
              {{ savingCase ? 'Salvando…' : 'Confirmar' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showTypeModal" class="modal-backdrop" @click.self="closeTypeModal">
      <div class="modal modal--wide">
        <h3 class="h3">{{ editingTypeId == null ? 'Novo tipo' : 'Editar tipo' }}</h3>
        <form class="form" @submit.prevent="submitType">
          <div class="field">
            <label class="lbl">Chave (slug, única neste curso)</label>
            <input v-model="typeForm.key" class="in" required placeholder="ex.: eixo, protocolo" />
          </div>
          <div class="field">
            <label class="lbl">Rótulo exibido</label>
            <input v-model="typeForm.label" class="in" required />
          </div>
          <div class="field">
            <label class="lbl">Descrição (opcional)</label>
            <textarea v-model="typeForm.description" class="in in--area" rows="2" />
          </div>
          <div class="field">
            <label class="lbl">Ordem na lista de tipos</label>
            <input v-model.number="typeForm.sortOrder" type="number" class="in" />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn--ghost" @click="closeTypeModal">Cancelar</button>
            <button type="submit" class="btn btn--pri" :disabled="savingType">
              {{ savingType ? 'Salvando…' : 'Confirmar' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showCatModal" class="modal-backdrop" @click.self="closeCatModal">
      <div class="modal modal--wide">
        <h3 class="h3">{{ editingCatId == null ? 'Nova categoria' : 'Editar categoria' }}</h3>
        <form class="form" @submit.prevent="submitCategory">
          <div class="field">
            <label class="lbl">Nome</label>
            <input v-model="catForm.name" class="in in--full" required />
          </div>
          <div class="field">
            <label class="lbl">Tipo (catálogo do contexto)</label>
            <select v-model.number="catForm.categoryTypeDefinitionId" class="in in--full" required>
              <option disabled :value="''">Selecione…</option>
              <option v-for="opt in typeDefsList" :key="opt.id" :value="opt.id">
                {{ opt.label }} ({{ opt.key }})
              </option>
            </select>
          </div>
          <div class="field">
            <label class="lbl">Pai (subcategoria)</label>
            <select v-model="catForm.parentId" class="in in--full">
              <option :value="'null'">— Raiz do caso —</option>
              <option v-for="p in parentOptions" :key="p.id" :value="p.id">
                {{ depthPrefix(p.depth) }}{{ p.name }}
              </option>
            </select>
          </div>
          <label class="chk-row">
            <input v-model="catForm.isLeafLevel" type="checkbox" />
            <span>
              <strong>Nível FINAL</strong>
              <span class="chk-desc">
                Sem subcategorias abaixo. No cadastro do paciente, exercícios e atividades ligam a estes nós (coluna
                FINAL).
              </span>
            </span>
          </label>
          <div class="field">
            <label class="lbl">Ordem (irmãos)</label>
            <input v-model.number="catForm.sortOrder" type="number" class="in in--full" />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn--ghost" @click="closeCatModal">Cancelar</button>
            <button type="submit" class="btn btn--pri" :disabled="savingCat">
              {{ savingCat ? 'Salvando…' : 'Confirmar' }}
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
  max-width: min(100%, 72rem);
}
.contexts-types-layout {
  display: grid;
  gap: 1.25rem;
  align-items: start;
  grid-template-columns: 1fr;
}
.contexts-types-layout--split {
  grid-template-columns: minmax(260px, 1fr) minmax(300px, 1.35fr);
}
@media (max-width: 960px) {
  .contexts-types-layout--split {
    grid-template-columns: 1fr;
  }
}
.types-course-panel {
  position: sticky;
  top: 0.75rem;
}
.head {
  margin-bottom: 1.25rem;
}
.title {
  margin: 0;
  font-size: 2.25rem;
  font-weight: 800;
}
.sub {
  margin: 0.35rem 0 0;
  color: var(--uf-on-surface-variant);
  font-size: 0.9rem;
  line-height: 1.5;
  max-width: 52rem;
}
.filters-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 1.5rem;
  padding: 1rem 1.25rem;
  margin-bottom: 1.25rem;
  align-items: flex-end;
}
.course-line {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.course-auto {
  margin: 0;
  font-weight: 700;
  font-size: 0.95rem;
}
.warn {
  margin: 0;
  font-size: 0.85rem;
  color: #b3261e;
}
.case-section {
  margin-bottom: 1.5rem;
}
.case-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 1.25rem;
  align-items: flex-end;
  margin-bottom: 1rem;
}
.field--grow {
  flex: 1;
  min-width: 12rem;
}
.in--filter {
  max-width: 100%;
}
.case-pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.75rem 1rem;
  margin-bottom: 1rem;
  font-size: 0.82rem;
  color: var(--uf-on-surface-variant);
}
.btn-pager {
  border: 1px solid rgba(13, 99, 27, 0.35);
  background: rgba(13, 99, 27, 0.06);
  color: var(--uf-primary);
  font-family: var(--uf-font);
  font-weight: 700;
  font-size: 0.78rem;
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  cursor: pointer;
}
.btn-pager:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.pager-meta {
  font-weight: 600;
  color: var(--uf-on-surface);
}
.pager-count {
  font-weight: 500;
  color: var(--uf-on-surface-variant);
  margin-left: 0.25rem;
}
.panel-head--wrap {
  flex-wrap: wrap;
  align-items: flex-start;
}
.panel-head--inner {
  margin-bottom: 0.75rem;
}
.h4 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
}
.btn--sm {
  padding: 0.45rem 0.85rem;
  font-size: 0.75rem;
}
.case-cards {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.case-card {
  border-radius: var(--uf-radius-lg);
  border: 1px solid rgba(191, 202, 186, 0.35);
  background: var(--uf-surface-container-low);
  overflow: hidden;
}
.case-card--open {
  outline: 1px solid rgba(13, 99, 27, 0.25);
}
.case-card__header {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 1rem 1.1rem;
  cursor: pointer;
  user-select: none;
}
.case-card__header:hover {
  background: rgba(13, 99, 27, 0.04);
}
.case-card__chev {
  flex-shrink: 0;
  margin-top: 0.15rem;
  color: var(--uf-primary);
  transition: transform 0.2s ease;
}
.case-card--open .case-card__chev {
  transform: rotate(180deg);
}
.case-card__main {
  flex: 1;
  min-width: 0;
}
.hint-sep {
  font-weight: 500;
  color: var(--uf-on-surface-variant);
}
.case-card__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1.25;
}
.case-card__desc {
  margin: 0.4rem 0 0;
  font-size: 0.8rem;
  line-height: 1.45;
  color: var(--uf-on-surface-variant);
}
.case-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  flex-shrink: 0;
}
.case-card__body {
  padding: 0 1.1rem 1.1rem;
  border-top: 1px solid rgba(191, 202, 186, 0.25);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.case-card__block {
  padding-top: 1rem;
}
.panel {
  padding: 1.5rem;
  border-radius: var(--uf-radius-xl);
  background: var(--uf-surface-container-lowest);
}
.tonal {
  box-shadow: var(--uf-tonal-shadow);
}
.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}
.h2 {
  margin: 0;
  font-size: 1.1rem;
}
.hint {
  margin: 0.35rem 0 0;
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--uf-on-surface-variant);
  max-width: 36rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.lbl {
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--uf-on-surface-variant);
}
.in {
  width: 100%;
  max-width: 280px;
  padding: 0.55rem 0.75rem;
  border: none;
  border-radius: var(--uf-radius-md);
  background: var(--uf-surface-container-low);
  font-family: var(--uf-font);
  box-sizing: border-box;
}
.in--sm {
  max-width: 100%;
}
.in--area {
  min-height: 4rem;
  resize: vertical;
}
.muted {
  color: var(--uf-on-surface-variant);
  font-size: 0.88rem;
}
.pad {
  padding: 0.5rem 0;
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
.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.btn-mini {
  border: none;
  border-radius: 999px;
  padding: 0.3rem 0.55rem;
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
.table-wrap {
  overflow: auto;
}
.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}
.tbl--compact {
  font-size: 0.78rem;
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
.tree-indent {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
.tree-mark {
  color: var(--uf-primary);
  opacity: 0.7;
  font-size: 0.75rem;
}
.badge-type {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--uf-on-surface);
}
.key-hint {
  font-size: 0.68rem;
  color: var(--uf-on-surface-variant);
  margin-left: 0.25rem;
}
.td-actions {
  white-space: nowrap;
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
  max-width: 440px;
  padding: 1.25rem;
  border-radius: var(--uf-radius-xl);
  background: var(--uf-surface-container-lowest);
  outline: 1px solid var(--uf-outline-variant);
  box-shadow: var(--uf-tonal-shadow);
}
.modal--wide {
  max-width: 520px;
}
.in--full {
  max-width: 100%;
}
.chk-row {
  display: flex;
  gap: 0.65rem;
  align-items: flex-start;
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--uf-on-surface);
  cursor: pointer;
}
.chk-row input {
  margin-top: 0.2rem;
  flex-shrink: 0;
}
.chk-desc {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--uf-on-surface-variant);
}
.leaf-badge {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--uf-primary);
}
.muted-td {
  color: var(--uf-on-surface-variant);
  font-size: 0.85rem;
}
.h3 {
  margin: 0 0 1rem;
  font-size: 1rem;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
code {
  font-size: 0.78rem;
}
</style>
