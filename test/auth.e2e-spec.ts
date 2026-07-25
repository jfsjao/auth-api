import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { configureApp } from '../src/app.setup';
import {
  NewRefreshTokenRecord,
  RotateRefreshResult,
} from '../src/modules/auth/domain/ports/refresh-token-repository.port';
import { AuthModule } from '../src/modules/auth/auth.module';
import { RefreshTokenOrmEntity } from '../src/modules/auth/infrastructure/persistence/refresh-token.orm-entity';
import { TypeOrmRefreshTokenRepository } from '../src/modules/auth/infrastructure/persistence/typeorm-refresh-token.repository';
import { Argon2PasswordHasher } from '../src/modules/users/infrastructure/security/argon2-password-hasher';
import {
  CreateUserRecord,
  UpdateUserRecord,
  UserRepositoryPort,
} from '../src/modules/users/domain/ports/user-repository.port';
import { User } from '../src/modules/users/domain/user';
import { UserOrmEntity } from '../src/modules/users/infrastructure/persistence/user.orm-entity';
import { TypeOrmUserRepository } from '../src/modules/users/infrastructure/persistence/typeorm-user.repository';

class TestPasswordHasher {
  hash(password: string): Promise<string> {
    return Promise.resolve(`hashed:${password}`);
  }

  verify(hash: string, password: string): Promise<boolean> {
    return Promise.resolve(hash === `hashed:${password}`);
  }
}

class InMemoryUsers implements UserRepositoryPort {
  readonly records = new Map<string, User>();

  create(input: CreateUserRecord): Promise<User> {
    const now = new Date('2026-07-25T12:00:00.000Z');
    const user: User = {
      id: randomUUID(),
      ...input,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.records.set(user.id, user);
    return Promise.resolve(user);
  }

  findByEmail(email: string): Promise<User | null> {
    return Promise.resolve(
      [...this.records.values()].find((user) => user.email === email) ?? null,
    );
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.records.get(id) ?? null);
  }

  list(limit: number, offset: number): Promise<User[]> {
    return Promise.resolve(
      [...this.records.values()].slice(offset, offset + limit),
    );
  }

  update(id: string, input: UpdateUserRecord): Promise<User | null> {
    const user = this.records.get(id);
    if (!user) return Promise.resolve(null);
    Object.assign(user, input, { updatedAt: new Date() });
    return Promise.resolve(user);
  }
}

interface StoredRefresh extends NewRefreshTokenRecord {
  revokedAt: Date | null;
}

class InMemoryRefreshTokens {
  readonly records = new Map<string, StoredRefresh>();

  create(input: NewRefreshTokenRecord): Promise<void> {
    this.records.set(input.tokenHash, { ...input, revokedAt: null });
    return Promise.resolve();
  }

  findUserIdByHash(tokenHash: string): Promise<string | null> {
    return Promise.resolve(this.records.get(tokenHash)?.userId ?? null);
  }

  rotate(
    currentHash: string,
    replacement: NewRefreshTokenRecord,
    now: Date,
  ): Promise<RotateRefreshResult> {
    const current = this.records.get(currentHash);
    if (!current || current.expiresAt <= now) {
      return Promise.resolve({ status: 'invalid' });
    }
    if (current.revokedAt) {
      for (const token of this.records.values()) {
        if (token.userId === current.userId) token.revokedAt = now;
      }
      return Promise.resolve({ status: 'reuse', userId: current.userId });
    }
    current.revokedAt = now;
    this.records.set(replacement.tokenHash, {
      ...replacement,
      revokedAt: null,
    });
    return Promise.resolve({ status: 'rotated', userId: current.userId });
  }

  revoke(tokenHash: string, now: Date): Promise<void> {
    const token = this.records.get(tokenHash);
    if (token) token.revokedAt = now;
    return Promise.resolve();
  }
}

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let users: InMemoryUsers;
  let refreshTokens: InMemoryRefreshTokens;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET =
      'test-access-secret-with-more-than-thirty-two-bytes';
    process.env.REFRESH_TOKEN_PEPPER =
      'test-refresh-pepper-with-more-than-thirty-two-bytes';
    process.env.JWT_ACCESS_EXPIRES_IN = '15m';
    process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';

    users = new InMemoryUsers();
    refreshTokens = new InMemoryRefreshTokens();
    const builder = Test.createTestingModule({ imports: [AuthModule] });
    builder.overrideProvider(getRepositoryToken(UserOrmEntity)).useValue({});
    builder
      .overrideProvider(getRepositoryToken(RefreshTokenOrmEntity))
      .useValue({});
    builder.overrideProvider(TypeOrmUserRepository).useValue(users);
    builder
      .overrideProvider(TypeOrmRefreshTokenRepository)
      .useValue(refreshTokens);
    builder
      .overrideProvider(Argon2PasswordHasher)
      .useValue(new TestPasswordHasher());

    const moduleRef = await builder.compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => app.close());

  it('registers, logs in and reads own profile', async () => {
    const registration = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: ' DEV@Example.com ', password: 'strong-password' })
      .expect(201);

    expect(registration.body.data.email).toBe('dev@example.com');
    expect(registration.body.data.passwordHash).toBeUndefined();

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'dev@example.com', password: 'strong-password' })
      .expect(200);

    expect(login.body.data.accessToken).toEqual(expect.any(String));
    expect(login.body.data.refreshToken).toEqual(expect.any(String));

    const profile = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)
      .expect(200);

    expect(profile.body.data.email).toBe('dev@example.com');
  });

  it('rotates refresh token and detects reuse', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'dev@example.com', password: 'strong-password' })
      .expect(200);
    const original = login.body.data.refreshToken as string;

    const rotated = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: original })
      .expect(200);

    expect(rotated.body.data.refreshToken).not.toBe(original);

    const reuse = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: original })
      .expect(401);

    expect(reuse.body.error.code).toBe('TOKEN_REUSE_DETECTED');
  });

  it('rejects invalid credentials with a stable error', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'dev@example.com', password: 'wrong-password' })
      .expect(401);

    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects weak registration passwords', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'other@example.com', password: 'short' })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('blocks regular users from listing users', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'dev@example.com', password: 'strong-password' })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('allows users to update their own email', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'dev@example.com', password: 'strong-password' })
      .expect(200);

    const response = await request(app.getHttpServer())
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)
      .send({ email: 'updated@example.com' })
      .expect(200);

    expect(response.body.data.email).toBe('updated@example.com');
  });

  it('rejects duplicate registration', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'updated@example.com', password: 'another-password' })
      .expect(409);

    expect(response.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('revokes refresh token on logout', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'updated@example.com', password: 'strong-password' })
      .expect(200);
    const refreshToken = login.body.data.refreshToken as string;

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .send({ refreshToken })
      .expect(204);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);
    expect(response.body.error.code).toBe('TOKEN_REUSE_DETECTED');
  });

  it('allows administrators to list users', async () => {
    const user = await users.findByEmail('updated@example.com');
    if (!user) throw new Error('Expected seeded user');
    user.role = 'admin';

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'updated@example.com', password: 'strong-password' })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
  });
});
