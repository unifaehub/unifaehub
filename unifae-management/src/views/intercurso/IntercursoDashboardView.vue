<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import client from '@/api/client'

const router = useRouter()

const sections = ref([
  { name: 'Modalidades',    desc: 'Gerenciar modalidades do evento',              route: 'intercurso-modalidades' },
  { name: 'Equipes',        desc: 'Moderar e aprovar inscrições de equipes',       route: 'intercurso-equipes'     },
  { name: 'Resultados',     desc: 'Lançar e publicar resultados por modalidade',  route: 'intercurso-resultados'  },
  { name: 'Palavra-Chave',  desc: 'Agendar palavras-chave para certificados',     route: 'intercurso-keywords'    },
  { name: 'Configurações',  desc: 'Datas, local e dados gerais do evento',        route: 'intercurso-config'      },
])

type Config = { eventoNome: string | null; eventoLocal: string | null; edicao: string | null; datasEvento: string[] | null }
type Stats  = { total: number; pendentes: number; aprovadas: number; reprovadas: number }

const config       = ref<Config | null>(null)
const stats        = ref<Stats | null>(null)
const loadingStatus = ref(false)

async function loadStatus() {
  loadingStatus.value = true
  try {
    const [cfgRes, statsRes] = await Promise.allSettled([
      client.get('/intercurso/config'),
      client.get('/intercurso/equipes/stats'),
    ])
    if (cfgRes.status === 'fulfilled')   config.value = cfgRes.value.data
    if (statsRes.status === 'fulfilled') stats.value  = statsRes.value.data
  } catch { /* silencioso */ }
  finally { loadingStatus.value = false }
}

const proximaData = computed(() => {
  const datas = config.value?.datasEvento
  if (!datas?.length) return null
  const today = new Date().toISOString().slice(0, 10)
  const future = datas.filter((d) => d >= today).sort()
  return future[0] ?? datas[datas.length - 1]
})

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

onMounted(loadStatus)
</script>

<template>
  <div class="intercurso-dashboard">
    <div class="intercurso-dashboard__header">
      <h1 class="intercurso-dashboard__title">Intercurso</h1>
      <p class="intercurso-dashboard__subtitle">Gerencie o evento inter-cursos da UNIFAE</p>
    </div>

    <!-- Status do evento -->
    <div class="evento-status" :class="config?.eventoNome ? 'evento-status--ativo' : 'evento-status--vazio'">
      <div v-if="loadingStatus" class="evento-status__loading">Carregando informações do evento…</div>
      <template v-else-if="config?.eventoNome">
        <div class="evento-status__top">
          <div class="evento-status__info">
            <span class="evento-status__badge">● Evento configurado</span>
            <strong class="evento-status__nome">{{ config.eventoNome }}</strong>
            <span v-if="config.edicao" class="evento-status__edicao">{{ config.edicao }}</span>
            <span v-if="config.eventoLocal" class="evento-status__local">📍 {{ config.eventoLocal }}</span>
          </div>
          <button class="btn-config" @click="router.push({ name: 'intercurso-config' })">✏️ Editar</button>
        </div>
        <div class="evento-status__datas" v-if="config.datasEvento?.length">
          <span
            v-for="d in config.datasEvento"
            :key="d"
            class="data-chip"
            :class="{ 'data-chip--proxima': d === proximaData }"
          >{{ formatDate(d) }}</span>
        </div>
      </template>
      <div v-else class="evento-status__empty">
        ⚠️ Nenhum evento configurado.
        <button class="btn-link" @click="router.push({ name: 'intercurso-config' })">Configurar agora</button>
      </div>
    </div>

    <!-- Estatísticas de equipes -->
    <div v-if="stats" class="stats-row">
      <div class="stat-card stat-card--total">
        <span class="stat-card__num">{{ stats.total }}</span>
        <span class="stat-card__label">Total de Equipes</span>
      </div>
      <div class="stat-card stat-card--pending">
        <span class="stat-card__num">{{ stats.pendentes }}</span>
        <span class="stat-card__label">Pendentes</span>
      </div>
      <div class="stat-card stat-card--approved">
        <span class="stat-card__num">{{ stats.aprovadas }}</span>
        <span class="stat-card__label">Aprovadas</span>
      </div>
      <div class="stat-card stat-card--rejected">
        <span class="stat-card__num">{{ stats.reprovadas }}</span>
        <span class="stat-card__label">Reprovadas</span>
      </div>
    </div>

    <!-- Grid de módulos -->
    <div class="intercurso-dashboard__grid">
      <button
        v-for="s in sections"
        :key="s.route"
        class="intercurso-card"
        @click="router.push({ name: s.route })"
      >
        <p class="intercurso-card__name">{{ s.name }}</p>
        <p class="intercurso-card__desc">{{ s.desc }}</p>
      </button>
    </div>
  </div>
</template>

<style scoped>
.intercurso-dashboard { padding: 2rem; }
.intercurso-dashboard__header { margin-bottom: 1.5rem; }
.intercurso-dashboard__title { font-size: 1.75rem; font-weight: 700; color: var(--color-text-primary, #111); margin: 0 0 .25rem; }
.intercurso-dashboard__subtitle { color: var(--color-text-secondary, #666); margin: 0; }

.evento-status { border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; }
.evento-status--ativo { background: #eff6ff; border: 1px solid #bfdbfe; }
.evento-status--vazio { background: #fefce8; border: 1px solid #fde68a; }
.evento-status__loading { color: #6b7280; font-size: .9rem; }
.evento-status__top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: .5rem; flex-wrap: wrap; gap: .5rem; }
.evento-status__info { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem .75rem; }
.evento-status__badge { font-size: .75rem; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: .04em; }
.evento-status__nome  { font-weight: 700; font-size: 1rem; color: #111; }
.evento-status__edicao { font-size: .8rem; background: #dbeafe; color: #1e40af; padding: .15rem .5rem; border-radius: 4px; font-weight: 600; }
.evento-status__local { font-size: .85rem; color: #555; }
.evento-status__datas { display: flex; flex-wrap: wrap; gap: .4rem; }
.data-chip { font-size: .8rem; padding: .2rem .65rem; background: #dbeafe; color: #1e40af; border-radius: 20px; border: 1px solid #bfdbfe; }
.data-chip--proxima { background: #1d4ed8; color: #fff; border-color: #1d4ed8; font-weight: 700; }
.evento-status__empty { font-size: .9rem; color: #92400e; display: flex; align-items: center; gap: .5rem; }
.btn-config { background: #fff; border: 1px solid #bfdbfe; border-radius: 6px; padding: .3rem .75rem; font-size: .82rem; font-weight: 600; cursor: pointer; color: #1e40af; white-space: nowrap; }
.btn-config:hover { background: #eff6ff; }
.btn-link { background: none; border: none; cursor: pointer; color: var(--color-primary, #0d631b); font-size: .9rem; font-weight: 700; text-decoration: underline; padding: 0; }

.stats-row { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.stat-card { flex: 1; min-width: 100px; border-radius: 10px; padding: 1rem 1.25rem; display: flex; flex-direction: column; align-items: center; }
.stat-card--total    { background: #f1f5f9; }
.stat-card--pending  { background: #fefce8; }
.stat-card--approved { background: #f0fdf4; }
.stat-card--rejected { background: #fef2f2; }
.stat-card__num   { font-size: 1.75rem; font-weight: 900; color: #111; }
.stat-card__label { font-size: .78rem; font-weight: 600; color: #555; margin-top: .2rem; text-align: center; }

.intercurso-dashboard__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
.intercurso-card {
  display: flex; flex-direction: column; gap: .3rem;
  padding: 1.25rem 1.5rem; border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 10px; background: #fff; cursor: pointer;
  text-align: left; transition: box-shadow .15s, border-color .15s;
}
.intercurso-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.08); border-color: #1d4ed8; }
.intercurso-card__name { font-weight: 600; font-size: .95rem; margin: 0; }
.intercurso-card__desc { font-size: .82rem; color: #666; margin: 0; }
</style>
