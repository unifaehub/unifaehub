<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import axios from 'axios'
import client from '@/api/client'
import ExerciseCategoryTreeBranch from '@/components/exercises/ExerciseCategoryTreeBranch.vue'
import type { PickerTreeNode } from '@/components/exercises/ExerciseCategoryTreeBranch.vue'
import MaterialIcon from '@/components/shell/MaterialIcon.vue'
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiPager from '@/components/ui/UiPager.vue'
import { useApiRequest } from '@/composables/useApiRequest'
import { useAuthStore } from '@/stores/auth'
import { useConfirmStore } from '@/stores/confirm'
import { useToastStore } from '@/stores/toast'
import { youtubeEmbedUrlFromLink } from '@/utils/videoEmbed'
import type { Paged } from '@/types/pagination'

type AppRow = { id: number; name: string; active: boolean }
type CourseRow = {
  id: number
  name: string
  caseContextLabel?: string | null
  app: { id: number; name: string } | null
}

type LeafCategoryRow = {
  id: number
  name: string
  clinicalCaseId: number | null
  clinicalCaseName: string | null
  sortOrder: number
}

type ClinicalCaseBrief = { id: number; name: string }

type CategoryApiRow = {
  id: number
  name: string
  parentId: number | null
  sortOrder: number
  isLeafLevel?: boolean
}

type ModalCaseBlock = {
  caseId: number
  caseName: string
  roots: PickerTreeNode[]
}

type ExerciseAttachmentRef = {
  id: number
  kind: 'VIDEO_FILE' | 'DOCUMENT'
  originalFilename: string
  mimeType: string
  sizeBytes: number
}

type ExerciseRow = {
  id: number
  name: string
  description: string | null
  instructions: string | null
  videoUrl: string | null
  active: boolean
  courseId: number
  appId: number
  categories: {
    id: number
    name: string
    clinicalCaseId: number | null
    clinicalCaseName: string | null
  }[]
  attachments?: ExerciseAttachmentRef[]
}

const props = withDefaults(
  defineProps<{
    /** Menu do curso: app e curso fixos; oculta seletores globais. */
    embeddedInCourse?: boolean
    courseAppId?: number
    courseScopeId?: number
  }>(),
  { embeddedInCourse: false },
)

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
const manualCourseId = ref<number | ''>('')

const { data: appsData, execute: loadApps } = useApiRequest<AppRow[]>(
  async () => {
    const { data } = await client.get<Paged<AppRow>>('/apps', { params: { page: 1, limit: 100 } })
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

function toFiniteId(v: unknown): number {
  if (v == null || v === '') return NaN
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : NaN
}

/** App/curso efetivos para chamadas à API (globais ou vindos do hub do curso). */
const activeAppId = computed((): number => {
  if (props.embeddedInCourse) {
    return toFiniteId(props.courseAppId)
  }
  const v = filterAppId.value
  return v === '' ? NaN : v
})

const activeCourseId = computed((): number => {
  if (props.embeddedInCourse) {
    return toFiniteId(props.courseScopeId)
  }
  const v = effectiveCourseId.value
  return v === '' ? NaN : v
})

watch(coursesForApp, (list) => {
  if (props.embeddedInCourse) return
  if (list.length > 1 && manualCourseId.value === '') {
    const first = list[0]
    if (first) manualCourseId.value = first.id
  }
})

const search = ref('')
const exercisesPage = ref(1)
const exercisesLimit = ref(20)
const exercisesTotal = ref(0)
const debouncedExerciseSearch = ref('')
let exerciseSearchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, (v) => {
  if (exerciseSearchTimer) clearTimeout(exerciseSearchTimer)
  exerciseSearchTimer = setTimeout(() => {
    debouncedExerciseSearch.value = v.trim()
  }, 400)
})
watch(debouncedExerciseSearch, () => {
  exercisesPage.value = 1
})

const listLoading = ref(false)
const listFailed = ref(false)
const exercisesList = ref<ExerciseRow[]>([])

const leafLoading = ref(false)
const leafFailed = ref(false)
const leafCategories = ref<LeafCategoryRow[]>([])

const sortedLeafCategories = computed(() => {
  const list = [...leafCategories.value]
  list.sort((a, b) => {
    const ca = (a.clinicalCaseName ?? '').localeCompare(b.clinicalCaseName ?? '', 'pt-BR')
    if (ca !== 0) return ca
    return a.name.localeCompare(b.name, 'pt-BR')
  })
  return list
})

function buildCategoryTree(flat: CategoryApiRow[]): PickerTreeNode[] {
  type Internal = {
    id: number
    name: string
    isLeafLevel: boolean
    sortOrder: number
    children: Internal[]
  }
  const m = new Map<number, Internal>()
  for (const r of flat) {
    m.set(r.id, {
      id: r.id,
      name: r.name,
      isLeafLevel: r.isLeafLevel ?? false,
      sortOrder: r.sortOrder ?? 0,
      children: [],
    })
  }
  const roots: Internal[] = []
  for (const r of flat) {
    const n = m.get(r.id)!
    const pid = r.parentId
    if (pid == null) roots.push(n)
    else {
      const p = m.get(pid)
      if (p) p.children.push(n)
      else roots.push(n)
    }
  }
  function sortRec(n: Internal) {
    n.children.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    n.children.forEach(sortRec)
  }
  roots.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
  roots.forEach(sortRec)
  function strip(n: Internal): PickerTreeNode {
    return {
      id: n.id,
      name: n.name,
      isLeafLevel: n.isLeafLevel,
      children: n.children.map(strip),
    }
  }
  return roots.map(strip)
}

function filterCategoryNodes(nodes: PickerTreeNode[], ql: string): PickerTreeNode[] {
  if (!ql.trim()) return nodes
  const out: PickerTreeNode[] = []
  for (const n of nodes) {
    const childF = filterCategoryNodes(n.children, ql)
    const self = n.name.toLowerCase().includes(ql)
    if (self) {
      out.push({ ...n, children: n.children })
    } else if (childF.length > 0) {
      out.push({ ...n, children: childF })
    }
  }
  return out
}

function collectFolderIds(nodes: PickerTreeNode[], into: Set<number>) {
  for (const n of nodes) {
    if (n.children.length > 0) {
      into.add(n.id)
      collectFolderIds(n.children, into)
    }
  }
}

const modalCaseBlocks = ref<ModalCaseBlock[]>([])
const modalTreesLoading = ref(false)
const modalTreesFailed = ref(false)
const categoryPickerFilter = ref('')
const expandedCaseIds = ref<Set<number>>(new Set())
const expandedNodeIds = ref<Set<number>>(new Set())

const filteredModalCaseBlocks = computed(() => {
  const q = categoryPickerFilter.value.trim().toLowerCase()
  return modalCaseBlocks.value
    .map((block) => ({
      ...block,
      roots: q ? filterCategoryNodes(block.roots, q) : block.roots,
    }))
    .filter((block) => block.roots.length > 0)
})

async function loadModalCategoryTrees() {
  const aid = activeAppId.value
  const cid = activeCourseId.value
  if (!Number.isFinite(aid) || !Number.isFinite(cid)) {
    modalCaseBlocks.value = []
    return
  }
  modalTreesLoading.value = true
  modalTreesFailed.value = false
  try {
    const allCases: ClinicalCaseBrief[] = []
    let cpage = 1
    const climit = 100
    for (;;) {
      const { data: cbody } = await client.get<Paged<ClinicalCaseBrief>>('/clinical-cases', {
        params: { appId: aid, courseId: cid, page: cpage, limit: climit },
      })
      allCases.push(...cbody.data)
      if (cbody.data.length < climit || allCases.length >= cbody.total) break
      cpage += 1
    }
    const sortedCases = [...allCases].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    const blocks: ModalCaseBlock[] = []
    for (const kase of sortedCases) {
      const { data: flat } = await client.get<CategoryApiRow[]>('/categories', {
        params: { clinicalCaseId: kase.id },
      })
      const roots = buildCategoryTree(flat)
      if (roots.length > 0) {
        blocks.push({ caseId: kase.id, caseName: kase.name, roots })
      }
    }
    modalCaseBlocks.value = blocks
    expandedCaseIds.value = new Set(blocks.map((b) => b.caseId))
    expandedNodeIds.value = new Set()
    categoryPickerFilter.value = ''
  } catch {
    modalTreesFailed.value = true
    modalCaseBlocks.value = []
  } finally {
    modalTreesLoading.value = false
  }
}

function toggleExpandCase(caseId: number) {
  const s = new Set(expandedCaseIds.value)
  if (s.has(caseId)) s.delete(caseId)
  else s.add(caseId)
  expandedCaseIds.value = s
}

function toggleExpandNode(id: number) {
  const s = new Set(expandedNodeIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  expandedNodeIds.value = s
}

watch(categoryPickerFilter, (q) => {
  const ql = q.trim()
  if (!ql) {
    expandedNodeIds.value = new Set()
    expandedCaseIds.value = new Set(modalCaseBlocks.value.map((b) => b.caseId))
    return
  }
  const ids = new Set<number>()
  for (const b of filteredModalCaseBlocks.value) {
    collectFolderIds(b.roots, ids)
  }
  expandedNodeIds.value = ids
  expandedCaseIds.value = new Set(modalCaseBlocks.value.map((b) => b.caseId))
})

async function loadExercises() {
  const aid = activeAppId.value
  const cid = activeCourseId.value
  if (!Number.isFinite(aid) || !Number.isFinite(cid)) {
    exercisesList.value = []
    exercisesTotal.value = 0
    return
  }
  listLoading.value = true
  listFailed.value = false
  try {
    const params: Record<string, string | number> = {
      appId: aid,
      courseId: cid,
      page: exercisesPage.value,
      limit: exercisesLimit.value,
    }
    const q = debouncedExerciseSearch.value.trim()
    if (q) params.q = q
    const { data } = await client.get<Paged<ExerciseRow>>('/exercises', { params })
    exercisesList.value = data.data
    exercisesTotal.value = data.total
  } catch {
    listFailed.value = true
    exercisesList.value = []
    exercisesTotal.value = 0
  } finally {
    listLoading.value = false
  }
}

async function loadLeafCategories() {
  const aid = activeAppId.value
  const cid = activeCourseId.value
  if (!Number.isFinite(aid) || !Number.isFinite(cid)) {
    leafCategories.value = []
    return
  }
  leafLoading.value = true
  leafFailed.value = false
  try {
    const { data } = await client.get<LeafCategoryRow[]>('/categories/leaf', {
      params: { appId: aid, courseId: cid },
    })
    leafCategories.value = data
  } catch {
    leafFailed.value = true
    leafCategories.value = []
  } finally {
    leafLoading.value = false
  }
}

watch(filterAppId, () => {
  if (!props.embeddedInCourse) manualCourseId.value = ''
})

watch(
  () => [activeAppId.value, activeCourseId.value] as const,
  () => {
    exercisesPage.value = 1
    void loadLeafCategories()
  },
  { immediate: true },
)

watch(
  [exercisesPage, exercisesLimit, debouncedExerciseSearch, activeAppId, activeCourseId],
  () => {
    void loadExercises()
  },
  { immediate: true },
)

function categoriesSummary(e: ExerciseRow) {
  if (!e.categories.length) return '—'
  return e.categories.map((c) => (c.clinicalCaseName ? `${c.clinicalCaseName} · ${c.name}` : c.name)).join('; ')
}

function attachmentVideoFileCount(e: ExerciseRow) {
  return (e.attachments ?? []).filter((a) => a.kind === 'VIDEO_FILE').length
}

function attachmentDocCount(e: ExerciseRow) {
  return (e.attachments ?? []).filter((a) => a.kind === 'DOCUMENT').length
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const showModal = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)
const form = ref({
  name: '',
  description: '',
  instructions: '',
  videoUrl: '',
  active: true,
  categoryIds: [] as number[],
})

const modalEmbedUrl = computed(() => youtubeEmbedUrlFromLink(form.value.videoUrl))

/** Anexos já salvos (edição). */
const modalAttachments = ref<ExerciseAttachmentRef[]>([])
/** Arquivos escolhidos no navegador; enviados após salvar o exercício. */
const pendingFiles = ref<File[]>([])

watch(showModal, (open) => {
  if (open) void loadModalCategoryTrees()
})

function onPickFiles(ev: Event) {
  const el = ev.target as HTMLInputElement
  if (!el.files?.length) return
  pendingFiles.value = [...pendingFiles.value, ...Array.from(el.files)]
  el.value = ''
}

function removePendingFile(index: number) {
  pendingFiles.value = pendingFiles.value.filter((_, i) => i !== index)
}

async function downloadModalAttachment(att: ExerciseAttachmentRef) {
  const eid = editingId.value
  if (eid == null) return
  try {
    const { data } = await client.get(`/exercises/${eid}/attachments/${att.id}/file`, {
      responseType: 'blob',
    })
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = att.originalFilename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch {
    toast.error('Não foi possível baixar o arquivo.')
  }
}

async function removeModalAttachment(att: ExerciseAttachmentRef) {
  const eid = editingId.value
  if (eid == null) return
  const ok = await confirm.confirm({
    title: 'Remover anexo',
    message: `Remover "${att.originalFilename}" do servidor?`,
    confirmText: 'Remover',
    cancelText: 'Cancelar',
    tone: 'danger',
  })
  if (!ok) return
  try {
    await client.delete(`/exercises/${eid}/attachments/${att.id}`)
    modalAttachments.value = modalAttachments.value.filter((x) => x.id !== att.id)
    toast.success('Anexo removido.')
    await loadExercises()
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, 'Não foi possível remover o anexo.'))
  }
}

function openNew() {
  const aid = activeAppId.value
  const cid = activeCourseId.value
  if (!Number.isFinite(aid) || !Number.isFinite(cid)) {
    toast.error('Selecione app e curso.')
    return
  }
  if (!leafCategories.value.length) {
    toast.error('Não há categorias finais neste curso. Defina a árvore em Categorias antes.')
    return
  }
  editingId.value = null
  modalAttachments.value = []
  pendingFiles.value = []
  form.value = {
    name: '',
    description: '',
    instructions: '',
    videoUrl: '',
    active: true,
    categoryIds: [sortedLeafCategories.value[0]!.id],
  }
  showModal.value = true
}

function openEdit(e: ExerciseRow) {
  editingId.value = e.id
  modalAttachments.value = [...(e.attachments ?? [])]
  pendingFiles.value = []
  form.value = {
    name: e.name,
    description: e.description ?? '',
    instructions: e.instructions ?? '',
    videoUrl: e.videoUrl ?? '',
    active: e.active,
    categoryIds: e.categories.map((c) => c.id),
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingId.value = null
  modalAttachments.value = []
  pendingFiles.value = []
}

function toggleCategory(id: number) {
  const ids = form.value.categoryIds
  const i = ids.indexOf(id)
  if (i >= 0) form.value.categoryIds = ids.filter((x) => x !== id)
  else form.value.categoryIds = [...ids, id]
}

async function submit() {
  if (!form.value.name.trim()) return
  if (form.value.categoryIds.length === 0) {
    toast.error('Marque ao menos uma categoria final.')
    return
  }
  const aid = activeAppId.value
  const cid = activeCourseId.value
  if (!Number.isFinite(aid) || !Number.isFinite(cid)) return
  saving.value = true
  try {
    const payload = {
      name: form.value.name.trim(),
      description: form.value.description.trim() || null,
      instructions: form.value.instructions.trim() || null,
      videoUrl: form.value.videoUrl.trim() || null,
      active: form.value.active,
      categoryIds: form.value.categoryIds,
      courseId: cid,
      appId: aid,
    }
    let exerciseId: number
    if (editingId.value == null) {
      const { data: created } = await client.post<ExerciseRow>('/exercises', payload)
      exerciseId = created.id
      toast.success('Exercício criado.')
    } else {
      exerciseId = editingId.value
      await client.patch(`/exercises/${exerciseId}`, {
        name: payload.name,
        description: payload.description,
        instructions: payload.instructions,
        videoUrl: payload.videoUrl,
        active: payload.active,
        categoryIds: payload.categoryIds,
      })
      toast.success('Exercício atualizado.')
    }
    if (pendingFiles.value.length > 0) {
      const fd = new FormData()
      for (const f of pendingFiles.value) {
        fd.append('files', f)
      }
      try {
        await client.post(`/exercises/${exerciseId}/attachments`, fd)
        toast.success('Anexos enviados ao servidor.')
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Exercício salvo, mas falha ao enviar anexos.'))
        await loadExercises()
        closeModal()
        return
      }
    }
    closeModal()
    await loadExercises()
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, 'Erro ao salvar o exercício.'))
  } finally {
    saving.value = false
  }
}

async function removeExercise(e: ExerciseRow) {
  const ok = await confirm.confirm({
    title: 'Excluir exercício',
    message: `Excluir "${e.name}"? Só é permitido se não estiver em prescrições.`,
    confirmText: 'Excluir',
    cancelText: 'Cancelar',
    tone: 'danger',
  })
  if (!ok) return
  try {
    await client.delete(`/exercises/${e.id}`)
    toast.success('Exercício excluído.')
    await loadExercises()
  } catch (err: unknown) {
    toast.error(apiErrorMessage(err, 'Não foi possível excluir.'))
  }
}

onMounted(() => {
  void loadApps()
  if (!props.embeddedInCourse) void loadCourses()
})
</script>

<template>
  <div class="page">
    <header class="head" :class="{ 'head--embedded': embeddedInCourse }">
      <div>
        <h1 class="title">Exercícios</h1>
        <p v-if="!embeddedInCourse" class="sub">
          Biblioteca por <strong>app e curso</strong>. Cada exercício fica vinculado a uma ou mais
          <strong>categorias finais</strong> (folhas da árvore). Inclua um link de vídeo (ex.: YouTube) para
          demonstração do movimento — aqui você pode assistir em prévia embutida quando o link for do YouTube.
        </p>
        <p v-else class="sub sub--compact">
          Biblioteca deste curso: vínculo a <strong>categorias finais</strong> e vídeo demonstrativo (YouTube com
          prévia embutida).
        </p>
      </div>
      <button type="button" class="btn btn--pri" @click="openNew">
        <MaterialIcon name="add" size="1rem" />
        Novo exercício
      </button>
    </header>

    <div v-if="!embeddedInCourse" class="filters-bar panel tonal">
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
        <label class="lbl">Curso ({{ courseAutoLine.n }} cursos neste app)</label>
        <select v-model="manualCourseId" class="in in--sm">
          <option v-for="c in coursesForApp" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
      <p v-else-if="filterAppId !== '' && courseAutoLine?.kind === 'none'" class="warn">
        Nenhum curso vinculado a este app. Cadastre em Cursos.
      </p>
      <div v-if="filterAppId !== '' && effectiveCourseId !== ''" class="field field--grow">
        <label class="lbl">Buscar</label>
        <input
          v-model="search"
          class="in in--filter"
          type="search"
          placeholder="Nome, descrição ou categoria…"
          autocomplete="off"
        />
      </div>
    </div>

    <div
      v-else-if="
        embeddedInCourse && Number.isFinite(activeAppId) && Number.isFinite(activeCourseId)
      "
      class="filters-bar panel tonal filters-bar--embedded"
    >
      <div class="field field--grow">
        <label class="lbl">Buscar</label>
        <input
          v-model="search"
          class="in in--filter"
          type="search"
          placeholder="Nome, descrição ou categoria…"
          autocomplete="off"
        />
      </div>
    </div>

    <section class="panel tonal list-panel">
      <p v-if="listLoading" class="muted">Carregando…</p>
      <UiConnectionRetry v-else-if="listFailed" @retry="loadExercises" />
      <template v-else>
        <p
          v-if="!Number.isFinite(activeAppId) || !Number.isFinite(activeCourseId)"
          class="muted"
        >
          {{ embeddedInCourse ? 'Não foi possível carregar o escopo do curso.' : 'Selecione um app com curso.' }}
        </p>
        <template v-else>
          <p v-if="leafLoading" class="muted">Carregando categorias finais…</p>
          <UiConnectionRetry v-else-if="leafFailed" @retry="loadLeafCategories" />
          <p v-else-if="!leafCategories.length" class="warn-inline">
            Não há categorias finais neste curso. Monte a árvore em <strong>Categorias</strong> antes de cadastrar
            exercícios.
          </p>
          <div v-if="!exercisesList.length" class="muted">Nenhum exercício encontrado.</div>
          <div v-else class="table-wrap">
            <table class="tbl">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Ativo</th>
                  <th>Categorias finais</th>
                  <th>Mídia / anexos</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr v-for="e in exercisesList" :key="e.id">
                  <td>
                    <span class="ex-name">{{ e.name }}</span>
                    <span v-if="e.description" class="ex-desc">{{ e.description }}</span>
                  </td>
                  <td>
                    <span v-if="e.active" class="pill pill--on">Sim</span>
                    <span v-else class="pill pill--off">Não</span>
                  </td>
                  <td class="td-cats">{{ categoriesSummary(e) }}</td>
                  <td class="td-media">
                    <div class="media-pills">
                      <span
                        v-if="youtubeEmbedUrlFromLink(e.videoUrl)"
                        class="pill pill--vid"
                        title="YouTube (prévia no painel)"
                      >
                        <MaterialIcon name="smart_display" size="0.95rem" />
                        YouTube
                      </span>
                      <span v-else-if="e.videoUrl" class="pill pill--link" title="URL de vídeo">
                        <MaterialIcon name="link" size="0.95rem" />
                        Link vídeo
                      </span>
                      <span
                        v-if="attachmentVideoFileCount(e) > 0"
                        class="pill pill--file-vid"
                        :title="`${attachmentVideoFileCount(e)} vídeo(s) no servidor`"
                      >
                        <MaterialIcon name="video_file" size="0.95rem" />
                        Vídeo {{ attachmentVideoFileCount(e) }}
                      </span>
                      <span
                        v-if="attachmentDocCount(e) > 0"
                        class="pill pill--doc"
                        :title="`${attachmentDocCount(e)} documento(s)`"
                      >
                        <MaterialIcon name="description" size="0.95rem" />
                        Doc {{ attachmentDocCount(e) }}
                      </span>
                      <span
                        v-if="
                          !e.videoUrl &&
                          attachmentVideoFileCount(e) === 0 &&
                          attachmentDocCount(e) === 0
                        "
                        class="muted-sm"
                        >—</span
                      >
                    </div>
                  </td>
                  <td class="td-actions">
                    <div class="ui-act-row">
                      <UiIconButton icon="edit" label="Editar" @click="openEdit(e)" />
                      <UiIconButton icon="delete" label="Excluir" variant="danger" @click="removeExercise(e)" />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <UiPager
            v-if="exercisesTotal > 0"
            v-model:page="exercisesPage"
            :limit="exercisesLimit"
            :total="exercisesTotal"
            :loading="listLoading"
          />
        </template>
      </template>
    </section>

    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal modal--wide">
        <h3 class="h3">{{ editingId == null ? 'Novo exercício' : 'Editar exercício' }}</h3>
        <form class="form" @submit.prevent="submit">
          <div class="field">
            <label class="lbl">Nome</label>
            <input v-model="form.name" class="in in--full" required />
          </div>
          <div class="field">
            <label class="lbl">Descrição (opcional)</label>
            <textarea v-model="form.description" class="in in--area in--full" rows="2" />
          </div>
          <div class="field">
            <label class="lbl">Instruções (opcional)</label>
            <textarea v-model="form.instructions" class="in in--area in--full" rows="3" />
          </div>
          <div class="field">
            <label class="lbl">URL do vídeo demonstrativo (opcional)</label>
            <input
              v-model="form.videoUrl"
              class="in in--full"
              type="url"
              placeholder="https://www.youtube.com/watch?v=… ou youtu.be/…"
              autocomplete="off"
            />
            <p class="field-hint">
              No app, o usuário poderá abrir este link. Abaixo, prévia embutida apenas para URLs do YouTube.
            </p>
          </div>
          <div v-if="modalEmbedUrl" class="embed-box">
            <p class="embed-lbl">Pré-visualização (painel web)</p>
            <div class="embed-ratio">
              <iframe
                :src="modalEmbedUrl"
                title="Prévia do vídeo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
                loading="lazy"
              />
            </div>
          </div>
          <p v-else-if="form.videoUrl.trim()" class="embed-fallback">
            URL não reconhecida como YouTube. O vídeo poderá ser aberto pelo link no aplicativo.
          </p>

          <div class="field">
            <label class="lbl">Arquivos no servidor (opcional)</label>
            <p class="field-hint">
              Vídeos (MP4, WebM, MOV), PDF, Word (.doc/.docx) ou texto (.txt), até ~50 MB por arquivo. São gravados
              neste servidor; o app pode baixar ou abrir. Complementa a URL do YouTube acima.
            </p>
            <label class="btn btn--ghost btn--file">
              <MaterialIcon name="upload_file" size="1rem" />
              Escolher arquivos
              <input
                type="file"
                class="file-input-hidden"
                multiple
                accept="video/mp4,video/webm,video/quicktime,.pdf,.doc,.docx,.txt"
                @change="onPickFiles"
              />
            </label>
            <ul v-if="pendingFiles.length" class="pending-files">
              <li v-for="(f, i) in pendingFiles" :key="`${f.name}-${i}`" class="pending-files__row">
                <span class="pending-files__name">{{ f.name }}</span>
                <button type="button" class="btn-tiny" @click="removePendingFile(i)">Remover</button>
              </li>
            </ul>
            <template v-if="modalAttachments.length">
              <p class="attach-sub">Já salvos neste exercício:</p>
              <ul class="saved-attach">
                <li v-for="att in modalAttachments" :key="att.id" class="saved-attach__row">
                  <span class="saved-attach__meta">
                    <MaterialIcon
                      :name="att.kind === 'VIDEO_FILE' ? 'video_file' : 'description'"
                      size="1rem"
                      class="saved-attach__ico"
                    />
                    <span class="saved-attach__name">{{ att.originalFilename }}</span>
                    <span class="saved-attach__size">{{ formatFileSize(att.sizeBytes) }}</span>
                  </span>
                  <span class="saved-attach__acts">
                    <button type="button" class="btn-tiny" @click="downloadModalAttachment(att)">
                      Baixar
                    </button>
                    <button type="button" class="btn-tiny btn-tiny--danger" @click="removeModalAttachment(att)">
                      Excluir
                    </button>
                  </span>
                </li>
              </ul>
            </template>
          </div>

          <label class="chk-row">
            <input v-model="form.active" type="checkbox" />
            <span><strong>Ativo</strong> na biblioteca</span>
          </label>
          <div class="field">
            <label class="lbl">Categorias finais (obrigatório — ao menos uma)</label>
            <p class="field-hint">
              Abra cada <strong>contexto</strong> e expanda pastas na árvore; só o último nível (folhas) pode ser
              marcado. Use o filtro para localizar nomes sem abrir tudo de uma vez.
            </p>
            <input
              v-model="categoryPickerFilter"
              class="in in--full cat-picker-filter"
              type="search"
              placeholder="Filtrar por nome na árvore…"
              autocomplete="off"
            />
            <p class="cat-picker-meta">
              <strong>{{ form.categoryIds.length }}</strong> categoria(s) selecionada(s)
            </p>
            <div class="cat-picker-box">
              <p v-if="modalTreesLoading" class="muted">Carregando árvores de categorias…</p>
              <UiConnectionRetry v-else-if="modalTreesFailed" @retry="loadModalCategoryTrees" />
              <p v-else-if="!filteredModalCaseBlocks.length" class="muted">
                Nenhuma categoria encontrada{{ categoryPickerFilter.trim() ? ' para este filtro' : ' neste curso' }}.
              </p>
              <div v-else class="cat-picker-cases">
                <div v-for="block in filteredModalCaseBlocks" :key="block.caseId" class="cat-picker-case">
                  <button
                    type="button"
                    class="cat-picker-case__head"
                    @click="toggleExpandCase(block.caseId)"
                  >
                    <MaterialIcon
                      class="cat-picker-case__chev"
                      :name="expandedCaseIds.has(block.caseId) ? 'expand_more' : 'chevron_right'"
                      size="1.1rem"
                    />
                    <span class="cat-picker-case__title">{{ block.caseName }}</span>
                  </button>
                  <div v-show="expandedCaseIds.has(block.caseId)" class="cat-picker-case__body">
                    <ExerciseCategoryTreeBranch
                      :nodes="block.roots"
                      :depth="0"
                      :expanded-ids="expandedNodeIds"
                      :selected-ids="form.categoryIds"
                      @toggle-expand="toggleExpandNode"
                      @toggle-select="toggleCategory"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn--ghost" @click="closeModal">Cancelar</button>
            <button type="submit" class="btn btn--pri" :disabled="saving">
              {{ saving ? 'Salvando…' : 'Confirmar' }}
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
.head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 1.25rem;
}
.head--embedded {
  margin-bottom: 0.85rem;
}
.sub--compact {
  max-width: 40rem;
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
  max-width: 48rem;
}
.filters-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 1.5rem;
  padding: 1rem 1.25rem;
  margin-bottom: 1.25rem;
  align-items: flex-end;
}
.filters-bar--embedded {
  margin-bottom: 1rem;
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
.warn-inline {
  margin: 0;
  font-size: 0.88rem;
  color: #b3261e;
  line-height: 1.45;
}
.field--grow {
  flex: 1;
  min-width: 12rem;
}
.in--filter {
  max-width: 100%;
}
.list-panel {
  padding: 1.5rem;
  border-radius: var(--uf-radius-xl);
  background: var(--uf-surface-container-lowest);
}
.tonal {
  box-shadow: var(--uf-tonal-shadow);
}
.panel {
  border-radius: var(--uf-radius-xl);
  background: var(--uf-surface-container-lowest);
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
.in--full {
  max-width: 100%;
}
.in--area {
  min-height: 4rem;
  resize: vertical;
}
.field-hint {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: var(--uf-on-surface-variant);
  line-height: 1.4;
}
.muted {
  color: var(--uf-on-surface-variant);
  font-size: 0.88rem;
}
.muted-sm {
  font-size: 0.78rem;
  color: var(--uf-on-surface-variant);
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
  font-size: 0.85rem;
}
.tbl th {
  text-align: left;
  padding: 0.5rem 0.65rem 0.5rem 0;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--uf-on-surface-variant);
  border-bottom: 1px solid rgba(191, 202, 186, 0.35);
}
.tbl td {
  padding: 0.65rem 0.65rem 0.65rem 0;
  vertical-align: top;
  border-bottom: 1px solid rgba(191, 202, 186, 0.2);
}
.ex-name {
  display: block;
  font-weight: 700;
}
.ex-desc {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.78rem;
  color: var(--uf-on-surface-variant);
  line-height: 1.35;
  max-width: 28rem;
}
.td-cats {
  font-size: 0.8rem;
  line-height: 1.35;
  max-width: 22rem;
}
.td-actions {
  white-space: nowrap;
  text-align: right;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
}
.pill--on {
  background: rgba(13, 99, 27, 0.12);
  color: var(--uf-primary);
}
.pill--off {
  background: rgba(0, 0, 0, 0.06);
  color: var(--uf-on-surface-variant);
}
.pill--vid {
  background: rgba(179, 38, 30, 0.08);
  color: #b3261e;
}
.pill--link {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
}
.pill--file-vid {
  background: rgba(124, 58, 237, 0.12);
  color: #6d28d9;
}
.pill--doc {
  background: rgba(14, 165, 233, 0.12);
  color: #0369a1;
}
.td-media {
  max-width: 14rem;
}
.media-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
}
.btn--file {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  margin-top: 0.25rem;
}
.file-input-hidden {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  overflow: hidden;
}
.pending-files {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
  font-size: 0.85rem;
}
.pending-files__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid var(--uf-outline-variant, rgba(0, 0, 0, 0.12));
}
.pending-files__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.attach-sub {
  margin: 0.75rem 0 0.35rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--uf-on-surface-variant);
}
.saved-attach {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.85rem;
}
.saved-attach__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.35rem 0;
  border-bottom: 1px solid var(--uf-outline-variant, rgba(0, 0, 0, 0.12));
}
.saved-attach__meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  flex: 1;
}
.saved-attach__ico {
  flex-shrink: 0;
  color: var(--uf-on-surface-variant);
}
.saved-attach__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.saved-attach__size {
  flex-shrink: 0;
  font-size: 0.75rem;
  color: var(--uf-on-surface-variant);
}
.saved-attach__acts {
  display: flex;
  gap: 0.35rem;
  flex-shrink: 0;
}
.btn-tiny {
  border: none;
  border-radius: 999px;
  padding: 0.3rem 0.55rem;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  background: rgba(13, 99, 27, 0.1);
  color: var(--uf-primary);
  font-family: var(--uf-font);
}
.btn-tiny--danger {
  color: #b3261e;
  background: rgba(179, 38, 30, 0.08);
}
.h3 {
  margin: 0 0 1rem;
  font-size: 1.15rem;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}
.modal {
  width: 100%;
  max-width: 32rem;
  max-height: 90vh;
  overflow: auto;
  background: var(--uf-surface-container-lowest);
  border-radius: var(--uf-radius-xl);
  padding: 1.5rem;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
}
.modal--wide {
  max-width: 40rem;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 0.5rem;
}
.chk-row {
  display: flex;
  gap: 0.65rem;
  align-items: flex-start;
  font-size: 0.88rem;
  cursor: pointer;
}
.cat-picker-filter {
  margin-top: 0.35rem;
}
.cat-picker-meta {
  margin: 0.4rem 0 0.35rem;
  font-size: 0.8rem;
  color: var(--uf-on-surface-variant);
}
.cat-picker-box {
  max-height: 18rem;
  overflow: auto;
  margin-top: 0.25rem;
  padding: 0.5rem 0.65rem;
  border-radius: var(--uf-radius-md);
  background: var(--uf-surface-container-low);
}
.cat-picker-cases {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.cat-picker-case {
  border-radius: var(--uf-radius-md);
  border: 1px solid rgba(191, 202, 186, 0.45);
  overflow: hidden;
  background: var(--uf-surface-container-lowest);
}
.cat-picker-case__head {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  width: 100%;
  margin: 0;
  padding: 0.5rem 0.6rem;
  border: none;
  background: rgba(13, 99, 27, 0.06);
  font-family: var(--uf-font);
  font-size: 0.78rem;
  font-weight: 800;
  text-align: left;
  color: var(--uf-on-surface);
  cursor: pointer;
}
.cat-picker-case__head:hover {
  background: rgba(13, 99, 27, 0.1);
}
.cat-picker-case__chev {
  flex-shrink: 0;
  color: var(--uf-primary);
}
.cat-picker-case__title {
  flex: 1;
  min-width: 0;
}
.cat-picker-case__body {
  padding: 0.35rem 0.5rem 0.6rem;
}
.embed-box {
  margin-top: 0.25rem;
}
.embed-lbl {
  margin: 0 0 0.4rem;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--uf-on-surface-variant);
}
.embed-ratio {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%;
  height: 0;
  overflow: hidden;
  border-radius: var(--uf-radius-md);
  background: #000;
}
.embed-ratio iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: none;
}
.embed-fallback {
  margin: 0;
  font-size: 0.8rem;
  color: var(--uf-on-surface-variant);
  line-height: 1.4;
}
</style>
