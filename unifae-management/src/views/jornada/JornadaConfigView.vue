<script setup lang="ts">
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import UiAsyncPanel from '@/components/ui/UiAsyncPanel.vue'
import client from '@/api/client'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'

const router = useRouter()
const toast = useToastStore()
const confirm = useConfirmStore()

// ── Config ────────────────────────────────────────────────────────────────
type Config = { eventoNome: string | null; eventoLocal: string | null; datasEvento: string[] | null }
const config = ref<Config>({ eventoNome: null, eventoLocal: null, datasEvento: null })
const loadingConfig = ref(false)
const failedConfig = ref(false)
const savingConfig = ref(false)
const newDataInput = ref('')

async function loadConfig() {
  loadingConfig.value = true; failedConfig.value = false
  try { const { data } = await client.get('/evidence-journey/config'); config.value = data }
  catch { failedConfig.value = true }
  finally { loadingConfig.value = false }
}

async function saveConfig() {
  savingConfig.value = true
  try {
    await client.patch('/evidence-journey/config', {
      eventoNome: config.value.eventoNome || null,
      eventoLocal: config.value.eventoLocal || null,
      datasEvento: config.value.datasEvento,
    })
    toast.success('Configurações salvas.')
  } catch { toast.error('Erro ao salvar configurações.') }
  finally { savingConfig.value = false }
}

function addDate() {
  const d = newDataInput.value.trim()
  if (!d) return
  if (!config.value.datasEvento) config.value.datasEvento = []
  if (config.value.datasEvento.includes(d)) {
    toast.error(`A data ${formatDate(d)} já está cadastrada no evento.`)
    return
  }
  config.value.datasEvento.push(d)
  newDataInput.value = ''
}

function removeDate(d: string) {
  if (!config.value.datasEvento) return
  config.value.datasEvento = config.value.datasEvento.filter((x) => x !== d)
}

async function clearConfig() {
  // 1. Buscar resumo do que será deletado
  let summary = { rooms: 0, evaluations: 0, availabilities: 0, datas: [] as string[] }
  try {
    const { data } = await client.get('/evidence-journey/config/reset-summary')
    summary = data
  } catch { /* ignora, mostra aviso genérico */ }

  const hasData = summary.rooms > 0 || summary.evaluations > 0

  const confirmMsg = hasData
    ? `⚠️ ATENÇÃO: Esta ação é irreversível e irá excluir:\n\n` +
      `• ${summary.rooms} sala(s) criada(s)\n` +
      `• ${summary.evaluations} avaliação(ões) registrada(s)\n` +
      `• Disponibilidades dos professores nas datas: ${summary.datas.map((d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')).join(', ') || 'nenhuma'}\n\n` +
      `Setores e salas físicas NÃO serão excluídos.\n\nConfirmar limpeza completa do evento?`
    : 'Limpar as informações do evento (nome, local e datas)? Setores e salas físicas serão mantidos.'

  const ok = await confirm.confirm({ message: confirmMsg, tone: 'danger' })
  if (!ok) return

  try {
    await client.delete('/evidence-journey/config/reset')
    await loadConfig()
    await loadSectors()
    toast.success('Evento limpo com sucesso.')
  } catch {
    toast.error('Erro ao limpar o evento.')
  }
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

// ── Sectors ───────────────────────────────────────────────────────────────
type Sector = { id: number; nome: string; descricao: string | null; salas: Hall[] }
const sectors = ref<Sector[]>([])
const loadingSectors = ref(false)
const failedSectors = ref(false)
const showSectorForm = ref(false)
const sectorFormId = ref<number | null>(null)
const sectorFormNome = ref('')
const sectorFormDesc = ref('')
const savingSector = ref(false)

async function loadSectors() {
  loadingSectors.value = true; failedSectors.value = false
  try { const { data } = await client.get('/evidence-journey/config/sectors'); sectors.value = data }
  catch { failedSectors.value = true }
  finally { loadingSectors.value = false }
}

function openNewSector() {
  sectorFormId.value = null; sectorFormNome.value = ''; sectorFormDesc.value = ''
  showSectorForm.value = true
}

function openEditSector(s: Sector) {
  sectorFormId.value = s.id; sectorFormNome.value = s.nome; sectorFormDesc.value = s.descricao ?? ''
  showSectorForm.value = true
}

async function saveSector() {
  if (!sectorFormNome.value.trim()) { toast.error('Nome é obrigatório.'); return }
  savingSector.value = true
  try {
    const payload = { nome: sectorFormNome.value.trim(), descricao: sectorFormDesc.value || null }
    if (sectorFormId.value) await client.patch(`/evidence-journey/config/sectors/${sectorFormId.value}`, payload)
    else await client.post('/evidence-journey/config/sectors', payload)
    toast.success('Setor salvo.'); showSectorForm.value = false; await loadSectors()
  } catch { toast.error('Erro ao salvar setor.') }
  finally { savingSector.value = false }
}

async function deleteSector(id: number) {
  const ok = await confirm.confirm({ message: 'Excluir este setor e todas as suas salas?', tone: 'danger' })
  if (!ok) return
  try { await client.delete(`/evidence-journey/config/sectors/${id}`); await loadSectors(); toast.success('Setor excluído.') }
  catch { toast.error('Erro ao excluir setor.') }
}

// ── Halls ─────────────────────────────────────────────────────────────────
type Hall = { id: number; nome: string; andar: string | null; capacidade: number | null }
const showHallForm = ref(false)
const hallFormId = ref<number | null>(null)
const hallFormSetorId = ref<number | null>(null)
const hallFormNome = ref('')
const hallFormAndar = ref('')
const hallFormCap = ref<number | string>('')
const savingHall = ref(false)

function openNewHall(setorId: number) {
  hallFormId.value = null; hallFormSetorId.value = setorId
  hallFormNome.value = ''; hallFormAndar.value = ''; hallFormCap.value = ''
  showHallForm.value = true
}

function openEditHall(setorId: number, h: Hall) {
  hallFormId.value = h.id; hallFormSetorId.value = setorId
  hallFormNome.value = h.nome; hallFormAndar.value = h.andar ?? ''; hallFormCap.value = h.capacidade ?? ''
  showHallForm.value = true
}

async function saveHall() {
  if (!hallFormNome.value.trim()) { toast.error('Nome é obrigatório.'); return }
  savingHall.value = true
  const payload = {
    nome: hallFormNome.value.trim(),
    andar: hallFormAndar.value || null,
    capacidade: hallFormCap.value !== '' ? Number(hallFormCap.value) : null,
  }
  try {
    if (hallFormId.value) await client.patch(`/evidence-journey/config/halls/${hallFormId.value}`, payload)
    else await client.post(`/evidence-journey/config/sectors/${hallFormSetorId.value}/halls`, payload)
    toast.success('Sala salva.'); showHallForm.value = false; await loadSectors()
  } catch { toast.error('Erro ao salvar sala.') }
  finally { savingHall.value = false }
}

async function deleteHall(id: number) {
  const ok = await confirm.confirm({ message: 'Excluir esta sala?', tone: 'danger' })
  if (!ok) return
  try { await client.delete(`/evidence-journey/config/halls/${id}`); await loadSectors(); toast.success('Sala excluída.') }
  catch { toast.error('Erro ao excluir sala.') }
}

onMounted(() => { loadConfig(); loadSectors() })
</script>

<template>
  <div class="cfg-view">
    <button class="btn-back" @click="router.push({ name: 'jornada-dashboard' })">← Voltar à Jornada</button>
    <h2 class="cfg-view__title">Configurações da Jornada</h2>

    <!-- ── Evento ─────────────────────────────────────────────────────── -->
    <section class="card">
      <div class="card__header">
        <div>
          <h3 class="card__title">
            {{ config.eventoNome ? `Editando: ${config.eventoNome}` : 'Novo Evento' }}
          </h3>
          <p class="card__desc">
            {{ config.eventoNome
              ? 'Altere os dados e clique em Salvar para atualizar o evento.'
              : 'Preencha os dados abaixo para configurar o evento da Jornada.' }}
          </p>
        </div>
        <button v-if="config.eventoNome" class="btn btn--outline btn--sm" @click="clearConfig">
          🗑 Limpar evento
        </button>
      </div>
      <UiConnectionRetry v-if="failedConfig" @retry="loadConfig" />
      <UiAsyncPanel :loading="loadingConfig">
        <div class="form-grid">
          <div class="form-group">
            <label>Nome do evento</label>
            <input v-model="config.eventoNome" type="text" class="input-field" placeholder="Ex.: Jornada de Evidências 2025" />
          </div>
          <div class="form-group">
            <label>Local</label>
            <input v-model="config.eventoLocal" type="text" class="input-field" placeholder="Ex.: Bloco A — UniFAE" />
          </div>
        </div>

        <div class="form-group">
          <label>Datas do evento</label>
          <div class="dates-row">
            <input v-model="newDataInput" type="date" class="input-field input-field--sm" />
            <button class="btn btn--outline" @click="addDate">+ Adicionar</button>
          </div>
          <div class="tags-row">
            <span v-for="d in (config.datasEvento ?? []).slice().sort()" :key="d" class="date-tag">
              {{ formatDate(d) }}
              <button @click="removeDate(d)" class="tag-remove">×</button>
            </span>
            <span v-if="!config.datasEvento?.length" class="empty-hint">Nenhuma data cadastrada.</span>
          </div>
        </div>

        <button class="btn btn--primary" :disabled="savingConfig" @click="saveConfig">
          {{ savingConfig ? 'Salvando…' : 'Salvar configurações' }}
        </button>
      </UiAsyncPanel>
    </section>

    <!-- ── Setores & Salas ───────────────────────────────────────────── -->
    <section class="card">
      <div class="card__header">
        <h3 class="card__title">Setores e Salas</h3>
        <button class="btn btn--primary" @click="openNewSector">+ Novo Setor</button>
      </div>
      <p class="card__desc">Cadastre os setores (ex.: Setor A, B, C) e as salas de apresentação de cada setor.</p>

      <UiConnectionRetry v-if="failedSectors" @retry="loadSectors" />
      <UiAsyncPanel :loading="loadingSectors">
        <div v-if="!sectors.length" class="empty-hint">Nenhum setor cadastrado.</div>

        <div v-for="s in sectors" :key="s.id" class="sector-block">
          <div class="sector-header">
            <div>
              <span class="sector-nome">{{ s.nome }}</span>
              <span v-if="s.descricao" class="sector-desc">{{ s.descricao }}</span>
            </div>
            <div class="sector-actions">
              <button class="btn-link" @click="openEditSector(s)">Editar</button>
              <button class="btn-link btn-link--danger" @click="deleteSector(s.id)">Excluir</button>
            </div>
          </div>

          <table class="data-table">
            <thead><tr><th>Sala</th><th>Andar</th><th>Capacidade</th><th></th></tr></thead>
            <tbody>
              <tr v-for="h in s.salas ?? []" :key="h.id">
                <td>{{ h.nome }}</td>
                <td>{{ h.andar ?? '—' }}</td>
                <td>{{ h.capacidade ?? '—' }}</td>
                <td class="actions-cell">
                  <button class="btn-link" @click="openEditHall(s.id, h)">Editar</button>
                  <button class="btn-link btn-link--danger" @click="deleteHall(h.id)">Excluir</button>
                </td>
              </tr>
              <tr v-if="!s.salas?.length">
                <td colspan="4" class="empty-row">Nenhuma sala neste setor.</td>
              </tr>
            </tbody>
          </table>
          <button class="btn btn--outline btn--sm" @click="openNewHall(s.id)">+ Nova Sala</button>
        </div>
      </UiAsyncPanel>
    </section>

    <!-- ── Modal setor ─────────────────────────────────────────────────── -->
    <div v-if="showSectorForm" class="modal-overlay" @click.self="showSectorForm = false">
      <div class="modal">
        <h3 class="modal__title">{{ sectorFormId ? 'Editar' : 'Novo' }} Setor</h3>
        <div class="form-group">
          <label>Nome</label>
          <input v-model="sectorFormNome" type="text" class="input-field" placeholder="Ex.: Setor A" />
        </div>
        <div class="form-group">
          <label>Descrição (opcional)</label>
          <input v-model="sectorFormDesc" type="text" class="input-field" placeholder="Descrição breve" />
        </div>
        <div class="modal__actions">
          <button class="btn btn--primary" :disabled="savingSector" @click="saveSector">
            {{ savingSector ? 'Salvando…' : 'Salvar' }}
          </button>
          <button class="btn" @click="showSectorForm = false">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- ── Modal sala ──────────────────────────────────────────────────── -->
    <div v-if="showHallForm" class="modal-overlay" @click.self="showHallForm = false">
      <div class="modal">
        <h3 class="modal__title">{{ hallFormId ? 'Editar' : 'Nova' }} Sala</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Número/Nome</label>
            <input v-model="hallFormNome" type="text" class="input-field" placeholder="Ex.: 1 ou Lab A" />
          </div>
          <div class="form-group">
            <label>Andar (opcional)</label>
            <input v-model="hallFormAndar" type="text" class="input-field" placeholder="Ex.: 2º" />
          </div>
        </div>
        <div class="form-group">
          <label>Capacidade (opcional)</label>
          <input v-model.number="hallFormCap" type="number" class="input-field" min="1" />
        </div>
        <div class="modal__actions">
          <button class="btn btn--primary" :disabled="savingHall" @click="saveHall">
            {{ savingHall ? 'Salvando…' : 'Salvar' }}
          </button>
          <button class="btn" @click="showHallForm = false">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-back { background: none; border: none; cursor: pointer; color: var(--color-primary, #0d631b); font-size: .85rem; font-weight: 600; padding: 0; margin-bottom: 1rem; display: inline-block; }
.btn-back:hover { text-decoration: underline; }
.cfg-view { padding: 1.5rem; }
.cfg-view__title { font-size: 1.4rem; font-weight: 700; margin: 0 0 1.5rem; }
.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 1.25rem; margin-bottom: 1.5rem; }
.card__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: .25rem; }
.card__title { font-size: 1rem; font-weight: 600; margin: 0 0 .5rem; }
.card__desc { font-size: .85rem; color: #6b7280; margin: 0 0 1rem; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; margin-bottom: .75rem; }
@media (max-width: 700px) { .form-grid { grid-template-columns: 1fr; } }
.form-group { display: flex; flex-direction: column; gap: .3rem; margin-bottom: .75rem; font-size: .87rem; }
.form-group label { font-weight: 600; font-size: .8rem; color: #374151; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
.input-field { padding: .45rem .75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: .9rem; }
.input-field--sm { max-width: 180px; }
.dates-row { display: flex; gap: .5rem; align-items: center; margin-bottom: .5rem; }
.tags-row { display: flex; flex-wrap: wrap; gap: .4rem; }
.date-tag { background: #e0f2e9; color: #065f46; padding: .2rem .5rem; border-radius: 4px; font-size: .82rem; display: flex; align-items: center; gap: .25rem; }
.tag-remove { background: none; border: none; cursor: pointer; font-size: 1rem; line-height: 1; color: #065f46; padding: 0; }
.empty-hint { font-size: .82rem; color: #9ca3af; }
.btn { padding: .4rem .9rem; border: 1px solid transparent; border-radius: 6px; cursor: pointer; font-size: .85rem; font-weight: 600; background: #f3f4f6; }
.btn--primary { background: var(--color-primary, #0d631b); color: #fff; border-color: var(--color-primary, #0d631b); }
.btn--outline { background: #fff; border-color: #d1d5db; }
.btn--sm { font-size: .8rem; padding: .3rem .7rem; margin-top: .5rem; }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.btn-link { background: none; border: none; cursor: pointer; color: var(--color-primary, #0d631b); font-size: .82rem; text-decoration: underline; padding: 0; }
.btn-link--danger { color: #dc2626; }
.sector-block { border: 1px solid #e5e7eb; border-radius: 8px; padding: .75rem; margin-bottom: 1rem; }
.sector-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: .5rem; }
.sector-nome { font-weight: 600; font-size: .95rem; }
.sector-desc { font-size: .82rem; color: #6b7280; margin-left: .5rem; }
.sector-actions { display: flex; gap: .75rem; }
.data-table { width: 100%; border-collapse: collapse; font-size: .87rem; margin-bottom: .5rem; }
.data-table th, .data-table td { padding: .4rem .5rem; border-bottom: 1px solid #f3f4f6; text-align: left; }
.data-table th { font-weight: 600; font-size: .78rem; text-transform: uppercase; color: #6b7280; }
.actions-cell { display: flex; gap: .5rem; }
.empty-row { text-align: center; color: #9ca3af; padding: 1rem; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: #fff; border-radius: 10px; padding: 1.5rem; width: 420px; max-width: 95vw; box-shadow: 0 8px 32px rgba(0,0,0,.15); }
.modal__title { font-size: 1.1rem; font-weight: 700; margin: 0 0 1rem; }
.modal__actions { display: flex; gap: .5rem; margin-top: 1.25rem; }
</style>
