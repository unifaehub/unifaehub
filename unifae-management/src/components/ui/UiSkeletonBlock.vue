<script setup lang="ts">
withDefaults(
  defineProps<{
    width?: string
    height?: string
    radius?: string
  }>(),
  {
    width: '100%',
    height: '1rem',
    radius: 'var(--uf-radius-md)',
  },
)
</script>

<template>
  <span
    class="skel"
    :style="{ width, height, borderRadius: radius }"
    aria-hidden="true"
  />
</template>

<style scoped>
.skel {
  display: inline-block;
  vertical-align: middle;
  background: linear-gradient(
    90deg,
    var(--uf-surface-container-low) 0%,
    var(--uf-surface-container-high, #e6e8e9) 50%,
    var(--uf-surface-container-low) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}
</style>
