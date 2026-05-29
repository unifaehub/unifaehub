import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalized } from 'vue-router'
import client from '@/api/client'
import type { CourseNavigationItem } from '@/config/courseNavigation'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'

/**
 * Overlay de carregamento durante navegação (somente visual, sem bloquear cliques).
 */
function shouldTrackRouteLoading(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
) {
  if (!from.matched.length) return false
  const toPub = !!to.meta.public
  const fromPub = !!from.meta.public
  if (toPub && fromPub) return false
  // Após login o botão já mostra "Entrando…"; evita overlay em tela cheia na transição.
  if (from.name === 'login') return false
  return true
}

type Role = 'MASTER' | 'ADMIN' | 'ADMIN_JORNADA' | 'COORDINATOR' | 'PROFESSOR' | 'STUDENT' | 'PATIENT'

const COURSE_HUB_ROLES = ['ADMIN', 'COORDINATOR', 'PROFESSOR', 'STUDENT'] satisfies Role[]
const COORD_ONLY_ROLES = ['ADMIN', 'COORDINATOR'] satisfies Role[]
/** Prescrições: fila de aprovação (professor, coordenação, admin). */
const APPROVALS_HUB_ROLES = ['ADMIN', 'COORDINATOR', 'PROFESSOR'] satisfies Role[]

/** URLs antigas (/pacientes, …) → `/n/:menuNodeId` conforme catálogo do curso. */
async function redirectToCourseMenuByKey(to: RouteLocationNormalized, key: string) {
  const courseIdRaw = to.params.courseId
  const courseId = typeof courseIdRaw === 'string' ? Number(courseIdRaw) : NaN
  if (!Number.isFinite(courseId)) return { name: 'dashboard' }
  try {
    const { data } = await client.get<CourseNavigationItem[]>(`/courses/${courseId}/navigation`)
    const hit = data.find((i) => i.key === key && i.menuNodeId > 0)
    if (!hit) return { name: 'course-hub', params: { courseId: String(courseId) } }
    return {
      name: 'course-menu-dynamic',
      params: { courseId: String(courseId), menuNodeId: String(hit.menuNodeId) },
    }
  } catch {
    return { name: 'dashboard' }
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/jornada/ao-vivo',
      name: 'jornada-live',
      component: () => import('@/views/jornada/JornadaLiveView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: {
            searchPlaceholder: 'Buscar dados do painel…',
            roles: ['ADMIN', 'COORDINATOR', 'PROFESSOR', 'STUDENT'] satisfies Role[],
          },
        },
        {
          path: 'cursos',
          name: 'courses',
          component: () => import('@/views/CoursesView.vue'),
          meta: { searchPlaceholder: 'Buscar cursos…', roles: ['ADMIN', 'COORDINATOR'] satisfies Role[] },
        },
        {
          path: 'admin/menus',
          name: 'admin-menus',
          component: () => import('@/views/AdminMenusView.vue'),
          meta: { searchPlaceholder: 'Buscar em menus…', roles: ['ADMIN'] satisfies Role[] },
        },
        {
          path: 'curso/:courseId',
          component: () => import('@/layouts/CourseScopeLayout.vue'),
          meta: {
            searchPlaceholder: 'Buscar no curso…',
            roles: ['ADMIN', 'COORDINATOR', 'PROFESSOR', 'STUDENT'] satisfies Role[],
          },
          children: [
            {
              path: '',
              name: 'course-hub',
              component: () => import('@/views/CourseHubView.vue'),
              meta: {
                menuNodeKey: 'overview',
                roles: COURSE_HUB_ROLES,
              },
            },
            {
              path: 'pacientes',
              name: 'course-patients-legacy',
              beforeEnter: (to) => redirectToCourseMenuByKey(to, 'patients'),
              component: () => import('@/views/CourseMenuLegacyRedirect.vue'),
              meta: { roles: COURSE_HUB_ROLES },
            },
            {
              path: 'exercicios',
              name: 'course-exercises-legacy',
              beforeEnter: (to) => redirectToCourseMenuByKey(to, 'exercises'),
              component: () => import('@/views/CourseMenuLegacyRedirect.vue'),
              meta: { roles: COORD_ONLY_ROLES },
            },
            {
              path: 'prescricoes',
              name: 'course-prescriptions-legacy',
              beforeEnter: (to) => redirectToCourseMenuByKey(to, 'prescriptions'),
              component: () => import('@/views/CourseMenuLegacyRedirect.vue'),
              meta: { roles: COURSE_HUB_ROLES },
            },
            {
              path: 'aprovacoes',
              name: 'course-approvals-legacy',
              beforeEnter: (to) => redirectToCourseMenuByKey(to, 'approvals'),
              component: () => import('@/views/CourseMenuLegacyRedirect.vue'),
              meta: { roles: APPROVALS_HUB_ROLES },
            },
            {
              path: 'biblioteca',
              name: 'course-library-legacy',
              beforeEnter: (to) => redirectToCourseMenuByKey(to, 'library'),
              component: () => import('@/views/CourseMenuLegacyRedirect.vue'),
              meta: { roles: COURSE_HUB_ROLES },
            },
            {
              path: 'termos-consentimento',
              name: 'course-consent-terms',
              component: () => import('@/views/CourseConsentTermsView.vue'),
              meta: {
                searchPlaceholder: 'Termos de consentimento…',
                roles: COORD_ONLY_ROLES,
              },
            },
            {
              path: 'n/:menuNodeId',
              name: 'course-menu-dynamic',
              component: () => import('@/views/CourseScopedModuleView.vue'),
              meta: {
                dynamicMenu: true,
                hint: 'Módulo configurado no catálogo de menus do curso.',
                roles: COURSE_HUB_ROLES,
              },
            },
          ],
        },
        {
          path: 'apps',
          name: 'apps',
          component: () => import('@/views/AppsView.vue'),
          meta: { searchPlaceholder: 'Buscar apps…', roles: ['ADMIN'] satisfies Role[] },
        },
        {
          path: 'locais-atendimento',
          name: 'care-locations-admin',
          component: () => import('@/views/CareLocationsView.vue'),
          meta: {
            searchPlaceholder: 'Buscar locais de atendimento…',
            roles: ['ADMIN'] satisfies Role[],
          },
        },
        {
          path: 'usuarios',
          name: 'users',
          component: () => import('@/views/UsersView.vue'),
          meta: {
            searchPlaceholder: 'Buscar por nome ou e-mail…',
            roles: ['ADMIN', 'COORDINATOR'] satisfies Role[],
          },
        },
        {
          path: 'pacientes',
          name: 'patients',
          component: () => import('@/views/PatientsView.vue'),
          meta: {
            searchPlaceholder: 'Buscar prontuário…',
            roles: ['ADMIN', 'COORDINATOR', 'PROFESSOR', 'STUDENT'] satisfies Role[],
          },
        },
        {
          path: 'historia-paciente',
          name: 'patient-history',
          component: () => import('@/views/PatientHistoryView.vue'),
          meta: {
            searchPlaceholder: 'Buscar na história…',
            roles: ['ADMIN', 'COORDINATOR', 'PROFESSOR', 'STUDENT'] satisfies Role[],
          },
        },
        {
          path: 'exercicios',
          name: 'exercises',
          component: () => import('@/views/ExercisesView.vue'),
          meta: { searchPlaceholder: 'Buscar exercícios…', roles: ['ADMIN', 'COORDINATOR'] satisfies Role[] },
        },
        {
          path: 'categorias',
          name: 'categories',
          component: () => import('@/views/CategoriesView.vue'),
          meta: { searchPlaceholder: 'Buscar categorias…', roles: ['ADMIN', 'COORDINATOR'] satisfies Role[] },
        },
        {
          path: 'prescricoes',
          name: 'prescriptions',
          component: () => import('@/views/PrescriptionsView.vue'),
          meta: {
            searchPlaceholder: 'Buscar prescrições ou pacientes…',
            roles: ['ADMIN', 'COORDINATOR', 'PROFESSOR', 'STUDENT'] satisfies Role[],
          },
        },
        {
          path: 'aprovacoes',
          name: 'approvals',
          component: () => import('@/views/ApprovalsView.vue'),
          meta: {
            searchPlaceholder: 'Buscar prescrições ou alunos…',
            roles: APPROVALS_HUB_ROLES,
          },
        },
        {
          path: 'relatorios',
          name: 'reports',
          component: () => import('@/views/ReportsView.vue'),
          meta: {
            searchPlaceholder: 'Buscar relatórios…',
            roles: ['ADMIN', 'COORDINATOR', 'PROFESSOR', 'STUDENT'] satisfies Role[],
          },
        },
        {
          path: 'logs',
          name: 'audit-logs',
          component: () => import('@/views/AuditLogsView.vue'),
          meta: { searchPlaceholder: 'Buscar em logs de auditoria…', roles: ['ADMIN'] satisfies Role[] },
        },
        {
          path: 'app/api-guide',
          name: 'app-api-guide',
          component: () => import('@/views/AppApiGuideView.vue'),
          meta: { searchPlaceholder: 'Guia interno de APIs…', roles: ['ADMIN'] satisfies Role[] },
        },
        {
          path: 'configuracoes',
          name: 'settings',
          component: () => import('@/views/SettingsView.vue'),
          meta: { searchPlaceholder: 'Buscar nas configurações…', roles: ['ADMIN'] satisfies Role[] },
        },
        // ── Jornada de Evidências ─────────────────────────────────────────
        {
          path: 'jornada',
          name: 'jornada-dashboard',
          component: () => import('@/views/jornada/JornadaDashboardView.vue'),
          meta: { searchPlaceholder: 'Jornada de Evidências…', roles: ['ADMIN', 'COORDINATOR'] satisfies Role[] },
        },
        {
          path: 'jornada/trabalhos',
          name: 'jornada-works',
          component: () => import('@/views/jornada/WorksModerationView.vue'),
          meta: { searchPlaceholder: 'Buscar trabalhos…', roles: ['ADMIN', 'COORDINATOR'] satisfies Role[] },
        },
        {
          path: 'jornada/professores',
          name: 'jornada-professors',
          component: () => import('@/views/jornada/ProfessoresView.vue'),
          meta: { searchPlaceholder: 'Buscar professores…', roles: ['ADMIN', 'COORDINATOR'] satisfies Role[] },
        },
        {
          path: 'jornada/sorteio',
          name: 'jornada-lottery',
          component: () => import('@/views/jornada/LotteryView.vue'),
          meta: { searchPlaceholder: 'Sorteio de bancas…', roles: ['ADMIN', 'COORDINATOR'] satisfies Role[] },
        },
        {
          path: 'jornada/salas',
          name: 'jornada-rooms',
          component: () => import('@/views/jornada/RoomsView.vue'),
          meta: { searchPlaceholder: 'Buscar salas…', roles: ['ADMIN', 'COORDINATOR'] satisfies Role[] },
        },
        {
          path: 'jornada/perguntas',
          name: 'jornada-questions',
          component: () => import('@/views/jornada/QuestionsView.vue'),
          meta: { searchPlaceholder: 'Buscar perguntas…', roles: ['ADMIN'] satisfies Role[] },
        },
        {
          path: 'jornada/palavra-chave',
          name: 'jornada-keywords',
          component: () => import('@/views/jornada/KeywordView.vue'),
          meta: { searchPlaceholder: 'Palavras-chave agendadas…', roles: ['ADMIN', 'COORDINATOR'] satisfies Role[] },
        },
        {
          path: 'jornada/ranking',
          name: 'jornada-ranking',
          component: () => import('@/views/jornada/RankingView.vue'),
          meta: { searchPlaceholder: 'Ranking de trabalhos…', roles: ['ADMIN', 'COORDINATOR'] satisfies Role[] },
        },
        {
          path: 'jornada/estatisticas',
          name: 'jornada-stats',
          component: () => import('@/views/jornada/WorksStatsView.vue'),
          meta: { searchPlaceholder: 'Estatísticas de trabalhos…', roles: ['ADMIN', 'COORDINATOR'] satisfies Role[] },
        },
        {
          path: 'jornada/configuracoes',
          name: 'jornada-config',
          component: () => import('@/views/jornada/JornadaConfigView.vue'),
          meta: { searchPlaceholder: 'Configurações da Jornada…', roles: ['ADMIN', 'COORDINATOR'] satisfies Role[] },
        },
      ],
    },
  ],
})

router.beforeEach(async (to, from) => {
  const ui = useUiStore()
  if (shouldTrackRouteLoading(to, from)) {
    ui.beginRouteNavigation()
  }

  const auth = useAuthStore()
  if (to.meta.public) {
    // permite abrir /login mesmo logado (vamos mostrar a mensagem na tela)
    return true
  }
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // Carrega perfil se ainda não estiver carregado (para aplicar roles)
  if (auth.isAuthenticated && !auth.user) {
    await auth.fetchMe()
    if (!auth.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }

  const roles = to.meta.roles as Role[] | undefined
  if (roles && auth.user) {
    const allRoles = [auth.user.role as Role, ...((auth.user.extraRoles ?? []) as Role[])]
    if (!allRoles.some((r) => roles.includes(r))) {
      return { name: 'dashboard' }
    }
  }

  const courseIdRaw = to.params.courseId
  const courseId = typeof courseIdRaw === 'string' ? Number(courseIdRaw) : NaN
  const leaf = to.matched[to.matched.length - 1]
  const leafMeta = leaf?.meta ?? {}
  if (auth.isAuthenticated && Number.isFinite(courseId)) {
    const needsNavCheck = leafMeta.menuNodeKey != null || leafMeta.dynamicMenu === true
    if (needsNavCheck) {
      try {
        const { data } = await client.get<CourseNavigationItem[]>(`/courses/${courseId}/navigation`)
        if (leafMeta.dynamicMenu === true) {
          const mid = Number(to.params.menuNodeId)
          const hit = data.find((i) => i.menuNodeId === mid)
          if (!hit) {
            return { name: 'course-hub', params: { courseId: String(courseId) } }
          }
          const role = auth.user?.role as Role | undefined
          if (hit.key === 'exercises' && role !== 'ADMIN' && role !== 'COORDINATOR') {
            return { name: 'course-hub', params: { courseId: String(courseId) } }
          }
          if (
            hit.key === 'approvals' &&
            role !== 'ADMIN' &&
            role !== 'COORDINATOR' &&
            role !== 'PROFESSOR'
          ) {
            return { name: 'course-hub', params: { courseId: String(courseId) } }
          }
          if (hit.key === 'care-locations' && role !== 'ADMIN') {
            return { name: 'course-hub', params: { courseId: String(courseId) } }
          }
        } else {
          const mk = leafMeta.menuNodeKey as string | undefined
          if (mk && mk !== 'overview' && !data.some((i) => i.key === mk)) {
            return { name: 'course-hub', params: { courseId: String(courseId) } }
          }
        }
      } catch {
        return { name: 'dashboard' }
      }
    }
  }

  return true
})

router.afterEach((to, from) => {
  if (shouldTrackRouteLoading(to, from)) {
    useUiStore().endRouteNavigation()
  }
})

router.onError(() => {
  useUiStore().resetRouteNavigation()
})

export default router
