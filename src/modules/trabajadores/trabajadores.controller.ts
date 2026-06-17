import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException, NotFoundException, UseInterceptors, UploadedFile, Res, InternalServerErrorException, Query, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as xlsx from 'xlsx';
import { TrabajadoresService } from './trabajadores.service';
import { CreateTrabajadorDto } from './dto/create-trabajador.dto';
import { UpdateTrabajadorDto } from './dto/update-trabajador.dto';
import { TransferirTrabajadorDto } from './dto/transferir-trabajador.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { isValidObjectId } from 'mongoose';
import { Response, Request } from 'express';

type AuthenticatedRequest = Request & { userId: string };

@Controller('api/:empresaId([0-9a-fA-F]{24})/:centroId([0-9a-fA-F]{24})')
@ApiTags('Trabajadores')
export class TrabajadoresController {
  constructor(private readonly trabajadoresService: TrabajadoresService) {}

  @Get('/exportar-trabajadores')
  @ApiOperation({ summary: 'Exporta todos los trabajadores de un centro de trabajo en un archivo .xlsx' })
  @ApiResponse({ status: 200, description: 'Archivo de trabajadores exportado exitosamente' })
  @ApiResponse({ status: 400, description: 'El ID proporcionado no es válido' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async exportarTrabajadores(
    @Param('empresaId') empresaId: string,
    @Param('centroId') centroId: string,
    @Req() _req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    if (!isValidObjectId(empresaId)) {
      throw new BadRequestException('El ID de empresa no es válido');
    }

    if (!isValidObjectId(centroId)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    // Llamar al servicio para generar el archivo .xlsx temporalmente
    const workbookBuffer = await this.trabajadoresService.exportarTrabajadores(centroId);

    // Configurar encabezados de respuesta para la descarga del archivo
    res.setHeader('Content-Disposition', 'attachment; filename="trabajadores.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Enviar el archivo al cliente
    res.send(workbookBuffer);
  }

  @Post('registrar-trabajador')
  @ApiOperation({ summary: 'Registra un trabajador nuevo ' })
  @ApiResponse({ status: 201, description: 'Trabajador registrado exitosamente' })
  @ApiResponse({ status: 400, description: 'Solicitud Incorrecta *(Muestra violaciones de reglas de validación)*' })
  async create(@Body() createTrabajadorDto: CreateTrabajadorDto) {
    const trabajador = await this.trabajadoresService.create(createTrabajadorDto);
    return { message: 'Trabajador registrado', data: trabajador };
  }

  @Get('/trabajadores')
  @ApiOperation({ summary: 'Obtiene todos los trabajadores de un centro de trabajo' })
  @ApiResponse({ status: 200, description: 'Trabajadores encontrados exitosamente | Este centro de trabajo no tiene trabajadores registrados' })
  @ApiResponse({ status: 400, description: 'El ID proporcionado no es válido' })
  async findWorkersByCenter(@Param('empresaId') empresaId: string, @Param('centroId') centroId: string) {
    if (!isValidObjectId(empresaId)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    if (!isValidObjectId(centroId)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    const trabajadores = await this.trabajadoresService.findWorkersByCenter(centroId);

    if (!trabajadores || trabajadores.length === 0) {
      return { message: 'No hay trabajadores registrados en este centro de trabajo' };
    }

    return trabajadores;
  }

  @Get('/trabajadores-con-historia')
  @ApiOperation({ summary: 'Obtiene trabajadores con campos seleccionados de historia clínica' })
  @ApiResponse({ status: 200, description: 'Trabajadores encontrados con información médica' })
  @ApiResponse({ status: 400, description: 'El ID proporcionado no es válido' })
  async findWorkersWithHistoria(
    @Param('empresaId') empresaId: string,
    @Param('centroId') centroId: string
  ) {
    if (!isValidObjectId(empresaId)) {
      throw new BadRequestException('El ID de empresa no es válido');
    }

    if (!isValidObjectId(centroId)) {
      throw new BadRequestException('El ID de centro de trabajo no es válido');
    }

    const trabajadoresConHistoria = await this.trabajadoresService.findWorkersWithHistoriaDataByCenter(centroId);

    if (!trabajadoresConHistoria || trabajadoresConHistoria.length === 0) {
      return { message: 'No hay trabajadores con historia clínica en este centro de trabajo' };
    }

    return trabajadoresConHistoria;
  }

  @Get('/sexos-y-fechas-nacimiento-activos')
  async findSexosYFechasNacimientoActivos(
    @Param('empresaId') empresaId: string,
    @Param('centroId') centroId: string
  ) {
    if (!isValidObjectId(empresaId)) {
      throw new BadRequestException('El ID de empresa no es válido');
    }

    if (!isValidObjectId(centroId)) {
      throw new BadRequestException('El ID de centro de trabajo no es válido');
    }

    const sexosYFechasNacimiento = await this.trabajadoresService.findSexosYFechasNacimientoActivos(centroId);

    if (!sexosYFechasNacimiento || sexosYFechasNacimiento.length === 0) {
      return { message: 'No hay trabajadores con historia clínica en este centro de trabajo' };
    }

    return sexosYFechasNacimiento;
  }

  @Get('dashboard/')
  async getDashboardData(
    @Param('empresaId') empresaId: string, 
    @Param('centroId') centroId: string,
    @Query('inicio') inicio?: string,
    @Query('fin') fin?: string
  ) {
    const dashboardData = await this.trabajadoresService.getDashboardData(centroId, inicio, fin);
    if (!dashboardData) {
      throw new BadRequestException('No se encontraron datos para el dashboard');
    }
    return dashboardData;
  }

  @Get('/centros-disponibles-transferencia')
  @ApiOperation({ summary: 'Obtiene empresas y centros de trabajo disponibles para transferencia según permisos del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de empresas con sus centros disponibles' })
  @ApiResponse({ status: 401, description: 'Token de autorización requerido o inválido' })
  @ApiResponse({ status: 403, description: 'Usuario no encontrado' })
  async getCentrosDisponiblesTransferencia(
    @Param('empresaId') empresaId: string,
    @Param('centroId') centroId: string,
    @Req() req: AuthenticatedRequest,
    @Query('excluirCentroId') excluirCentroId?: string,
    @Query('idProveedorSalud') idProveedorSalud?: string
  ) {
    if (excluirCentroId && !isValidObjectId(excluirCentroId)) {
      throw new BadRequestException('[TRANSFER-CENTROS] El ID de centro a excluir no es válido');
    }

    if (idProveedorSalud && !isValidObjectId(idProveedorSalud)) {
      throw new BadRequestException('[TRANSFER-CENTROS] El ID de proveedor de salud no es válido');
    }

    const userId = req.userId;

    return await this.trabajadoresService.getCentrosDisponiblesParaTransferencia(
      userId,
      excluirCentroId,
      idProveedorSalud
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un trabajador por su ID' })
  @ApiResponse({ status: 200, description: 'trabajador obtenido exitosamente' })
  @ApiResponse({ status: 400, description: 'El ID proporcionado no es válido' })
  @ApiResponse({ status: 404, description: 'No se encontró el trabajador' })
  async findOne(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    const trabajador = await this.trabajadoresService.findOne(id);

    if (!trabajador) {
      throw new NotFoundException('No se encontró el trabajador');
    }

    return trabajador;
  }

  @Patch('/actualizar-trabajador/:id')
  @ApiOperation({ summary: 'Actualiza un trabajador' })
  @ApiResponse({ status: 200, description: 'Trabajador actualizado exitosamente' })
  @ApiResponse({ status: 400, description: 'El ID de trabajador proporcionado no es válido | Solicitud Incorrecta *(Muestra violaciones de reglas de validación)*' })
  async update(@Param('id') id: string, @Body() updateTrabajadorDto: UpdateTrabajadorDto) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    const updatedTrabajador = await this.trabajadoresService.update(id, updateTrabajadorDto);

    if (!updatedTrabajador) {
      return { message: `No se pudo actualizar el trabajador con id ${id}` };
    }

    return { message: 'Trabajador actualizado', data: updatedTrabajador };
  }

  @Patch('/transferir-trabajador/:id')
  @ApiOperation({ summary: 'Transfiere un trabajador a otro centro de trabajo' })
  @ApiResponse({ status: 200, description: 'Trabajador transferido exitosamente' })
  @ApiResponse({ status: 400, description: 'El ID proporcionado no es válido | Trabajador no encontrado | Centro de trabajo destino no encontrado | El trabajador ya pertenece a este centro de trabajo' })
  @ApiResponse({ status: 403, description: 'No tiene permiso para transferir a este centro de trabajo' })
  async transferirTrabajador(
    @Param('id') id: string,
    @Body() transferData: TransferirTrabajadorDto,
    @Req() req: AuthenticatedRequest
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID de trabajador proporcionado no es válido');
    }

    if (!isValidObjectId(transferData.nuevoCentroId)) {
      throw new BadRequestException('El ID de centro de trabajo destino no es válido');
    }

    const userId = req.userId;

    const trabajadorTransferido = await this.trabajadoresService.transferirTrabajador(
      id,
      transferData.nuevoCentroId,
      userId
    );

    return { 
      message: 'Trabajador transferido exitosamente', 
      data: trabajadorTransferido 
    };
  }

  @Post('importar-trabajadores')
  @UseInterceptors(FileInterceptor('file'))
  async importarTrabajadores(
      @UploadedFile() file: Express.Multer.File, 
      @Param('centroId') centroId: string,
      @Body('createdBy') createdBy: string
  ) {
      if (!file) {
          throw new BadRequestException('No se proporcionó un archivo');
      }
  
      // Procesa el archivo Excel
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);
      
      // Llama al servicio para importar trabajadores
      const result = await this.trabajadoresService.importarTrabajadores(data, centroId, createdBy);
      
      // Retornar el resultado completo del servicio (exitosos + fallidos)
      return result;
  }
  
  @Delete('/eliminar-trabajador/:id')
  @ApiOperation({ summary: 'Elimina un trabajador' })
  @ApiResponse({ status: 200, description: 'Trabajador eliminado exitosamente | El trabajador del ID proporcionado no existe o ya ha sido eliminado' })
  @ApiResponse({ status: 400, description: 'El ID de trabajador proporcionado no es válido' })
  async remove(@Param('centroId') centroId: string, @Param('id') id: string) {
    if (!isValidObjectId(centroId)) {
      throw new BadRequestException('El ID de centro de trabajo proporcionado no es válido');
    }

    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID de trabajador proporcionado no es válido');
    }

    try {
      const deletedTrabajador = await this.trabajadoresService.remove(id);

      if (!deletedTrabajador) {
        throw new NotFoundException(`El trabajador con ID ${id} no existe o ya ha sido eliminado.`);
      }

      return { message: 'Trabajador/a eliminado exitosamente' };
    } catch (error) {
      throw new InternalServerErrorException('Ocurrió un error al eliminar el trabajador');
    }
  }

  

}
