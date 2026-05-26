<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import client from '@/api/client'

type CourseDetail = { id: number; name: string; active: boolean; app?: { id: number; name: string } | null }

const route = useRoute()
const courseId = computed(() => Number(route.params.courseId))
const course = ref<CourseDetail | null>(null)

async function load() {
  if (!Number.isFinite(courseId.value)) return
  const { data } = await client.get<CourseDetail>(`/courses/${courseId.value}`)
  course.value = data
}

onMounted(() => void load())
watch(courseId, () => void load())
</script>

<template>
  <div class="course-scope">
    <p class="crumb">Curso</p>
    <h2 class="title">{{ course?.name ?? 'Carregando…' }}</h2>
    <p v-if="course?.app" class="sub">App: {{ course.app.name }}</p>
    <div class="well">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.course-scope {
  font-family: var(--uf-font);
  color: var(--uf-on-surface);
}
.crumb {
  margin: 0 0 0.25rem;
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--uf-on-surface-variant);
}
.title {
  margin: 0 0 0.35rem;
  font-size: 1.5rem;
  font-weight: 800;
}
.sub {
  margin: 0 0 1rem;
  font-size: 0.85rem;
  color: var(--uf-on-surface-variant);
}
.well {
  margin-top: 1rem;
}
</style>
