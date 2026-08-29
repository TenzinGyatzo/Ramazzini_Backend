import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { InicioResumenService } from './inicio-resumen.service';

type AuthenticatedRequest = Request & { userId?: string };

@Controller('api/inicio')
export class InicioController {
  constructor(private readonly inicioResumenService: InicioResumenService) {}

  @Get('resumen')
  async getResumen(@Req() req: AuthenticatedRequest) {
    if (!req.userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.inicioResumenService.getResumen(req.userId);
  }

  @Get('hoy/trabajadores')
  async listHoyTrabajadores(@Req() req: AuthenticatedRequest) {
    if (!req.userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.inicioResumenService.listHoyTrabajadores(req.userId);
  }

  @Get('hoy/documentos')
  async listHoyDocumentos(@Req() req: AuthenticatedRequest) {
    if (!req.userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.inicioResumenService.listHoyDocumentos(req.userId);
  }

  @Get('hoy/centros')
  async listHoyCentros(@Req() req: AuthenticatedRequest) {
    if (!req.userId) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.inicioResumenService.listHoyCentros(req.userId);
  }
}
