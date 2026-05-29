<script setup lang="ts">
import UiPager from '@/components/ui/UiPager.vue'
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import UiAsyncPanel from '@/components/ui/UiAsyncPanel.vue'
import client from '@/api/client'
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useApiRequest } from '@/composables/useApiRequest'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import type { Paged } from '@/types/pagination'

const router = useRouter()

const submissionUrl = `${window.location.origin}/jornada/submissao`
const submissionLinkCopied = ref(false)
async function copySubmissionLink() {
  try {
    await navigator.clipboard.writeText(submissionUrl)
    submissionLinkCopied.value = true
    setTimeout(() => { submissionLinkCopied.value = false }, 2500)
  } catch { /* fallback manual */ }
}

type WorkRow = {
  id: number
  titulo: string
  cursoTrabalho: string
  status: string
  dataSubmissao: string
  aluno: { id: number; name: string; email: string } | null
  arquivoUrl: string | null
  tipoSubmissao: 'manual' | 'arquivo' | null
  motivo: string | null
}

const toast = useToastStore()
const confirm = useConfirmStore()

// Modal de inserção de motivo ao reprovar
const motivoInput = ref('')
const showMotivoModal = ref(false)
const pendingModerateStatus = ref<'Aprovado' | 'Reprovado' | null>(null)

// Modal de visualização de motivo na tabela
const viewMotivo = ref<string | null>(null)

const page = ref(1)
const limit = ref(20)
const statusFilter = ref('')
const search = ref('')
const selected = ref<number[]>([])

const { data, loading, failed, execute } = useApiRequest<Paged<WorkRow>>(async () => {
  const params = new URLSearchParams({
    page: String(page.value),
    limit: String(limit.value),
  })
  if (statusFilter.value) params.set('status', statusFilter.value)
  if (search.value.trim()) params.set('q', search.value.trim())
  const { data } = await client.get(`/evidence-journey/works?${params}`)
  return data
})

watch([page, statusFilter, search], execute, { immediate: true })

function toggleAll(checked: boolean) {
  if (!data.value) return
  selected.value = checked ? data.value.data.map((w) => w.id) : []
}

function toggleRow(id: number, checked: boolean) {
  if (checked) selected.value.push(id)
  else selected.value = selected.value.filter((x) => x !== id)
}

async function moderate(status: 'Aprovado' | 'Reprovado') {
  if (!selected.value.length) {
    toast.error('Selecione ao menos um trabalho.')
    return
  }
  if (status === 'Reprovado') {
    pendingModerateStatus.value = status
    motivoInput.value = ''
    showMotivoModal.value = true
    return
  }
  const ok = await confirm.confirm({ message: `Deseja aprovar ${selected.value.length} trabalho(s)?`, tone: 'default' })
  if (!ok) return
  try {
    await client.patch('/evidence-journey/works/moderate', { ids: selected.value, status })
    toast.success(`${selected.value.length} trabalho(s) aprovado(s).`)
    selected.value = []
    execute()
  } catch {
    toast.error('Erro ao moderar trabalhos.')
  }
}

async function confirmReprovar() {
  if (!motivoInput.value.trim()) return
  showMotivoModal.value = false
  try {
    await client.patch('/evidence-journey/works/moderate', {
      ids: selected.value,
      status: 'Reprovado',
      motivo: motivoInput.value.trim(),
    })
    toast.success(`${selected.value.length} trabalho(s) reprovado(s).`)
    selected.value = []
    motivoInput.value = ''
    execute()
  } catch {
    toast.error('Erro ao reprovar trabalhos.')
  }
}

async function softDelete(id: number) {
  const ok = await confirm.confirm({ message: 'Excluir trabalho? O aluno poderá reenviar.', tone: 'danger' })
  if (!ok) return
  try {
    await client.delete(`/evidence-journey/works/${id}`)
    toast.success('Trabalho excluído.')
    execute()
  } catch {
    toast.error('Erro ao excluir trabalho.')
  }
}

const STATUS_COLORS: Record<string, string> = {
  Pendente: '#f59e0b',
  Aprovado: '#16a34a',
  Reprovado: '#dc2626',
  Inativo: '#9ca3af',
}
</script>

<template>
  <div class="works-view">
    <button class="btn-back" @click="router.push({ name: 'jornada-dashboard' })">← Voltar à Jornada</button>
    <div class="works-view__toolbar">
      <h2 class="works-view__title">Moderação de Trabalhos</h2>

      <div class="works-view__filters">
        <input v-model="search" class="input-field" placeholder="Buscar título, curso ou aluno…" @input="page = 1" />
        <select v-model="statusFilter" class="select-field" @change="page = 1">
          <option value="">Todos os status</option>
          <option value="Pendente">Pendente</option>
          <option value="Aprovado">Aprovado</option>
          <option value="Reprovado">Reprovado</option>
          <option value="Inativo">Inativo</option>
        </select>
      </div>

      <div class="works-view__actions" v-if="selected.length">
        <span class="works-view__sel-count">{{ selected.length }} selecionado(s)</span>
        <button class="btn btn--success" @click="moderate('Aprovado')">Aprovar</button>
        <button class="btn btn--danger" @click="moderate('Reprovado')">Reprovar</button>
      </div>
    </div>

    <!-- ── Link público de submissão ─────────────────────────────────── -->
    <div class="public-link-card" @click="copySubmissionLink" title="Clique para copiar o link">
      <div class="plc-left">
        <span class="plc-icon">📝</span>
        <div>
          <p class="plc-title">Link público — Submissão de trabalhos</p>
          <p class="plc-url">{{ submissionUrl }}</p>
        </div>
      </div>
      <span class="plc-action" :class="{ 'plc-action--copied': submissionLinkCopied }">
        {{ submissionLinkCopied ? '✅ Copiado!' : '📋 Copiar' }}
      </span>
    </div>

    <!-- ── Modal motivo reprovação ─────────────────────────────────── -->
    <div v-if="showMotivoModal" class="modal-overlay">
      <div class="modal-box">
        <h3>Motivo da reprovação</h3>
        <p>Informe o motivo para reprovar {{ selected.length }} trabalho(s). O aluno verá esta mensagem.</p>
        <textarea v-model="motivoInput" class="input-field" rows="4" placeholder="Descreva o motivo da reprovação…" style="width:100%;resize:vertical;margin-top:.5rem" />
        <div class="modal-actions">
          <button class="btn btn--danger" :disabled="!motivoInput.trim()" @click="confirmReprovar">Reprovar</button>
          <button class="btn btn--secondary" @click="showMotivoModal = false; motivoInput = ''">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Modal: visualizar motivo de reprovação -->
    <div v-if="viewMotivo" class="modal-overlay" @click.self="viewMotivo = null">
      <div class="modal-box">
        <h3>Motivo da reprovação</h3>
        <p class="motivo-body">{{ viewMotivo }}</p>
        <div class="modal-actions">
          <button class="btn btn--secondary" @click="viewMotivo = null">Fechar</button>
        </div>
      </div>
    </div>

    <UiConnectionRetry v-if="failed" @retry="execute" />

    <UiAsyncPanel :loading="loading">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th><input type="checkbox" @change="(e) => toggleAll((e.target as HTMLInputElement).checked)" /></th>
              <th>Título</th>
              <th>Curso</th>
              <th>Aluno</th>
              <th>Status</th>
              <th>Tipo</th>
              <th>Submissão</th>
              <th>Arquivo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="w in data?.data ?? []" :key="w.id">
              <td><input type="checkbox" :checked="selected.includes(w.id)" @change="(e) => toggleRow(w.id, (e.target as HTMLInputElement).checked)" /></td>
              <td class="td-title">{{ w.titulo }}</td>
              <td>{{ w.cursoTrabalho }}</td>
              <td>{{ w.aluno?.name ?? '—' }}</td>
              <td>
                <div class="status-cell">
                  <span class="status-badge" :style="{ background: STATUS_COLORS[w.status] + '20', color: STATUS_COLORS[w.status] }">{{ w.status }}</span>
                  <button v-if="w.motivo && w.status === 'Reprovado'" class="btn-motivo" title="Ver motivo da reprovação" @click="viewMotivo = w.motivo">💬</button>
                </div>
              </td>
              <td>
                <span v-if="w.tipoSubmissao === 'manual'"  class="tipo-badge tipo-badge--manual">Formulário</span>
                <span v-else-if="w.tipoSubmissao === 'arquivo'" class="tipo-badge tipo-badge--arquivo">Arquivo</span>
                <span v-else class="text-muted">—</span>
              </td>
              <td>{{ new Date(w.dataSubmissao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</td>
              <td>
                <a v-if="w.arquivoUrl" :href="w.arquivoUrl" target="_blank" class="link-pdf">Abrir</a>
                <span v-else class="text-muted">—</span>
              </td>
              <td>
                <button class="btn-icon-sm" title="Excluir" @click="softDelete(w.id)">🗑</button>
              </td>
            </tr>
            <tr v-if="!loading && !data?.data.length">
              <td colspan="8" class="empty-row">Nenhum trabalho encontrado.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <UiPager v-if="data" :page="page" :limit="limit" :total="data.total" @update:page="page = $event" />
    </UiAsyncPanel>
  </div>
</template>

<style scoped>
.btn-back { background: none; border: none; cursor: pointer; color: var(--color-primary, #0d631b); font-size: .85rem; font-weight: 600; padding: 0; margin-bottom: 1rem; display: inline-block; }
.btn-back:hover { text-decoration: underline; }
.works-view { padding: 1.5rem; }
.works-view__title { font-size: 1.4rem; font-weight: 700; margin: 0 0 1rem; }
.works-view__toolbar { display: flex; flex-wrap: wrap; gap: .75rem; align-items: center; margin-bottom: 1rem; }
.works-view__filters { display: flex; gap: .5rem; flex: 1; }
.works-view__actions { display: flex; align-items: center; gap: .5rem; }
.works-view__sel-count { font-size: .85rem; color: #555; }
.input-field { padding: .45rem .75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: .9rem; flex: 1; }
.select-field { padding: .45rem .75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: .9rem; }
.table-wrap { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: .9rem; }
.data-table th, .data-table td { padding: .6rem .75rem; border-bottom: 1px solid #e5e7eb; text-align: left; }
.data-table th { background: #f9fafb; font-weight: 600; font-size: .8rem; text-transform: uppercase; letter-spacing: .03em; }
.td-title { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-badge { padding: .2rem .6rem; border-radius: 12px; font-size: .8rem; font-weight: 600; }
.empty-row { text-align: center; color: #9ca3af; padding: 2rem; }
.link-pdf { color: var(--color-primary, #0d631b); text-decoration: none; font-size: .85rem; }
.btn { padding: .4rem .9rem; border: none; border-radius: 6px; cursor: pointer; font-size: .85rem; font-weight: 600; }
.btn--success { background: #16a34a; color: #fff; }
.btn--danger { background: #dc2626; color: #fff; }
.btn-icon-sm { background: none; border: none; cursor: pointer; font-size: 1rem; padding: .1rem .3rem; }
.text-muted { color: #9ca3af; }
.tipo-badge { padding: .15rem .55rem; border-radius: 12px; font-size: .78rem; font-weight: 600; }
.tipo-badge--manual  { background: #eff6ff; color: #1d4ed8; }
.tipo-badge--arquivo { background: #faf5ff; color: #7c3aed; }

.public-link-card { display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: .75rem 1rem;
  cursor: pointer; margin-bottom: 1rem; transition: background .15s; }
.public-link-card:hover { background: #dcfce7; }
.plc-left  { display: flex; align-items: center; gap: .75rem; min-width: 0; }
.plc-icon  { font-size: 1.4rem; flex-shrink: 0; }
.plc-title { font-size: .85rem; font-weight: 700; color: #166534; margin: 0 0 .2rem; }
.plc-url   { font-size: .78rem; color: #166534; opacity: .75; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 420px; }
.plc-action { font-size: .82rem; font-weight: 700; color: #166534; white-space: nowrap; padding: .3rem .75rem; border: 1.5px solid #86efac; border-radius: 20px; flex-shrink: 0; }
.plc-action--copied { background: #16a34a; color: #fff; border-color: #16a34a; }
.status-cell { display: flex; align-items: center; gap: .35rem; }
.btn-motivo { background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0; line-height: 1; opacity: .75; }
.btn-motivo:hover { opacity: 1; }
.motivo-body { font-size: .9rem; color: #374151; line-height: 1.6; white-space: pre-wrap; margin: .5rem 0 0; }
.btn--secondary { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
.modal-overlay { position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:1000; }
.modal-box { background:#fff;border-radius:12px;padding:1.5rem;max-width:480px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.2); }
.modal-box h3 { margin:0 0 .5rem;font-size:1rem; }
.modal-box p { font-size:.87rem;color:#555;margin:0 0 .5rem; }
.modal-actions { display:flex;gap:.75rem;margin-top:1rem;justify-content:flex-end; }
</style>
