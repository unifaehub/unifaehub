<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppShellSidebar from '@/components/shell/AppShellSidebar.vue'
import AppShellTopBar from '@/components/shell/AppShellTopBar.vue'
import UiToastHost from '@/components/ui/UiToastHost.vue'
import UiConfirmHost from '@/components/ui/UiConfirmHost.vue'

const auth = useAuthStore()
const router = useRouter()

onMounted(() => {
  if (!auth.user) void auth.fetchMe()
})

function logout() {
  auth.logout()
  void router.push({ name: 'login' })
}
</script>

<template>
  <div class="app-shell">
    <AppShellSidebar />
    <div class="app-shell__main">
      <AppShellTopBar>
        <template #logout>
          <button type="button" class="btn-logout" @click="logout">Logout</button>
        </template>
      </AppShellTopBar>
      <UiToastHost />
      <UiConfirmHost />
      <div class="app-shell__well">
        <RouterView />
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: var(--uf-bg);
}

.app-shell__main {
  margin-left: 16rem;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-shell__well {
  flex: 1;
  padding: 2rem;
  background: var(--uf-surface-container-low);
  min-height: calc(100vh - 4.5rem);
}

.btn-logout {
  padding: 0.45rem 1rem;
  border: none;
  border-radius: 999px;
  font-family: var(--uf-font);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--uf-primary);
  background: transparent;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn-logout:hover {
  background: rgba(46, 125, 50, 0.1);
}
</style>
