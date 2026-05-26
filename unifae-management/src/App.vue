<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
</script>

<template>
  <RouterView />
  <Transition name="route-loading-fade">
    <div
      v-if="ui.routeSpinnerVisible"
      class="route-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span class="route-loading__label visually-hidden">Carregando página…</span>
      <div class="route-loading__spinner" aria-hidden="true" />
    </div>
  </Transition>
</template>

<style scoped>
.route-loading {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Indicador visual apenas — não bloqueia cliques nem interação do navegador. */
  pointer-events: none;
  background: rgba(248, 250, 251, 0.45);
}

.route-loading__spinner {
  width: 2.25rem;
  height: 2.25rem;
  border: 3px solid rgba(13, 99, 27, 0.2);
  border-top-color: var(--uf-primary);
  border-radius: 50%;
  animation: route-loading-spin 0.7s linear infinite;
}

@keyframes route-loading-spin {
  to {
    transform: rotate(360deg);
  }
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.route-loading-fade-enter-active,
.route-loading-fade-leave-active {
  transition: opacity 0.18s ease;
}

.route-loading-fade-enter-from,
.route-loading-fade-leave-to {
  opacity: 0;
}
</style>
