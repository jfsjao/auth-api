import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { nestDatabaseOptions } from './database.config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        nestDatabaseOptions({
          ...process.env,
          DATABASE_URL: config.get<string>('DATABASE_URL'),
        }),
    }),
  ],
})
export class DatabaseModule {}
