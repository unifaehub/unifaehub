<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import client from '@/api/client'

type Modalidade = { id: number; nome: string }
type Equipe = {
  id: number; nome: string; cursoRepresentante: string
  modalidade: { id: number; nome: string } | null
  status: string; emailContato: string | null
  membros: { nome: string; ra: string; curso: string; responsavel?: boolean }[] | null
  motivo: string | null; createdAt: string
}
type PaginatedEquipes = { items: Equipe[]; total: number; page: number; limit: number }

const list       = ref<Equipe[]>([])
const total      = ref(0)
const page       = ref(1)
const loading    = ref(false)
const feedback   = ref<{ type: 'ok' | 'err'; msg: string } | null>(null)
const modalidades = ref<Modalidade[]>([])
const expandedId = ref<number | null>(null)

// filtros
const filterStatus     = ref('')
const filterModalidade = ref('')
const filterQ          = ref('')

const STATUS_LIST = ['', 'Pendente', 'Aprovada', 'Reprovada', 'Inativa']

async function loadModalidades() {
  try {
    const { data } = await client.get<Modalidade[]>('/intercurso/modalidades')
    modalidades.value = data
  } catch {}
}

async function load(p = 1) {
  loading.value = true
  page.value    = p
  try {
    const params: Record<string, string> = { page: String(p), limit: '30' }
    if (filterStatus.value)     params.status      = filterStatus.value
    if (filterModalidade.value) params.modalidadeId = filterModalidade.value
    if (filterQ.value)          params.q            = filterQ.value
    const { data } = await client.get<PaginatedEquipes>('/intercurso/equipes', { params })
    list.value  = data.items
    total.value = data.total
  } catch { feedback.value = { type: 'err', msg: 'Erro ao carregar equipes.' } }
  finally  { loading.value = false }
}

async function moderate(ids: number[], status: string, motivo?: string) {
  try {
    await client.patch('/intercurso/equipes/moderate', { ids, status, motivo })
    feedback.value = { type: 'ok', msg: `${ids.length} equipe(s) atualizada(s) para ${status}.` }
    await load(page.value)
  } catch (e: any) {
    feedback.value = { type: 'err', msg: e?.response?.data?.message ?? 'Erro ao moderar.' }
  }
}

function confirmModerate(e: Equipe, status: string) {
  const ok = confirm(`Atualizar "${e.nome}" para ${status}?`)
  if (ok) moderate([e.id], status)
}

async function remove(id: number) {
  if (!confirm('Inativar esta equipe?')) return
  try {
    await client.delete(`/intercurso/equipes/${id}`)
    feedback.value = { type: 'ok', msg: 'Equipe inativada.' }
    await load(page.value)
  } catch { feedback.value = { type: 'err', msg: 'Erro ao remover.' } }
}

const statusColor: Record<string, string> = {
  Pendente:  'badge--pending',
  Aprovada:  'badge--approved',
  Reprovada: 'badge--rejected',
  Inativa:   'badge--inactive',
}

onMounted(() => { loadModalidades(); load() })
</script>

<template>
  <div class="view">
    <div class="view__header">
      <div>
        <h1 class="view__title">Equipes Inscritas</h1>
        <p class="view__subtitle">{{ total }} equipes encontradas</p>
      </div>
    </div>

    <!-- Filtros -->
    <div class="filters">
      <select v-model="filterStatus" class="filter-select" @change="load(1)">
        <option v-for="s in STATUS_LIST" :key="s" :value="s">{{ s || 'Todos os status' }}</option>
      </select>
      <select v-model="filterModalidade" class="filter-select" @change="load(1)">
        <option value="">Todas as modalidades</option>
        <option v-for="m in modalidades" :key="m.id" :value="String(m.id)">{{ m.nome }}</option>
      </select>
      <input v-model="filterQ" class="filter-input" placeholder="Buscar por nome ou curso…" @keyup.enter="load(1)" />
      <button class="btn-secondary" @click="load(1)">Buscar</button>
    </div>

    <div v-if="feedback" :class="['feedback', feedback.type === 'ok' ? 'feedback--ok' : 'feedback--err']">
      {{ feedback.msg }}
    </div>

    <div v-if="loading" class="loading-msg">Carregando…</div>
    <div v-else-if="!list.length" class="empty-msg">Nenhuma equipe encontrada.</div>

    <div v-else class="equipes-list">
      <div v-for="e in list" :key="e.id" class="equipe-card">
        <div class="equipe-card__top">
          <div class="equipe-card__info">
            <strong class="equipe-card__nome">{{ e.nome }}</strong>
            <span class="equipe-card__curso">{{ e.cursoRepresentante }}</span>
            <span v-if="e.modalidade" class="equipe-card__mod">{{ e.modalidade.nome }}</span>
          </div>
          <div class="equipe-card__right">
            <span :class="['status-badge', statusColor[e.status]]">{{ e.status }}</span>
            <button class="btn-sm" @click="expandedId = expandedId === e.id ? null : e.id">
              {{ expandedId === e.id ? '▲ Ocultar' : '▼ Membros' }}
            </button>
          </div>
        </div>

        <!-- Motivo de reprovação -->
        <div v-if="e.motivo && e.status === 'Reprovada'" class="motivo-box">
          ⚠️ {{ e.motivo }}
        </div>

        <!-- Membros expandidos -->
        <div v-if="expandedId === e.id && e.membros?.length" class="membros-table">
          <table>
            <thead><tr><th>Nome</th><th>RA</th><th>Curso</th><th></th></tr></thead>
            <tbody>
              <tr v-for="m in e.membros" :key="m.ra">
                <td>{{ m.nome }}</td>
                <td>{{ m.ra }}</td>
                <td>{{ m.curso }}</td>
                <td>{{ m.responsavel ? '👑 Resp.' : '' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Ações de moderação -->
        <div class="equipe-card__actions">
          <button
            v-if="e.status !== 'Aprovada'"
            class="btn-action btn-action--approve"
            @click="confirmModerate(e, 'Aprovada')"
          >✓ Aprovar</button>
          <button
            v-if="e.status !== 'Reprovada'"
            class="btn-action btn-action--reject"
            @click="confirmModerate(e, 'Reprovada')"
          >✗ Reprovar</button>
          <button class="btn-action btn-action--delete" @click="remove(e.id)">Inativar</button>
        </div>
      </div>
    </div>

    <!-- Paginação -->
    <div v-if="total > 30" class="pagination">
      <button class="btn-secondary" :disabled="page <= 1" @click="load(page - 1)">← Anterior</button>
      <span class="pagination__info">Página {{ page }} de {{ Math.ceil(total / 30) }}</span>
      <button class="btn-secondary" :disabled="page >= Math.ceil(total / 30)" @click="load(page + 1)">Próxima →</button>
    </div>
  </div>
</template>

<style scoped>
.view { padding: 2rem; }
.view__header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem; gap: 1rem; flex-wrap: wrap; }
.view__title { font-size: 1.5rem; font-weight: 700; margin: 0 0 .25rem; color: #111; }
.view__subtitle { font-size: .87rem; color: #6b7280; margin: 0; }

.filters { display: flex; gap: .75rem; flex-wrap: wrap; margin-bottom: 1.25rem; }
.filter-select, .filter-input { border: 1px solid #d1d5db; border-radius: 7px; padding: .5rem .75rem; font-size: .9rem; }
.filter-input { min-width: 220px; }

.feedback { padding: .75rem 1rem; border-radius: 8px; font-size: .9rem; font-weight: 600; margin-bottom: 1rem; }
.feedback--ok  { background: #f0fdf4; color: #166534; }
.feedback--err { background: #fef2f2; color: #dc2626; }

.equipes-list { display: flex; flex-direction: column; gap: .75rem; }
.equipe-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1rem 1.25rem; }
.equipe-card__top { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
.equipe-card__info { display: flex; flex-direction: column; gap: .25rem; }
.equipe-card__nome { font-size: 1rem; font-weight: 700; color: #111; }
.equipe-card__curso { font-size: .82rem; color: #6b7280; }
.equipe-card__mod { font-size: .78rem; background: #dbeafe; color: #1e40af; padding: .15rem .5rem; border-radius: 4px; font-weight: 600; align-self: flex-start; }
.equipe-card__right { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }

.status-badge { font-size: .75rem; font-weight: 700; padding: .2rem .6rem; border-radius: 20px; }
.badge--pending  { background: #fefce8; color: #854d0e; }
.badge--approved { background: #dcfce7; color: #166534; }
.badge--rejected { background: #fef2f2; color: #dc2626; }
.badge--inactive { background: #f3f4f6; color: #6b7280; }

.motivo-box { font-size: .85rem; color: #92400e; background: #fffbeb; border-radius: 8px; padding: .5rem .75rem; margin-top: .75rem; }

.membros-table { margin-top: .75rem; overflow-x: auto; }
.membros-table table { width: 100%; border-collapse: collapse; font-size: .85rem; }
.membros-table th { text-align: left; padding: .4rem .5rem; font-size: .73rem; font-weight: 700; text-transform: uppercase; color: #9ca3af; border-bottom: 1px solid #e5e7eb; }
.membros-table td { padding: .4rem .5rem; border-bottom: 1px solid #f9fafb; }

.equipe-card__actions { display: flex; gap: .5rem; margin-top: .75rem; flex-wrap: wrap; }
.btn-action { border: none; border-radius: 6px; padding: .3rem .8rem; font-size: .82rem; font-weight: 700; cursor: pointer; }
.btn-action--approve { background: #dcfce7; color: #166534; }
.btn-action--approve:hover { background: #bbf7d0; }
.btn-action--reject  { background: #fef2f2; color: #dc2626; }
.btn-action--reject:hover  { background: #fecaca; }
.btn-action--delete  { background: #f3f4f6; color: #6b7280; }
.btn-action--delete:hover  { background: #e5e7eb; }

.btn-sm { border: 1px solid #d1d5db; background: #fff; border-radius: 6px; padding: .25rem .65rem; font-size: .8rem; cursor: pointer; }
.btn-secondary { background: #fff; border: 1px solid #d1d5db; border-radius: 8px; padding: .5rem 1rem; font-size: .88rem; font-weight: 600; cursor: pointer; }
.btn-secondary:disabled { opacity: .5; cursor: default; }

.pagination { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 1.5rem; }
.pagination__info { font-size: .87rem; color: #6b7280; }

.loading-msg, .empty-msg { color: #6b7280; padding: 1rem 0; }
</style>
