<script setup lang="ts">
import client from '@/api/client'
import { useRouter } from 'vue-router'
import { useApiRequest } from '@/composables/useApiRequest'
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import UiAsyncPanel from '@/components/ui/UiAsyncPanel.vue'

const router = useRouter()

type CursoStat = { curso: string; total: number; aprovados: number; reprovados: number; pendentes: number }
type DestaqueStat = { curso: string; destaques: number }
type Stats = {
  total: number; aprovados: number; reprovados: number; pendentes: number; inativos: number
  porCurso: CursoStat[]
  destaquesPorCurso: DestaqueStat[]
}

const { data: stats, loading, failed, execute: reload } = useApiRequest<Stats>(async () => {
  const { data } = await client.get('/evidence-journey/works/stats')
  return data
})
reload()

function pct(n: number, total: number) {
  if (!total) return '0%'
  return `${Math.round(n / total * 100)}%`
}
</script>

<template>
  <div class="stats-view">
    <button class="btn-back" @click="router.push({ name: 'jornada-dashboard' })">← Voltar à Jornada</button>
    <h2 class="stats-view__title">Estatísticas de Trabalhos</h2>

    <UiConnectionRetry v-if="failed" @retry="reload" />
    <UiAsyncPanel :loading="loading">
      <template v-if="stats">
        <!-- ── Totais gerais ──────────────────────────────────────────── -->
        <div class="summary-grid">
          <div class="scard scard--total">
            <span class="scard__num">{{ stats.total }}</span>
            <span class="scard__label">Total submetidos</span>
          </div>
          <div class="scard scard--aprov">
            <span class="scard__num">{{ stats.aprovados }}</span>
            <span class="scard__label">Aprovados</span>
            <span class="scard__pct">{{ pct(stats.aprovados, stats.total) }}</span>
          </div>
          <div class="scard scard--reprov">
            <span class="scard__num">{{ stats.reprovados }}</span>
            <span class="scard__label">Reprovados</span>
            <span class="scard__pct">{{ pct(stats.reprovados, stats.total) }}</span>
          </div>
          <div class="scard scard--pend">
            <span class="scard__num">{{ stats.pendentes }}</span>
            <span class="scard__label">Pendentes</span>
            <span class="scard__pct">{{ pct(stats.pendentes, stats.total) }}</span>
          </div>
        </div>

        <!-- ── Por curso ──────────────────────────────────────────────── -->
        <section class="card">
          <h3 class="card__title">Trabalhos por Curso</h3>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Curso</th>
                  <th class="num-col">Submetidos</th>
                  <th class="num-col">Aprovados</th>
                  <th class="num-col">Reprovados</th>
                  <th class="num-col">Pendentes</th>
                  <th class="num-col">% Aprovação</th>
                  <th class="bar-col">Proporção</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in stats.porCurso" :key="r.curso">
                  <td class="curso-cell">{{ r.curso }}</td>
                  <td class="num-col">{{ r.total }}</td>
                  <td class="num-col aprov-num">{{ r.aprovados }}</td>
                  <td class="num-col reprov-num">{{ r.reprovados }}</td>
                  <td class="num-col pend-num">{{ r.pendentes }}</td>
                  <td class="num-col">{{ pct(r.aprovados, r.total) }}</td>
                  <td class="bar-col">
                    <div class="bar-wrap">
                      <div class="bar-aprov" :style="{ width: pct(r.aprovados, r.total) }" />
                    </div>
                  </td>
                </tr>
                <tr v-if="!stats.porCurso.length">
                  <td colspan="7" class="empty-row">Nenhum trabalho cadastrado.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- ── Destaques pós-evento ───────────────────────────────────── -->
        <section class="card">
          <h3 class="card__title">Destaques por Curso — Pós Evento</h3>
          <p class="card__desc">
            Trabalhos eleitos como destaque pelos líderes de sala ao fechar a avaliação.
          </p>
          <div v-if="stats.destaquesPorCurso.length" class="table-wrap">
            <table class="data-table">
              <thead>
                <tr><th>Curso</th><th class="num-col">Destaques</th></tr>
              </thead>
              <tbody>
                <tr v-for="(d, i) in stats.destaquesPorCurso" :key="d.curso">
                  <td>
                    <span v-if="i === 0" class="medal">🥇</span>
                    <span v-else-if="i === 1" class="medal">🥈</span>
                    <span v-else-if="i === 2" class="medal">🥉</span>
                    {{ d.curso }}
                  </td>
                  <td class="num-col">{{ d.destaques }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="empty-hint">Nenhum destaque registrado ainda. Os destaques aparecem após o fechamento das salas.</p>
        </section>
      </template>
    </UiAsyncPanel>
  </div>
</template>

<style scoped>
.btn-back { background: none; border: none; cursor: pointer; color: var(--color-primary, #0d631b); font-size: .85rem; font-weight: 600; padding: 0; margin-bottom: 1rem; display: inline-block; }
.btn-back:hover { text-decoration: underline; }
.stats-view { padding: 1.5rem; }
.stats-view__title { font-size: 1.4rem; font-weight: 700; margin: 0 0 1.5rem; }

/* Summary cards */
.summary-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.scard { display: flex; flex-direction: column; align-items: center; padding: 1.25rem 1rem; border-radius: 12px; }
.scard--total  { background: #f3f4f6; }
.scard--aprov  { background: #dcfce7; }
.scard--reprov { background: #fee2e2; }
.scard--pend   { background: #fef3c7; }
.scard__num   { font-size: 2rem; font-weight: 900; }
.scard--aprov  .scard__num { color: #166534; }
.scard--reprov .scard__num { color: #991b1b; }
.scard--pend   .scard__num { color: #92400e; }
.scard__label { font-size: .78rem; font-weight: 600; text-transform: uppercase; color: #6b7280; margin-top: 4px; }
.scard__pct   { font-size: .85rem; font-weight: 700; color: #374151; margin-top: 2px; }

/* Cards */
.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 1.25rem; margin-bottom: 1.5rem; }
.card__title { font-size: 1rem; font-weight: 600; margin: 0 0 .5rem; }
.card__desc  { font-size: .83rem; color: #6b7280; margin: 0 0 1rem; }

/* Table */
.table-wrap { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: .87rem; }
.data-table th { background: #f9fafb; padding: .5rem .75rem; font-size: .76rem; font-weight: 700; text-transform: uppercase; color: #6b7280; text-align: left; border-bottom: 1px solid #e5e7eb; }
.data-table td { padding: .5rem .75rem; border-bottom: 1px solid #f3f4f6; }
.data-table tr:hover td { background: #f9fafb; }
.num-col   { text-align: right; width: 90px; }
.bar-col   { width: 120px; }
.curso-cell { font-weight: 500; }
.aprov-num  { color: #166534; font-weight: 700; }
.reprov-num { color: #991b1b; font-weight: 700; }
.pend-num   { color: #92400e; }
.bar-wrap   { background: #f3f4f6; border-radius: 4px; height: 8px; overflow: hidden; }
.bar-aprov  { background: #22c55e; height: 100%; border-radius: 4px; transition: width .3s; }
.empty-row  { text-align: center; color: #9ca3af; padding: 1.5rem; }
.empty-hint { font-size: .82rem; color: #9ca3af; margin: 0; }
.medal { margin-right: .3rem; }
</style>
