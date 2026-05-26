<script setup lang="ts">
import MaterialIcon from '@/components/shell/MaterialIcon.vue'
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiPager from '@/components/ui/UiPager.vue'
import client from '@/api/client'
import axios from 'axios'
import { computed, onMounted, ref, watch } from 'vue'
import { useApiRequest } from '@/composables/useApiRequest'
import { useAuthStore } from '@/stores/auth'
import { useConfirmStore } from '@/stores/confirm'
import { useToastStore } from '@/stores/toast'
import * as XLSX from 'xlsx'
import type { Paged } from '@/types/pagination'

type UserRow = {
  id: number
  name: string
  email: string
  role: string
  appId: number | null
  courseId: number | null
  app: { id: number; name: string } | null
  course: { id: number; name: string } | null
  photoUrl: string | null
  primarySpecialty: string | null
  coordinatorSpecialties: Array<{ id: number; name: string; isPrimary: boolean }>
  active: boolean
  activeFrom: string | null
  activeUntil: string | null
  lastLoginAt: string | null
}

type UserStats = {
  total: number
  active: number
  inactive: number
  byRole: Record<string, number>
}

type CourseCatalog = { id: number; name: string; app: { id: number; name: string } | null }
type AppRow = { id: number; name: string; active: boolean }
type SpecialtyFormRow = { id: string; name: string; isPrimary: boolean }

const auth = useAuthStore()
const confirm = useConfirmStore()
const toast = useToastStore()
const isAdmin = computed(() => auth.user?.role === 'ADMIN')
const isCoordinator = computed(() => auth.user?.role === 'COORDINATOR')
/** Desativar/ativar: admin ou coordenador (escopo no backend). */
const canToggleActive = computed(() => isAdmin.value || isCoordinator.value)

const search = ref('')
const roleFilter = ref<string>('')
const activeFilter = ref<'all' | 'active' | 'inactive'>('active')

const showCreate = ref(false)
const creating = ref(false)
const periodError = ref<string | null>(null)
const newName = ref('')
const newEmail = ref('')
const newPassword = ref('')
const newRole = ref<'ADMIN' | 'COORDINATOR' | 'PROFESSOR' | 'STUDENT' | 'PATIENT'>('STUDENT')
const newActive = ref(true)
const newActiveFrom = ref<string>('')
const newActiveUntil = ref<string>('')
const newAppId = ref<number | ''>('')
const newCourseId = ref<number | ''>('')
const newCoordinatorSpecialties = ref<SpecialtyFormRow[]>([])

const appsOptions = ref<AppRow[]>([])
const stats = ref<UserStats | null>(null)
const catalogCourses = ref<CourseCatalog[]>([])

const importing = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const showEdit = ref(false)
const editing = ref(false)
const editId = ref<number | null>(null)
const editName = ref('')
const editEmail = ref('')
const editPassword = ref('')
const editRole = ref<'ADMIN' | 'COORDINATOR' | 'PROFESSOR' | 'STUDENT' | 'PATIENT'>('STUDENT')
const editActive = ref(true)
const editActiveFrom = ref('')
const editActiveUntil = ref('')
const editAppId = ref<number | ''>('')
const editCourseId = ref<number | ''>('')
const editCoordinatorSpecialties = ref<SpecialtyFormRow[]>([])
const editPhotoFile = ref<File | null>(null)
const editPhotoInput = ref<HTMLInputElement | null>(null)
const editPeriodError = ref<string | null>(null)
let specialtySeq = 0

function handleUnauthorized() {
  auth.logout()
  window.location.href = '/login'
}

function apiErrorMessage(err: unknown, fallback: string) {
  if (!axios.isAxiosError(err)) return fallback
  const m = err.response?.data as { message?: string | string[] } | undefined
  const raw = m?.message
  if (Array.isArray(raw)) return raw.join(' ')
  if (typeof raw === 'string' && raw.trim()) return raw
  return fallback
}

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

watch([debouncedSearch, roleFilter, activeFilter], () => {
  page.value = 1
})

const { data: usersPage, loading, failed, execute } = useApiRequest<Paged<UserRow>>(
  async () => {
    const params: Record<string, string | number> = {
      page: page.value,
      limit: limit.value,
    }
    const q = debouncedSearch.value.trim()
    if (q) params.q = q
    if (roleFilter.value) params.role = roleFilter.value
    if (activeFilter.value === 'active') params.active = 'true'
    if (activeFilter.value === 'inactive') params.active = 'false'
    const { data } = await client.get<Paged<UserRow>>('/users', { params })
    return data
  },
  { onUnauthorized: handleUnauthorized },
)

watch([page, limit, debouncedSearch, roleFilter, activeFilter], () => {
  void execute()
})

const rows = computed(() => usersPage.value?.data ?? [])
const listTotal = computed(() => usersPage.value?.total ?? 0)

async function loadStats() {
  try {
    const { data } = await client.get<UserStats>('/users/stats')
    stats.value = data
  } catch {
    stats.value = null
  }
}

async function loadCatalog() {
  try {
    const { data } = await client.get<Paged<CourseCatalog>>('/courses', { params: { page: 1, limit: 100 } })
    catalogCourses.value = data.data.map((c) => ({
      id: c.id,
      name: c.name,
      app: c.app ?? null,
    }))
  } catch {
    catalogCourses.value = []
  }
}

async function loadApps() {
  try {
    const { data } = await client.get<Paged<AppRow>>('/apps', { params: { page: 1, limit: 100 } })
    appsOptions.value = data.data
  } catch {
    appsOptions.value = []
  }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const a = parts[0]?.[0] ?? '?'
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? ''
  return (a + b).toUpperCase()
}

function createSpecialtyRow(name = '', isPrimary = false): SpecialtyFormRow {
  specialtySeq += 1
  return { id: `sp-${Date.now()}-${specialtySeq}`, name, isPrimary }
}

function ensureOnePrimary(rows: SpecialtyFormRow[]) {
  const filled = rows.filter((s) => s.name.trim())
  if (!filled.length) return
  const selected = filled.find((s) => s.isPrimary) ?? filled[0]!
  rows.forEach((s) => {
    s.isPrimary = s.id === selected.id
  })
}

function addSpecialty(rows: SpecialtyFormRow[]) {
  rows.push(createSpecialtyRow('', rows.every((s) => !s.name.trim())))
}

function removeSpecialty(rows: SpecialtyFormRow[], id: string) {
  const idx = rows.findIndex((s) => s.id === id)
  if (idx >= 0) rows.splice(idx, 1)
  ensureOnePrimary(rows)
}

function setPrimarySpecialty(rows: SpecialtyFormRow[], id: string) {
  rows.forEach((s) => {
    s.isPrimary = s.id === id
  })
}

function serializeSpecialties(rows: SpecialtyFormRow[]) {
  const seen = new Set<string>()
  const out: Array<{ name: string; isPrimary: boolean }> = []
  for (const row of rows) {
    const name = row.name.trim().replace(/\s+/g, ' ')
    const key = name.toLowerCase()
    if (!name || seen.has(key)) continue
    seen.add(key)
    out.push({ name, isPrimary: row.isPrimary })
  }
  if (out.length && !out.some((s) => s.isPrimary)) out[0]!.isPrimary = true
  const primaryIndex = out.findIndex((s) => s.isPrimary)
  return out.map((s, index) => ({ ...s, isPrimary: index === primaryIndex }))
}

function specialtyRowsFromUser(u: UserRow): SpecialtyFormRow[] {
  const rows = (u.coordinatorSpecialties ?? []).map((s) => createSpecialtyRow(s.name, s.isPrimary))
  ensureOnePrimary(rows)
  return rows
}

function resetNewSpecialties() {
  newCoordinatorSpecialties.value = [createSpecialtyRow('', true)]
}

function resetEditSpecialties() {
  editCoordinatorSpecialties.value = [createSpecialtyRow('', true)]
}

function validatePeriodLocal(): boolean {
  periodError.value = null
  if (newRole.value !== 'STUDENT') return true
  const a = newActiveFrom.value
  const b = newActiveUntil.value
  if (a && b && a > b) {
    periodError.value = 'A data inicial deve ser anterior ou igual à data final.'
    return false
  }
  return true
}

watch([newActiveFrom, newActiveUntil, newRole], () => {
  if (periodError.value) validatePeriodLocal()
})

async function createUser() {
  if (!isAdmin.value) return
  if (!newName.value.trim() || !newEmail.value.trim() || !newPassword.value.trim()) return
  if (!validatePeriodLocal()) return
  creating.value = true
  try {
    await client.post('/users', {
      name: newName.value.trim(),
      email: newEmail.value.trim(),
      password: newPassword.value,
      role: newRole.value,
      active: newActive.value,
      appId: newAppId.value === '' ? undefined : newAppId.value,
      courseId: newCourseId.value === '' ? undefined : newCourseId.value,
      coordinatorSpecialties:
        newRole.value === 'COORDINATOR' ? serializeSpecialties(newCoordinatorSpecialties.value) : undefined,
      activeFrom: newRole.value === 'STUDENT' && newActiveFrom.value ? newActiveFrom.value : undefined,
      activeUntil: newRole.value === 'STUDENT' && newActiveUntil.value ? newActiveUntil.value : undefined,
    })
    showCreate.value = false
    newName.value = ''
    newEmail.value = ''
    newPassword.value = ''
    newRole.value = 'STUDENT'
    newActive.value = true
    newActiveFrom.value = ''
    newActiveUntil.value = ''
    newAppId.value = ''
    newCourseId.value = ''
    resetNewSpecialties()
    await execute()
    await loadStats()
  } finally {
    creating.value = false
  }
}

function openCreatePanel() {
  showEdit.value = false
  if (!newCoordinatorSpecialties.value.length) resetNewSpecialties()
  showCreate.value = true
}

function openEdit(u: UserRow) {
  if (!isAdmin.value) return
  showCreate.value = false
  editId.value = u.id
  editName.value = u.name
  editEmail.value = u.email
  editPassword.value = ''
  editRole.value = u.role as typeof editRole.value
  editAppId.value = u.appId ?? ''
  editCourseId.value = u.courseId ?? ''
  editActive.value = u.active
  editActiveFrom.value = u.activeFrom ?? ''
  editActiveUntil.value = u.activeUntil ?? ''
  editCoordinatorSpecialties.value = specialtyRowsFromUser(u)
  if (!editCoordinatorSpecialties.value.length) resetEditSpecialties()
  editPhotoFile.value = null
  if (editPhotoInput.value) editPhotoInput.value.value = ''
  editPeriodError.value = null
  showEdit.value = true
}

function closeEdit() {
  showEdit.value = false
  editId.value = null
  editPhotoFile.value = null
  if (editPhotoInput.value) editPhotoInput.value.value = ''
}

function validateEditPeriod(): boolean {
  editPeriodError.value = null
  if (editRole.value !== 'STUDENT') return true
  const a = editActiveFrom.value
  const b = editActiveUntil.value
  if (a && b && a > b) {
    editPeriodError.value = 'A data inicial deve ser anterior ou igual à data final.'
    return false
  }
  return true
}

watch([editActiveFrom, editActiveUntil, editRole], () => {
  if (editPeriodError.value) validateEditPeriod()
})

async function saveEdit() {
  if (!isAdmin.value || editId.value == null) return
  if (!editName.value.trim() || !editEmail.value.trim()) return
  if (!validateEditPeriod()) return
  editing.value = true
  try {
    const payload: Record<string, unknown> = {
      name: editName.value.trim(),
      email: editEmail.value.trim(),
      role: editRole.value,
      active: editActive.value,
      appId: editAppId.value === '' ? null : editAppId.value,
      courseId: editCourseId.value === '' ? null : editCourseId.value,
      coordinatorSpecialties:
        editRole.value === 'COORDINATOR' ? serializeSpecialties(editCoordinatorSpecialties.value) : [],
    }
    if (editPassword.value.trim()) payload.password = editPassword.value
    if (editRole.value === 'STUDENT') {
      payload.activeFrom = editActiveFrom.value || null
      payload.activeUntil = editActiveUntil.value || null
    } else {
      payload.activeFrom = null
      payload.activeUntil = null
    }
    await client.patch(`/users/${editId.value}`, payload)
    if (editPhotoFile.value) {
      const fd = new FormData()
      fd.append('file', editPhotoFile.value)
      await client.post(`/users/${editId.value}/profile/photo`, fd)
    }
    closeEdit()
    await execute()
    await loadStats()
  } finally {
    editing.value = false
  }
}

async function toggleActive(u: UserRow) {
  if (!canToggleActive.value) return
  try {
    await client.patch(`/users/${u.id}`, { active: !u.active })
    await execute()
    await loadStats()
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, 'Não foi possível alterar o status do usuário.'))
  }
}

async function confirmDelete(u: UserRow) {
  if (!isAdmin.value) return
  const ok = await confirm.confirm({
    title: 'Excluir usuário',
    message: `Excluir o cadastro de "${u.name}"? O acesso será bloqueado, a ação fica registrada em log e não poderá ser desfeita pelo painel.`,
    confirmText: 'Excluir',
    cancelText: 'Cancelar',
    tone: 'danger',
  })
  if (!ok) return
  try {
    await client.delete(`/users/${u.id}`)
    toast.success('Usuário excluído com sucesso.')
    await execute()
    await loadStats()
  } catch {
    toast.error('Erro ao excluir usuário. Tente novamente.')
  }
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function downloadXlsxTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['name', 'email', 'password', 'role', 'active', 'activeFrom', 'activeUntil', 'appId', 'courseId'],
    ['Aluno Exemplo', 'aluno.exemplo@unifae.local', 'Temp@123', 'STUDENT', 'true', '2026-04-01', '2026-06-30', '', ''],
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'usuarios')
  XLSX.writeFile(wb, 'modelo_importacao_usuarios.xlsx')
}

function cellVal(row: Record<string, unknown>, ...keys: string[]) {
  for (const k of keys) {
    const v = row[k]
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
  }
  const lower = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [String(k).trim().toLowerCase(), v]),
  )
  for (const k of keys) {
    const kk = k.toLowerCase()
    const v = lower[kk]
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

function parseUsersFromSheet(rows: Record<string, unknown>[]) {
  const out: Array<Record<string, unknown>> = []
  for (const row of rows) {
    const name = cellVal(row, 'name', 'nome', 'Nome')
    const email = cellVal(row, 'email', 'e-mail', 'Email')
    const password = cellVal(row, 'password', 'senha', 'Password')
    const role = (cellVal(row, 'role', 'perfil', 'Role') || 'STUDENT').toUpperCase()
    const activeRaw = cellVal(row, 'active', 'ativo', 'Active')
    const active = activeRaw === '' ? true : activeRaw.toLowerCase() !== 'false' && activeRaw !== '0'
    const activeFrom = cellVal(row, 'activeFrom', 'ativo_de', 'ActiveFrom') || undefined
    const activeUntil = cellVal(row, 'activeUntil', 'ate', 'ActiveUntil') || undefined
    const appIdRaw = cellVal(row, 'appId', 'app_id', 'AppId')
    const courseIdRaw = cellVal(row, 'courseId', 'course_id', 'CourseId')
    const appId = appIdRaw === '' ? undefined : Number(appIdRaw)
    const courseId = courseIdRaw === '' ? undefined : Number(courseIdRaw)
    if (!name || !email || !password) continue
    out.push({
      name,
      email,
      password,
      role,
      active,
      activeFrom: activeFrom || undefined,
      activeUntil: activeUntil || undefined,
      ...(Number.isFinite(appId) ? { appId } : {}),
      ...(Number.isFinite(courseId) ? { courseId } : {}),
    })
  }
  return out
}

async function importXlsxFile(file: File) {
  if (!isAdmin.value) return
  importing.value = true
  try {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const sheetName = wb.SheetNames[0]
    if (!sheetName) return
    const sheet = wb.Sheets[sheetName]
    if (!sheet) return
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
    const users = parseUsersFromSheet(json)
    await client.post('/users/import', { users })
    await execute()
    await loadStats()
  } finally {
    importing.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

function openFilePicker() {
  fileInput.value?.click()
}

onMounted(() => {
  void loadStats()
  void loadCatalog()
  void loadApps()
  void execute()
})
</script>

<template>
  <div class="page">
    <header class="head">
      <div>
        <h1 class="title">Usuários</h1>
        <p class="sub">Gerencie o acesso de professores, alunos e editores clínicos.</p>
      </div>
      <div class="actions">
        <button type="button" class="btn btn--ghost" @click="downloadXlsxTemplate">
          <MaterialIcon name="download" size="1.1rem" />
          Modelo XLSX
        </button>
        <button type="button" class="btn btn--ghost" :disabled="!isAdmin || importing" @click="openFilePicker">
          <MaterialIcon name="upload" size="1.1rem" />
          {{ importing ? 'Importando…' : 'Importar XLSX' }}
        </button>
        <button type="button" class="btn btn--pri" :disabled="!isAdmin" @click="openCreatePanel">
          <MaterialIcon name="add" size="1.1rem" />
          Novo Usuário
        </button>
      </div>
    </header>

    <input
      ref="fileInput"
      type="file"
      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      class="file"
      @change="
        (e) => {
          const f = (e.target as HTMLInputElement).files?.[0]
          if (f) void importXlsxFile(f)
        }
      "
    />

    <section v-if="showCreate" class="create tonal">
      <div class="create-head">
        <h2>Novo usuário</h2>
        <button type="button" class="btn btn--ghost" @click="showCreate = false">Fechar</button>
      </div>
      <p v-if="periodError" class="err">{{ periodError }}</p>
      <form class="form" @submit.prevent="createUser">
        <div class="field">
          <label>Nome</label>
          <input v-model="newName" class="in" />
        </div>
        <div class="field">
          <label>E-mail</label>
          <input v-model="newEmail" class="in" type="email" />
        </div>
        <div class="field">
          <label>Senha</label>
          <input v-model="newPassword" class="in" type="password" />
        </div>
        <div class="field">
          <label>Perfil</label>
          <select v-model="newRole" class="in">
            <option value="ADMIN">Administrador</option>
            <option value="COORDINATOR">Coordenador</option>
            <option value="PROFESSOR">Professor</option>
            <option value="STUDENT">Aluno</option>
            <option value="PATIENT">Paciente</option>
          </select>
        </div>
        <div class="field">
          <label>App</label>
          <select v-model="newAppId" class="in">
            <option value="">—</option>
            <option v-for="a in appsOptions" :key="a.id" :value="a.id">{{ a.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>Curso</label>
          <select v-model="newCourseId" class="in">
            <option value="">—</option>
            <option v-for="c in catalogCourses" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <label class="chk">
          <input v-model="newActive" type="checkbox" />
          Ativo
        </label>

        <div v-if="newRole === 'STUDENT'" class="row">
          <div class="field">
            <label>Ativo de</label>
            <input v-model="newActiveFrom" class="in" type="date" />
          </div>
          <div class="field">
            <label>Até</label>
            <input v-model="newActiveUntil" class="in" type="date" />
          </div>
        </div>

        <div v-if="newRole === 'COORDINATOR'" class="field">
          <label>Especialidades da coordenadora</label>
          <div class="specialty-list">
            <div v-for="sp in newCoordinatorSpecialties" :key="sp.id" class="specialty-row">
              <input v-model="sp.name" class="in" placeholder="Ex.: Ortopedia" @blur="ensureOnePrimary(newCoordinatorSpecialties)" />
              <label class="radio-main">
                <input
                  type="radio"
                  name="new-primary-specialty"
                  :checked="sp.isPrimary"
                  @change="setPrimarySpecialty(newCoordinatorSpecialties, sp.id)"
                />
                Principal
              </label>
              <button type="button" class="mini-act" @click="removeSpecialty(newCoordinatorSpecialties, sp.id)">
                Remover
              </button>
            </div>
          </div>
          <button type="button" class="btn btn--ghost btn--inline" @click="addSpecialty(newCoordinatorSpecialties)">
            Adicionar especialidade
          </button>
          <p class="hint">Selecione uma única especialidade principal para exibição no app.</p>
        </div>

        <button
          type="submit"
          class="btn btn--pri"
          :disabled="creating || !newName.trim() || !newEmail.trim() || !newPassword.trim()"
        >
          <MaterialIcon name="add" size="1.1rem" />
          {{ creating ? 'Criando…' : 'Criar usuário' }}
        </button>
      </form>
    </section>

    <section v-if="showEdit" class="create tonal">
      <div class="create-head">
        <h2>Editar usuário</h2>
        <button type="button" class="btn btn--ghost" @click="closeEdit">Fechar</button>
      </div>
      <p v-if="editPeriodError" class="err">{{ editPeriodError }}</p>
      <form class="form" @submit.prevent="saveEdit">
        <div class="field">
          <label>Nome</label>
          <input v-model="editName" class="in" />
        </div>
        <div class="field">
          <label>E-mail</label>
          <input v-model="editEmail" class="in" type="email" />
        </div>
        <div class="field">
          <label>Nova senha (opcional)</label>
          <input v-model="editPassword" class="in" type="password" placeholder="Deixe em branco para manter" />
        </div>
        <div class="field">
          <label>Perfil</label>
          <select v-model="editRole" class="in">
            <option value="ADMIN">Administrador</option>
            <option value="COORDINATOR">Coordenador</option>
            <option value="PROFESSOR">Professor</option>
            <option value="STUDENT">Aluno</option>
            <option value="PATIENT">Paciente</option>
          </select>
        </div>
        <div class="field">
          <label>App</label>
          <select v-model="editAppId" class="in">
            <option value="">—</option>
            <option v-for="a in appsOptions" :key="a.id" :value="a.id">{{ a.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>Curso</label>
          <select v-model="editCourseId" class="in">
            <option value="">—</option>
            <option v-for="c in catalogCourses" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <label class="chk">
          <input v-model="editActive" type="checkbox" />
          Ativo
        </label>

        <div v-if="editRole === 'STUDENT'" class="row">
          <div class="field">
            <label>Período ativo — de</label>
            <input v-model="editActiveFrom" class="in" type="date" />
          </div>
          <div class="field">
            <label>Até</label>
            <input v-model="editActiveUntil" class="in" type="date" />
          </div>
        </div>

        <div v-if="editRole === 'COORDINATOR'" class="field">
          <label>Especialidades da coordenadora</label>
          <div class="specialty-list">
            <div v-for="sp in editCoordinatorSpecialties" :key="sp.id" class="specialty-row">
              <input v-model="sp.name" class="in" placeholder="Ex.: Ortopedia" @blur="ensureOnePrimary(editCoordinatorSpecialties)" />
              <label class="radio-main">
                <input
                  type="radio"
                  name="edit-primary-specialty"
                  :checked="sp.isPrimary"
                  @change="setPrimarySpecialty(editCoordinatorSpecialties, sp.id)"
                />
                Principal
              </label>
              <button type="button" class="mini-act" @click="removeSpecialty(editCoordinatorSpecialties, sp.id)">
                Remover
              </button>
            </div>
          </div>
          <button type="button" class="btn btn--ghost btn--inline" @click="addSpecialty(editCoordinatorSpecialties)">
            Adicionar especialidade
          </button>
          <p class="hint">Selecione uma única especialidade principal para exibição no app.</p>
        </div>

        <div class="field">
          <label>Foto de perfil</label>
          <input
            ref="editPhotoInput"
            class="in"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            @change="editPhotoFile = ($event.target as HTMLInputElement).files?.[0] ?? null"
          />
          <p class="hint">JPG, PNG ou WEBP até 8MB. Usada no painel e nas rotas do app quando autorizada.</p>
        </div>

        <button type="submit" class="btn btn--pri" :disabled="editing || !editName.trim() || !editEmail.trim()">
          <MaterialIcon name="save" size="1.1rem" />
          {{ editing ? 'Salvando…' : 'Salvar alterações' }}
        </button>
      </form>
    </section>

    <div class="filters">
      <div class="filter-card">
        <label>Buscar</label>
        <input v-model="search" class="in" placeholder="Nome ou e-mail…" @keyup.enter="execute" />
      </div>
      <div class="filter-card">
        <label>Perfil</label>
        <select
          v-model="roleFilter"
          class="in"
          @change="
            () => {
              void execute()
            }
          "
        >
          <option value="">Todos</option>
          <option value="ADMIN">Administrador</option>
          <option value="COORDINATOR">Coordenador</option>
          <option value="PROFESSOR">Professor</option>
          <option value="STUDENT">Aluno</option>
          <option value="PATIENT">Paciente</option>
        </select>
      </div>
      <div class="filter-card">
        <label>Status</label>
        <select
          v-model="activeFilter"
          class="in"
          @change="
            () => {
              void execute()
            }
          "
        >
          <option value="all">Todos</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
      </div>
      <div class="filter-card filter-card--accent">
        <div>
          <h4>Total no sistema</h4>
          <p class="big">{{ stats?.total ?? '—' }}</p>
        </div>
        <div class="icon-wrap">
          <MaterialIcon name="groups" size="1.75rem" />
        </div>
      </div>
      <div class="filter-card filter-card--accent filter-card--accent2">
        <div>
          <h4>Usuários ativos</h4>
          <p class="big">{{ stats?.active ?? '—' }}</p>
        </div>
        <div class="icon-wrap">
          <MaterialIcon name="verified_user" size="1.75rem" />
        </div>
      </div>
      <div class="filter-card">
        <label>Total no filtro</label>
        <p class="big big--sm">{{ loading ? '…' : listTotal }}</p>
        <p class="hint">Mostrando {{ rows.length }} nesta página ({{ limit }} por página).</p>
      </div>
    </div>

    <div class="table-card tonal">
      <p v-if="loading" class="muted pad">Carregando…</p>
      <UiConnectionRetry v-else-if="failed" @retry="execute" />
      <table v-else>
        <thead>
          <tr>
            <th>Nome</th>
            <th>E-mail</th>
            <th>Perfil</th>
            <th>App</th>
            <th>Curso</th>
            <th>Status</th>
            <th>Período (aluno)</th>
            <th>Último login</th>
            <th class="th-actions">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td>
              <div class="user-cell">
                <img v-if="r.photoUrl" class="avatar avatar--img" :src="r.photoUrl" alt="" />
                <span v-else class="avatar">{{ initials(r.name) }}</span>
                <span>
                  <span class="name">{{ r.name }}</span>
                  <span v-if="r.role === 'COORDINATOR' && r.primarySpecialty" class="muted small block">
                    {{ r.primarySpecialty }}
                  </span>
                </span>
              </div>
            </td>
            <td class="muted">{{ r.email }}</td>
            <td>
              <span class="tag tag--sec">{{ r.role }}</span>
            </td>
            <td class="muted">{{ r.app?.name ?? '—' }}</td>
            <td class="muted">{{ r.course?.name ?? '—' }}</td>
            <td>
              <span class="status">
                <span :class="['dot', !r.active && 'dot--off']" />
                {{ r.active ? 'Ativo' : 'Inativo' }}
              </span>
            </td>
            <td class="muted small">{{ r.role === 'STUDENT' ? `${r.activeFrom ?? '—'} → ${r.activeUntil ?? '—'}` : '—' }}</td>
            <td class="muted small">{{ fmtDateTime(r.lastLoginAt) }}</td>
            <td class="td-actions">
              <div class="ui-act-row">
                <UiIconButton v-if="isAdmin" icon="edit" label="Editar" @click="openEdit(r)" />
                <UiIconButton
                  v-if="canToggleActive && !(isCoordinator && r.role === 'ADMIN')"
                  :icon="r.active ? 'block' : 'check_circle'"
                  :label="r.active ? 'Desativar' : 'Ativar'"
                  :variant="r.active ? 'warn' : 'success'"
                  @click="toggleActive(r)"
                />
                <UiIconButton
                  v-if="isAdmin"
                  icon="delete_forever"
                  label="Excluir cadastro (log)"
                  variant="danger"
                  @click="confirmDelete(r)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <UiPager
        v-if="!loading && !failed && listTotal > 0"
        v-model:page="page"
        :limit="limit"
        :total="listTotal"
        :loading="loading"
      />
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
  margin-bottom: 2rem;
}
.title {
  margin: 0;
  font-size: 2.75rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
}
.sub {
  margin: 0.35rem 0 0;
  color: var(--uf-on-surface-variant);
  font-weight: 500;
  font-size: 0.9rem;
}
.actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.75rem 1.5rem;
  border-radius: 999px;
  font-family: var(--uf-font);
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
  border: none;
}
.btn--ghost {
  background: transparent;
  border: 1px solid rgba(191, 202, 186, 0.45);
  color: var(--uf-on-surface-variant);
}
.btn--pri {
  color: #fff;
  background: linear-gradient(90deg, var(--uf-primary), var(--uf-primary-container));
  box-shadow: 0 8px 24px rgba(13, 99, 27, 0.18);
}
.filters {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.filter-card {
  background: var(--uf-surface-container-lowest);
  padding: 1.5rem;
  border-radius: var(--uf-radius-xl);
  box-shadow: var(--uf-tonal-shadow);
}
.filter-card label {
  display: block;
  font-size: 0.625rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--uf-on-surface-variant);
  margin-bottom: 0.75rem;
}
.filter-card select {
  width: 100%;
  padding: 0.65rem 1rem;
  border: none;
  border-radius: var(--uf-radius-md);
  background: var(--uf-surface-container-low);
  font-family: var(--uf-font);
  font-size: 0.875rem;
}
.in {
  width: 100%;
  padding: 0.65rem 1rem;
  border: none;
  border-radius: var(--uf-radius-md);
  background: var(--uf-surface-container-low);
  font-family: var(--uf-font);
  font-size: 0.875rem;
  box-sizing: border-box;
}
.area {
  resize: vertical;
  min-height: 5.5rem;
}
.block {
  display: block;
}
.specialty-list {
  display: grid;
  gap: 0.5rem;
}
.specialty-row {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) auto auto;
  gap: 0.5rem;
  align-items: center;
}
.radio-main {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: var(--uf-on-surface-variant);
  white-space: nowrap;
}
.mini-act {
  border: none;
  border-radius: var(--uf-radius-md);
  padding: 0.55rem 0.7rem;
  background: var(--uf-surface-container-low);
  color: var(--uf-on-surface-variant);
  cursor: pointer;
}
.btn--inline {
  width: fit-content;
  margin-top: 0.5rem;
}
.file {
  display: none;
}
.create {
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  border-radius: var(--uf-radius-xl);
  background: var(--uf-surface-container-lowest);
}
.err {
  color: #b3261e;
  font-size: 0.85rem;
  margin: 0 0 0.75rem;
}
.create-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}
.form {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 0.75rem;
}
.field label {
  display: block;
  font-size: 0.625rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--uf-on-surface-variant);
  margin-bottom: 0.5rem;
}
.row {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 0.75rem;
}
.chk {
  grid-column: 1 / -1;
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.85rem;
  color: var(--uf-on-surface-variant);
}
.muted {
  color: var(--uf-on-surface-variant);
}
.small {
  font-size: 0.8rem;
}
.pad {
  padding: 1rem 1.5rem;
}
.hint {
  margin: 0.35rem 0 0;
  font-size: 0.65rem;
  color: var(--uf-on-surface-variant);
}
.big--sm {
  font-size: 1.5rem;
}
.filter-card--accent {
  grid-column: span 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--uf-primary-container);
  color: var(--uf-on-primary-container, #cbffc2);
}
.filter-card--accent2 {
  background: rgba(13, 99, 27, 0.12);
  color: var(--uf-on-surface);
}
@media (max-width: 768px) {
  .filter-card--accent {
    grid-column: span 1;
  }
}
.filter-card--accent h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}
.big {
  margin: 0.25rem 0 0;
  font-size: 2rem;
  font-weight: 800;
}
.icon-wrap {
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}
.tonal {
  box-shadow: var(--uf-tonal-shadow);
}
.table-card {
  background: var(--uf-surface-container-lowest);
  border-radius: var(--uf-radius-xl);
  overflow: auto;
  outline: 1px solid rgba(191, 202, 186, 0.2);
}
table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  min-width: 960px;
}
thead tr {
  background: var(--uf-surface-container-low);
  color: var(--uf-on-surface-variant);
}
th {
  padding: 1rem 1.5rem;
  font-size: 0.625rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
td {
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(191, 202, 186, 0.15);
  font-size: 0.875rem;
}
.user-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.avatar {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  background: var(--uf-secondary-container);
  color: var(--uf-on-secondary-container);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.75rem;
  flex-shrink: 0;
}
.avatar--img {
  object-fit: cover;
  padding: 0;
}
.name {
  font-weight: 700;
}
.tag {
  display: inline-block;
  padding: 0.15rem 0.45rem;
  border-radius: 0.25rem;
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
}
.tag--sec {
  background: rgba(46, 125, 50, 0.12);
  color: var(--uf-primary-container);
}
.status {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
}
.dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--uf-primary);
}
.dot--off {
  background: var(--uf-outline-variant);
}
.th-actions {
  min-width: 8rem;
  text-align: right;
}
.td-actions {
  text-align: right;
  width: 1%;
  white-space: nowrap;
}
.icon-act {
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--uf-on-surface-variant);
  padding: 0.25rem;
  border-radius: 0.25rem;
}
.icon-act:hover {
  background: rgba(0, 0, 0, 0.05);
}
.act-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  justify-content: flex-end;
}
.icon-act--danger {
  color: #b3261e;
}
.icon-act--success {
  color: #1b5e20;
}
.icon-act--warn {
  color: #b3261e;
}
</style>
