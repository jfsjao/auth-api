import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './application/users.service';
import { PASSWORD_HASHER } from './domain/ports/password-hasher.port';
import { USER_REPOSITORY } from './domain/ports/user-repository.port';
import { UserOrmEntity } from './infrastructure/persistence/user.orm-entity';
import { TypeOrmUserRepository } from './infrastructure/persistence/typeorm-user.repository';
import { Argon2PasswordHasher } from './infrastructure/security/argon2-password-hasher';
import { UsersController } from './presentation/users.controller';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([UserOrmEntity])],
  controllers: [UsersController],
  providers: [
    UsersService,
    TypeOrmUserRepository,
    Argon2PasswordHasher,
    { provide: USER_REPOSITORY, useExisting: TypeOrmUserRepository },
    { provide: PASSWORD_HASHER, useExisting: Argon2PasswordHasher },
    { provide: 'USERS_APPLICATION', useExisting: UsersService },
  ],
  exports: [UsersService, 'USERS_APPLICATION'],
})
export class UsersModule {}
