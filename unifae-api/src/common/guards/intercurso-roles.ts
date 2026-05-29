import { UserRole } from '../../database/entities/enums';

/** Papéis com permissão de leitura no módulo Intercurso. */
export const INTERCURSO_READ_ROLES = [
  UserRole.MASTER,
  UserRole.ADMIN,
  UserRole.COORDINATOR,
] as const;

/** Papéis com permissão de gestão no módulo Intercurso. */
export const INTERCURSO_ADMIN_ROLES = [
  UserRole.MASTER,
  UserRole.ADMIN,
  UserRole.COORDINATOR,
] as const;
