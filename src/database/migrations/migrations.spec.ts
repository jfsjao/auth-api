import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('InitialSchema migration', () => {
  const migrationPath = join(
    process.cwd(),
    'src/database/migrations/1784955000000-InitialSchema.ts',
  );

  it('creates and removes persistence tables explicitly', () => {
    expect(existsSync(migrationPath)).toBe(true);

    const migration = readFileSync(migrationPath, 'utf8');

    expect(migration).toContain('CREATE TABLE "users"');
    expect(migration).toContain('CREATE TABLE "refresh_tokens"');
    expect(migration).toContain('CREATE INDEX "IDX_refresh_tokens_user_id"');
    expect(migration).toContain('DROP TABLE "refresh_tokens"');
    expect(migration).toContain('DROP TABLE "users"');
  });
});
