<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { computed, onMounted, ref, watch } from 'vue'
import { NAV_FOOTER, NAV_TOP, type NavRole } from '@/config/navigation'
import {
  navDepth,
  resolveCourseNavigation,
  routeTarget,
  type CourseListRow,
  type CourseNavigationItem,
} from '@/config/courseNavigation'
import MaterialIcon from './MaterialIcon.vue'
import { useAuthStore } from '@/stores/auth'
import client from '@/api/client'

const route = useRoute()
const auth = useAuthStore()

type CourseRow = CourseListRow

const courses = ref<CourseRow[]>([])

function allowed(roles?: NavRole[]) {
  if (!roles?.length) return true
  const r = auth.user?.role as NavRole | undefined
  return r ? roles.includes(r) : false
}

const navTop = computed(() => NAV_TOP.filter((i) => allowed(i.roles)))
const navFooter = computed(() => NAV_FOOTER.filter((i) => allowed(i.roles)))

const coursesNav = computed(() => {
  let list = courses.value
  const uid = auth.user?.courseId
  if (auth.user?.role === 'COORDINATOR' && uid != null) {
    list = list.filter((c) => c.id === uid)
  }
  if (auth.user?.role === 'STUDENT' && uid != null) {
    list = list.filter((c) => c.id === uid)
  }
  return list
})

const openCourseIds = ref<Set<number>>(new Set())

function isCourseActive(courseId: number) {
  return String(route.params.courseId) === String(courseId)
}

function isCoordOrAdmin() {
  const r = auth.user?.role
  return r === 'ADMIN' || r === 'COORDINATOR'
}

function canAccessApprovalsInCourse() {
  const r = auth.user?.role
  return r === 'ADMIN' || r === 'COORDINATOR' || r === 'PROFESSOR'
}

function isAdmin() {
  return auth.user?.role === 'ADMIN'
}

function visibleCourseNav(c: CourseRow) {
  return resolveCourseNavigation(c).filter((item) => {
    if (item.key === 'exercises' && !isCoordOrAdmin()) return false
    if (item.key === 'approvals' && !canAccessApprovalsInCourse()) return false
    if (item.key === 'care-locations' && !isAdmin()) return false
    return true
  })
}

function navItems(c: CourseRow) {
  return visibleCourseNav(c)
}

function subLinkClass(item: CourseNavigationItem, courseId: number, all: CourseNavigationItem[]) {
  const active =
    item.routeName != null
      ? route.name === item.routeName && String(route.params.courseId) === String(courseId)
      : route.name === 'course-menu-dynamic' &&
        String(route.params.courseId) === String(courseId) &&
        String(route.params.menuNodeId) === String(item.menuNodeId)
  return ['sub-link', navDepth(item, all) > 0 && 'sub-link--nested', active && 'sub-link--active']
}

function padForItem(item: CourseNavigationItem, all: CourseNavigationItem[]) {
  const d = navDepth(item, all)
  return { paddingLeft: d ? `calc(0.35rem + ${d} * 0.55rem)` : undefined }
}

function isSubMenuItem(item: CourseNavigationItem, all: CourseNavigationItem[]) {
  return navDepth(item, all) > 0
}

function isActive(name: string) {
  return route.name === name
}

function navClass(name: string) {
  return ['nav-link', isActive(name) && 'nav-link--active']
}

watch(
  () => route.params.courseId,
  (cid) => {
    if (cid != null && cid !== '') openCourseIds.value.add(Number(cid))
  },
  { immediate: true },
)

onMounted(async () => {
  try {
    const { data } = await client.get<CourseRow[]>('/courses/nav')
    courses.value = data
  } catch {
    courses.value = []
  }
})
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-brand">
      <img src="/unifae_hub_transparent.png" alt="Unifae Hub" class="sidebar-logo" />
    </div>

    <nav class="sidebar-nav" aria-label="Principal">
      <RouterLink v-for="item in navTop" :key="item.routeName" :to="{ name: item.routeName }" :class="navClass(item.routeName)">
        <MaterialIcon :name="item.icon" :filled="isActive(item.routeName)" />
        <span>{{ item.label }}</span>
      </RouterLink>

      <div class="nav-section">
        <p class="nav-section__label">Por curso</p>
        <RouterLink :to="{ name: 'courses' }" class="nav-link nav-link--subhead" :class="{ 'nav-link--active': route.name === 'courses' }">
          <MaterialIcon name="view_list" :filled="route.name === 'courses'" />
          <span>Cadastro de cursos</span>
        </RouterLink>

        <details
          v-for="c in coursesNav"
          :key="c.id"
          class="course-pack"
          :open="openCourseIds.has(c.id) || isCourseActive(c.id)"
        >
          <summary class="course-pack__summary">{{ c.name }}</summary>
          <div class="course-pack__subs">
            <RouterLink
              v-for="item in navItems(c)"
              :key="`${c.id}-${item.menuNodeId}-${item.key}`"
              :to="routeTarget(c.id, item)"
              :class="subLinkClass(item, c.id, navItems(c))"
              :style="padForItem(item, navItems(c))"
            >
              <span v-if="isSubMenuItem(item, navItems(c))" class="sub-link__mark" aria-hidden="true">
                <MaterialIcon name="subdirectory_arrow_right" size="0.95rem" />
              </span>
              <span class="sub-link__label">{{ item.label }}</span>
            </RouterLink>
            <RouterLink
              v-if="isCoordOrAdmin()"
              :to="{ name: 'course-consent-terms', params: { courseId: String(c.id) } }"
              class="sub-link"
              :class="{
                'sub-link--active':
                  route.name === 'course-consent-terms' &&
                  String(route.params.courseId) === String(c.id),
              }"
            >
              <span class="sub-link__label">Termos de consentimento</span>
            </RouterLink>
          </div>
        </details>
      </div>

      <div class="sidebar-nav__divider" />

      <RouterLink v-for="item in navFooter" :key="item.routeName" :to="{ name: item.routeName }" :class="navClass(item.routeName)">
        <MaterialIcon :name="item.icon" :filled="isActive(item.routeName)" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="sidebar-user">
      <div class="sidebar-user__avatar" aria-hidden="true">
        {{ auth.user?.name?.charAt(0) ?? '?' }}
      </div>
      <div class="sidebar-user__text">
        <p class="sidebar-user__name">{{ auth.user?.name ?? '—' }}</p>
        <p class="sidebar-user__role">{{ auth.user?.role ?? '—' }}</p>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  width: 16rem;
  height: 100vh;
  padding: 1.5rem 1rem;
  background: var(--uf-surface-container-low);
  box-sizing: border-box;
}

.sidebar-brand {
  margin-bottom: 2rem;
  padding: 0 0.5rem;
  display: flex;
  justify-content: center;
}

.sidebar-logo {
  height: 6rem;
  width: auto;
  object-fit: contain;
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  overflow-y: auto;
  min-height: 0;
}

.sidebar-nav__divider {
  margin: 0.75rem 0.25rem;
  height: 1px;
  background: rgba(191, 202, 186, 0.25);
}

.nav-section {
  margin-top: 0.35rem;
}

.nav-section__label {
  margin: 0.5rem 0.35rem 0.25rem;
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--uf-on-surface-variant);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--uf-on-surface-variant);
  transition:
    background 0.15s ease,
    color 0.15s ease,
    transform 0.1s ease;
}

.nav-link:hover {
  background: var(--uf-surface-container);
  color: var(--uf-on-surface);
}

.nav-link--active {
  color: var(--uf-on-primary);
  background: linear-gradient(90deg, var(--uf-primary), var(--uf-primary-container));
  box-shadow: 0 8px 24px rgba(13, 99, 27, 0.15);
  font-weight: 700;
}

.nav-link--subhead {
  font-size: 0.8125rem;
  font-weight: 700;
}

.course-pack {
  margin: 0.15rem 0 0.35rem;
  border-radius: var(--uf-radius-xl);
  background: var(--uf-surface-container-lowest);
  outline: 1px solid rgba(191, 202, 186, 0.2);
}

.course-pack__summary {
  cursor: pointer;
  list-style: none;
  padding: 0.45rem 0.65rem;
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--uf-on-surface);
}

.course-pack__summary::-webkit-details-marker {
  display: none;
}

.course-pack__subs {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0 0.35rem 0.45rem 0.75rem;
}

.sub-link {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
  font-size: 0.75rem;
  padding: 0.35rem 0.5rem;
  border-radius: 999px;
  color: var(--uf-on-surface-variant);
  text-decoration: none;
  font-weight: 600;
}

.sub-link__mark {
  flex-shrink: 0;
  display: inline-flex;
  color: var(--uf-primary);
  opacity: 0.75;
}

.sub-link__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sub-link:hover {
  background: rgba(13, 99, 27, 0.06);
  color: var(--uf-on-surface);
}

.sub-link--active {
  color: var(--uf-primary);
  background: rgba(13, 99, 27, 0.1);
}
.sub-link--nested {
  font-size: 0.72rem;
  opacity: 0.95;
}

.sidebar-user {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--uf-surface-container);
  border-radius: 1rem;
}

.sidebar-user__avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: var(--uf-secondary-container);
  color: var(--uf-on-secondary-container);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.sidebar-user__text {
  min-width: 0;
}

.sidebar-user__name {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--uf-on-surface);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-user__role {
  margin: 0.1rem 0 0;
  font-size: 0.625rem;
  color: var(--uf-on-surface-variant);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
