/** Itens estáticos do menu lateral (agrupamento dinâmico por curso em AppShellSidebar). */
export type NavSection = 'main' | 'footer'

export type NavRole = 'ADMIN' | 'COORDINATOR' | 'PROFESSOR' | 'STUDENT' | 'PATIENT'

export interface NavItem {
  routeName: string
  label: string
  icon: string
  section: NavSection
  /** Se definido, o item só aparece para esses perfis. */
  roles?: NavRole[]
}

/** Topo: visão global do Hub (sem itens clínicos soltos — estes ficam por curso). */
export const NAV_TOP: NavItem[] = [
  { routeName: 'dashboard', label: 'Dashboard', icon: 'dashboard', section: 'main', roles: ['ADMIN', 'COORDINATOR', 'PROFESSOR', 'STUDENT'] },
  { routeName: 'apps', label: 'Apps', icon: 'apps', section: 'main', roles: ['ADMIN'] },
  {
    routeName: 'care-locations-admin',
    label: 'Locais de atendimento',
    icon: 'location_on',
    section: 'main',
    roles: ['ADMIN'],
  },
  { routeName: 'courses', label: 'Cursos', icon: 'school', section: 'main', roles: ['ADMIN', 'COORDINATOR'] },
  { routeName: 'admin-menus', label: 'Menus do hub', icon: 'menu_book', section: 'main', roles: ['ADMIN'] },
  { routeName: 'users', label: 'Usuários', icon: 'group', section: 'main', roles: ['ADMIN', 'COORDINATOR'] },
  /** Pacientes, prescrições, aprovações e história ficam no menu dinâmico do curso (ex.: Fisioterapia). */
  { routeName: 'categories', label: 'Categorias', icon: 'category', section: 'main', roles: ['ADMIN', 'COORDINATOR'] },
  {
    routeName: 'reports',
    label: 'Relatórios',
    icon: 'assessment',
    section: 'main',
    roles: ['ADMIN', 'COORDINATOR', 'PROFESSOR', 'STUDENT'],
  },
]

export const NAV_FOOTER: NavItem[] = [
  { routeName: 'audit-logs', label: 'Logs', icon: 'receipt_long', section: 'footer', roles: ['ADMIN'] },
  { routeName: 'settings', label: 'Configurações', icon: 'settings', section: 'footer', roles: ['ADMIN'] },
]

/** @deprecated use NAV_TOP */
export const NAV_ITEMS: NavItem[] = [...NAV_TOP, ...NAV_FOOTER]
export const NAV_MAIN = NAV_TOP
