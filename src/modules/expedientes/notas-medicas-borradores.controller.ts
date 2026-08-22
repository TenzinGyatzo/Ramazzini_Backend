import { Controller, Get, Query, Req, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { NotasMedicasBorradoresService } from './notas-medicas-borradores.service';

type AuthenticatedRequest = Request & { userId: string };

@Controller('api/expedientes/notas-medicas')
export class NotasMedicasBorradoresController {
  constructor(
    private readonly notasMedicasBorradoresService: NotasMedicasBorradoresService,
  ) {}

  @Get('borradores-pendientes')
  async getBorradoresPendientes(@Req() req: AuthenticatedRequest) {
    return this.notasMedicasBorradoresService.findBorradoresPendientes(
      req.userId,
    );
  }

  @Get('contexto-cex')
  async getContextoCex(
    @Req() req: AuthenticatedRequest,
    @Query('trabajadorId') trabajadorId?: string,
    @Query('fechaNotaMedica') fechaNotaMedica?: string,
    @Query('excludeDocumentoId') excludeDocumentoId?: string,
  ) {
    if (!trabajadorId?.trim()) {
      throw new BadRequestException('trabajadorId es requerido');
    }
    if (!fechaNotaMedica?.trim()) {
      throw new BadRequestException('fechaNotaMedica es requerida');
    }
    return this.notasMedicasBorradoresService.getContextoCex({
      userId: req.userId,
      trabajadorId: trabajadorId.trim(),
      fechaNotaMedica: fechaNotaMedica.trim(),
      excludeDocumentoId: excludeDocumentoId?.trim() || undefined,
    });
  }
}
