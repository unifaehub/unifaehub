<script setup lang="ts">
import MaterialIcon from '@/components/shell/MaterialIcon.vue'

defineEmits<{
  retry: []
}>()
</script>

<template>
  <div class="box" role="status">
    <MaterialIcon name="cloud_off" class="ico" />
    <p class="txt">Algo impediu o carregamento. Você pode tentar de novo.</p>
    <button type="button" class="btn" @click="$emit('retry')">
      <MaterialIcon name="refresh" size="1rem" />
      Tentar novamente
    </button>
  </div>
</template>

<style scoped>
.box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem 1rem;
  text-align: center;
  border-radius: var(--uf-radius-xl);
  background: var(--uf-surface-container-lowest);
  outline: 1px solid var(--uf-outline-variant);
  box-shadow: var(--uf-tonal-shadow);
}

.ico {
  font-size: 2rem !important;
  color: var(--uf-on-surface-variant);
  opacity: 0.85;
}

.txt {
  margin: 0;
  font-size: 0.875rem;
  color: var(--uf-on-surface-variant);
  max-width: 22rem;
  line-height: 1.45;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 999px;
  font-family: var(--uf-font);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--uf-primary);
  background: rgba(13, 99, 27, 0.08);
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn:hover {
  background: rgba(13, 99, 27, 0.14);
}
</style>
