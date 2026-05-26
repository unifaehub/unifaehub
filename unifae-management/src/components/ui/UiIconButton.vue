<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import MaterialIcon from '@/components/shell/MaterialIcon.vue'

export type UiIconButtonVariant = 'default' | 'danger' | 'success' | 'warn' | 'doc' | 'primary'

const props = withDefaults(
  defineProps<{
    icon: string
    label: string
    variant?: UiIconButtonVariant
    disabled?: boolean
    size?: string
    href?: string
    to?: RouteLocationRaw
  }>(),
  { variant: 'default', disabled: false, size: '1.15rem' },
)

const emit = defineEmits<{ click: [MouseEvent] }>()

const variantClass = computed(() =>
  props.variant === 'default' ? undefined : `ui-ibtn--${props.variant}`,
)

function onClick(e: MouseEvent) {
  emit('click', e)
}
</script>

<template>
  <RouterLink
    v-if="to != null"
    class="ui-ibtn"
    :class="variantClass"
    :to="to"
    :title="label"
    :aria-label="label"
  >
    <MaterialIcon :name="icon" :size="size" />
  </RouterLink>
  <a
    v-else-if="href"
    class="ui-ibtn"
    :class="variantClass"
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    :title="label"
    :aria-label="label"
  >
    <MaterialIcon :name="icon" :size="size" />
  </a>
  <button
    v-else
    type="button"
    class="ui-ibtn"
    :class="variantClass"
    :title="label"
    :aria-label="label"
    :disabled="disabled"
    @click="onClick"
  >
    <MaterialIcon :name="icon" :size="size" />
  </button>
</template>

<style scoped>
.ui-ibtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--uf-on-surface-variant);
  padding: 0.3rem;
  border-radius: 0.35rem;
  text-decoration: none;
  line-height: 1;
  flex-shrink: 0;
  font-family: inherit;
}
.ui-ibtn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.06);
}
.ui-ibtn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.ui-ibtn--danger {
  color: #b3261e;
}
.ui-ibtn--danger:hover:not(:disabled) {
  background: rgba(179, 38, 30, 0.1);
}
.ui-ibtn--success,
.ui-ibtn--primary {
  color: var(--uf-primary);
}
.ui-ibtn--success:hover:not(:disabled),
.ui-ibtn--primary:hover:not(:disabled) {
  background: rgba(13, 99, 27, 0.1);
}
.ui-ibtn--warn {
  color: #9a6700;
}
.ui-ibtn--warn:hover:not(:disabled) {
  background: rgba(154, 103, 0, 0.12);
}
.ui-ibtn--doc {
  color: var(--uf-primary-container, var(--uf-primary));
}
.ui-ibtn--doc:hover:not(:disabled) {
  background: rgba(13, 99, 27, 0.08);
}
</style>
