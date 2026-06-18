import { Controller, Get, Post, Put, Delete, Body, Param, Req } from '@nestjs/common';
import { InformePersonalizacionService } from './informe-personalizacion.service';
import { CreateInformePersonalizacionDto, UpdateInformePersonalizacionDto } from './dto/informe-personalizacion.dto';
import { Request } from 'express';

type AuthenticatedRequest = Request & { userId: string };

@Controller('api/informe-personalizacion')
export class InformePersonalizacionController {
  constructor(
    private readonly informePersonalizacionService: InformePersonalizacionService,
  ) {}

  @Post()
  async create(@Body() createDto: CreateInformePersonalizacionDto, @Req() req: AuthenticatedRequest) {
    const userId = req.userId;
    createDto.createdBy = userId;
    createDto.updatedBy = userId;
    return this.informePersonalizacionService.create(createDto);
  }

  @Get('empresa/:idEmpresa')
  async findByEmpresa(@Param('idEmpresa') idEmpresa: string) {
    return this.informePersonalizacionService.findByEmpresa(idEmpresa);
  }

  @Get('empresa/:idEmpresa/centro/:idCentroTrabajo')
  async findByEmpresaAndCentro(
    @Param('idEmpresa') idEmpresa: string,
    @Param('idCentroTrabajo') idCentroTrabajo: string,
  ) {
    return this.informePersonalizacionService.findByEmpresaAndCentro(idEmpresa, idCentroTrabajo);
  }

  @Get('empresa/:idEmpresa/centro')
  async findByEmpresaOnly(@Param('idEmpresa') idEmpresa: string) {
    return this.informePersonalizacionService.findByEmpresaAndCentro(idEmpresa);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateInformePersonalizacionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.userId;
    updateDto.updatedBy = userId;
    return this.informePersonalizacionService.update(id, updateDto);
  }

  @Put('upsert/empresa/:idEmpresa')
  async upsertByEmpresa(
    @Param('idEmpresa') idEmpresa: string,
    @Body() updateDto: UpdateInformePersonalizacionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.userId;
    updateDto.updatedBy = userId;
    return this.informePersonalizacionService.upsertByEmpresaAndCentro(
      idEmpresa,
      undefined,
      updateDto,
    );
  }

  @Put('upsert/empresa/:idEmpresa/centro/:idCentroTrabajo')
  async upsertByEmpresaAndCentro(
    @Param('idEmpresa') idEmpresa: string,
    @Param('idCentroTrabajo') idCentroTrabajo: string,
    @Body() updateDto: UpdateInformePersonalizacionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.userId;
    updateDto.updatedBy = userId;
    return this.informePersonalizacionService.upsertByEmpresaAndCentro(
      idEmpresa,
      idCentroTrabajo,
      updateDto,
    );
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.informePersonalizacionService.delete(id);
    return { message: 'Personalización eliminada correctamente' };
  }
}
