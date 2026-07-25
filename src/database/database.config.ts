import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';

export function databaseOptions(
  environment: NodeJS.ProcessEnv = process.env,
): DataSourceOptions {
  const url = environment.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required');
  }

  return {
    type: 'postgres',
    url,
    uuidExtension: 'pgcrypto',
    ssl:
      environment.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: true }
        : false,
    synchronize: false,
    migrationsRun: environment.DATABASE_MIGRATIONS_RUN === 'true',
    logging: environment.NODE_ENV === 'development' ? ['error', 'warn'] : false,
    entities: [`${__dirname}/../modules/**/*.orm-entity{.ts,.js}`],
    migrations: [`${__dirname}/migrations/*-*.{ts,js}`],
    connectTimeoutMS: Number(
      environment.DATABASE_CONNECTION_TIMEOUT_MS ?? 5000,
    ),
    extra: {
      min: Number(environment.DATABASE_POOL_MIN ?? 2),
      max: Number(environment.DATABASE_POOL_MAX ?? 10),
      statement_timeout: Number(
        environment.DATABASE_STATEMENT_TIMEOUT_MS ?? 10000,
      ),
    },
  };
}

export function nestDatabaseOptions(
  environment: NodeJS.ProcessEnv = process.env,
): TypeOrmModuleOptions {
  return {
    ...databaseOptions(environment),
    autoLoadEntities: true,
  };
}
