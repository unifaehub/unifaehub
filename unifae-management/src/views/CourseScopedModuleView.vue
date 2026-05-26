<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import client from '@/api/client'
import type { CourseNavigationItem } from '@/config/courseNavigation'
import CourseLibraryView from '@/views/CourseLibraryView.vue'
import ExercisesView from '@/views/ExercisesView.vue'
import PatientsView from '@/views/PatientsView.vue'
import PrescriptionsView from '@/views/PrescriptionsView.vue'
import ApprovalsView from '@/views/ApprovalsView.vue'
import PatientHistoryView from '@/views/PatientHistoryView.vue'
import AppointmentsView from '@/views/AppointmentsView.vue'
import CareLocationsView from '@/views/CareLocationsView.vue'

const route = useRoute()

const courseId = computed(() => Number(route.params.courseId))
const menuNodeId = computed(() => Number(route.params.menuNodeId))

const title = ref('')
const hint = ref('')
const navKey = ref<string | null>(null)

const DEFAULT_HINT =
  'Item de menu vinculado a este curso no catálogo. Conteúdo específico pode ser ligado por chave no hub.'

const HINTS: Record<string, string> = {
  approvals: 'Fila de prescrições pendentes e histórico de decisões neste curso.',
  'patient-history':
    'Linha do tempo: cadastro, vínculos, episódios, prescrições, decisões e dias com prática de exercícios.',
  appointments:
    'Agenda semanal: estagiário vê só a própria; coordenação vê a sua e pode acompanhar estagiários; administrador filtra por profissional.',
  'care-locations':
    'Cadastro de locais presenciais (endereço completo) vinculados a este curso. Apenas administradores podem criar, editar e excluir.',
}

type CourseScopeRow = {
  id: number
  name: string
  appId?: number | null
  app?: { id: number; name: string } | null
}

const courseScope = ref<CourseScopeRow | null>(null)
const courseScopeLoading = ref(false)

const exerciseAppId = computed((): number | null => {
  const c = courseScope.value
  if (!c) return null
  const id = c.app?.id ?? c.appId
  return id != null && Number.isFinite(Number(id)) ? Number(id) : null
})

async function loadFromNavigation() {
  if (!Number.isFinite(courseId.value) || !Number.isFinite(menuNodeId.value)) {
    title.value = ''
    hint.value = ''
    navKey.value = null
    return
  }
  try {
    const { data } = await client.get<CourseNavigationItem[]>(`/courses/${courseId.value}/navigation`)
    const hit = data.find((i) => i.menuNodeId === menuNodeId.value)
    navKey.value = hit?.key ?? null
    title.value = hit?.label ?? 'Módulo'
    const k = hit?.key
    hint.value = (k && HINTS[k]) || (route.meta.hint as string) || DEFAULT_HINT
  } catch {
    title.value = 'Módulo'
    hint.value = ''
    navKey.value = null
  }
}

async function loadCourseScope() {
  if (!Number.isFinite(courseId.value)) {
    courseScope.value = null
    return
  }
  courseScopeLoading.value = true
  try {
    const { data } = await client.get<CourseScopeRow>(`/courses/${courseId.value}`)
    courseScope.value = data
  } catch {
    courseScope.value = null
  } finally {
    courseScopeLoading.value = false
  }
}

onMounted(() => {
  void loadFromNavigation()
  void loadCourseScope()
})

watch([courseId, menuNodeId], () => {
  void loadFromNavigation()
})

watch(courseId, () => {
  void loadCourseScope()
})
</script>

<template>
  <CourseLibraryView v-if="navKey === 'library'" />

  <template v-else-if="navKey === 'patients'">
    <p v-if="courseScopeLoading" class="muted pad">Carregando pacientes…</p>
    <section v-else-if="!courseScope" class="panel tonal">
      <h3 class="h3">Pacientes</h3>
      <p class="lead">Não foi possível carregar os dados do curso.</p>
    </section>
    <section v-else-if="exerciseAppId == null" class="panel tonal">
      <h3 class="h3">Pacientes</h3>
      <p class="lead">
        Este curso não tem <strong>app</strong> vinculado. Associe um app em <strong>Cursos</strong> para cadastrar
        pacientes com acesso ao aplicativo.
      </p>
    </section>
    <PatientsView
      v-else
      embedded-in-course
      :course-app-id="exerciseAppId"
      :course-scope-id="courseScope.id"
    />
  </template>

  <template v-else-if="navKey === 'patient-history'">
    <p v-if="courseScopeLoading" class="muted pad">Carregando história…</p>
    <section v-else-if="!courseScope" class="panel tonal">
      <h3 class="h3">História do paciente</h3>
      <p class="lead">Não foi possível carregar os dados do curso.</p>
    </section>
    <section v-else-if="exerciseAppId == null" class="panel tonal">
      <h3 class="h3">História do paciente</h3>
      <p class="lead">
        Este curso não tem <strong>app</strong> vinculado. Associe um app em <strong>Cursos</strong>.
      </p>
    </section>
    <PatientHistoryView
      v-else
      embedded-in-course
      :course-app-id="exerciseAppId"
      :course-scope-id="courseScope.id"
    />
  </template>

  <template v-else-if="navKey === 'prescriptions'">
    <p v-if="courseScopeLoading" class="muted pad">Carregando prescrições…</p>
    <section v-else-if="!courseScope" class="panel tonal">
      <h3 class="h3">Prescrições</h3>
      <p class="lead">Não foi possível carregar os dados do curso.</p>
    </section>
    <section v-else-if="exerciseAppId == null" class="panel tonal">
      <h3 class="h3">Prescrições</h3>
      <p class="lead">
        Este curso não tem <strong>app</strong> vinculado. Associe um app em <strong>Cursos</strong>.
      </p>
    </section>
    <PrescriptionsView
      v-else
      embedded-in-course
      :course-app-id="exerciseAppId"
      :course-scope-id="courseScope.id"
    />
  </template>

  <template v-else-if="navKey === 'care-locations'">
    <p v-if="courseScopeLoading" class="muted pad">Carregando locais…</p>
    <CareLocationsView
      v-else-if="courseScope && exerciseAppId != null"
      embedded-in-course
      :course-app-id="exerciseAppId"
      :course-scope-id="courseScope.id"
    />
    <section v-else class="panel tonal">
      <h3 class="h3">Locais de atendimento</h3>
      <p class="lead">Associe um app ao curso para gerenciar os locais presenciais.</p>
    </section>
  </template>

  <template v-else-if="navKey === 'appointments'">
    <p v-if="courseScopeLoading" class="muted pad">Carregando agenda…</p>
    <AppointmentsView
      v-else-if="courseScope && exerciseAppId != null"
      embedded-in-course
      :course-app-id="exerciseAppId"
      :course-scope-id="courseScope.id"
    />
    <section v-else class="panel tonal">
      <h3 class="h3">Agenda</h3>
      <p class="lead">Associe um app ao curso para gerenciar agendamentos.</p>
    </section>
  </template>

  <template v-else-if="navKey === 'approvals'">
    <p v-if="courseScopeLoading" class="muted pad">Carregando aprovações…</p>
    <section v-else-if="!courseScope" class="panel tonal">
      <h3 class="h3">Aprovações</h3>
      <p class="lead">Não foi possível carregar os dados do curso.</p>
    </section>
    <section v-else-if="exerciseAppId == null" class="panel tonal">
      <h3 class="h3">Aprovações</h3>
      <p class="lead">
        Este curso não tem <strong>app</strong> vinculado. Associe um app em <strong>Cursos</strong>.
      </p>
    </section>
    <ApprovalsView
      v-else
      embedded-in-course
      :course-app-id="exerciseAppId"
      :course-scope-id="courseScope.id"
    />
  </template>

  <template v-else-if="navKey === 'exercises'">
    <p v-if="courseScopeLoading" class="muted pad">Carregando exercícios…</p>
    <section v-else-if="!courseScope" class="panel tonal">
      <h3 class="h3">Exercícios</h3>
      <p class="lead">Não foi possível carregar os dados do curso.</p>
    </section>
    <section v-else-if="exerciseAppId == null" class="panel tonal">
      <h3 class="h3">Exercícios</h3>
      <p class="lead">
        Este curso não tem <strong>app</strong> vinculado. Associe um app em <strong>Cursos</strong> para usar a
        biblioteca de exercícios (a mesma de <code>/exercicios</code> no menu principal).
      </p>
    </section>
    <ExercisesView
      v-else
      embedded-in-course
      :course-app-id="exerciseAppId"
      :course-scope-id="courseScope.id"
    />
  </template>

  <section v-else class="panel tonal">
    <h3 class="h3">{{ title }}</h3>
    <p v-if="hint" class="lead">{{ hint }}</p>
  </section>
</template>

<style scoped>
.panel {
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
  margin: 0;
  line-height: 1.55;
  color: var(--uf-on-surface-variant);
}
.muted {
  color: var(--uf-on-surface-variant);
  font-size: 0.88rem;
}
.pad {
  padding: 0.25rem 0;
}
code {
  font-size: 0.85rem;
  background: var(--uf-surface-container-low);
  padding: 0.08rem 0.3rem;
  border-radius: 0.25rem;
}
</style>
