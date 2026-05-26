/** Chaves de módulo conhecidas pelo hub (rotas filhas de /curso/:courseId). */
export type CourseNavModuleKey =
  | 'overview'
  | 'patients'
  | 'exercises'
  | 'prescriptions'
  | 'approvals'
  | 'library';

export interface CourseNavItemDto {
  key: CourseNavModuleKey;
  /** Rótulo exibido; se vazio, o front usa o padrão da chave. */
  label?: string | null;
  enabled: boolean;
  sortOrder: number;
  icon?: string | null;
}
