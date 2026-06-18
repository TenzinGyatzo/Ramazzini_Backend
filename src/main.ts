import { config } from 'dotenv';
config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env' });

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

  // Servir el directorio de archivos estáticos
  app.useStaticAssets(join(__dirname, '..', 'assets', 'signatories'), {
    prefix: '/assets/signatories',
  });

  app.useStaticAssets(join(__dirname, '..', 'assets', 'providers-logos'), {
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
  });

  // Escuchar puerto dinámico o 3000
  await app.listen(process.env.PORT || 3000);
}

bootstrap();
