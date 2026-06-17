import { Controller, Get, Post, Body, Query, Req, BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { TrabajadoresService } from './trabajadores.service';

type AuthenticatedRequest = Request & { userId: string };

// Nota: Usamos ruta con 4 segmentos para evitar colisión con 'api/:empresaId/:centroId/...'
@Controller('api/transferencias-trabajadores/v2')
@ApiTags('Transferencias Trabajadores')
export class TransferenciasController {
  constructor(private readonly trabajadoresService: TrabajadoresService) {}

  @Get('centros-disponibles-transferencia')
  @ApiOperation({ summary: 'Empresas y centros disponibles para transferencia (sin params de ruta)' })
  @ApiResponse({ status: 200, description: 'OK' })
  async getCentrosDisponiblesTransferencia(
    @Req() req: AuthenticatedRequest,
    @Query('excluirCentroId') excluirCentroId?: string,
    @Query('idProveedorSalud') idProveedorSalud?: string,
  ) {
    const t0 = Date.now();
    const excluirCentroIdNorm = (excluirCentroId || '').trim();
    const idProveedorSaludNorm = (idProveedorSalud || '').trim();
    const isObjId = (v: string) => /^[a-fA-F0-9]{24}$/.test(v);

    const excluirCentroIdSeguro = excluirCentroIdNorm && isObjId(excluirCentroIdNorm) ? excluirCentroIdNorm : undefined;
    const idProveedorSaludSeguro = idProveedorSaludNorm && isObjId(idProveedorSaludNorm) ? idProveedorSaludNorm : undefined;

    const userId = req.userId;
    const res = await this.trabajadoresService.getCentrosDisponiblesParaTransferencia(
      userId,
      excluirCentroIdSeguro,
      idProveedorSaludSeguro,
    );
    const t = Date.now() - t0;
    try {
      const numEmpresas = Array.isArray((res as any)?.empresas) ? (res as any).empresas.length : 0;
    } catch {}
    return res;
  }

  @Get('opciones')
  @ApiOperation({ summary: 'Opciones de transferencia paginadas (empresas + centros) con búsqueda' })
  @ApiResponse({ status: 200, description: 'OK' })
  async getOpcionesPaginadas(
    @Req() req: AuthenticatedRequest,
    @Query('q') q?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '25',
    @Query('excluirCentroId') excluirCentroId?: string,
    @Query('idProveedorSalud') idProveedorSalud?: string,
  ) {
    const userId = req.userId;
    const pageNum = Math.max(parseInt(page as any, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit as any, 10) || 25, 1), 100);
    const t0 = Date.now();
    const res = await this.trabajadoresService.getOpcionesTransferenciaPaginado(
      userId,
      (q || '').trim(),
      pageNum,
      limitNum,
      (excluirCentroId || '').trim(),
      (idProveedorSalud || '').trim(),
    );
    const t = (Date.now() - t0);
    return res;
  }

  @Post('centros/conteos')
  @ApiOperation({ summary: 'Conteo en lote de trabajadores por centroId' })
  @ApiResponse({ status: 200, description: 'OK' })
  async getConteosPorCentros(
    @Req() req: AuthenticatedRequest,
    @Body('centroIds') centroIds: string[] = [],
  ) {
    const userId = req.userId;
    if (!Array.isArray(centroIds) || centroIds.length === 0) {
      throw new BadRequestException('centroIds debe ser un arreglo no vacío');
    }
    const t0 = Date.now();
    const res = await this.trabajadoresService.contarTrabajadoresPorCentros(userId, centroIds);
    const t = (Date.now() - t0);
    return res;
  }
}
