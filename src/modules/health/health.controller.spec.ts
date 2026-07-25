import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports service liveness', () => {
    expect(new HealthController().check()).toEqual({
      status: 'ok',
      service: 'auth_api',
    });
  });
});
