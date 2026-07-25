import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApp } from '../src/app.setup';
import { HealthModule } from '../src/modules/health/health.module';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => app.close());

  it('GET /api/v1/health returns liveness', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);
    expect(response.body).toEqual({ status: 'ok', service: 'auth_api' });
  });
});
