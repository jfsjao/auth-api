import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { UserOrmEntity } from '../src/modules/users/infrastructure/persistence/user.orm-entity';

describe('Authentication persistence (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const email = `integration-${randomUUID()}@example.com`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    dataSource = moduleRef.get(DataSource);
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await dataSource.getRepository(UserOrmEntity).delete({ email });
    await app.close();
  });

  it('persists user and rotates refresh token transactionally', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'integration-password' })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'integration-password' })
      .expect(200);

    const original = login.body.data.refreshToken as string;
    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: original })
      .expect(200);

    expect(refreshed.body.data.refreshToken).not.toBe(original);

    const persisted = await dataSource
      .getRepository(UserOrmEntity)
      .findOneByOrFail({ email });
    expect(persisted.passwordHash).toMatch(/^\$argon2id\$/);
  });
});
