import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ResultadosClinicosService } from './resultados-clinicos.service';
import { CreateResultadoClinicoDto } from './dto/create-resultado-clinico.dto';
import { UpdateResultadoClinicoDto } from './dto/update-resultado-clinico.dto';
import { VincularDocumentoDto } from './dto/vincular-documento.dto';
import { isValidObjectId } from 'mongoose';

@Controller('api/resultados-clinicos')
export class ResultadosClinicosController {
  constructor(
    private readonly resultadosClinicosService: ResultadosClinicosService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body(ValidationPipe) createDto: CreateResultadoClinicoDto) {
    return await this.resultadosClinicosService.create(createDto);
  }

  @Get()
  async findAll() {
    return await this.resultadosClinicosService.findAll();
  }

  @Get('trabajador/:idTrabajador')
  async findByTrabajador(
    @Param('idTrabajador') idTrabajador: string,
    @Query('tipo') tipo?: string,
  ) {
    if (!isValidObjectId(idTrabajador)) {
      throw new BadRequestException('ID de trabajador inválido');
    }
    return await this.resultadosClinicosService.findByTrabajador(
      idTrabajador,
      tipo,
    );
  }

  @Get('trabajador/:idTrabajador/expediente')
  async findByTrabajadorGroupedByYear(@Param('idTrabajador') idTrabajador: string) {
    if (!isValidObjectId(idTrabajador)) {
      throw new BadRequestException('ID de trabajador inválido');
    }
    return await this.resultadosClinicosService.findByTrabajadorGroupedByYear(
      idTrabajador,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('ID inválido');
    }
    return await this.resultadosClinicosService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateDto: UpdateResultadoClinicoDto,
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('ID inválido');
    }
    return await this.resultadosClinicosService.update(id, updateDto);
  }

  @Patch(':id/vincular-documento')
  async vincularDocumento(
    @Param('id') id: string,
    @Body(ValidationPipe) vincularDto: VincularDocumentoDto,
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('ID de resultado inválido');
    }
    if (!isValidObjectId(vincularDto.idDocumentoExterno)) {
      throw new BadRequestException('ID de documento inválido');
    }
    return await this.resultadosClinicosService.vincularDocumento(
      id,
      vincularDto.idDocumentoExterno,
    );
  }

  @Delete(':id/desvincular-documento')
  @HttpCode(HttpStatus.OK)
  async desvincularDocumento(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('ID inválido');
    }
    return await this.resultadosClinicosService.desvincularDocumento(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('ID inválido');
    }
    await this.resultadosClinicosService.remove(id);
  }
}
