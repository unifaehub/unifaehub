<script setup lang="ts">
import MaterialIcon from '@/components/shell/MaterialIcon.vue'
</script>

<template>
  <div class="page">
    <header class="head">
      <div>
        <h1 class="title">Configurações</h1>
        <p class="sub">Preferências do painel, integrações e políticas (escopo futuro).</p>
      </div>
    </header>
    <div class="list">
      <button type="button" class="item tonal">
        <MaterialIcon name="tune" />
        <span>Geral</span>
        <MaterialIcon name="chevron_right" class="chev" />
      </button>
      <button type="button" class="item tonal">
        <MaterialIcon name="notifications_active" />
        <span>Notificações</span>
        <MaterialIcon name="chevron_right" class="chev" />
      </button>
      <button type="button" class="item tonal">
        <MaterialIcon name="shield_lock" />
        <span>Segurança e sessão</span>
        <MaterialIcon name="chevron_right" class="chev" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.page {
  font-family: var(--uf-font);
  color: var(--uf-on-surface);
}
.head {
  margin-bottom: 1.5rem;
}
.title {
  margin: 0;
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}
.sub {
  margin: 0.35rem 0 0;
  color: var(--uf-on-surface-variant);
}
.list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 28rem;
}
.item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 1rem 1.25rem;
  border: none;
  border-radius: var(--uf-radius-xl);
  background: var(--uf-surface-container-lowest);
  font-family: var(--uf-font);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--uf-on-surface);
  cursor: pointer;
  text-align: left;
}
.tonal {
  box-shadow: var(--uf-tonal-shadow);
}
.item:hover {
  background: #fff;
}
.item span {
  flex: 1;
}
.chev {
  color: var(--uf-on-surface-variant);
  opacity: 0.6;
}
</style>
