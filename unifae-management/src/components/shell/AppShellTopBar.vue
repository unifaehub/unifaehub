<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import MaterialIcon from './MaterialIcon.vue'

const route = useRoute()

const placeholder = computed(
  () => (route.meta.searchPlaceholder as string | undefined) ?? 'Buscar…',
)
</script>

<template>
  <header class="topbar">
    <div class="topbar__search">
      <MaterialIcon name="search" class="topbar__search-icon" />
      <input type="search" class="topbar__input" :placeholder="placeholder" />
    </div>
    <div class="topbar__actions">
      <button type="button" class="topbar__icon-btn" aria-label="Notificações">
        <MaterialIcon name="notifications" />
      </button>
      <button type="button" class="topbar__icon-btn" aria-label="Ajuda">
        <MaterialIcon name="help" />
      </button>
      <span class="topbar__sep" />
      <slot name="logout" />
    </div>
  </header>
</template>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 2rem;
  background: rgba(248, 250, 251, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  font-family: var(--uf-font);
}

.topbar__search {
  position: relative;
  flex: 1;
  max-width: 20rem;
}

.topbar__search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.1rem !important;
  color: var(--uf-on-surface-variant);
  opacity: 0.7;
  pointer-events: none;
}

.topbar__input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.5rem 1rem 0.5rem 2.5rem;
  border: none;
  border-radius: 999px;
  font-family: var(--uf-font);
  font-size: 0.875rem;
  background: var(--uf-surface-container-high, #e6e8e9);
  color: var(--uf-on-surface);
  outline: none;
  transition: box-shadow 0.15s ease;
}

.topbar__input:focus {
  box-shadow: 0 0 0 2px rgba(13, 99, 27, 0.2);
}

.topbar__input::placeholder {
  color: var(--uf-on-surface-variant);
  opacity: 0.75;
}

.topbar__actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.topbar__icon-btn {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--uf-on-surface-variant);
  cursor: pointer;
  transition: color 0.15s ease;
}

.topbar__icon-btn:hover {
  color: var(--uf-primary);
}

.topbar__sep {
  width: 1px;
  height: 1.5rem;
  margin: 0 0.5rem;
  background: rgba(191, 202, 186, 0.35);
}
</style>
