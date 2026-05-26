<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import axios from 'axios'
import client from '@/api/client'
import UiAddressMapPicker from '@/components/ui/UiAddressMapPicker.vue'
import UiAsyncPanel from '@/components/ui/UiAsyncPanel.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import { useConfirmStore } from '@/stores/confirm'
import { useToastStore } from '@/stores/toast'
import type { Paged } from '@/types/pagination'

const props = withDefaults(
  defineProps<{
    embeddedInCourse?: boolean
    courseAppId?: number
    courseScopeId?: number
  }>(),
  { embeddedInCourse: false },
)

const toast = useToastStore()
const confirm = useConfirmStore()

type AppRow = { id: number; name: string }
type CourseRow = { id: number; name: string; app?: { id: number } | null; appId?: number | null }

type LocationRow = {
  id: number
  appId: number
  name: string
  address: string
  notes: string | null
  active: boolean
  mapsUrl: string | null
  courseIds: number[]
}

function mapsUrlFromAddress(address: string) {
  const t = address.trim()
  if (!t) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t)}`
}

const formMapsPreview = computed(() => mapsUrlFromAddress(formAddress.value))

const apps = ref<AppRow[]>([])
const courses = ref<CourseRow[]>([])
const filterAppId = ref<number | ''>('')
const list = ref<LocationRow[]>([])
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const editingId = ref<number | null>(null)

const formName = ref('')
const formAddress = ref('')
const formNotes = ref('')
const formActive = ref(true)
const formCourseIds = ref<number[]>([])

const coursesForApp = computed(() => {
  const aid = filterAppId.value
  if (aid === '') return []
  return courses.value.filter((c) => (c.app?.id ?? c.appId) === aid)
})

function courseSummary(row: LocationRow) {
  if (!row.courseIds.length) return '—'
  const names = row.courseIds
    .map((id) => courses.value.find((c) => c.id === id)?.name)
    .filter((n): n is string => Boolean(n))
  if (!names.length) return `${row.courseIds.length} curso(s)`
  if (names.length <= 2) return names.join(', ')
  return `${names.length} cursos`
}

const embeddedCourseIds = computed(() => {
  if (!props.embeddedInCourse || !Number.isFinite(props.courseScopeId ?? NaN)) return []
  const cid = Number(props.courseScopeId)
  return [cid]
})

function apiError(err: unknown, fallback: string) {
  if (!axios.isAxiosError(err)) return fallback
  const m = err.response?.data as { message?: string | string[] } | undefined
  const raw = m?.message
  if (Array.isArray(raw)) return raw.join(' ')
  if (typeof raw === 'string' && raw.trim()) return raw
  return fallback
}

async function loadApps() {
  if (props.embeddedInCourse && props.courseAppId != null) {
    filterAppId.value = Number(props.courseAppId)
    return
  }
  const { data } = await client.get<Paged<AppRow>>('/apps', { params: { page: 1, limit: 100 } })
  apps.value = data.data
  if (filterAppId.value === '' && apps.value.length) {
    filterAppId.value = apps.value[0]!.id
  }
}

async function loadCourses() {
  const { data } = await client.get<Paged<CourseRow>>('/courses', { params: { page: 1, limit: 200 } })
  courses.value = data.data
}

async function load() {
  if (filterAppId.value === '') return
  loading.value = true
  try {
    const { data } = await client.get<LocationRow[]>('/care-locations', {
      params: { appId: filterAppId.value },
    })
    list.value = data
  } catch (e) {
    toast.error(apiError(e, 'Não foi possível carregar os locais.'))
  } finally {
    loading.value = false
  }
}

function openNew() {
  editingId.value = null
  formName.value = ''
  formAddress.value = ''
  formNotes.value = ''
  formActive.value = true
  formCourseIds.value = props.embeddedInCourse ? [...embeddedCourseIds.value] : []
  showModal.value = true
}

function openEdit(row: LocationRow) {
  editingId.value = row.id
  formName.value = row.name
  formAddress.value = row.address
  formNotes.value = row.notes ?? ''
  formActive.value = Boolean(row.active)
  formCourseIds.value = [...row.courseIds]
  showModal.value = true
}

function toggleCourse(id: number) {
  const set = new Set(formCourseIds.value)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  formCourseIds.value = [...set]
}

async function submit() {
  if (filterAppId.value === '') return
  const name = formName.value.trim()
  const address = formAddress.value.trim()
  if (name.length < 2 || address.length < 5) {
    toast.error('Informe nome e endereço válidos.')
    return
  }

  saving.value = true
  try {
    if (editingId.value == null) {
      await client.post('/care-locations', {
        appId: filterAppId.value,
        name,
        address,
        notes: formNotes.value.trim() || null,
        active: !!formActive.value,
        courseIds: formCourseIds.value,
      })
      toast.success('Local cadastrado.')
    } else {
      await client.patch(`/care-locations/${editingId.value}`, {
        name,
        address,
        notes: formNotes.value.trim() || null,
        active: !!formActive.value,
        courseIds: formCourseIds.value,
      })
      toast.success('Local atualizado.')
    }
    showModal.value = false
    await load()
  } catch (e) {
    toast.error(apiError(e, 'Não foi possível salvar. Apenas administradores podem gerenciar locais.'))
  } finally {
    saving.value = false
  }
}

async function confirmDelete(row: LocationRow) {
  const ok = await confirm.confirm({
    title: 'Excluir local',
    message: `Excluir "${row.name}"? Agendamentos já vinculados podem perder a referência ao local.`,
    confirmText: 'Excluir',
    cancelText: 'Cancelar',
    tone: 'danger',
  })
  if (!ok) return
  try {
    await client.delete(`/care-locations/${row.id}`)
    toast.success('Local excluído.')
    await load()
  } catch (e) {
    toast.error(apiError(e, 'Não foi possível excluir o local.'))
  }
}

watch(filterAppId, () => void load())

onMounted(async () => {
  await Promise.all([loadApps(), loadCourses()])
  await load()
})
</script>

<template>
  <section class="panel">
    <header class="head">
      <div>
        <h2 class="h2">Locais de atendimento</h2>
        <p class="muted">
          Cadastro exclusivo do administrador. Vincule cada local aos cursos que podem usá-lo nas agendas presenciais
          {{ embeddedInCourse ? 'deste curso' : 'do aplicativo' }}.
        </p>
      </div>
      <button type="button" class="btn btn--pri" :disabled="filterAppId === ''" @click="openNew">
        Novo local
      </button>
    </header>

    <div v-if="!embeddedInCourse" class="field-row">
      <label class="mlbl">Aplicativo</label>
      <select v-model="filterAppId" class="minp minp--md">
        <option value="">Selecione…</option>
        <option v-for="a in apps" :key="a.id" :value="a.id">{{ a.name }}</option>
      </select>
    </div>

    <UiAsyncPanel :loading="loading" label="Carregando locais…">
      <p v-if="!loading && !list.length" class="muted pad">Nenhum local neste app.</p>

      <div v-else-if="list.length" class="loc-list">
        <div class="loc-table-wrap" aria-label="Lista de locais em tabela">
          <table class="loc-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Endereço</th>
                <th>Cursos</th>
                <th>Status</th>
                <th class="loc-table__acts-h">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in list" :key="row.id">
                <td class="loc-table__name">{{ row.name }}</td>
                <td class="loc-table__addr">{{ row.address }}</td>
                <td>{{ courseSummary(row) }}</td>
                <td>
                  <span class="status-pill" :class="row.active ? 'status-pill--on' : 'status-pill--off'">
                    {{ row.active ? 'Ativo' : 'Inativo' }}
                  </span>
                </td>
                <td class="loc-table__acts">
                  <div class="ui-act-row">
                    <UiIconButton
                      v-if="row.mapsUrl"
                      icon="map"
                      label="Abrir no Google Maps"
                      variant="primary"
                      :href="row.mapsUrl"
                    />
                    <UiIconButton icon="edit" label="Editar" @click="openEdit(row)" />
                    <UiIconButton icon="delete" label="Excluir" variant="danger" @click="confirmDelete(row)" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <ul class="loc-cards" aria-label="Lista de locais em cartões">
          <li v-for="row in list" :key="`card-${row.id}`" class="loc-card">
            <div class="loc-card__top">
              <strong class="loc-card__title">{{ row.name }}</strong>
              <span class="status-pill" :class="row.active ? 'status-pill--on' : 'status-pill--off'">
                {{ row.active ? 'Ativo' : 'Inativo' }}
              </span>
            </div>
            <div class="loc-card__row">
              <span class="loc-card__lbl">Endereço</span>
              <span>{{ row.address }}</span>
            </div>
            <div class="loc-card__row">
              <span class="loc-card__lbl">Cursos</span>
              <span>{{ courseSummary(row) }}</span>
            </div>
            <div class="loc-card__acts ui-act-row">
              <UiIconButton
                v-if="row.mapsUrl"
                icon="map"
                label="Abrir no Google Maps"
                variant="primary"
                :href="row.mapsUrl"
              />
              <UiIconButton icon="edit" label="Editar" @click="openEdit(row)" />
              <UiIconButton icon="delete" label="Excluir" variant="danger" @click="confirmDelete(row)" />
            </div>
          </li>
        </ul>
      </div>
    </UiAsyncPanel>

    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <div class="modal modal--wide">
        <h3 class="mh">{{ editingId == null ? 'Novo local' : 'Editar local' }}</h3>
        <form class="mform" @submit.prevent="submit">
          <label class="mlbl">Nome</label>
          <input v-model="formName" class="minp" required />
          <UiAddressMapPicker :key="editingId ?? 'new'" v-model="formAddress" />
          <label class="mlbl">Observações</label>
          <textarea v-model="formNotes" class="minp minp--area" rows="2" />
          <label class="chk"><input v-model="formActive" type="checkbox" /> Ativo</label>
          <div v-if="coursesForApp.length" class="courses-pick">
            <span class="mlbl">Cursos que usam este local</span>
            <label v-for="c in coursesForApp" :key="c.id" class="chk">
              <input
                type="checkbox"
                :checked="formCourseIds.includes(c.id)"
                @change="toggleCourse(c.id)"
              />
              {{ c.name }}
            </label>
          </div>
          <div class="mactions">
            <button type="button" class="mbtn mbtn--ghost" @click="showModal = false">Cancelar</button>
            <button type="submit" class="mbtn mbtn--pri" :disabled="saving">
              {{ saving ? 'Salvando…' : 'Salvar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}
.field-row {
  margin-bottom: 1rem;
  max-width: 100%;
}
@media (min-width: 480px) {
  .field-row {
    max-width: 320px;
  }
}
.loc-list {
  width: 100%;
  min-width: 0;
}
.loc-table-wrap {
  display: none;
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border: 1px solid rgba(191, 202, 186, 0.35);
  border-radius: var(--uf-radius-md);
}
.loc-table {
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;
  font-size: 0.88rem;
}
.loc-table th,
.loc-table td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid rgba(191, 202, 186, 0.35);
  text-align: left;
  vertical-align: top;
}
.loc-table th {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--uf-on-surface-variant);
  background: rgba(13, 99, 27, 0.04);
  white-space: nowrap;
}
.loc-table__name {
  font-weight: 700;
  min-width: 8rem;
}
.loc-table__addr {
  word-break: break-word;
  max-width: 22rem;
}
.loc-table__acts-h,
.loc-table__acts {
  text-align: right;
  white-space: nowrap;
}
.loc-table__acts {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.35rem;
}
.loc-cards {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.loc-card {
  border: 1px solid rgba(191, 202, 186, 0.45);
  border-radius: var(--uf-radius-md);
  padding: 0.85rem 1rem;
  background: var(--uf-surface);
}
.loc-card__top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.65rem;
}
.loc-card__title {
  font-size: 1rem;
}
.loc-card__row {
  display: grid;
  grid-template-columns: minmax(4.5rem, 5.5rem) 1fr;
  gap: 0.35rem 0.75rem;
  margin-bottom: 0.5rem;
  font-size: 0.88rem;
}
.loc-card__lbl {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--uf-on-surface-variant);
}
.loc-card__acts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.65rem;
  padding-top: 0.65rem;
  border-top: 1px solid rgba(191, 202, 186, 0.3);
}
@media (min-width: 900px) {
  .loc-table-wrap {
    display: block;
  }
  .loc-cards {
    display: none;
  }
}
.btn--sm {
  font-size: 0.8rem;
  padding: 0.35rem 0.65rem;
}
.btn--danger {
  color: #b3261e;
}
.status-pill {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}
.status-pill--on {
  background: rgba(13, 99, 27, 0.12);
  color: var(--uf-primary);
}
.status-pill--off {
  background: rgba(179, 38, 30, 0.1);
  color: #b3261e;
}
.mlbl {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--uf-on-surface-variant);
}
.minp {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(191, 202, 186, 0.55);
  border-radius: var(--uf-radius-md);
  padding: 0.45rem 0.6rem;
  font-family: var(--uf-font);
}
.minp--md {
  max-width: 320px;
}
.minp--area {
  resize: vertical;
}
.courses-pick {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  max-height: 12rem;
  overflow-y: auto;
}
.chk {
  font-size: 0.85rem;
  display: flex;
  gap: 0.4rem;
  align-items: center;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.modal {
  background: var(--uf-surface);
  border-radius: var(--uf-radius-lg);
  padding: 1.25rem;
  width: min(520px, 94vw);
  max-height: min(92vh, 900px);
  overflow-y: auto;
}
.modal--wide {
  width: min(720px, 96vw);
}
.mform {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.mactions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.mbtn {
  border: none;
  border-radius: 999px;
  padding: 0.5rem 1rem;
  font-weight: 700;
  cursor: pointer;
}
.mbtn--ghost {
  background: transparent;
}
.mbtn--pri {
  background: var(--uf-primary);
  color: #fff;
}
</style>
