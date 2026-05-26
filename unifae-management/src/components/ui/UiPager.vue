<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    page: number
    limit: number
    total: number
    loading?: boolean
  }>(),
  { loading: false },
)

const emit = defineEmits<{ 'update:page': [value: number] }>()

const totalPages = computed(() => (props.total <= 0 ? 1 : Math.ceil(props.total / props.limit)))

const rangeFrom = computed(() => {
  if (props.total <= 0) return 0
  return (props.page - 1) * props.limit + 1
})

const rangeTo = computed(() => Math.min(props.page * props.limit, props.total))

function go(p: number) {
  const next = Math.min(totalPages.value, Math.max(1, p))
  if (next !== props.page) emit('update:page', next)
}
</script>

<template>
  <div v-if="total > 0" class="pager" role="navigation" aria-label="Paginação">
    <span class="pager__meta">{{ rangeFrom }}–{{ rangeTo }} de {{ total }}</span>
    <div class="pager__btns">
      <button type="button" class="pager__btn" :disabled="page <= 1 || loading" @click="go(page - 1)">
        Anterior
      </button>
      <span class="pager__page">Página {{ page }} / {{ totalPages }}</span>
      <button
        type="button"
        class="pager__btn"
        :disabled="page >= totalPages || loading"
        @click="go(page + 1)"
      >
        Próxima
      </button>
    </div>
  </div>
</template>

<style scoped>
.pager {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(191, 202, 186, 0.25);
  font-size: 0.8rem;
  color: var(--uf-on-surface-variant);
}
.pager__meta {
  font-weight: 600;
}
.pager__btns {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.pager__page {
  font-weight: 700;
  color: var(--uf-on-surface);
  padding: 0 0.35rem;
}
.pager__btn {
  border: none;
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  font-family: var(--uf-font);
  font-size: 0.75rem;
  font-weight: 800;
  cursor: pointer;
  color: var(--uf-primary);
  background: rgba(13, 99, 27, 0.08);
}
.pager__btn:hover:not(:disabled) {
  background: rgba(13, 99, 27, 0.14);
}
.pager__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
