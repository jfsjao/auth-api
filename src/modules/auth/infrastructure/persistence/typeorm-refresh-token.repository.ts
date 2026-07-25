import { Injectable } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import {
  NewRefreshTokenRecord,
  RefreshTokenRepositoryPort,
  RotateRefreshResult,
} from '../../domain/ports/refresh-token-repository.port';
import { RefreshTokenOrmEntity } from './refresh-token.orm-entity';

@Injectable()
export class TypeOrmRefreshTokenRepository implements RefreshTokenRepositoryPort {
  constructor(private readonly dataSource: DataSource) {}

  async create(input: NewRefreshTokenRecord): Promise<void> {
    await this.dataSource
      .getRepository(RefreshTokenOrmEntity)
      .save(this.toEntity(input));
  }

  async findUserIdByHash(tokenHash: string): Promise<string | null> {
    const token = await this.dataSource
      .getRepository(RefreshTokenOrmEntity)
      .findOne({ select: { userId: true }, where: { tokenHash } });
    return token?.userId ?? null;
  }

  rotate(
    currentHash: string,
    replacement: NewRefreshTokenRecord,
    now: Date,
  ): Promise<RotateRefreshResult> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(RefreshTokenOrmEntity);
      const current = await repository.findOne({
        where: { tokenHash: currentHash },
        lock: { mode: 'pessimistic_write' },
      });

      if (!current || current.expiresAt <= now) return { status: 'invalid' };

      if (current.revokedAt) {
        await repository.update(
          { userId: current.userId, revokedAt: IsNull() },
          { revokedAt: now },
        );
        return { status: 'reuse', userId: current.userId };
      }

      if (current.userId !== replacement.userId) return { status: 'invalid' };

      await repository.save(this.toEntity(replacement));
      current.revokedAt = now;
      current.lastUsedAt = now;
      current.replacedByTokenId = replacement.id;
      await repository.save(current);
      return { status: 'rotated', userId: current.userId };
    });
  }

  async revoke(tokenHash: string, now: Date): Promise<void> {
    await this.dataSource
      .getRepository(RefreshTokenOrmEntity)
      .update({ tokenHash, revokedAt: IsNull() }, { revokedAt: now });
  }

  private toEntity(input: NewRefreshTokenRecord): RefreshTokenOrmEntity {
    return Object.assign(new RefreshTokenOrmEntity(), {
      ...input,
      revokedAt: null,
      replacedByTokenId: null,
      lastUsedAt: null,
    });
  }
}
