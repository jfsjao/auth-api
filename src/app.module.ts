import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { CacheModule } from './modules/cache/cache.module';
import { HealthModule } from './modules/health/health.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
    }),
    HealthModule,
    AuthModule,
    UsersModule,
    IntegrationsModule,
    CacheModule,
  ],
})
export class AppModule {}
