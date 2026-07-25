import { User, UserRole } from '../user';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface CreateUserRecord {
  email: string;
  passwordHash: string;
  role: UserRole;
}

export interface UpdateUserRecord {
  email?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UserRepositoryPort {
  create(input: CreateUserRecord): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  list(limit: number, offset: number): Promise<User[]>;
  update(id: string, input: UpdateUserRecord): Promise<User | null>;
}
