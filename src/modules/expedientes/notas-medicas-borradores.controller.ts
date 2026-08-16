import { Controller, Get, Req } from '@nestjs/common';
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
}
