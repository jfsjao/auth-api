export const REFRESH_TOKEN_REPOSITORY = Symbol('REFRESH_TOKEN_REPOSITORY');

export interface NewRefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export type RotateRefreshResult =
  | { status: 'rotated'; userId: string }
  | { status: 'invalid' }
  | { status: 'reuse'; userId: string };

export interface RefreshTokenRepositoryPort {
  create(input: NewRefreshTokenRecord): Promise<void>;
  findUserIdByHash(tokenHash: string): Promise<string | null>;
  rotate(
    currentHash: string,
    replacement: NewRefreshTokenRecord,
    now: Date,
  ): Promise<RotateRefreshResult>;
  revoke(tokenHash: string, now: Date): Promise<void>;
}
