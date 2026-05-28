<script setup lang="ts">
import UiPager from '@/components/ui/UiPager.vue'
import UiConnectionRetry from '@/components/ui/UiConnectionRetry.vue'
import UiAsyncPanel from '@/components/ui/UiAsyncPanel.vue'
import client from '@/api/client'
import { ref, watch } from 'vue'
import { useApiRequest } from '@/composables/useApiRequest'
import type { Paged } from '@/types/pagination'

type RankingRow = {
  trabalhoId: number
  titulo: string
  cursoTrabalho: string
  alunoNome: string
  score: number
}

const page = ref(1)
const limit = ref(20)

const { data, loading, failed, execute } = useApiRequest<Paged<RankingRow>>(async () => {
  const { data } = await client.get(`/evidence-journey/ranking?page=${page.value}&limit=${limit.value}`)
  return data
})

watch([page, limit], execute, { immediate: true })
</script>

<template>
  <div class="ranking-view">
    <h2 class="ranking-view__title">Ranking Final — Jornada de Evidências</h2>
    <p class="ranking-view__formula">
      Score = (Melhor da Sala × 5) + (Média Apresentação × 2) + (Média Resumo × 1)
    </p>

    <UiConnectionRetry v-if="failed" @retry="execute" />

    <UiAsyncPanel :loading="loading">
      <table class="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Trabalho</th>
            <th>Curso</th>
            <th>Aluno</th>
            <th class="th-score">Score</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(r, idx) in data?.data ?? []"
            :key="r.trabalhoId"
            :class="{ 'tr--top3': idx < 3 }"
          >
            <td class="td-position">
              <span v-if="idx === 0" class="medal medal--gold">🥇</span>
              <span v-else-if="idx === 1" class="medal medal--silver">🥈</span>
              <span v-else-if="idx === 2" class="medal medal--bronze">🥉</span>
              <span v-else>{{ (page - 1) * limit + idx + 1 }}º</span>
            </td>
            <td class="td-title">{{ r.titulo }}</td>
            <td>{{ r.cursoTrabalho }}</td>
            <td>{{ r.alunoNome }}</td>
            <td class="td-score">{{ r.score.toFixed(2) }}</td>
          </tr>
          <tr v-if="!loading && !data?.data.length">
            <td colspan="5" class="empty-row">Nenhum trabalho avaliado ainda.</td>
          </tr>
        </tbody>
      </table>

      <UiPager v-if="data" :page="page" :limit="limit" :total="data.total" @update:page="page = $event" />
    </UiAsyncPanel>
  </div>
</template>

<style scoped>
.ranking-view { padding: 1.5rem; }
.ranking-view__title { font-size: 1.4rem; font-weight: 700; margin: 0 0 .35rem; }
.ranking-view__formula { font-size: .82rem; color: #6b7280; background: #f3f4f6; padding: .5rem 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-family: monospace; }
.data-table { width: 100%; border-collapse: collapse; font-size: .9rem; }
.data-table th, .data-table td { padding: .6rem .75rem; border-bottom: 1px solid #f3f4f6; text-align: left; }
.data-table th { background: #f9fafb; font-weight: 600; font-size: .78rem; text-transform: uppercase; color: #6b7280; }
.th-score { text-align: right; }
.tr--top3 { background: #fefce8; }
.td-position { font-weight: 700; width: 60px; }
.td-title { max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.td-score { text-align: right; font-weight: 700; font-size: 1rem; color: var(--color-primary, #0d631b); }
.medal { font-size: 1.3rem; }
.empty-row { text-align: center; color: #9ca3af; padding: 3rem; }
</style>
