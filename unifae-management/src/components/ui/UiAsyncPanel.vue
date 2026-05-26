<script setup lang="ts">
import UiLoadingSpinner from '@/components/ui/UiLoadingSpinner.vue'

withDefaults(
  defineProps<{
    loading?: boolean
    label?: string
  }>(),
  {
    loading: false,
    label: 'Carregando…',
  },
)
</script>

<template>
  <div class="async-panel" :class="{ 'async-panel--busy': loading }" :aria-busy="loading">
    <slot />
    <div v-if="loading" class="async-panel__veil" role="status" :aria-label="label">
      <UiLoadingSpinner />
      <span class="async-panel__lbl">{{ label }}</span>
    </div>
  </div>
</template>

<style scoped>
.async-panel {
  position: relative;
  min-height: 2.5rem;
}
.async-panel--busy :deep(> *:not(.async-panel__veil)) {
  opacity: 0.45;
  pointer-events: none;
  user-select: none;
}
.async-panel__veil {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.55);
  border-radius: inherit;
  pointer-events: none;
}
.async-panel__lbl {
  font-size: 0.82rem;
  color: var(--uf-on-surface-variant);
  font-weight: 600;
}
</style>
