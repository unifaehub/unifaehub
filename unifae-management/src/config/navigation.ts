/** Itens estáticos do menu lateral (agrupamento dinâmico por curso em AppShellSidebar). */
export type NavSection = 'main' | 'footer'

export type NavRole = 'MASTER' | 'ADMIN' | 'ADMIN_JORNADA' | 'COORDINATOR' | 'PROFESSOR' | 'STUDENT' | 'PATIENT'

export type NavGroup = 'hub' | 'jornada' | 'intercurso' | 'config'

export interface NavItem {
  routeName: string
  label: string
  icon: string
  section: NavSection
  group?: NavGroup
  /** Se definido, o item só aparece para esses perfis. */
  roles?: NavRole[]
}

/** Topo: visão global do Hub (sem itens clínicos soltos — estes ficam por curso). */
export const NAV_TOP: NavItem[] = [
  { routeName: 'dashboard', label: 'Dashboard', icon: 'dashboard', section: 'main', group: 'hub', roles: ['MASTER', 'ADMIN', 'COORDINATOR', 'PROFESSOR', 'STUDENT'] },
  { routeName: 'apps', label: 'Apps', icon: 'apps', section: 'main', group: 'hub', roles: ['MASTER', 'ADMIN'] },
  { routeName: 'care-locations-admin', label: 'Locais de atendimento', icon: 'location_on', section: 'main', group: 'hub', roles: ['MASTER', 'ADMIN'] },
  { routeName: 'courses', label: 'Cursos', icon: 'school', section: 'main', group: 'hub', roles: ['MASTER', 'ADMIN', 'COORDINATOR'] },
  { routeName: 'admin-menus', label: 'Menus do hub', icon: 'menu_book', section: 'main', group: 'hub', roles: ['MASTER', 'ADMIN'] },
  { routeName: 'users', label: 'Usuários', icon: 'group', section: 'main', group: 'hub', roles: ['MASTER', 'ADMIN', 'COORDINATOR'] },
  { routeName: 'categories', label: 'Categorias', icon: 'category', section: 'main', group: 'hub', roles: ['MASTER', 'ADMIN', 'COORDINATOR'] },
  { routeName: 'reports', label: 'Relatórios', icon: 'assessment', section: 'main', group: 'hub', roles: ['MASTER', 'ADMIN', 'COORDINATOR', 'PROFESSOR', 'STUDENT'] },
  { routeName: 'jornada-dashboard', label: 'Jornada de Evidências', icon: 'science', section: 'main', group: 'jornada', roles: ['MASTER', 'ADMIN', 'ADMIN_JORNADA', 'COORDINATOR'] },
  { routeName: 'intercurso-dashboard', label: 'Intercurso', icon: 'emoji_events', section: 'main', group: 'intercurso', roles: ['MASTER', 'ADMIN', 'COORDINATOR'] },
]

export const NAV_FOOTER: NavItem[] = [
  { routeName: 'audit-logs', label: 'Logs', icon: 'receipt_long', section: 'footer', group: 'config', roles: ['MASTER', 'ADMIN'] },
  { routeName: 'settings', label: 'Configurações', icon: 'settings', section: 'footer', group: 'config', roles: ['MASTER', 'ADMIN'] },
]

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  hub: 'UNIFAE Hub',
  jornada: 'Jornada Científica',
  intercurso: 'Intercurso',
  config: 'Configurações',
}

/** @deprecated use NAV_TOP */
export const NAV_ITEMS: NavItem[] = [...NAV_TOP, ...NAV_FOOTER]
export const NAV_MAIN = NAV_TOP
