<script setup lang="ts">
import UiPager from '@/components/ui/UiPager.vue'
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import UiAsyncPanel from '@/components/ui/UiAsyncPanel.vue'
import client from '@/api/client'
import { ref, watch } from 'vue'
import { useApiRequest } from '@/composables/useApiRequest'
import { useToastStore } from '@/stores/toast'
import { useConfirmStore } from '@/stores/confirm'
import type { Paged } from '@/types/pagination'

type WorkRow = {
  id: number
  titulo: string
  cursoTrabalho: string
  status: string
  dataSubmissao: string
  aluno: { id: number; name: string; email: string } | null
  arquivoUrl: string | null
}

const toast = useToastStore()
const confirm = useConfirmStore()

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
  const label = status === 'Aprovado' ? 'aprovar' : 'reprovar'
  const ok = await confirm.confirm({ message: `Deseja ${label} ${selected.value.length} trabalho(s)?`, tone: status === 'Reprovado' ? 'danger' : 'default' })
  if (!ok) return
  try {
    await client.patch('/evidence-journey/works/moderate', { ids: selected.value, status })
    toast.success(`${selected.value.length} trabalho(s) ${status.toLowerCase()}(s).`)
    selected.value = []
    execute()
  } catch {
    toast.error('Erro ao moderar trabalhos.')
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
              <th>Submissão</th>
              <th>PDF</th>
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
                <span class="status-badge" :style="{ background: STATUS_COLORS[w.status] + '20', color: STATUS_COLORS[w.status] }">{{ w.status }}</span>
              </td>
              <td>{{ new Date(w.dataSubmissao).toLocaleDateString('pt-BR') }}</td>
              <td>
                <a v-if="w.arquivoUrl" :href="w.arquivoUrl" target="_blank" class="link-pdf">PDF</a>
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
</style>
