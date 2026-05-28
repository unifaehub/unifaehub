<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import client from '@/api/client'

const router = useRouter()

const sections = ref([
  { name: 'Trabalhos',     desc: 'Moderar e aprovar trabalhos submetidos',       route: 'jornada-works'      },
  { name: 'Professores',   desc: 'Gerenciar professores e disponibilidades',      route: 'jornada-professors' },
  { name: 'Sorteio',       desc: 'Executar sorteio inteligente de bancas',        route: 'jornada-lottery'    },
  { name: 'Salas',         desc: 'Visualizar salas e bancas do evento',           route: 'jornada-rooms'      },
  { name: 'Perguntas',     desc: 'Configurar perguntas dinâmicas de avaliação',   route: 'jornada-questions'  },
  { name: 'Palavra-Chave', desc: 'Agendar palavras-chave do evento',              route: 'jornada-keywords'   },
  { name: 'Ranking',       desc: 'Visualizar ranking final dos trabalhos',        route: 'jornada-ranking'    },
  { name: 'Configurações', desc: 'Datas, local, setores e salas do evento',       route: 'jornada-config'     },
])

type Config = { eventoNome: string | null; eventoLocal: string | null; datasEvento: string[] | null }
type Stats  = { trabalhos: { total: number; aprovados: number; pendentes: number }; professores: number; salas: number }

const config = ref<Config | null>(null)
const stats  = ref<Stats | null>(null)
const loadingStatus = ref(false)

async function loadStatus() {
  loadingStatus.value = true
  try {
    const [cfgRes, worksRes, profsRes, roomsRes] = await Promise.allSettled([
      client.get('/evidence-journey/config'),
      client.get('/evidence-journey/works?limit=1'),
      client.get('/evidence-journey/professors'),
      client.get('/evidence-journey/lottery/rooms'),
    ])
    if (cfgRes.status === 'fulfilled')   config.value = cfgRes.value.data
    if (worksRes.status === 'fulfilled') {
      const d = worksRes.value.data
      stats.value = {
        trabalhos: { total: d.total ?? 0, aprovados: 0, pendentes: 0 },
        professores: profsRes.status === 'fulfilled' ? (profsRes.value.data?.length ?? 0) : 0,
        salas: roomsRes.status === 'fulfilled' ? (roomsRes.value.data?.length ?? 0) : 0,
      }
    }
  } catch { /* silencioso — dashboard não deve quebrar */ }
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
  <div class="jornada-dashboard">
    <div class="jornada-dashboard__header">
      <h1 class="jornada-dashboard__title">Jornada de Evidências</h1>
      <p class="jornada-dashboard__subtitle">Gerencie todo o fluxo do evento acadêmico</p>
    </div>

    <!-- ── Status do evento ──────────────────────────────────────────── -->
    <div class="evento-status" :class="config?.eventoNome ? 'evento-status--ativo' : 'evento-status--vazio'">
      <div v-if="loadingStatus" class="evento-status__loading">Carregando informações do evento…</div>
      <template v-else-if="config?.eventoNome">
        <div class="evento-status__info">
          <span class="evento-status__badge">● Evento configurado</span>
          <strong class="evento-status__nome">{{ config.eventoNome }}</strong>
          <span v-if="config.eventoLocal" class="evento-status__local">📍 {{ config.eventoLocal }}</span>
        </div>
        <div class="evento-status__datas" v-if="config.datasEvento?.length">
          <span v-for="d in config.datasEvento" :key="d" class="data-chip" :class="{ 'data-chip--proxima': d === proximaData }">
            {{ formatDate(d) }}
          </span>
        </div>
      </template>
      <div v-else class="evento-status__empty">
        ⚠️ Nenhum evento configurado.
        <button class="btn-link" @click="router.push({ name: 'jornada-config' })">Configurar agora</button>
      </div>
    </div>

    <!-- ── Grid de cards ─────────────────────────────────────────────── -->
    <div class="jornada-dashboard__grid">
      <button
        v-for="s in sections"
        :key="s.route"
        class="jornada-card"
        @click="router.push({ name: s.route })"
      >
        <p class="jornada-card__name">{{ s.name }}</p>
        <p class="jornada-card__desc">{{ s.desc }}</p>
      </button>
    </div>
  </div>
</template>

<style scoped>
.jornada-dashboard { padding: 2rem; }
.jornada-dashboard__header { margin-bottom: 1.5rem; }
.jornada-dashboard__title { font-size: 1.75rem; font-weight: 700; color: var(--color-text-primary, #111); margin: 0 0 .25rem; }
.jornada-dashboard__subtitle { color: var(--color-text-secondary, #666); margin: 0; }

/* Status do evento */
.evento-status { border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; }
.evento-status--ativo  { background: #f0fdf4; border: 1px solid #bbf7d0; }
.evento-status--vazio  { background: #fefce8; border: 1px solid #fde68a; }
.evento-status__loading { color: #6b7280; font-size: .9rem; }
.evento-status__info { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem .75rem; margin-bottom: .5rem; }
.evento-status__badge { font-size: .75rem; font-weight: 700; color: #16a34a; text-transform: uppercase; letter-spacing: .04em; }
.evento-status__nome  { font-weight: 700; font-size: 1rem; color: #111; }
.evento-status__local { font-size: .85rem; color: #555; }
.evento-status__datas { display: flex; flex-wrap: wrap; gap: .4rem; }
.data-chip { font-size: .8rem; padding: .2rem .65rem; background: #dcfce7; color: #166534; border-radius: 20px; border: 1px solid #bbf7d0; }
.data-chip--proxima { background: #16a34a; color: #fff; border-color: #16a34a; font-weight: 700; }
.evento-status__empty { font-size: .9rem; color: #92400e; display: flex; align-items: center; gap: .5rem; }
.btn-link { background: none; border: none; cursor: pointer; color: var(--color-primary, #0d631b); font-size: .9rem; font-weight: 700; text-decoration: underline; padding: 0; }

/* Grid de cards */
.jornada-dashboard__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
.jornada-card {
  display: flex; flex-direction: column; gap: .3rem;
  padding: 1.25rem 1.5rem; border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 10px; background: #fff; cursor: pointer;
  text-align: left; transition: box-shadow .15s, border-color .15s;
}
.jornada-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.08); border-color: var(--color-primary, #0d631b); }
.jornada-card__name { font-weight: 600; font-size: .95rem; margin: 0; }
.jornada-card__desc { font-size: .82rem; color: #666; margin: 0; }
</style>
