import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserOrmEntity } from '../users/infrastructure/persistence/user.orm-entity';
import { AuthModule } from './auth.module';
import { RefreshTokenOrmEntity } from './infrastructure/persistence/refresh-token.orm-entity';
import { TypeOrmRefreshTokenRepository } from './infrastructure/persistence/typeorm-refresh-token.repository';

describe('AuthModule', () => {
  it('exposes the authentication application service', async () => {
    const builder = Test.createTestingModule({
      imports: [AuthModule],
    });
    builder.overrideProvider(getRepositoryToken(UserOrmEntity)).useValue({});
    builder
      .overrideProvider(getRepositoryToken(RefreshTokenOrmEntity))
      .useValue({});
    builder.overrideProvider(TypeOrmRefreshTokenRepository).useValue({
      create: jest.fn(),
      findUserIdByHash: jest.fn(),
      rotate: jest.fn(),
      revoke: jest.fn(),
    });
    const moduleRef = await builder.compile();

    expect(() => moduleRef.get<unknown>('AUTH_APPLICATION')).not.toThrow();
  });
});
