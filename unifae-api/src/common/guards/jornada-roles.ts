import { UserRole } from '../../database/entities/enums';

/** Todos os papéis com acesso de leitura ao módulo Jornada de Evidências. */
export const JORNADA_READ_ROLES = [
  UserRole.MASTER,
  UserRole.ADMIN,
  UserRole.ADMIN_JORNADA,
  UserRole.COORDINATOR,
  UserRole.PROFESSOR,
] as const;

/** Papéis com permissão de escrita / gestão na Jornada. */
export const JORNADA_ADMIN_ROLES = [
  UserRole.MASTER,
  UserRole.ADMIN,
  UserRole.ADMIN_JORNADA,
  UserRole.COORDINATOR,
] as const;

/** Papéis exclusivos de escrita crítica (ex.: criar/excluir perguntas, rodar sorteio). */
export const JORNADA_WRITE_ROLES = [
  UserRole.MASTER,
  UserRole.ADMIN,
  UserRole.ADMIN_JORNADA,
] as const;
