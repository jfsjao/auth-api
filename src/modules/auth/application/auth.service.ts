import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { ApplicationError } from '../../../common/errors/application.error';
import { UsersService } from '../../users';
import type { User } from '../../users';
import { AuthenticatedUser, ROLE_PERMISSIONS } from '../domain/auth-user';
import {
  REFRESH_TOKEN_REPOSITORY,
  NewRefreshTokenRecord,
} from '../domain/ports/refresh-token-repository.port';
import type { RefreshTokenRepositoryPort } from '../domain/ports/refresh-token-repository.port';
import { OpaqueTokenService } from '../infrastructure/security/opaque-token.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly opaqueTokens: OpaqueTokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokens: RefreshTokenRepositoryPort,
  ) {}

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.users.verifyCredentials(email, password);
    if (!user) {
      throw new ApplicationError(
        'INVALID_CREDENTIALS',
        'E-mail ou senha inválidos',
        401,
      );
    }
    return this.createSession(user);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const currentHash = this.opaqueTokens.hash(refreshToken);
    const currentUserId = await this.findUserIdForRotation(currentHash);
    const user = await this.users.getById(currentUserId);
    if (!user.isActive) {
      throw new ApplicationError(
        'INVALID_REFRESH_TOKEN',
        'Refresh token inválido',
        401,
      );
    }

    const nextRawToken = this.opaqueTokens.generate();
    const replacement = this.newRefreshRecord(user.id, nextRawToken);
    const result = await this.refreshTokens.rotate(
      currentHash,
      replacement,
      new Date(),
    );

    if (result.status === 'reuse') {
      throw new ApplicationError(
        'TOKEN_REUSE_DETECTED',
        'Sessão revogada por reutilização de token',
        401,
      );
    }
    if (result.status === 'invalid') {
      throw new ApplicationError(
        'INVALID_REFRESH_TOKEN',
        'Refresh token inválido',
        401,
      );
    }

    return {
      ...(await this.createAccessToken(user)),
      refreshToken: nextRawToken,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokens.revoke(
      this.opaqueTokens.hash(refreshToken),
      new Date(),
    );
  }

  async authenticate(accessToken: string): Promise<AuthenticatedUser> {
    try {
      return await this.jwt.verifyAsync<AuthenticatedUser>(accessToken, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        issuer: this.config.get<string>('JWT_ISSUER', 'auth_api'),
        audience: this.config.get<string>('JWT_AUDIENCE', 'auth_api-clients'),
        algorithms: ['HS256'],
      });
    } catch {
      throw new ApplicationError(
        'UNAUTHENTICATED',
        'Token de acesso inválido ou expirado',
        401,
      );
    }
  }

  private async createSession(user: User): Promise<TokenPair> {
    const refreshToken = this.opaqueTokens.generate();
    await this.refreshTokens.create(
      this.newRefreshRecord(user.id, refreshToken),
    );
    return {
      ...(await this.createAccessToken(user)),
      refreshToken,
    };
  }

  private async createAccessToken(
    user: User,
  ): Promise<Omit<TokenPair, 'refreshToken'>> {
    const expiresIn = this.durationSeconds(
      this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    );
    const payload: AuthenticatedUser = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: ROLE_PERMISSIONS[user.role],
    };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      issuer: this.config.get<string>('JWT_ISSUER', 'auth_api'),
      audience: this.config.get<string>('JWT_AUDIENCE', 'auth_api-clients'),
      expiresIn,
      algorithm: 'HS256',
    });
    return { accessToken, tokenType: 'Bearer', expiresIn };
  }

  private newRefreshRecord(
    userId: string,
    rawToken: string,
  ): NewRefreshTokenRecord {
    const lifetime = this.durationSeconds(
      this.config.get<string>('REFRESH_TOKEN_EXPIRES_IN', '7d'),
    );
    return {
      id: randomUUID(),
      userId,
      tokenHash: this.opaqueTokens.hash(rawToken),
      expiresAt: new Date(Date.now() + lifetime * 1000),
    };
  }

  private durationSeconds(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value);
    if (!match) {
      throw new Error(`Invalid duration: ${value}`);
    }
    const amount = Number(match[1]);
    const factors = { s: 1, m: 60, h: 3600, d: 86400 };
    return amount * factors[match[2] as keyof typeof factors];
  }

  private async findUserIdForRotation(tokenHash: string): Promise<string> {
    const userId = await this.refreshTokens.findUserIdByHash(tokenHash);
    if (!userId) {
      throw new ApplicationError(
        'INVALID_REFRESH_TOKEN',
        'Refresh token inválido',
        401,
      );
    }
    return userId;
  }
}
