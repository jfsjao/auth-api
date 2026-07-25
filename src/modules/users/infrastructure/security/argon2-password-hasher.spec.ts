import { ConfigService } from '@nestjs/config';
import { Argon2PasswordHasher } from './argon2-password-hasher';

describe('Argon2PasswordHasher', () => {
  it('creates an Argon2id hash and verifies the password', async () => {
    const config = new ConfigService({
      PASSWORD_HASH_MEMORY_COST: 8192,
      PASSWORD_HASH_TIME_COST: 1,
      PASSWORD_HASH_PARALLELISM: 1,
    });
    const hasher = new Argon2PasswordHasher(config);

    const hash = await hasher.hash('strong-password');

    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(hasher.verify(hash, 'strong-password')).resolves.toBe(true);
    await expect(hasher.verify(hash, 'wrong-password')).resolves.toBe(false);
  });
});
