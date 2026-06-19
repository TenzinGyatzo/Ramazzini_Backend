import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
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
import { ConsentimientoDiarioService } from './consentimiento-diario.service';
import { CreateConsentimientoDiarioDto } from './dto/create-consentimiento-diario.dto';
import {
  ConsentimientoStatusResponseDto,
  ConsentimientoCreatedResponseDto,
} from './dto/consentimiento-response.dto';
import { isValidObjectId } from 'mongoose';

type AuthenticatedRequest = Request & { userId: string };

/**
 * Controller para Consentimiento Diario
 *
 * IMPORTANTE - Inmutabilidad del Consentimiento:
 * Los consentimientos son inmutables (create-only). No se permiten operaciones de
 * update o delete. Si en el futuro se requiere agregar estos endpoints, deben:
 * 1. Verificar régimen SIRES_NOM024
 * 2. Lanzar ForbiddenException con código REGIMEN_DOCUMENT_IMMUTABLE
 * 3. Bloquear cualquier modificación o eliminación de consentimientos existentes
 */
@Controller('api/consentimiento-diario')
@ApiTags('Consentimiento Diario')
@ApiBearerAuth()
export class ConsentimientoDiarioController {
  constructor(
    private readonly consentimientoDiarioService: ConsentimientoDiarioService,
  ) {}

  @Get('status/:trabajadorId')
  @ApiOperation({
    summary: 'Obtiene el estado del consentimiento diario para un trabajador',
    description:
      'Consulta si existe un consentimiento informado diario para el trabajador en la fecha especificada (o hoy si no se proporciona)',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado del consentimiento obtenido exitosamente',
    type: ConsentimientoStatusResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'ID del trabajador inválido o formato de dateKey inválido',
  })
  @ApiResponse({
    status: 401,
    description: 'Token de autorización requerido o inválido',
  })
  @ApiResponse({
    status: 403,
    description: 'Consentimiento diario no habilitado para este proveedor',
  })
  @ApiResponse({
    status: 404,
    description: 'Trabajador no encontrado',
  })
  async getStatus(
    @Param('trabajadorId') trabajadorId: string,
    @Query('dateKey') dateKey: string | undefined,
    @Req() req: AuthenticatedRequest,
  ): Promise<ConsentimientoStatusResponseDto> {
    if (!isValidObjectId(trabajadorId)) {
      throw new BadRequestException('El ID del trabajador no es válido');
    }

    return this.consentimientoDiarioService.getStatus(
      trabajadorId,
      req.userId,
      dateKey,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crea un nuevo consentimiento informado diario',
    description:
      'Registra un consentimiento informado diario para un trabajador. Si no se proporciona dateKey, se usa la fecha de hoy según el timezone del proveedor.',
  })
  @ApiResponse({
    status: 201,
    description: 'Consentimiento creado exitosamente',
    type: ConsentimientoCreatedResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos (validación fallida)',
  })
  @ApiResponse({
    status: 401,
    description: 'Token de autorización requerido o inválido',
  })
  @ApiResponse({
    status: 403,
    description: 'Consentimiento diario no habilitado para este proveedor',
  })
  @ApiResponse({
    status: 404,
    description: 'Trabajador no encontrado',
  })
  @ApiResponse({
    status: 409,
    description:
      'Ya existe un consentimiento para este trabajador en la fecha especificada',
  })
  async create(
    @Body() createDto: CreateConsentimientoDiarioDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ConsentimientoCreatedResponseDto> {
    return this.consentimientoDiarioService.create(createDto, req.userId);
  }
}
