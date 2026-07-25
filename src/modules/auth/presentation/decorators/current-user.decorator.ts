import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '../../domain/auth-user';

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
