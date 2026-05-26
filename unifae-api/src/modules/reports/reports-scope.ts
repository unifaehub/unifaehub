import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { UserRole } from '../../database/entities/enums';
import type { UserEntity } from '../../database/entities/user.entity';

/** Escopo de coordenador/professor/aluno: restringe curso e app quando definidos no usuário. */
export function applyActorScope<T extends ObjectLiteral>(
  actor: UserEntity,
  qb: SelectQueryBuilder<T>,
  fields: { courseId?: string; appId?: string },
): void {
  if (actor.role === UserRole.ADMIN) return;
  if (actor.courseId != null && fields.courseId) {
    qb.andWhere(`${fields.courseId} = :_scopeCourseId`, { _scopeCourseId: actor.courseId });
  }
  if (actor.appId != null && fields.appId) {
    qb.andWhere(`${fields.appId} = :_scopeAppId`, { _scopeAppId: actor.appId });
  }
}

/** Apps: coordenador só enxerga o app vinculado. */
export function coordinatorAppFilter<T extends ObjectLiteral>(
  actor: UserEntity,
  qb: SelectQueryBuilder<T>,
  appAlias = 'a',
): void {
  if (actor.role === UserRole.ADMIN) return;
  if (actor.appId != null) {
    qb.andWhere(`${appAlias}.id = :_coordApp`, { _coordApp: actor.appId });
  }
}
