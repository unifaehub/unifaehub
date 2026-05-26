<script setup lang="ts">
import UiSkeletonBlock from '@/components/ui/UiSkeletonBlock.vue'
</script>

<template>
  <div class="sk" aria-busy="true" aria-label="Carregando painel">
    <div class="sk-head">
      <div class="sk-title">
        <UiSkeletonBlock width="14rem" height="1.75rem" />
        <UiSkeletonBlock width="22rem" height="0.85rem" class="mt" />
      </div>
      <UiSkeletonBlock width="12rem" height="2.25rem" radius="999px" />
    </div>
    <div class="kpi">
      <div v-for="i in 4" :key="i" class="kpi-card">
        <UiSkeletonBlock width="2.5rem" height="2.5rem" radius="var(--uf-radius-md)" />
        <UiSkeletonBlock width="5rem" height="0.65rem" class="mt-sm" />
        <UiSkeletonBlock width="4rem" height="1.5rem" class="mt-sm" />
      </div>
    </div>
    <div class="row">
      <div class="chart">
        <UiSkeletonBlock width="40%" height="1rem" />
        <UiSkeletonBlock width="100%" height="12rem" radius="var(--uf-radius-xl)" class="mt" />
      </div>
      <div class="side">
        <UiSkeletonBlock width="50%" height="1rem" />
        <UiSkeletonBlock v-for="j in 4" :key="j" width="100%" height="2rem" class="mt-sm" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.sk {
  font-family: var(--uf-font);
}
.sk-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 2rem;
}
.sk-title {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.mt {
  margin-top: 0.35rem;
}
.kpi {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}
.kpi-card {
  padding: 1.5rem;
  border-radius: var(--uf-radius-xl);
  background: var(--uf-surface-container-lowest);
  outline: 1px solid var(--uf-outline-variant);
  box-shadow: var(--uf-tonal-shadow);
}
.mt-sm {
  margin-top: 0.65rem;
  display: block;
}
.row {
  display: grid;
  grid-template-columns: 1fr minmax(240px, 320px);
  gap: 1.5rem;
}
@media (max-width: 960px) {
  .row {
    grid-template-columns: 1fr;
  }
}
.chart,
.side {
  padding: 1.5rem;
  border-radius: var(--uf-radius-xl);
  background: var(--uf-surface-container-lowest);
  outline: 1px solid var(--uf-outline-variant);
  box-shadow: var(--uf-tonal-shadow);
}
.mt {
  margin-top: 1rem;
  display: block;
}
</style>
