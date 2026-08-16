import { config } from 'dotenv';
config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
});

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { EnoentSilencerFilter } from './filters/enoent-silencer.filter';
import * as express from 'express';
import cookieParser from 'cookie-parser';
import { isAuditTrailPersistEnabled } from './modules/audit/utils/audit-trail-persist.util';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  if (process.env.NODE_ENV === 'production' && !isAuditTrailPersistEnabled()) {
    Logger.warn(
      'AUDIT_TRAIL_PERSIST is not enabled in production; NOM-024 audit events will not be persisted.',
      'Bootstrap',
    );
  }

  app.set('trust proxy', 1);

  // Configurar límites de tamaño para peticiones HTTP
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Registrar el filtro global para silenciar ENOENT en expedientes-medicos
  app.useGlobalFilters(new EnoentSilencerFilter());

  // Firmas y logos se sirven vía BrandingAssetsController (JWT + tenant)

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.SWAGGER_ENABLED !== 'false'
  ) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Ramazzini API')
      .setDescription('Documentación de desarrollo (no expuesta en producción)')
      .setVersion('1.0.1')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, document);
  }

  app.enableCors({
    origin: ['https://ramazzini.app', 'http://localhost:5173'],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    optionsSuccessStatus: 204,
    allowedHeaders: [
      'X-Clinical-File-Probe',
      'X-Deletion-Password',
      'Content-Type',
      'Authorization',
    ],
    exposedHeaders: ['Content-Disposition'],
  });

  // Escuchar puerto dinámico o 3000
  await app.listen(process.env.PORT || 3000);
}

bootstrap();
