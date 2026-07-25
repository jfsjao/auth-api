import { ApplicationError } from '../../../common/errors/application.error';
import { PasswordHasherPort } from '../domain/ports/password-hasher.port';
import {
  CreateUserRecord,
  UpdateUserRecord,
  UserRepositoryPort,
} from '../domain/ports/user-repository.port';
import { User } from '../domain/user';
import { UsersService } from './users.service';

class MemoryUsers implements UserRepositoryPort {
  readonly records: User[] = [];

  create(input: CreateUserRecord): Promise<User> {
    const now = new Date('2026-07-25T12:00:00.000Z');
    const user: User = {
      id:
        this.records.length === 0
          ? '85fe332a-41da-46f4-a284-ace57b437ec0'
          : '5ef528c7-2bf4-496c-83ec-1b3d93932133',
      ...input,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.records.push(user);
    return Promise.resolve(user);
  }

  findByEmail(email: string): Promise<User | null> {
    return Promise.resolve(
      this.records.find((user) => user.email === email) ?? null,
    );
  }

  findById(id: string): Promise<User | null> {
    return Promise.resolve(this.records.find((user) => user.id === id) ?? null);
  }

  list(limit: number, offset: number): Promise<User[]> {
    return Promise.resolve(this.records.slice(offset, offset + limit));
  }

  update(id: string, input: UpdateUserRecord): Promise<User | null> {
    const user = this.records.find((record) => record.id === id);
    if (!user) return Promise.resolve(null);
    if (
      input.email &&
      this.records.some(
        (record) => record.id !== id && record.email === input.email,
      )
    ) {
      return Promise.reject(
        Object.assign(new Error('duplicate email'), { code: '23505' }),
      );
    }
    Object.assign(user, input);
    return Promise.resolve(user);
  }
}

class TestHasher implements PasswordHasherPort {
  hash(password: string): Promise<string> {
    return Promise.resolve(`hash:${password}`);
  }

  verify(hash: string, password: string): Promise<boolean> {
    return Promise.resolve(hash === `hash:${password}`);
  }
}

describe('UsersService', () => {
  let repository: MemoryUsers;
  let service: UsersService;

  beforeEach(() => {
    repository = new MemoryUsers();
    service = new UsersService(repository, new TestHasher());
  });

  it('normalizes email and never exposes password hash', async () => {
    const user = await service.register({
      email: ' Dev@Example.com ',
      password: 'strong-password',
    });

    expect(user.email).toBe('dev@example.com');
    expect('passwordHash' in user).toBe(false);
    expect(repository.records[0].passwordHash).toBe('hash:strong-password');
  });

  it('rejects duplicate normalized email', async () => {
    await service.register({
      email: 'dev@example.com',
      password: 'strong-password',
    });

    await expect(
      service.register({
        email: 'DEV@example.com',
        password: 'another-password',
      }),
    ).rejects.toMatchObject<ApplicationError>({
      code: 'EMAIL_ALREADY_EXISTS',
      statusCode: 409,
    });
  });

  it('does not authenticate inactive users', async () => {
    await service.register({
      email: 'dev@example.com',
      password: 'strong-password',
    });
    repository.records[0].isActive = false;

    await expect(
      service.verifyCredentials('dev@example.com', 'strong-password'),
    ).resolves.toBeNull();
  });

  it('maps duplicate email during update to a conflict', async () => {
    await service.register({
      email: 'first@example.com',
      password: 'strong-password',
    });
    const second = await service.register({
      email: 'second@example.com',
      password: 'strong-password',
    });

    await expect(
      service.update(second.id, { email: 'first@example.com' }),
    ).rejects.toMatchObject<ApplicationError>({
      code: 'EMAIL_ALREADY_EXISTS',
      statusCode: 409,
    });
  });
});
