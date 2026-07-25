import { databaseOptions } from './database.config';

describe('databaseOptions', () => {
  it('never enables schema synchronization', () => {
    const options = databaseOptions({
      DATABASE_URL: 'postgresql://user:password@localhost:5432/auth_api',
    });

    expect(options.synchronize).toBe(false);
  });

  it('uses PostgreSQL pgcrypto for UUID generation', () => {
    const options = databaseOptions({
      DATABASE_URL: 'postgresql://user:password@localhost:5432/auth_api',
    });

    expect(options.type).toBe('postgres');
    if (options.type === 'postgres') {
      expect(options.uuidExtension).toBe('pgcrypto');
    }
  });

  it('requires an explicit database URL', () => {
    expect(() => databaseOptions({})).toThrow('DATABASE_URL is required');
  });
});
