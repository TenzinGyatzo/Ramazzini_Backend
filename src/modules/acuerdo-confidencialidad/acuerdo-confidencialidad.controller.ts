import {
  Controller,
  Get,
  Post,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AcuerdoConfidencialidadService } from './acuerdo-confidencialidad.service';
import {
  AcuerdoConfidencialidadAcceptResponseDto,
  AcuerdoConfidencialidadStatusResponseDto,
} from './dto/acuerdo-confidencialidad-response.dto';
import { getClientIp } from '../../utils/get-client-ip.util';

type AuthenticatedRequest = Request & { userId: string };

@ApiTags('Acuerdo de Confidencialidad')
@ApiBearerAuth()
@Controller('api/acuerdo-confidencialidad')
export class AcuerdoConfidencialidadController {
  constructor(
    private readonly acuerdoConfidencialidadService: AcuerdoConfidencialidadService,
  ) {}

  @Get('status')
  @ApiOperation({
    summary: 'Estado del acuerdo de confidencialidad para el usuario autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado obtenido exitosamente',
    type: AcuerdoConfidencialidadStatusResponseDto,
  })
  async getStatus(
    @Req() req: AuthenticatedRequest,
  ): Promise<AcuerdoConfidencialidadStatusResponseDto> {
    return this.acuerdoConfidencialidadService.getStatus(req.userId);
  }

  @Post('accept')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registra la aceptación del acuerdo de confidencialidad',
  })
  @ApiResponse({
    status: 201,
    description: 'Aceptación registrada exitosamente',
    type: AcuerdoConfidencialidadAcceptResponseDto,
  })
  async accept(
    @Req() req: AuthenticatedRequest,
  ): Promise<AcuerdoConfidencialidadAcceptResponseDto> {
    const direccionIp = getClientIp(req);
    return this.acuerdoConfidencialidadService.accept(req.userId, direccionIp);
  }
}
