<script setup lang="ts">
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import UiAsyncPanel from '@/components/ui/UiAsyncPanel.vue'
import client from '@/api/client'
import { ref, watch, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useApiRequest } from '@/composables/useApiRequest'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'

const router  = useRouter()
const toast   = useToastStore()
const confirm = useConfirmStore()

// ── Tipos ─────────────────────────────────────────────────────────────────
type Professor = {
  id: number; name: string; email: string
  registroFuncional: string | null; cursoBase: string | null; diasSemana: string[] | null
}
type Availability = {
  id: number; professorId: number; dataEvento: string
  professor: { id: number; name: string }
}

const DIAS = [
  { value: '1', label: 'Seg' }, { value: '2', label: 'Ter' }, { value: '3', label: 'Qua' },
  { value: '4', label: 'Qui' }, { value: '5', label: 'Sex' },
]
function diasLabel(dias: string[] | null) {
  if (!dias?.length) return 'Todos os dias'
  return dias.sort().map((d) => DIAS.find((x) => x.value === d)?.label ?? d).join(', ')
}

// ── Datas do evento ───────────────────────────────────────────────────────
const eventDates = ref<string[]>([])
async function loadEventDates() {
  try {
    const { data } = await client.get('/evidence-journey/config')
    eventDates.value = (data.datasEvento ?? []).slice().sort()
  } catch { /* silencioso */ }
}
onMounted(loadEventDates)

// ── Professores — lista completa ──────────────────────────────────────────
const { data: professors, loading: loadingProfs, failed: failedProfs, execute: reloadProfs } =
  useApiRequest<Professor[]>(async () => {
    const { data } = await client.get('/evidence-journey/professors')
    return data
  })
reloadProfs()

// ── Filtro em tempo real da tabela de professores ─────────────────────────
const profSearch = ref('')
const cursoFilter = ref('')
const cursosDistintos = computed(() => {
  const set = new Set((professors.value ?? []).map((p) => p.cursoBase ?? '').filter(Boolean))
  return [...set].sort()
})
const filteredProfessors = computed(() => {
  const q = profSearch.value.trim().toLowerCase()
  return (professors.value ?? []).filter((p) => {
    const matchSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      (p.registroFuncional ?? '').toLowerCase().includes(q) ||
      (p.cursoBase ?? '').toLowerCase().includes(q)
    const matchCurso = !cursoFilter.value || p.cursoBase === cursoFilter.value
    return matchSearch && matchCurso
  })
})

// ── Modal editar dias da semana ───────────────────────────────────────────
const editingSchedule = ref<{ id: number; dias: string[] } | null>(null)
const savingSchedule  = ref(false)

function openSchedule(p: Professor) {
  editingSchedule.value = { id: p.id, dias: [...(p.diasSemana ?? [])] }
}
function toggleDia(dia: string) {
  if (!editingSchedule.value) return
  const idx = editingSchedule.value.dias.indexOf(dia)
  if (idx >= 0) editingSchedule.value.dias.splice(idx, 1)
  else editingSchedule.value.dias.push(dia)
}
async function saveSchedule() {
  if (!editingSchedule.value) return
  savingSchedule.value = true
  try {
    await client.patch(`/evidence-journey/professors/${editingSchedule.value.id}/schedule`, {
      diasSemana: editingSchedule.value.dias,
    })
    toast.success('Disponibilidade semanal salva.')
    editingSchedule.value = null
    reloadProfs()
  } catch { toast.error('Erro ao salvar.') }
  finally { savingSchedule.value = false }
}

// ── Disponibilidades ──────────────────────────────────────────────────────
const filterDate     = ref('')
const newProfessorId = ref<number | ''>('')
const newDataEvento  = ref('')
const adding         = ref(false)
const autoRegistering = ref(false)

// Professores elegíveis para a data selecionada (não cadastrados ainda)
const eligible = ref<Professor[]>([])
const loadingEligible = ref(false)

async function loadEligible() {
  if (!newDataEvento.value) { eligible.value = []; newProfessorId.value = ''; return }
  loadingEligible.value = true
  try {
    const { data } = await client.get<Professor[]>(
      `/evidence-journey/professors/eligible?dataEvento=${newDataEvento.value}`
    )
    eligible.value = data
    newProfessorId.value = ''
  } catch { eligible.value = professors.value ?? [] }
  finally { loadingEligible.value = false }
}

watch(newDataEvento, loadEligible)

const { data: availabilities, loading: loadingAvail, failed: failedAvail, execute: reloadAvail } =
  useApiRequest<Availability[]>(async () => {
    const params = filterDate.value ? `?dataEvento=${filterDate.value}` : ''
    const { data } = await client.get(`/evidence-journey/professors/availabilities${params}`)
    return data
  })
watch(filterDate, reloadAvail, { immediate: true })

// Aviso de dia da semana
const selectedDayOfWeek = computed(() => {
  if (!newDataEvento.value) return null
  const jsDay = new Date(newDataEvento.value + 'T12:00:00').getDay()
  if (jsDay === 0 || jsDay === 6) return null
  return String(jsDay)
})
const selectedProfessor = computed(() =>
  eligible.value.find((p) => p.id === Number(newProfessorId.value)) ?? null,
)
const availabilityWarning = computed(() => {
  const prof = selectedProfessor.value
  const day  = selectedDayOfWeek.value
  if (!prof || !day) return null
  if (!prof.diasSemana?.length) return null
  if (!prof.diasSemana.includes(day)) {
    const dayLabel = DIAS.find((d) => d.value === day)?.label ?? day
    return `⚠️ ${prof.name} não tem ${dayLabel} no cadastro semanal.`
  }
  return null
})

async function addAvailability() {
  if (!newProfessorId.value || !newDataEvento.value) {
    toast.error('Selecione professor e data.')
    return
  }
  if (availabilityWarning.value) {
    const ok = await confirm.confirm({ message: `${availabilityWarning.value}\n\nDeseja adicionar mesmo assim?`, tone: 'danger' })
    if (!ok) return
  }
  adding.value = true
  try {
    await client.post('/evidence-journey/professors/availabilities', {
      professorId: Number(newProfessorId.value),
      dataEvento: newDataEvento.value,
    })
    toast.success('Disponibilidade adicionada.')
    newProfessorId.value = ''
    reloadAvail()
    loadEligible()
  } catch (e: any) {
    toast.error(e?.response?.data?.message ?? 'Erro ao adicionar disponibilidade.')
  } finally { adding.value = false }
}

async function autoRegister() {
  if (!newDataEvento.value) { toast.error('Selecione uma data.'); return }
  const formattedDate = new Date(newDataEvento.value + 'T00:00:00').toLocaleDateString('pt-BR')
  const ok = await confirm.confirm({
    message: `Registrar automaticamente todos os ${eligible.value.length} professor(es) disponível(is) para ${formattedDate}?`,
  })
  if (!ok) return
  autoRegistering.value = true
  try {
    const { data } = await client.post('/evidence-journey/professors/availabilities/auto', {
      dataEvento: newDataEvento.value,
    })
    toast.success(`${data.registered} professor(es) registrado(s) automaticamente.`)
    reloadAvail()
    loadEligible()
  } catch (e: any) {
    toast.error(e?.response?.data?.message ?? 'Erro ao registrar automaticamente.')
  } finally { autoRegistering.value = false }
}

async function removeAvailability(id: number) {
  const ok = await confirm.confirm({ message: 'Remover disponibilidade deste professor?', tone: 'danger' })
  if (!ok) return
  try {
    await client.delete(`/evidence-journey/professors/availabilities/${id}`)
    toast.success('Disponibilidade removida.')
    reloadAvail()
    loadEligible()
  } catch { toast.error('Erro ao remover disponibilidade.') }
}
</script>

<template>
  <div class="profs-view">
    <button class="btn-back" @click="router.push({ name: 'jornada-dashboard' })">← Voltar à Jornada</button>
    <h2 class="profs-view__title">Professores e Disponibilidades</h2>

    <div class="profs-view__grid">
      <!-- ── Lista de professores ─────────────────────────────────────── -->
      <section class="card">
        <h3 class="card__title">Professores cadastrados</h3>

        <!-- Filtro em tempo real -->
        <div class="filter-bar">
          <input
            v-model="profSearch"
            type="text"
            class="input-field filter-search"
            placeholder="🔍  Buscar por nome ou reg. funcional…"
          />
          <select v-model="cursoFilter" class="select-field filter-curso">
            <option value="">Todos os cursos</option>
            <option v-for="c in cursosDistintos" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>

        <UiConnectionRetry v-if="failedProfs" @retry="reloadProfs" />
        <UiAsyncPanel :loading="loadingProfs">
          <div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr><th>Nome</th><th>Reg. Funcional</th><th>Curso Base</th><th>Dias Semana</th><th></th></tr>
              </thead>
              <tbody>
                <tr v-for="p in filteredProfessors" :key="p.id">
                  <td>{{ p.name }}</td>
                  <td>{{ p.registroFuncional ?? '—' }}</td>
                  <td>{{ p.cursoBase ?? '—' }}</td>
                  <td><span class="dias-pill">{{ diasLabel(p.diasSemana) }}</span></td>
                  <td><button class="btn-link" @click="openSchedule(p)">Editar dias</button></td>
                </tr>
                <tr v-if="!loadingProfs && !filteredProfessors.length">
                  <td colspan="5" class="empty-row">
                    {{ profSearch || cursoFilter ? 'Nenhum professor encontrado com estes filtros.' : 'Nenhum professor cadastrado.' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="count-hint" v-if="professors?.length">
            Exibindo {{ filteredProfessors.length }} de {{ professors.length }} professores
          </p>
        </UiAsyncPanel>

        <!-- Modal editar dias da semana -->
        <div v-if="editingSchedule" class="modal-overlay" @click.self="editingSchedule = null">
          <div class="modal">
            <h3 class="modal__title">Dias de disponibilidade semanal</h3>
            <p class="modal__desc">Selecione os dias em que este professor está presente na faculdade.</p>
            <div class="dias-check">
              <label v-for="d in DIAS" :key="d.value" class="dia-label">
                <input type="checkbox" :checked="editingSchedule.dias.includes(d.value)" @change="toggleDia(d.value)" />
                {{ d.label }}
              </label>
            </div>
            <div class="modal__actions">
              <button class="btn btn--primary" :disabled="savingSchedule" @click="saveSchedule">
                {{ savingSchedule ? 'Salvando…' : 'Salvar' }}
              </button>
              <button class="btn" @click="editingSchedule = null">Cancelar</button>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Disponibilidades por data ───────────────────────────────── -->
      <section class="card">
        <h3 class="card__title">Disponibilidades por data</h3>

        <!-- Seletor de data do evento -->
        <div class="date-selector">
          <label class="field-label">Data do evento</label>
          <select v-if="eventDates.length" v-model="newDataEvento" class="select-field">
            <option value="">Selecionar data…</option>
            <option v-for="d in eventDates" :key="d" :value="d">
              {{ new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }) }}
            </option>
          </select>
          <input v-else v-model="newDataEvento" type="date" class="input-field" />
        </div>

        <!-- Formulário de adição manual -->
        <template v-if="newDataEvento">
          <div class="avail-form">
            <div class="eligible-info" v-if="!loadingEligible">
              <span v-if="eligible.length" class="eligible-badge">
                {{ eligible.length }} professor(es) disponível(is) para esta data
              </span>
              <span v-else class="eligible-badge eligible-badge--empty">
                Todos os professores já foram cadastrados para esta data
              </span>
            </div>

            <div class="add-row">
              <select v-model="newProfessorId" class="select-field" :disabled="loadingEligible">
                <option value="">{{ loadingEligible ? 'Carregando…' : 'Selecionar professor…' }}</option>
                <option v-for="p in eligible" :key="p.id" :value="p.id">
                  {{ p.name }} {{ p.cursoBase ? `(${p.cursoBase})` : '' }}
                </option>
              </select>
              <button class="btn btn--primary" :disabled="adding || !newProfessorId" @click="addAvailability">
                {{ adding ? 'Adicionando…' : 'Adicionar' }}
              </button>
            </div>

            <div v-if="availabilityWarning" class="avail-warning">{{ availabilityWarning }}</div>

            <!-- Botão de cadastro automático -->
            <button
              v-if="eligible.length > 0"
              class="btn btn--auto"
              :disabled="autoRegistering"
              @click="autoRegister"
            >
              {{ autoRegistering ? 'Registrando…' : `⚡ Registrar todos (${eligible.length}) automaticamente` }}
            </button>
          </div>
        </template>

        <!-- Filtro da tabela de disponibilidades -->
        <div class="avail-filter">
          <label class="field-label">Filtrar tabela por data:</label>
          <select v-if="eventDates.length" v-model="filterDate" class="select-field select-sm">
            <option value="">Todas as datas</option>
            <option v-for="d in eventDates" :key="d" :value="d">
              {{ new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) }}
            </option>
          </select>
          <input v-else v-model="filterDate" type="date" class="input-field input-field--sm" />
          <button v-if="filterDate" class="btn-link" @click="filterDate = ''">Limpar</button>
        </div>

        <UiConnectionRetry v-if="failedAvail" @retry="reloadAvail" />
        <UiAsyncPanel :loading="loadingAvail">
          <table class="data-table">
            <thead><tr><th>Professor</th><th>Curso Base</th><th>Data</th><th></th></tr></thead>
            <tbody>
              <tr v-for="a in availabilities ?? []" :key="a.id">
                <td>{{ a.professor.name }}</td>
                <td>{{ (professors ?? []).find(p => p.id === a.professorId)?.cursoBase ?? '—' }}</td>
                <td>{{ new Date(a.dataEvento + 'T00:00:00').toLocaleDateString('pt-BR') }}</td>
                <td><button class="btn-icon-sm" @click="removeAvailability(a.id)" title="Remover">🗑</button></td>
              </tr>
              <tr v-if="!loadingAvail && !availabilities?.length">
                <td colspan="4" class="empty-row">Nenhuma disponibilidade cadastrada.</td>
              </tr>
            </tbody>
          </table>
        </UiAsyncPanel>
      </section>
    </div>
  </div>
</template>

<style scoped>
.btn-back { background: none; border: none; cursor: pointer; color: var(--color-primary, #0d631b); font-size: .85rem; font-weight: 600; padding: 0; margin-bottom: 1rem; display: inline-block; }
.btn-back:hover { text-decoration: underline; }
.profs-view { padding: 1.5rem; }
.profs-view__title { font-size: 1.4rem; font-weight: 700; margin: 0 0 1.25rem; }
.profs-view__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
@media (max-width: 900px) { .profs-view__grid { grid-template-columns: 1fr; } }
.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 1.25rem; }
.card__title { font-size: 1rem; font-weight: 600; margin: 0 0 .75rem; }

/* Filtro professores */
.filter-bar { display: flex; gap: .5rem; margin-bottom: .75rem; flex-wrap: wrap; }
.filter-search { flex: 1; min-width: 200px; }
.filter-curso  { min-width: 150px; }
.table-scroll  { overflow-x: auto; }
.count-hint    { font-size: .78rem; color: #9ca3af; margin: .4rem 0 0; }
.dias-pill     { background: #f0fdf4; color: #166534; padding: .15rem .55rem; border-radius: 8px; font-size: .78rem; font-weight: 600; white-space: nowrap; }

/* Disponibilidades */
.date-selector { margin-bottom: .75rem; }
.field-label   { font-size: .78rem; font-weight: 600; color: #6b7280; text-transform: uppercase; display: block; margin-bottom: .3rem; }
.avail-form    { margin-bottom: 1rem; }
.eligible-info { margin-bottom: .5rem; }
.eligible-badge { font-size: .82rem; font-weight: 600; background: #dcfce7; color: #166534; padding: .3rem .7rem; border-radius: 8px; }
.eligible-badge--empty { background: #f3f4f6; color: #6b7280; }
.add-row  { display: flex; gap: .5rem; flex-wrap: wrap; margin-bottom: .5rem; }
.avail-warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: .5rem .75rem; font-size: .82rem; color: #92400e; margin-bottom: .5rem; }
.btn--auto { width: 100%; background: #f0fdf4; color: #166534; border: 1.5px dashed #86efac; border-radius: 8px; padding: .55rem; font-size: .87rem; font-weight: 700; cursor: pointer; margin-top: .3rem; }
.btn--auto:hover { background: #dcfce7; }
.btn--auto:disabled { opacity: .6; cursor: not-allowed; }
.avail-filter { display: flex; align-items: center; gap: .5rem; margin-bottom: .75rem; font-size: .85rem; flex-wrap: wrap; }
.select-sm { padding: .3rem .6rem; max-width: 160px; }

/* Compartilhados */
.input-field { padding: .45rem .75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: .9rem; }
.input-field--sm { padding: .3rem .6rem; }
.select-field { padding: .45rem .75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: .9rem; flex: 1; min-width: 140px; }
.btn { padding: .4rem .9rem; border: none; border-radius: 6px; cursor: pointer; font-size: .85rem; font-weight: 600; }
.btn--primary { background: var(--color-primary, #0d631b); color: #fff; }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.btn-link { background: none; border: none; cursor: pointer; color: var(--color-primary, #0d631b); font-size: .85rem; text-decoration: underline; }
.btn-icon-sm { background: none; border: none; cursor: pointer; font-size: 1rem; }
.data-table { width: 100%; border-collapse: collapse; font-size: .87rem; }
.data-table th, .data-table td { padding: .5rem .6rem; border-bottom: 1px solid #f3f4f6; text-align: left; }
.data-table th { font-weight: 600; font-size: .78rem; text-transform: uppercase; color: #6b7280; }
.empty-row { text-align: center; color: #9ca3af; padding: 1.5rem; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: #fff; border-radius: 10px; padding: 1.5rem; width: 380px; max-width: 95vw; box-shadow: 0 8px 32px rgba(0,0,0,.15); }
.modal__title { font-size: 1.1rem; font-weight: 700; margin: 0 0 .5rem; }
.modal__desc  { font-size: .85rem; color: #6b7280; margin: 0 0 1rem; }
.modal__actions { display: flex; gap: .5rem; margin-top: 1.25rem; }
.dias-check { display: flex; gap: .75rem; flex-wrap: wrap; }
.dia-label  { display: flex; align-items: center; gap: .35rem; font-size: .9rem; cursor: pointer; }
</style>
