/** Item vindo da API (`GET /courses` / `GET /courses/:id/navigation`). */
export type CourseNavigationItem = {
  menuNodeId: number
  parentId: number | null
  key: string
  label: string
  icon: string | null
  routeName: string | null
  sortOrder: number
}

export type CourseListRow = {
  id: number
  name: string
  navigation?: CourseNavigationItem[] | null
  /** Legado; usado só se não houver linhas em `course_menu_nodes` na API. */
  navigationJson?: unknown
}

function isEduFisicaCourse(name: string) {
  const n = name.toLowerCase()
  return n.includes('educa') && (n.includes('física') || n.includes('fisica'))
}

function isPublicidadeCourse(name: string) {
  return name.toLowerCase().includes('publicidade')
}

function isFisioterapiaCourse(name: string) {
  return name.toLowerCase().includes('fisioterapia')
}

/** Fallback quando a API não envia `navigation` (cache antigo). */
export function resolveCourseNavigation(course: CourseListRow): CourseNavigationItem[] {
  if (Array.isArray(course.navigation) && course.navigation.length) {
    return [...course.navigation].sort((a, b) => a.sortOrder - b.sortOrder)
  }
  const raw = course.navigationJson
  if (Array.isArray(raw) && raw.length) {
    return raw
      .filter((x: unknown) => x && typeof x === 'object')
      .map((x: { key: string; label?: string | null; sortOrder: number }) => ({
        menuNodeId: 0,
        parentId: null,
        key: String(x.key),
        label: (x.label && String(x.label).trim()) || String(x.key),
        icon: null,
        routeName: legacyKeyToRouteName(String(x.key)),
        sortOrder: x.sortOrder ?? 0,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }
  const withLib = isPublicidadeCourse(course.name)
  if (isEduFisicaCourse(course.name)) {
    return [
      { menuNodeId: 0, parentId: null, key: 'overview', label: 'Visão geral', icon: null, routeName: 'course-hub', sortOrder: 0 },
      { menuNodeId: 0, parentId: null, key: 'exercises', label: 'Exercícios', icon: null, routeName: null, sortOrder: 10 },
    ]
  }
  if (isFisioterapiaCourse(course.name)) {
    return [
      { menuNodeId: 0, parentId: null, key: 'overview', label: 'Visão geral', icon: null, routeName: 'course-hub', sortOrder: 0 },
      { menuNodeId: 0, parentId: null, key: 'patients', label: 'Pacientes', icon: null, routeName: null, sortOrder: 10 },
      { menuNodeId: 0, parentId: null, key: 'exercises', label: 'Exercícios', icon: null, routeName: null, sortOrder: 20 },
      {
        menuNodeId: 0,
        parentId: null,
        key: 'patient-history',
        label: 'História do paciente',
        icon: null,
        routeName: null,
        sortOrder: 27,
      },
      { menuNodeId: 0, parentId: null, key: 'prescriptions', label: 'Prescrições', icon: null, routeName: null, sortOrder: 30 },
      { menuNodeId: 0, parentId: null, key: 'approvals', label: 'Aprovações', icon: null, routeName: null, sortOrder: 40 },
      {
        menuNodeId: 0,
        parentId: null,
        key: 'appointments',
        label: 'Agenda',
        icon: null,
        routeName: null,
        sortOrder: 45,
      },
      {
        menuNodeId: 0,
        parentId: null,
        key: 'care-locations',
        label: 'Locais de atendimento',
        icon: null,
        routeName: null,
        sortOrder: 46,
      },
    ]
  }
  const base: CourseNavigationItem[] = [
    { menuNodeId: 0, parentId: null, key: 'overview', label: 'Visão geral', icon: null, routeName: 'course-hub', sortOrder: 0 },
  ]
  if (withLib) {
    base.push({
      menuNodeId: 0,
      parentId: null,
      key: 'library',
      label: 'Biblioteca de arquivos',
      icon: null,
      routeName: null,
      sortOrder: 50,
    })
  }
  return base
}

function legacyKeyToRouteName(key: string): string | null {
  if (key === 'overview') return 'course-hub'
  return null
}

export function navDepth(item: CourseNavigationItem, all: CourseNavigationItem[]): number {
  if (item.parentId == null) return 0
  const p = all.find((x) => x.menuNodeId === item.parentId)
  return p ? 1 + navDepth(p, all) : 0
}

export function routeTarget(courseId: number, item: CourseNavigationItem) {
  if (item.routeName) {
    return { name: item.routeName, params: { courseId } }
  }
  if (item.menuNodeId > 0) {
    return { name: 'course-menu-dynamic', params: { courseId, menuNodeId: item.menuNodeId } }
  }
  return { name: 'course-hub', params: { courseId } }
}
