<script setup lang="ts">
import { computed } from 'vue'
import MaterialIcon from '@/components/shell/MaterialIcon.vue'

const props = defineProps<{
  level: 'RED' | 'YELLOW' | 'GREEN' | 'PENDING'
  label?: boolean
}>()

const config = computed(() => {
  switch (props.level) {
    case 'RED':
      return { color: '#ba1a1a', icon: 'flag', text: 'Crítico' }
    case 'YELLOW':
      return { color: '#f9a825', icon: 'flag', text: 'Moderado' }
    case 'GREEN':
      return { color: '#0d631b', icon: 'flag', text: 'Estável' }
    default:
      return { color: '#70787a', icon: 'pending', text: 'Pendente' }
  }
})
</script>

<template>
  <div class="risk-badge" :title="config.text" :style="{ '--badge-color': config.color }">
    <MaterialIcon :name="config.icon" size="1.1rem" />
    <span v-if="label" class="risk-label">{{ config.text }}</span>
  </div>
</template>

<style scoped>
.risk-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--badge-color);
  font-weight: 600;
  font-size: 0.85rem;
}

.risk-label {
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
</style>
