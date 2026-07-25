import { Inject, Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';
import { PASSWORD_HASHER } from '../domain/ports/password-hasher.port';
import type { PasswordHasherPort } from '../domain/ports/password-hasher.port';
import {
  USER_REPOSITORY,
  UpdateUserRecord,
} from '../domain/ports/user-repository.port';
import type { UserRepositoryPort } from '../domain/ports/user-repository.port';
import { PublicUser, User, UserRole, toPublicUser } from '../domain/user';

export interface RegisterUserInput {
  email: string;
  password: string;
}

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly users: UserRepositoryPort,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async register(input: RegisterUserInput): Promise<PublicUser> {
    const email = this.normalizeEmail(input.email);
    if (await this.users.findByEmail(email)) {
      throw new ApplicationError(
        'EMAIL_ALREADY_EXISTS',
        'E-mail já cadastrado',
        409,
      );
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    try {
      return toPublicUser(
        await this.users.create({ email, passwordHash, role: 'user' }),
      );
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new ApplicationError(
          'EMAIL_ALREADY_EXISTS',
          'E-mail já cadastrado',
          409,
        );
      }
      throw error;
    }
  }

  async verifyCredentials(
    emailInput: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.users.findByEmail(this.normalizeEmail(emailInput));
    if (
      !user ||
      !user.isActive ||
      !(await this.passwordHasher.verify(user.passwordHash, password))
    ) {
      return null;
    }
    return user;
  }

  async getById(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) {
      throw new ApplicationError(
        'USER_NOT_FOUND',
        'Usuário não encontrado',
        404,
      );
    }
    return user;
  }

  async getPublicById(id: string): Promise<PublicUser> {
    return toPublicUser(await this.getById(id));
  }

  async list(limit = 20, offset = 0): Promise<PublicUser[]> {
    return (await this.users.list(limit, offset)).map(toPublicUser);
  }

  async update(
    id: string,
    input: { email?: string; role?: UserRole; isActive?: boolean },
  ): Promise<PublicUser> {
    const update: UpdateUserRecord = {
      ...input,
      ...(input.email ? { email: this.normalizeEmail(input.email) } : {}),
    };
    let user: User | null;
    try {
      user = await this.users.update(id, update);
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new ApplicationError(
          'EMAIL_ALREADY_EXISTS',
          'E-mail já cadastrado',
          409,
        );
      }
      throw error;
    }
    if (!user) {
      throw new ApplicationError(
        'USER_NOT_FOUND',
        'Usuário não encontrado',
        404,
      );
    }
    return toPublicUser(user);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    );
  }
}
