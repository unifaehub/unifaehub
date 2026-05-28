<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const sections = ref([
  { name: 'Trabalhos', desc: 'Moderar e aprovar trabalhos submetidos', route: 'jornada-works' },
  { name: 'Professores', desc: 'Gerenciar professores e disponibilidades', route: 'jornada-professors' },
  { name: 'Sorteio', desc: 'Executar sorteio inteligente de bancas', route: 'jornada-lottery' },
  { name: 'Salas', desc: 'Visualizar salas e bancas do evento', route: 'jornada-rooms' },
  { name: 'Perguntas', desc: 'Configurar perguntas dinâmicas de avaliação', route: 'jornada-questions' },
  { name: 'Palavra-Chave', desc: 'Agendar palavras-chave do evento', route: 'jornada-keywords' },
  { name: 'Ranking', desc: 'Visualizar ranking final dos trabalhos', route: 'jornada-ranking' },
  { name: 'Configurações', desc: 'Datas, local, setores e salas do evento', route: 'jornada-config' },
])
</script>

<template>
  <div class="jornada-dashboard">
    <div class="jornada-dashboard__header">
      <h1 class="jornada-dashboard__title">Jornada de Evidências</h1>
      <p class="jornada-dashboard__subtitle">Gerencie todo o fluxo do evento acadêmico</p>
    </div>

    <div class="jornada-dashboard__grid">
      <button
        v-for="s in sections"
        :key="s.route"
        class="jornada-card"
        @click="router.push({ name: s.route })"
      >
        <p class="jornada-card__name">{{ s.name }}</p>
        <p class="jornada-card__desc">{{ s.desc }}</p>
      </button>
    </div>
  </div>
</template>

<style scoped>
.jornada-dashboard { padding: 2rem; }
.jornada-dashboard__header { margin-bottom: 2rem; }
.jornada-dashboard__title { font-size: 1.75rem; font-weight: 700; color: var(--color-text-primary, #111); margin: 0 0 .25rem; }
.jornada-dashboard__subtitle { color: var(--color-text-secondary, #666); margin: 0; }
.jornada-dashboard__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
.jornada-card {
  display: flex; flex-direction: column; gap: .3rem;
  padding: 1.25rem 1.5rem; border: 1px solid var(--color-border, #e0e0e0);
  border-radius: 10px; background: #fff; cursor: pointer;
  text-align: left; transition: box-shadow .15s, border-color .15s;
}
.jornada-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.08); border-color: var(--color-primary, #0d631b); }
.jornada-card__name { font-weight: 600; font-size: .95rem; margin: 0; }
.jornada-card__desc { font-size: .82rem; color: #666; margin: 0; }
</style>
