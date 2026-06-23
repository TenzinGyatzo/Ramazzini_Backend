import {
  BadRequestException,
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { isValidObjectId } from 'mongoose';
import { CentrosTrabajoService } from './centros-trabajo.service';

@Controller('api/centros-trabajo')
@ApiTags('Centros de Trabajo')
export class CentrosTrabajoBatchController {
  constructor(private readonly centrosTrabajoService: CentrosTrabajoService) {}

  @Get('por-empresas')
  @ApiOperation({
    summary: 'Obtiene centros de trabajo de múltiples empresas',
  })
  @ApiResponse({
    status: 200,
    description: 'Centros de trabajo encontrados',
  })
  @ApiResponse({ status: 400, description: 'IDs de empresa inválidos' })
  async findCentersByCompanies(@Query('ids') ids?: string) {
    const empresaIds = (ids ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (empresaIds.length === 0) {
      return [];
    }

    const invalidIds = empresaIds.filter((id) => !isValidObjectId(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        'Uno o más IDs de empresa no son válidos',
      );
    }

    return this.centrosTrabajoService.findCentersByCompanies(empresaIds);
  }
}
