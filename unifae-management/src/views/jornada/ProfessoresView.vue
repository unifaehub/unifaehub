<script setup lang="ts">
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import UiAsyncPanel from '@/components/ui/UiAsyncPanel.vue'
import client from '@/api/client'
import { ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useApiRequest } from '@/composables/useApiRequest'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'

const router = useRouter()

type Professor = {
  id: number
  name: string
  email: string
  registroFuncional: string | null
  cursoBase: string | null
  diasSemana: string[] | null
}

const DIAS = [
  { value: '1', label: 'Seg' },
  { value: '2', label: 'Ter' },
  { value: '3', label: 'Qua' },
  { value: '4', label: 'Qui' },
  { value: '5', label: 'Sex' },
]

const editingSchedule = ref<{ id: number; dias: string[] } | null>(null)
const savingSchedule = ref(false)

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
  } catch {
    toast.error('Erro ao salvar.')
  } finally {
    savingSchedule.value = false
  }
}

function diasLabel(dias: string[] | null) {
  if (!dias?.length) return '—'
  return dias.sort().map((d) => DIAS.find((x) => x.value === d)?.label ?? d).join(', ')
}

type Availability = {
  id: number
  professorId: number
  dataEvento: string
  professor: { id: number; name: string }
}

const toast = useToastStore()
const confirm = useConfirmStore()

const filterDate = ref('')
const newProfessorId = ref<number | ''>('')
const newDataEvento = ref('')
const adding = ref(false)

const { data: professors, loading: loadingProfs, failed: failedProfs, execute: reloadProfs } = useApiRequest<Professor[]>(async () => {
  const { data } = await client.get('/evidence-journey/professors')
  return data
})

const { data: availabilities, loading: loadingAvail, failed: failedAvail, execute: reloadAvail } = useApiRequest<Availability[]>(async () => {
  const params = filterDate.value ? `?dataEvento=${filterDate.value}` : ''
  const { data } = await client.get(`/evidence-journey/professors/availabilities${params}`)
  return data
})

reloadProfs()
watch(filterDate, reloadAvail, { immediate: true })

// Dia da semana da data selecionada (1=Seg…5=Sex, 0=Dom, 6=Sab)
const selectedDayOfWeek = computed(() => {
  if (!newDataEvento.value) return null
  const d = new Date(newDataEvento.value + 'T12:00:00')
  const jsDay = d.getDay() // 0=Dom, 1=Seg…6=Sab
  // converter para 1=Seg…5=Sex (sábado/domingo retornam null)
  if (jsDay === 0 || jsDay === 6) return null
  return String(jsDay)
})

// Professor selecionado
const selectedProfessor = computed(() =>
  (professors.value ?? []).find((p) => p.id === Number(newProfessorId.value)) ?? null,
)

// Aviso: professor não tem disponibilidade no dia da semana selecionado
const availabilityWarning = computed(() => {
  const prof = selectedProfessor.value
  const day  = selectedDayOfWeek.value
  if (!prof || !day || !newDataEvento.value) return null
  if (!prof.diasSemana?.length) return null // sem restrição cadastrada
  if (!prof.diasSemana.includes(day)) {
    const dayLabel = DIAS.find((d) => d.value === day)?.label ?? day
    return `⚠️ ${prof.name} não está disponível às ${dayLabel}s (dias cadastrados: ${diasLabel(prof.diasSemana)}).`
  }
  return null
})

async function addAvailability() {
  if (!newProfessorId.value || !newDataEvento.value) {
    toast.error('Selecione professor e data.')
    return
  }
  // Bloquear se dia da semana não está nos dias cadastrados
  if (availabilityWarning.value) {
    const ok = await confirm.confirm({
      message: `${availabilityWarning.value}\n\nDeseja adicionar mesmo assim?`,
      tone: 'danger',
    })
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
    newDataEvento.value = ''
    reloadAvail()
  } catch (e: any) {
    const msg = e?.response?.data?.message ?? 'Erro ao adicionar disponibilidade.'
    toast.error(msg)
  } finally {
    adding.value = false
  }
}

async function removeAvailability(id: number) {
  const ok = await confirm.confirm({ message: 'Remover disponibilidade deste professor?', tone: 'danger' })
  if (!ok) return
  try {
    await client.delete(`/evidence-journey/professors/availabilities/${id}`)
    toast.success('Disponibilidade removida.')
    reloadAvail()
  } catch {
    toast.error('Erro ao remover disponibilidade.')
  }
}
</script>

<template>
  <div class="profs-view">
    <button class="btn-back" @click="router.push({ name: 'jornada-dashboard' })">← Voltar à Jornada</button>
    <h2 class="profs-view__title">Professores e Disponibilidades</h2>

    <div class="profs-view__grid">
      <!-- Lista de professores -->
      <section class="card">
        <h3 class="card__title">Professores cadastrados</h3>
        <UiConnectionRetry v-if="failedProfs" @retry="reloadProfs" />
        <UiAsyncPanel :loading="loadingProfs">
          <table class="data-table">
            <thead>
              <tr><th>Nome</th><th>E-mail</th><th>Reg. Funcional</th><th>Curso Base</th><th>Dias Semana</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-for="p in professors ?? []" :key="p.id">
                <td>{{ p.name }}</td>
                <td>{{ p.email }}</td>
                <td>{{ p.registroFuncional ?? '—' }}</td>
                <td>{{ p.cursoBase ?? '—' }}</td>
                <td>{{ diasLabel(p.diasSemana) }}</td>
                <td><button class="btn-link" @click="openSchedule(p)">Editar dias</button></td>
              </tr>
              <tr v-if="!loadingProfs && !professors?.length">
                <td colspan="6" class="empty-row">Nenhum professor encontrado.</td>
              </tr>
            </tbody>
          </table>
        </UiAsyncPanel>

        <!-- Modal editar dias da semana -->
        <div v-if="editingSchedule" class="modal-overlay" @click.self="editingSchedule = null">
          <div class="modal">
            <h3 class="modal__title">Dias de disponibilidade semanal</h3>
            <p class="modal__desc">Selecione os dias em que este professor está presente na faculdade.</p>
            <div class="dias-check">
              <label v-for="d in DIAS" :key="d.value" class="dia-label">
                <input
                  type="checkbox"
                  :checked="editingSchedule.dias.includes(d.value)"
                  @change="toggleDia(d.value)"
                />
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

      <!-- Disponibilidades -->
      <section class="card">
        <h3 class="card__title">Disponibilidades por data</h3>

        <div class="avail-form">
          <select v-model="newProfessorId" class="select-field">
            <option value="">Selecionar professor…</option>
            <option v-for="p in professors ?? []" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
          <input v-model="newDataEvento" type="date" class="input-field" />
          <button class="btn btn--primary" :disabled="adding" @click="addAvailability">
            {{ adding ? 'Adicionando…' : 'Adicionar' }}
          </button>
        </div>
        <div v-if="availabilityWarning" class="avail-warning">{{ availabilityWarning }}</div>

        <div class="avail-filter">
          <label>Filtrar por data:</label>
          <input v-model="filterDate" type="date" class="input-field input-field--sm" />
          <button v-if="filterDate" class="btn-link" @click="filterDate = ''">Limpar</button>
        </div>

        <UiConnectionRetry v-if="failedAvail" @retry="reloadAvail" />
        <UiAsyncPanel :loading="loadingAvail">
          <table class="data-table">
            <thead><tr><th>Professor</th><th>Data</th><th></th></tr></thead>
            <tbody>
              <tr v-for="a in availabilities ?? []" :key="a.id">
                <td>{{ a.professor.name }}</td>
                <td>{{ new Date(a.dataEvento + 'T00:00:00').toLocaleDateString('pt-BR') }}</td>
                <td><button class="btn-icon-sm" @click="removeAvailability(a.id)">🗑</button></td>
              </tr>
              <tr v-if="!loadingAvail && !availabilities?.length">
                <td colspan="3" class="empty-row">Nenhuma disponibilidade cadastrada.</td>
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
.card__title { font-size: 1rem; font-weight: 600; margin: 0 0 1rem; }
.avail-form { display: flex; gap: .5rem; flex-wrap: wrap; margin-bottom: .5rem; }
.avail-warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: .5rem .75rem; font-size: .82rem; color: #92400e; margin-bottom: .75rem; }
.avail-filter { display: flex; align-items: center; gap: .5rem; margin-bottom: .75rem; font-size: .85rem; }
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
.modal__desc { font-size: .85rem; color: #6b7280; margin: 0 0 1rem; }
.modal__actions { display: flex; gap: .5rem; margin-top: 1.25rem; }
.dias-check { display: flex; gap: .75rem; flex-wrap: wrap; }
.dia-label { display: flex; align-items: center; gap: .35rem; font-size: .9rem; cursor: pointer; }
</style>
