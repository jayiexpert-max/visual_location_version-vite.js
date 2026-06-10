import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const corsOrigins = configService.get<string[]>('app.corsOrigins', []);
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-TV-Kiosk-Key',
      'Accept-Language',
    ],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Visual Location API')
    .setDescription('Warehouse management API for Visual Location Management')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Desktop or handheld JWT access token',
      },
      'access-token',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-TV-Kiosk-Key',
        description: 'TV kiosk read-only authentication key',
      },
      'tv-kiosk-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get<number>('app.port', 3000);
  await app.listen(port);

  logger.log(`Application listening on port ${port}`);
  logger.log(`Swagger docs available at /api/docs`);
}

void bootstrap();
