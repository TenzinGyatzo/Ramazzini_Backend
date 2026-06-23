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
  Req,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { isValidObjectId } from 'mongoose';
import { CreateSeguimientoProgramadoCardiometabolicoDto } from './dto/create-seguimiento-programado-cardiometabolico.dto';
import { UpdateSeguimientoProgramadoCardiometabolicoDto } from './dto/update-seguimiento-programado-cardiometabolico.dto';
import { SeguimientoProgramadoCardiometabolicoService } from './seguimiento-programado-cardiometabolico.service';
import { UsersService } from '../users/users.service';
import { assertDocumentPermission } from './utils/assert-document-permission.util';

type AuthenticatedRequest = Request & { userId: string };

@Controller('api/expedientes/:trabajadorId/seguimientos-programados-cardiometabolicos')
export class SeguimientoProgramadoCardiometabolicoController {
  constructor(
    private readonly seguimientoProgramadoService: SeguimientoProgramadoCardiometabolicoService,
    private readonly usersService: UsersService,
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
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertValidTrabajadorId(trabajadorId);
    await this.assertPermission(req);
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
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertValidObjectIds(trabajadorId, id);
    await this.assertPermission(req);
    const data = await this.seguimientoProgramadoService.update(trabajadorId, id, updateDto);
    return { message: 'Seguimiento programado cardiometabólico actualizado', data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('trabajadorId') trabajadorId: string,
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertValidObjectIds(trabajadorId, id);
    await this.assertPermission(req);
    await this.seguimientoProgramadoService.remove(trabajadorId, id);
  }

  private async assertPermission(req: AuthenticatedRequest): Promise<void> {
    const user = await this.usersService.findById(req.userId, 'role permisos');
    assertDocumentPermission(user, 'seguimientoProgramadoCardiometabolico');
  }

  private assertValidTrabajadorId(trabajadorId: string): void {
    if (!isValidObjectId(trabajadorId)) {
      throw new BadRequestException('El ID del trabajador no es válido');
    }
  }

  private assertValidObjectIds(trabajadorId: string, id: string): void {
    this.assertValidTrabajadorId(trabajadorId);
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }
  }
}
