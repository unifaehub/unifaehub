<script setup lang="ts">
import { computed } from 'vue'
import { useToastStore } from '@/stores/toast'
import MaterialIcon from '@/components/shell/MaterialIcon.vue'

const toast = useToastStore()

const items = computed(() => toast.items.slice(0, 4))

function iconFor(kind: string) {
  if (kind === 'success') return 'check_circle'
  if (kind === 'error') return 'error'
  return 'info'
}
</script>

<template>
  <div class="toast-host" aria-live="polite" aria-relevant="additions removals">
    <div v-for="t in items" :key="t.id" class="toast" :class="`toast--${t.kind}`" role="status">
      <MaterialIcon :name="iconFor(t.kind)" filled size="1.15rem" />
      <p class="toast__msg">{{ t.message }}</p>
      <button type="button" class="toast__x" aria-label="Fechar" @click="toast.remove(t.id)">×</button>
    </div>
  </div>
</template>

<style scoped>
.toast-host {
  position: fixed;
  top: 0.9rem;
  right: 1rem;
  left: auto;
  padding: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
  pointer-events: none;
  max-width: min(420px, calc(100vw - 2rem));
}

.toast {
  pointer-events: auto;
  display: grid;
  grid-template-columns: 1.25rem 1fr 1.25rem;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.7rem 0.85rem;
  border-radius: var(--uf-radius-xl);
  box-shadow: var(--uf-tonal-shadow);
}

.toast__msg {
  margin: 0;
  font-size: 0.85rem;
  color: var(--uf-on-surface);
  line-height: 1.35;
}

.toast__x {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0.1rem;
  font-size: 1.05rem;
  line-height: 1;
  color: var(--uf-on-surface-variant);
}

.toast--success {
  background: #e8f5e9;
  outline: 1px solid rgba(46, 125, 50, 0.35);
  color: var(--uf-on-surface);
}
.toast--success .toast__msg {
  color: #1b5e20;
}
.toast--error {
  background: #ffebee;
  outline: 1px solid rgba(186, 26, 26, 0.35);
  color: var(--uf-on-surface);
}
.toast--error .toast__msg {
  color: #b71c1c;
}
.toast--info {
  background: var(--uf-surface-container-lowest);
  outline: 1px solid var(--uf-outline-variant);
}
</style>

