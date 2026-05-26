<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import axios from 'axios'
import client from '@/api/client'
import MaterialIcon from '@/components/shell/MaterialIcon.vue'
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import UiIconButton from '@/components/ui/UiIconButton.vue'
import UiPager from '@/components/ui/UiPager.vue'
import { useApiRequest } from '@/composables/useApiRequest'
import { useToastStore } from '@/stores/toast'
import type { Paged } from '@/types/pagination'

type AppRow = { id: number; name: string; active: boolean }

const search = ref('')
const activeFilter = ref<'all' | 'active' | 'inactive'>('all')

const newName = ref('')
const newActive = ref(true)
const creating = ref(false)
const updatingId = ref<number | null>(null)

const toast = useToastStore()

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

watch([debouncedSearch, activeFilter], () => {
  page.value = 1
})

const { data: appsPage, loading, failed, execute } = useApiRequest<Paged<AppRow>>(async () => {
  const params: Record<string, string | number> = { page: page.value, limit: limit.value }
  const q = debouncedSearch.value.trim()
  if (q) params.q = q
  if (activeFilter.value === 'active') params.active = 'true'
  if (activeFilter.value === 'inactive') params.active = 'false'
  const { data } = await client.get<Paged<AppRow>>('/apps', { params })
  return data
})

watch([page, limit, debouncedSearch, activeFilter], () => {
  void execute()
})

const rows = computed(() => appsPage.value?.data ?? [])
const listTotal = computed(() => appsPage.value?.total ?? 0)

async function createApp() {
  if (!newName.value.trim()) return
  creating.value = true
  try {
    await client.post('/apps', { name: newName.value.trim(), active: newActive.value })
    newName.value = ''
    newActive.value = true
    await execute()
  } finally {
    creating.value = false
  }
}

async function toggleActive(a: AppRow) {
  updatingId.value = a.id
  try {
    await client.patch(`/apps/${a.id}`, { active: !a.active })
    await execute()
  } catch (e: unknown) {
    toast.error(apiErrorMessage(e, 'Não foi possível alterar o app.'))
  } finally {
    updatingId.value = null
  }
}

onMounted(() => {
  void execute()
})
</script>

<template>
  <div class="page">
    <header class="head">
      <div>
        <h1 class="title">Aplicativos</h1>
        <p class="sub">Cadastro de apps do ecossistema (ex: UNIFAE Care, UNIFAE Edu).</p>
      </div>
    </header>

    <div class="grid">
      <section class="panel tonal">
        <h2 class="h2">Novo app</h2>
        <form class="form" @submit.prevent="createApp">
          <div class="field">
            <label class="lbl">Nome</label>
            <input v-model="newName" class="in" placeholder="Ex: UNIFAE Care" />
          </div>
          <label class="chk">
            <input v-model="newActive" type="checkbox" />
            Ativo
          </label>
          <button type="submit" class="btn" :disabled="creating || !newName.trim()">
            <MaterialIcon name="add" />
            {{ creating ? 'Criando…' : 'Criar app' }}
          </button>
        </form>
      </section>

      <section class="panel tonal">
        <div class="list-head">
          <div>
            <h2 class="h2">Apps cadastrados</h2>
            <p class="sub2">Use filtros para encontrar rapidamente.</p>
          </div>
          <button type="button" class="btn btn--ghost" @click="execute">
            <MaterialIcon name="refresh" />
            Atualizar
          </button>
        </div>

        <div class="filters">
          <div class="field">
            <label class="lbl">Buscar</label>
            <input v-model="search" class="in in--sm" placeholder="Nome do app…" />
          </div>
          <div class="field">
            <label class="lbl">Status</label>
            <select v-model="activeFilter" class="in in--sm">
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
        </div>

        <p v-if="loading" class="muted">Carregando…</p>
        <UiConnectionRetry v-else-if="failed" @retry="execute" />
        <ul v-else class="list">
          <li v-for="a in rows" :key="a.id" class="item">
            <div class="left">
              <span class="name">{{ a.name }}</span>
              <span :class="['badge', !a.active && 'badge--off']">{{ a.active ? 'ativo' : 'inativo' }}</span>
            </div>
            <UiIconButton
              :icon="a.active ? 'block' : 'check_circle'"
              :label="a.active ? 'Desativar' : 'Ativar'"
              :variant="a.active ? 'warn' : 'success'"
              :disabled="updatingId === a.id"
              @click="toggleActive(a)"
            />
          </li>
          <li v-if="!rows.length" class="empty">Nenhum app encontrado.</li>
        </ul>
        <UiPager v-if="!loading && !failed && listTotal > 0" v-model:page="page" :limit="limit" :total="listTotal" />
      </section>
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
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.title {
  margin: 0;
  font-size: 2.25rem;
  font-weight: 800;
}
.sub {
  margin: 0.35rem 0 0;
  color: var(--uf-on-surface-variant);
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 1.5rem;
}
@media (max-width: 980px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
.panel {
  padding: 1.5rem;
  border-radius: var(--uf-radius-xl);
  background: var(--uf-surface-container-lowest);
}
.tonal {
  box-shadow: var(--uf-tonal-shadow);
}
.h2 {
  margin: 0 0 0.75rem;
  font-size: 1.05rem;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.lbl {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--uf-on-surface-variant);
}
.in {
  width: 100%;
  box-sizing: border-box;
  padding: 0.6rem 0.75rem;
  font-family: var(--uf-font);
  font-size: 0.9rem;
  background: var(--uf-surface-container-highest);
  border: none;
  border-radius: var(--uf-radius-md);
  outline: 1px solid var(--uf-outline-variant);
}
.in--sm {
  padding: 0.45rem 0.6rem;
  font-size: 0.85rem;
}
.chk {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.85rem;
  color: var(--uf-on-surface-variant);
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.65rem 1.1rem;
  border: none;
  border-radius: 999px;
  font-family: var(--uf-font);
  font-weight: 800;
  font-size: 0.8125rem;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(90deg, var(--uf-primary), var(--uf-primary-container));
  box-shadow: 0 8px 24px rgba(13, 99, 27, 0.18);
}
.btn--ghost {
  background: rgba(13, 99, 27, 0.08);
  color: var(--uf-primary);
  box-shadow: none;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
}
.list-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}
.sub2 {
  margin: 0.15rem 0 0;
  font-size: 0.8rem;
  color: var(--uf-on-surface-variant);
}
.filters {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 0.75rem;
}
@media (max-width: 980px) {
  .filters {
    grid-template-columns: 1fr;
  }
}
.muted {
  margin-top: 1rem;
  color: var(--uf-on-surface-variant);
}
.list {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0.9rem;
  border-radius: var(--uf-radius-xl);
  outline: 1px solid rgba(191, 202, 186, 0.25);
}
.left {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}
.name {
  font-weight: 700;
}
.btn-mini {
  border: none;
  border-radius: 999px;
  padding: 0.35rem 0.65rem;
  font-family: var(--uf-font);
  font-size: 0.75rem;
  font-weight: 800;
  cursor: pointer;
  color: var(--uf-primary);
  background: rgba(13, 99, 27, 0.08);
}
.btn-mini:hover {
  background: rgba(13, 99, 27, 0.14);
}
.btn-mini:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-mini--positive {
  color: #1b5e20;
  background: rgba(46, 125, 50, 0.16);
}
.btn-mini--positive:hover:not(:disabled) {
  background: rgba(46, 125, 50, 0.24);
}
.btn-mini--warn {
  color: #b3261e;
  background: rgba(211, 47, 47, 0.12);
}
.btn-mini--warn:hover:not(:disabled) {
  background: rgba(211, 47, 47, 0.2);
}
.badge {
  font-size: 0.625rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 0.15rem 0.45rem;
  border-radius: 0.25rem;
  background: rgba(46, 125, 50, 0.12);
  color: var(--uf-primary-container);
}
.badge--off {
  background: var(--uf-surface-container-low);
  color: var(--uf-on-surface-variant);
}
.empty {
  color: var(--uf-on-surface-variant);
  font-style: italic;
}
</style>

