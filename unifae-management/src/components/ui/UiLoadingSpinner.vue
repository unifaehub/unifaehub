<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
    size?: string
  }>(),
  {
    label: 'Carregando',
    size: '1.5rem',
  },
)
</script>

<template>
  <span class="wrap" role="status" :aria-label="label">
    <span class="spinner" :style="{ width: size, height: size }" aria-hidden="true" />
    <span class="sr-only">{{ label }}</span>
  </span>
</template>

<style scoped>
.wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.spinner {
  display: inline-block;
  border: 2px solid var(--uf-surface-container-high, #e6e8e9);
  border-top-color: var(--uf-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>
