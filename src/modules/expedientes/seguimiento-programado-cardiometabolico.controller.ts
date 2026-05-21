import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { CreateSeguimientoProgramadoCardiometabolicoDto } from './dto/create-seguimiento-programado-cardiometabolico.dto';
import { UpdateSeguimientoProgramadoCardiometabolicoDto } from './dto/update-seguimiento-programado-cardiometabolico.dto';
import { SeguimientoProgramadoCardiometabolicoService } from './seguimiento-programado-cardiometabolico.service';

@Controller('api/expedientes/:trabajadorId/seguimientos-programados-cardiometabolicos')
export class SeguimientoProgramadoCardiometabolicoController {
  constructor(
    private readonly seguimientoProgramadoService: SeguimientoProgramadoCardiometabolicoService,
  ) {}

  @Get()
  async findByTrabajador(@Param('trabajadorId') trabajadorId: string) {
    this.assertValidTrabajadorId(trabajadorId);
    return this.seguimientoProgramadoService.findByTrabajador(trabajadorId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('trabajadorId') trabajadorId: string,
    @Body(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    )
    createDto: CreateSeguimientoProgramadoCardiometabolicoDto,
  ) {
    this.assertValidTrabajadorId(trabajadorId);
    const data = await this.seguimientoProgramadoService.create(trabajadorId, createDto);
    return { message: 'Seguimiento programado cardiometabólico creado exitosamente', data };
  }

  @Get(':id')
  async findOne(@Param('trabajadorId') trabajadorId: string, @Param('id') id: string) {
    this.assertValidObjectIds(trabajadorId, id);
    const data = await this.seguimientoProgramadoService.findOne(trabajadorId, id);
    return data;
  }

  @Patch(':id')
  async update(
    @Param('trabajadorId') trabajadorId: string,
    @Param('id') id: string,
    @Body(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    )
    updateDto: UpdateSeguimientoProgramadoCardiometabolicoDto,
  ) {
    this.assertValidObjectIds(trabajadorId, id);
    const data = await this.seguimientoProgramadoService.update(trabajadorId, id, updateDto);
    return { message: 'Seguimiento programado cardiometabólico actualizado', data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('trabajadorId') trabajadorId: string, @Param('id') id: string) {
    this.assertValidObjectIds(trabajadorId, id);
    await this.seguimientoProgramadoService.remove(trabajadorId, id);
  }

  private assertValidTrabajadorId(trabajadorId: string): void {
    if (!isValidObjectId(trabajadorId)) {
      throw new BadRequestException('ID de trabajador inválido');
    }
  }

  private assertValidObjectIds(trabajadorId: string, id: string): void {
    if (!isValidObjectId(trabajadorId) || !isValidObjectId(id)) {
      throw new BadRequestException('ID inválido');
    }
  }
}
