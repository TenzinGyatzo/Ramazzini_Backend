import { config } from 'dotenv';
config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
});

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { EnoentSilencerFilter } from './filters/enoent-silencer.filter';
import * as express from 'express';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.set('trust proxy', 1);

  // Configurar límites de tamaño para peticiones HTTP
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Registrar el filtro global para silenciar ENOENT en expedientes-medicos
  app.useGlobalFilters(new EnoentSilencerFilter());

  // Servir firmas y logos desde el mismo directorio donde se guardan (evitar 404 en local/prod)
  const signatoriesDir =
    process.env.SIGNATORIES_UPLOADS_DIR || 'assets/signatories';
  const providersLogosDir =
    process.env.PROVIDERS_UPLOADS_DIR || 'assets/providers-logos';
  app.useStaticAssets(join(process.cwd(), signatoriesDir), {
    prefix: '/assets/signatories',
  });
  app.useStaticAssets(join(process.cwd(), providersLogosDir), {
    prefix: '/assets/providers-logos',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );

  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Ramazzini API')
      .setDescription('Documentación de desarrollo (no expuesta en producción)')
      .setVersion('1.0')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, document);
  }

  app.enableCors({
    origin: ['https://ramazzini.app', 'http://localhost:5173'],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    optionsSuccessStatus: 204,
    exposedHeaders: ['Content-Disposition'],
  });

  // Escuchar puerto dinámico o 3000
  await app.listen(process.env.PORT || 3000);
}

bootstrap();
