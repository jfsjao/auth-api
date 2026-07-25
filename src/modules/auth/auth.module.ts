import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users';
import { AuthService } from './application/auth.service';
import { REFRESH_TOKEN_REPOSITORY } from './domain/ports/refresh-token-repository.port';
import { RefreshTokenOrmEntity } from './infrastructure/persistence/refresh-token.orm-entity';
import { TypeOrmRefreshTokenRepository } from './infrastructure/persistence/typeorm-refresh-token.repository';
import { OpaqueTokenService } from './infrastructure/security/opaque-token.service';
import { AuthController } from './presentation/auth.controller';
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';
import { PermissionsGuard } from './presentation/guards/permissions.guard';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({}),
    }),
    TypeOrmModule.forFeature([RefreshTokenOrmEntity]),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OpaqueTokenService,
    TypeOrmRefreshTokenRepository,
    {
      provide: REFRESH_TOKEN_REPOSITORY,
      useExisting: TypeOrmRefreshTokenRepository,
    },
    { provide: 'AUTH_APPLICATION', useExisting: AuthService },
    JwtAuthGuard,
    PermissionsGuard,
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_GUARD, useExisting: PermissionsGuard },
  ],
  exports: [AuthService, 'AUTH_APPLICATION'],
})
export class AuthModule {}
