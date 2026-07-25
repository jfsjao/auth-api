import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApplicationError } from '../../../../common/errors/application.error';
import { REQUIRED_PERMISSIONS } from '../../../../common/security/auth-metadata';
import { AuthenticatedRequest } from '../decorators/current-user.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;

    if (
      !required.every((permission) => user.permissions.includes(permission))
    ) {
      throw new ApplicationError('FORBIDDEN', 'Permissão insuficiente', 403);
    }
    return true;
  }
}
