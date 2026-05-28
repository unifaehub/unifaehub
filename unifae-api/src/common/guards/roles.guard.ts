import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../database/entities/enums';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;
    const req = context
      .switchToHttp()
      .getRequest<{ user?: { role: UserRole; extraRoles?: UserRole[] | null } }>();
    const user = req.user;
    if (!user) return false;
    const allRoles = [user.role, ...(user.extraRoles ?? [])].filter(Boolean) as UserRole[];
    if (allRoles.includes(UserRole.MASTER)) return true;
    return allRoles.some((r) => required.includes(r));
  }
}
