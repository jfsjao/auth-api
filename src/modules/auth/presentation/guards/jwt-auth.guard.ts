import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC } from '../../../../common/security/auth-metadata';
import { AuthService } from '../../application/auth.service';
import { AuthenticatedRequest } from '../decorators/current-user.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const [scheme, token] = request.header('authorization')?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      await this.auth.authenticate('');
      return false;
    }

    (request as AuthenticatedRequest).user =
      await this.auth.authenticate(token);
    return true;
  }
}
