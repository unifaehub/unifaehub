<script setup lang="ts">
import { computed } from 'vue'
import { useConfirmStore } from '@/stores/confirm'

const confirm = useConfirmStore()

const danger = computed(() => confirm.tone === 'danger')
</script>

<template>
  <div v-if="confirm.open" class="modal-backdrop" role="dialog" aria-modal="true" @click.self="confirm.cancel()">
    <div class="modal">
      <h3 class="h3">{{ confirm.title }}</h3>
      <p class="msg">{{ confirm.message }}</p>
      <div class="actions">
        <button type="button" class="btn btn--ghost" @click="confirm.cancel()">{{ confirm.cancelText }}</button>
        <button type="button" class="btn" :class="danger ? 'btn--danger' : 'btn--pri'" @click="confirm.ok()">
          {{ confirm.confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  /* Camada global: acima de modais de formulário (geralmente 1000+) */
  z-index: 10000;
}

.modal {
  width: 100%;
  max-width: 520px;
  background: var(--uf-surface-container-lowest);
  border-radius: var(--uf-radius-xl);
  outline: 1px solid var(--uf-outline-variant);
  box-shadow: var(--uf-tonal-shadow);
  padding: 1.25rem;
}

.h3 {
  margin: 0 0 0.35rem;
  font-size: 1.05rem;
}

.msg {
  margin: 0.25rem 0 0;
  color: var(--uf-on-surface-variant);
  line-height: 1.5;
  font-size: 0.9rem;
}

.actions {
  margin-top: 0.9rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.55rem 1.1rem;
  border-radius: 999px;
  border: none;
  font-family: var(--uf-font);
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}
.btn--pri {
  background: linear-gradient(90deg, var(--uf-primary), var(--uf-primary-container));
  color: #fff;
}
.btn--danger {
  background: linear-gradient(90deg, var(--uf-error), #b3261e);
  color: #fff;
}
.btn--ghost {
  background: transparent;
  border: 1px solid rgba(191, 202, 186, 0.45);
  color: var(--uf-on-surface-variant);
}
</style>

