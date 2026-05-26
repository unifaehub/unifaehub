<script setup lang="ts">
withDefaults(
  defineProps<{
    name: string
    filled?: boolean
    size?: string
  }>(),
  { filled: false, size: '1.25rem' },
)
</script>

<template>
  <span
    class="material-symbols-outlined"
    :class="{ 'material-symbols-outlined--fill': filled }"
    :style="{ fontSize: size }"
  >{{ name }}</span>
</template>
