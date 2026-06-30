import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
  BadRequestException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class EnoentSilencerFilter implements ExceptionFilter {
  private readonly logger = new Logger(EnoentSilencerFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // 1) Silenciar ENOENT SOLO en /expedientes-medicos
    if (
      typeof exception === 'object' &&
      exception !== null &&
      (exception as any).code === 'ENOENT' &&
      request?.url?.startsWith('/expedientes-medicos')
    ) {
      return response.status(404).json({
        statusCode: 404,
        message: 'Archivo no encontrado',
        path: request.url,
        timestamp: new Date().toISOString(),
      });
    }

    // 2) Si es BadRequestException (validación), devuelve el payload completo
    if (exception instanceof BadRequestException) {
      const status = exception.getStatus();
      const payload = exception.getResponse(); // <-- aquí viene el array de errores del ValidationPipe
      // Log detallado con formato legible
      this.logger.warn(
        `[BadRequestException] ${request.method} ${request.url} -> ${JSON.stringify(payload, null, 2)}`,
      );
      return response.status(status).json(payload);
    }

    // 3) Para cualquier HttpException, no pierdas el payload
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const isQuietClinicalProbe =
        exception instanceof NotFoundException &&
        request.method === 'HEAD' &&
        request.url?.startsWith('/expedientes-medicos') &&
        request.headers['x-clinical-file-probe'] === 'regenerable';
      if (!isQuietClinicalProbe) {
        this.logger.error(
          `[HttpException] ${request.method} ${request.url} -> ${JSON.stringify(payload)}`,
        );
      }
      return response
        .status(status)
        .json(
          typeof payload === 'string'
            ? { statusCode: status, message: payload }
            : payload,
        );
    }

    // 4) Fallback para errores inesperados (no tumba el proceso)
    const message =
      (typeof exception === 'object' &&
        exception &&
        (exception as any)['message']) ||
      'Internal server error';
    const stack =
      (typeof exception === 'object' &&
        exception &&
        (exception as any)['stack']) ||
      '';
    this.logger.error(
      `[UnknownException] ${request.method} ${request.url}: ${message}`,
      stack,
    );

    return response.status(500).json({
      statusCode: 500,
      message: 'Internal server error',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
