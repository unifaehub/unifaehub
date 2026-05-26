<script setup lang="ts">
import MaterialIcon from '@/components/shell/MaterialIcon.vue'
</script>

<template>
  <section class="panel tonal">
    <div class="head">
      <MaterialIcon name="folder_open" class="ico" />
      <div>
        <h3 class="h3">Biblioteca de arquivos</h3>
        <p class="sub">Curso de Publicidade e Propaganda</p>
      </div>
    </div>
    <p class="lead">
      Área reservada para upload de vídeos e arquivos (em desenvolvimento). Aqui você poderá organizar materiais por campanha,
      disciplina ou projeto.
    </p>
  </section>
</template>

<style scoped>
.panel {
  padding: 1.5rem;
  border-radius: var(--uf-radius-xl);
  background: var(--uf-surface-container-lowest);
  box-shadow: var(--uf-tonal-shadow);
}
.head {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}
.ico {
  font-size: 2rem !important;
  color: var(--uf-primary);
}
.h3 {
  margin: 0;
  font-size: 1.1rem;
}
.sub {
  margin: 0.2rem 0 0;
  font-size: 0.75rem;
  color: var(--uf-on-surface-variant);
}
.lead {
  margin: 0;
  line-height: 1.55;
  color: var(--uf-on-surface-variant);
}
</style>
