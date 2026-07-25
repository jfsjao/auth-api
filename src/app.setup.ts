import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ApiExceptionFilter } from './common/http/api-exception.filter';

export function configureApp(app: INestApplication): void {
  const prefix = process.env.API_PREFIX ?? 'api';
  app.setGlobalPrefix(prefix);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();

  if (process.env.SWAGGER_ENABLED !== 'false') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('auth_api')
      .setDescription('API agregadora segura e resiliente.')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(
      process.env.SWAGGER_PATH ?? 'docs',
      app,
      SwaggerModule.createDocument(app, swaggerConfig),
    );
  }
}
