<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import axios from 'axios'
import client from '@/api/client'
import MaterialIcon from '@/components/shell/MaterialIcon.vue'
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import UiPager from '@/components/ui/UiPager.vue'
import { useToastStore } from '@/stores/toast'
import type { Paged } from '@/types/pagination'

type AuditUser = { id: number; name: string; email: string; role: string }

type AuditRow = {
  id: number
  userId: number | null
  user: AuditUser | null
  action: string
  entity: string
  entityId: string
  metadata: Record<string, unknown> | null
  ipAddress: string | null
  deviceId: string | null
  deviceName: string | null
  userAgent: string | null
  createdAt: string
}

const toast = useToastStore()

function apiErrorMessage(err: unknown, fallback: string) {
  if (!axios.isAxiosError(err)) return fallback
  const m = err.response?.data as { message?: string | string[] } | undefined
  const raw = m?.message
  if (Array.isArray(raw)) return raw.join(' ')
  if (typeof raw === 'string' && raw.trim()) return raw
  return fallback
}

const q = ref('')
const filterId = ref('')
const filterUserId = ref('')
const filterUserAbsent = ref(false)
const filterAction = ref('')
const filterEntity = ref('')
const filterEntityId = ref('')
const filterIp = ref('')
const filterDeviceId = ref('')
const filterDeviceName = ref('')
const filterUserAgent = ref('')
const createdFrom = ref('')
const createdTo = ref('')
const limit = ref(50)

const page = ref(1)
const total = ref(0)
const rows = ref<AuditRow[]>([])
const loading = ref(false)
const failed = ref(false)

const facetActions = ref<string[]>([])
const facetEntities = ref<string[]>([])

let qDebounceTimer: ReturnType<typeof setTimeout> | null = null
let suppressPageWatch = false

function formatPtDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })
}

function userLabel(row: AuditRow) {
  if (!row.user) return '—'
  return `${row.user.name} · ${row.user.email}`
}

function metaStr(row: AuditRow) {
  if (row.metadata == null) return '—'
  try {
    return JSON.stringify(row.metadata)
  } catch {
    return String(row.metadata)
  }
}

function truncate(s: string, max: number) {
  if (s.length <= max) return s
  return `${s.slice(0, max)}…`
}

function buildParams(forPage: number): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {
    page: forPage,
    limit: limit.value,
  }
  const qt = q.value.trim()
  if (qt) params.q = qt

  const idT = filterId.value.trim()
  if (idT) params.id = idT

  if (filterUserAbsent.value) {
    params.userAbsent = 'true'
  } else {
    const uid = filterUserId.value.trim()
    if (uid) params.userId = uid
  }

  const a = filterAction.value.trim()
  if (a) params.action = a
  const e = filterEntity.value.trim()
  if (e) params.entity = e
  const eid = filterEntityId.value.trim()
  if (eid) params.entityId = eid
  const ip = filterIp.value.trim()
  if (ip) params.ipAddress = ip
  const did = filterDeviceId.value.trim()
  if (did) params.deviceId = did
  const dn = filterDeviceName.value.trim()
  if (dn) params.deviceName = dn
  const ua = filterUserAgent.value.trim()
  if (ua) params.userAgent = ua

  if (createdFrom.value) params.createdFrom = createdFrom.value
  if (createdTo.value) params.createdTo = createdTo.value

  return params
}

async function loadFacets() {
  try {
    const { data } = await client.get<{ actions: string[]; entities: string[] }>('/audit-logs/facets')
    facetActions.value = data.actions ?? []
    facetEntities.value = data.entities ?? []
  } catch {
    facetActions.value = []
    facetEntities.value = []
  }
}

async function fetchLogs() {
  loading.value = true
  failed.value = false
  try {
    const { data } = await client.get<Paged<AuditRow>>('/audit-logs', {
      params: buildParams(page.value),
    })
    rows.value = (data.data ?? []) as AuditRow[]
    total.value = data.total ?? 0
  } catch (e) {
    failed.value = true
    rows.value = []
    total.value = 0
    toast.error(apiErrorMessage(e, 'Não foi possível carregar os logs.'))
  } finally {
    loading.value = false
  }
}

function onFilterControlChange() {
  const prev = page.value
  if (prev === 1) {
    void fetchLogs()
    return
  }
  suppressPageWatch = true
  page.value = 1
  void nextTick(() => {
    suppressPageWatch = false
    void fetchLogs()
  })
}

function onUserAbsentChange() {
  if (filterUserAbsent.value) filterUserId.value = ''
  onFilterControlChange()
}

function csvEscape(v: string) {
  return `"${v.replace(/"/g, '""')}"`
}

function rowToCsvLine(row: AuditRow) {
  const cells = [
    String(row.id),
    formatPtDate(row.createdAt),
    row.user ? `${row.user.name} (${row.user.email})` : '',
    row.user?.role ?? '',
    String(row.userId ?? ''),
    row.action,
    row.entity,
    row.entityId,
    row.ipAddress ?? '',
    row.deviceId ?? '',
    row.deviceName ?? '',
    row.userAgent ?? '',
    metaStr(row),
  ]
  return cells.map(csvEscape).join(';')
}

function exportCsvPage() {
  if (!rows.value.length) {
    toast.error('Nada para exportar nesta página.')
    return
  }
  const header = [
    'ID',
    'Data/hora',
    'Usuário',
    'Papel',
    'ID usuário',
    'Ação',
    'Rota (entity)',
    'Referência (entityId)',
    'IP',
    'Device ID',
    'Device name',
    'User-Agent',
    'Metadados (JSON)',
  ]
    .map(csvEscape)
    .join(';')
  const lines = rows.value.map(rowToCsvLine)
  const bom = '\uFEFF'
  const csv = bom + [header, ...lines].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `audit-logs-pagina-${page.value}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
  toast.success('CSV da página gerado.')
}

async function exportCsvAll() {
  const cap = 5000
  const chunk = Math.min(200, limit.value)
  const acc: AuditRow[] = []
  let p = 1
  loading.value = true
  try {
    while (acc.length < cap) {
      const { data } = await client.get<Paged<AuditRow>>('/audit-logs', {
        params: { ...buildParams(p), limit: chunk },
      })
      const batch = (data.data ?? []) as AuditRow[]
      acc.push(...batch)
      const t = data.total ?? 0
      if (batch.length < chunk || acc.length >= t) break
      p += 1
      if (acc.length >= cap) break
    }
  } catch (e) {
    toast.error(apiErrorMessage(e, 'Falha ao buscar registros para exportação.'))
    loading.value = false
    return
  } finally {
    loading.value = false
  }

  if (!acc.length) {
    toast.error('Nada para exportar com estes filtros.')
    return
  }

  const header = [
    'ID',
    'Data/hora',
    'Usuário',
    'Papel',
    'ID usuário',
    'Ação',
    'Rota (entity)',
    'Referência (entityId)',
    'IP',
    'Device ID',
    'Device name',
    'User-Agent',
    'Metadados (JSON)',
  ]
    .map(csvEscape)
    .join(';')
  const lines = acc.map(rowToCsvLine)
  const bom = '\uFEFF'
  const csv = bom + [header, ...lines].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `audit-logs-${acc.length}-registros-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
  toast.success(`CSV com ${acc.length} registro(s) gerado.`)
}

watch(q, () => {
  if (qDebounceTimer) clearTimeout(qDebounceTimer)
  const trimmed = q.value.trim()
  const run = () => {
    suppressPageWatch = true
    page.value = 1
    void nextTick(() => {
      suppressPageWatch = false
      void fetchLogs()
    })
  }
  if (!trimmed) {
    run()
    return
  }
  qDebounceTimer = setTimeout(() => {
    qDebounceTimer = null
    run()
  }, 400)
})

watch([page, limit], () => {
  if (suppressPageWatch) return
  void fetchLogs()
})

onMounted(() => {
  void loadFacets()
  void fetchLogs()
})
</script>

<template>
  <div class="page">
    <header class="hero">
      <div>
        <h1 class="title">Logs de auditoria</h1>
        <p class="sub">
          Registros da tabela <code>audit_logs</code> (ações HTTP, login, prescrições, pacientes, usuários, etc.). Use a
          busca geral ou filtros específicos; exporte para CSV quando precisar de arquivo.
        </p>
      </div>
      <div class="hero__actions">
        <button
          type="button"
          class="btn-export btn-export--secondary"
          :disabled="loading || !rows.length"
          @click="exportCsvPage"
        >
          <MaterialIcon name="download" size="1.05rem" />
          CSV (página)
        </button>
        <button type="button" class="btn-export" :disabled="loading" @click="exportCsvAll">
          <MaterialIcon name="download" size="1.05rem" />
          CSV (até 5k)
        </button>
      </div>
    </header>

    <div class="filters panel tonal">
      <p class="filters__hint">Busca geral (<span class="kbd">q</span>) cruza ação, rota, referência, IP, dispositivo, metadados JSON e usuário.</p>
      <div class="filters__grid">
        <div class="field field--grow">
          <label class="lbl">Busca geral</label>
          <input v-model="q" class="in" type="search" placeholder="Texto livre em qualquer campo…" />
        </div>
        <div class="field">
          <label class="lbl">ID do log</label>
          <input v-model="filterId" class="in" inputmode="numeric" placeholder="ex.: 42" @change="onFilterControlChange" />
        </div>
        <div class="field">
          <label class="lbl">ID usuário</label>
          <input
            v-model="filterUserId"
            class="in"
            inputmode="numeric"
            placeholder="Filtrar por usuário"
            :disabled="filterUserAbsent"
            @change="onFilterControlChange"
          />
        </div>
        <div class="field field--check">
          <label class="lbl">Contexto</label>
          <label class="chk">
            <input v-model="filterUserAbsent" type="checkbox" @change="onUserAbsentChange" />
            <span>Apenas sem usuário (sistema / não autenticado)</span>
          </label>
        </div>
        <div class="field">
          <label class="lbl">Ação</label>
          <input
            v-model="filterAction"
            class="in"
            list="facet-actions"
            placeholder="POST, LOGIN…"
            @change="onFilterControlChange"
          />
          <datalist id="facet-actions">
            <option v-for="a in facetActions" :key="a" :value="a" />
          </datalist>
        </div>
        <div class="field field--wide">
          <label class="lbl">Rota / recurso (<code>entity</code>)</label>
          <input
            v-model="filterEntity"
            class="in"
            list="facet-entities"
            placeholder="/api/v1/…"
            @change="onFilterControlChange"
          />
          <datalist id="facet-entities">
            <option v-for="e in facetEntities" :key="e" :value="e" />
          </datalist>
        </div>
        <div class="field">
          <label class="lbl">Referência (<code>entityId</code>)</label>
          <input v-model="filterEntityId" class="in" placeholder="ID ou trecho da URL" @change="onFilterControlChange" />
        </div>
        <div class="field">
          <label class="lbl">IP</label>
          <input v-model="filterIp" class="in" placeholder="IPv4/IPv6" @change="onFilterControlChange" />
        </div>
        <div class="field">
          <label class="lbl">Device ID</label>
          <input v-model="filterDeviceId" class="in" @change="onFilterControlChange" />
        </div>
        <div class="field">
          <label class="lbl">Nome do dispositivo</label>
          <input v-model="filterDeviceName" class="in" @change="onFilterControlChange" />
        </div>
        <div class="field field--wide">
          <label class="lbl">User-Agent</label>
          <input v-model="filterUserAgent" class="in" @change="onFilterControlChange" />
        </div>
        <div class="field">
          <label class="lbl">De (data)</label>
          <input v-model="createdFrom" class="in" type="date" @change="onFilterControlChange" />
        </div>
        <div class="field">
          <label class="lbl">Até (data)</label>
          <input v-model="createdTo" class="in" type="date" @change="onFilterControlChange" />
        </div>
        <div class="field">
          <label class="lbl">Por página</label>
          <select v-model.number="limit" class="in" @change="onFilterControlChange">
            <option :value="25">25</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
            <option :value="200">200</option>
          </select>
        </div>
      </div>
    </div>

    <UiConnectionRetry v-if="failed" @retry="fetchLogs" />
    <p v-else-if="loading" class="muted pad">Carregando…</p>
    <div v-else class="table-wrap panel tonal">
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th class="col-datetime">Data/hora</th>
              <th class="col-id">ID</th>
              <th class="col-user">Usuário</th>
              <th class="col-action">Ação</th>
              <th class="col-route">Rota</th>
              <th class="col-ref">Ref.</th>
              <th class="col-ip">IP</th>
              <th class="col-device">Dispositivo</th>
              <th class="col-ua">User-Agent</th>
              <th class="col-meta">Metadados</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <td class="col-datetime nowrap">{{ formatPtDate(row.createdAt) }}</td>
              <td class="col-id mono">{{ row.id }}</td>
              <td class="col-user">{{ userLabel(row) }}</td>
              <td class="col-action mono">{{ row.action }}</td>
              <td class="col-route cell-route">{{ row.entity }}</td>
              <td class="col-ref mono">{{ row.entityId }}</td>
              <td class="col-ip mono">{{ row.ipAddress ?? '—' }}</td>
              <td class="col-device">
                <span v-if="row.deviceName || row.deviceId" class="mono">
                  {{ row.deviceName || '—' }}
                  <template v-if="row.deviceId"><br /><small>{{ row.deviceId }}</small></template>
                </span>
                <span v-else>—</span>
              </td>
              <td class="col-ua cell-ua" :title="row.userAgent ?? ''">{{ truncate(row.userAgent ?? '—', 80) }}</td>
              <td class="col-meta cell-meta" :title="metaStr(row)">{{ truncate(metaStr(row), 160) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="!rows.length" class="empty muted">Nenhum registro neste filtro.</p>
      <UiPager v-if="total > 0" v-model:page="page" :limit="limit" :total="total" :loading="loading" />
    </div>
  </div>
</template>

<style scoped>
.page {
  font-family: var(--uf-font);
  color: var(--uf-on-surface);
}
.hero {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.25rem;
}
.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.title {
  margin: 0;
  font-size: 2.1rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.sub {
  margin: 0.35rem 0 0;
  max-width: 46rem;
  color: var(--uf-on-surface-variant);
  font-size: 0.9rem;
  line-height: 1.5;
}
.sub code {
  font-size: 0.8rem;
  background: var(--uf-surface-container-low);
  padding: 0.08rem 0.3rem;
  border-radius: 0.25rem;
}
.btn-export {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1.1rem;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  font-family: var(--uf-font);
  font-weight: 700;
  font-size: 0.82rem;
  background: var(--uf-primary);
  color: #fff;
}
.btn-export--secondary {
  background: var(--uf-surface-container-high);
  color: var(--uf-primary);
  border: 1px solid rgba(13, 99, 27, 0.35);
}
.btn-export:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.filters {
  padding: 1rem 1.15rem;
  margin-bottom: 1rem;
}
.filters__hint {
  margin: 0 0 0.75rem;
  font-size: 0.8rem;
  color: var(--uf-on-surface-variant);
}
.kbd {
  font-family: ui-monospace, monospace;
  font-size: 0.78rem;
  background: var(--uf-surface-container-low);
  padding: 0.05rem 0.35rem;
  border-radius: 0.25rem;
}
.filters__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.75rem 1rem;
  align-items: end;
}
.field--grow {
  grid-column: span 2;
  min-width: 200px;
}
.field--wide {
  grid-column: span 2;
  min-width: 220px;
}
.field--check {
  grid-column: span 2;
}
.lbl {
  display: block;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--uf-on-surface-variant);
  margin-bottom: 0.2rem;
}
.lbl code {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: none;
}
.in {
  width: 100%;
  box-sizing: border-box;
  border-radius: var(--uf-radius-md);
  border: 1px solid rgba(191, 202, 186, 0.55);
  padding: 0.45rem 0.55rem;
  font-family: var(--uf-font);
  font-size: 0.85rem;
}
.chk {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  cursor: pointer;
}
.table-wrap {
  padding: 0;
  overflow: hidden;
}
.table-scroll {
  overflow-x: auto;
}
.data-table {
  width: max-content;
  min-width: 100%;
  table-layout: auto;
  border-collapse: collapse;
  font-size: 0.78rem;
}
.data-table th,
.data-table td {
  padding: 0.45rem 0.6rem;
  border-bottom: 1px solid rgba(191, 202, 186, 0.25);
  text-align: left;
  vertical-align: top;
}
.data-table th {
  background: var(--uf-surface-container-low);
  font-weight: 700;
  white-space: nowrap;
}
.data-table td {
  word-break: break-word;
}
/* Larguras dinâmicas por coluna (só limitamos onde o texto pode explodir) */
.col-datetime {
  min-width: 9.5rem;
  white-space: nowrap;
}
.col-id {
  min-width: 6.25rem;
  width: 1%;
  white-space: nowrap;
}
.col-id.mono {
  font-variant-numeric: tabular-nums;
}
.col-user {
  min-width: 11rem;
  max-width: 22rem;
}
.col-action {
  min-width: 4.5rem;
  white-space: nowrap;
}
.col-route {
  min-width: 10rem;
  max-width: 28rem;
}
.col-ref {
  min-width: 8rem;
  max-width: 20rem;
}
.col-ip {
  min-width: 7.5rem;
  white-space: nowrap;
}
.col-device {
  min-width: 8rem;
  max-width: 18rem;
}
.col-ua {
  min-width: 10rem;
  max-width: 22rem;
}
.col-meta {
  min-width: 12rem;
  max-width: 28rem;
}
.nowrap {
  white-space: nowrap;
}
.mono {
  font-family: ui-monospace, monospace;
  font-size: 0.74rem;
}
.cell-route {
  font-family: ui-monospace, monospace;
  font-size: 0.72rem;
}
.cell-ua {
  font-size: 0.72rem;
}
.cell-meta {
  font-family: ui-monospace, monospace;
  font-size: 0.7rem;
  line-height: 1.35;
}
.empty {
  padding: 1rem 1.25rem;
}
.muted {
  color: var(--uf-on-surface-variant);
}
.pad {
  padding: 1rem 0;
}
.panel.tonal {
  box-shadow: var(--uf-tonal-shadow);
  border-radius: var(--uf-radius-xl);
  background: var(--uf-surface-container-lowest);
}
</style>
