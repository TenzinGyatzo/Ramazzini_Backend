import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  BadRequestException,
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
import { isValidObjectId } from 'mongoose';
import { ConsentimientosService } from './consentimientos.service';
import { CreateConsentimientoDto } from './dto/create-consentimiento.dto';
import {
  ConsentimientoStatusResponseDto,
  ConsentimientoCreatedResponseDto,
} from './dto/consentimiento-response.dto';

type AuthenticatedRequest = Request & { userId: string };

/**
 * Consentimiento para tratamiento de información en SIRES (trabajador).
 * Registros inmutables (create-only).
 */
@Controller('api/consentimientos')
@ApiTags('Consentimientos')
@ApiBearerAuth()
export class ConsentimientosController {
  constructor(private readonly consentimientosService: ConsentimientosService) {}

  @Get('status/:trabajadorId')
  @ApiOperation({
    summary:
      'Estado del consentimiento para tratamiento de información (versión vigente)',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado obtenido exitosamente',
    type: ConsentimientoStatusResponseDto,
  })
  async getStatus(
    @Param('trabajadorId') trabajadorId: string,
  ): Promise<ConsentimientoStatusResponseDto> {
    if (!isValidObjectId(trabajadorId)) {
      throw new BadRequestException('El ID del trabajador no es válido');
    }
    return this.consentimientosService.getStatus(trabajadorId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registra consentimiento para tratamiento de información en SIRES',
  })
  @ApiResponse({
    status: 201,
    description: 'Consentimiento registrado exitosamente',
    type: ConsentimientoCreatedResponseDto,
  })
  async create(
    @Body() createDto: CreateConsentimientoDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ConsentimientoCreatedResponseDto> {
    return this.consentimientosService.create(createDto, req.userId);
  }
}
