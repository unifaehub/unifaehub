<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import CourseClinicalMetrics from '@/components/course/CourseClinicalMetrics.vue'
import MaterialIcon from '@/components/shell/MaterialIcon.vue'

const route = useRoute()
const courseId = computed(() => Number(route.params.courseId))
</script>

<template>
  <div class="hub">
    <section class="intro tonal">
      <h3 class="h3">Visão geral do curso</h3>
      <p class="lead">
        Abaixo, indicadores de <strong>prescrições pendentes</strong>, <strong>taxa de adesão</strong> e o
        <strong>gráfico de evolução</strong> referem-se ao ecossistema clínico (fisioterapia) neste curso. Use o menu
        lateral para os demais módulos habilitados.
      </p>
      <ul class="list">
        <li><MaterialIcon name="check_circle" /> Filtros de período aplicam apenas a estes números.</li>
        <li><MaterialIcon name="check_circle" /> Outros perfis de curso podem ter menos itens no menu — configurável pelo administrador.</li>
      </ul>
    </section>

    <CourseClinicalMetrics v-if="Number.isFinite(courseId)" :course-id="courseId" />
  </div>
</template>

<style scoped>
.hub {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.intro {
  padding: 1.5rem;
  border-radius: var(--uf-radius-xl);
  background: var(--uf-surface-container-lowest);
  box-shadow: var(--uf-tonal-shadow);
}
.h3 {
  margin: 0 0 0.75rem;
  font-size: 1.1rem;
}
.lead {
  margin: 0 0 1rem;
  line-height: 1.55;
  color: var(--uf-on-surface-variant);
}
.list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--uf-on-surface);
}
.list li {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}
.tonal {
  box-shadow: var(--uf-tonal-shadow);
}
</style>
