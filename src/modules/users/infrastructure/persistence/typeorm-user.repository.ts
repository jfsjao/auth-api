import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateUserRecord,
  UpdateUserRecord,
  UserRepositoryPort,
} from '../../domain/ports/user-repository.port';
import { User } from '../../domain/user';
import { UserOrmEntity } from './user.orm-entity';

@Injectable()
export class TypeOrmUserRepository implements UserRepositoryPort {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly repository: Repository<UserOrmEntity>,
  ) {}

  create(input: CreateUserRecord): Promise<User> {
    return this.repository.save(this.repository.create(input));
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repository
      .createQueryBuilder('user')
      .where('lower(user.email) = lower(:email)', { email })
      .getOne();
  }

  findById(id: string): Promise<User | null> {
    return this.repository.findOneBy({ id });
  }

  list(limit: number, offset: number): Promise<User[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async update(id: string, input: UpdateUserRecord): Promise<User | null> {
    const user = await this.repository.findOneBy({ id });
    if (!user) return null;
    Object.assign(user, input);
    return this.repository.save(user);
  }
}
