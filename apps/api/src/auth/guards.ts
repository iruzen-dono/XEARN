import { Injectable, CanActivate, ExecutionContext, SetMetadata, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

// JWT Guard
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// Roles decorator
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// Roles Guard
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Accès refusé');
    if (!requiredRoles.includes(user.role)) throw new ForbiddenException('Rôle insuffisant');
    return true;
  }
}
