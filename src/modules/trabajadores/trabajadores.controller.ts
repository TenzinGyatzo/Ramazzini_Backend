import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  Res,
  InternalServerErrorException,
  Query,
  Req,
  UseGuards,
  GoneException,
  ConflictException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as xlsx from 'xlsx';
import { TrabajadoresService } from './trabajadores.service';
import { WorkerFusionService } from './worker-fusion.service';
import { UsersService } from '../users/users.service';
import { CreateTrabajadorDto } from './dto/create-trabajador.dto';
import { UpdateTrabajadorDto } from './dto/update-trabajador.dto';
import { TransferirTrabajadorDto } from './dto/transferir-trabajador.dto';
import {
  FusionarTrabajadoresDto,
  DescartarDuplicadoDto,
} from './dto/fusion-trabajadores.dto';
import { WorkerDuplicateAlertDto } from './dto/worker-duplicate-alert.dto';
import { assertManageTrabajadores } from './utils/assert-manage-trabajadores.util';
import { OrganizationalAccessService } from 'src/utils/organizational-access.service';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { isValidObjectId } from 'mongoose';
import { Response, Request } from 'express';
import { DeletionPasswordGuard } from 'src/utils/guards/deletion-password.guard';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '../audit/constants/audit-action-type';
import { AuditEventClass } from '../audit/constants/audit-event-class';
import { RegistrarExportacionExcelDto } from './dto/registrar-exportacion-excel.dto';

type AuthenticatedRequest = Request & { userId: string };

@Controller('api/:empresaId([0-9a-fA-F]{24})/:centroId([0-9a-fA-F]{24})')
@ApiTags('Trabajadores')
export class TrabajadoresController {
  constructor(
    private readonly trabajadoresService: TrabajadoresService,
    private readonly workerFusionService: WorkerFusionService,
    private readonly usersService: UsersService,
    private readonly organizationalAccessService: OrganizationalAccessService,
    private readonly auditService: AuditService,
  ) {}

  private async assertCanManageTrabajadores(userId: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    assertManageTrabajadores(user as any);
  }

  private async recordWorkersExportExcel(
    req: AuthenticatedRequest,
    empresaId: string,
    centroId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const user = await this.usersService.findById(req.userId, 'idProveedorSalud');
    if (!user?.idProveedorSalud) {
      return;
    }
    await this.auditService.record({
      proveedorSaludId: String(user.idProveedorSalud),
      actorId: req.userId,
      actionType: AuditActionType.WORKERS_EXPORT_EXCEL,
      resourceType: 'CentroTrabajo',
      resourceId: centroId,
      payload: { empresaId, ...payload },
      eventClass: AuditEventClass.CLASS_2_SOFT_FAIL,
    });
  }

  @Get('/exportar-trabajadores')
  @ApiOperation({
    summary:
      'Exporta todos los trabajadores de un centro de trabajo en un archivo .xlsx',
  })
  @ApiResponse({
    status: 200,
    description: 'Archivo de trabajadores exportado exitosamente',
  })
  @ApiResponse({ status: 400, description: 'El ID proporcionado no es válido' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async exportarTrabajadores(
    @Param('empresaId') empresaId: string,
    @Param('centroId') centroId: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    if (!isValidObjectId(empresaId)) {
      throw new BadRequestException('El ID de empresa no es válido');
    }

    if (!isValidObjectId(centroId)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    await this.assertCanManageTrabajadores(req.userId);
    await this.organizationalAccessService.assertUserCanAccessCentro(
      req.userId,
      empresaId,
      centroId,
    );

    const workbookBuffer =
      await this.trabajadoresService.exportarTrabajadores(centroId);

    await this.recordWorkersExportExcel(req, empresaId, centroId, {
      origen: 'servidor',
      filtered: false,
    });

    // Configurar encabezados de respuesta para la descarga del archivo
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="trabajadores.xlsx"',
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    // Enviar el archivo al cliente
    res.send(workbookBuffer);
  }

  @Post('/registrar-exportacion-excel')
  @ApiOperation({
    summary:
      'Registra en auditoría una exportación Excel de trabajadores generada en el cliente',
  })
  @ApiResponse({ status: 201, description: 'Evento de auditoría registrado' })
  @ApiResponse({ status: 400, description: 'El ID proporcionado no es válido' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async registrarExportacionExcel(
    @Param('empresaId') empresaId: string,
    @Param('centroId') centroId: string,
    @Body() dto: RegistrarExportacionExcelDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!isValidObjectId(empresaId)) {
      throw new BadRequestException('El ID de empresa no es válido');
    }

    if (!isValidObjectId(centroId)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    await this.assertCanManageTrabajadores(req.userId);
    await this.organizationalAccessService.assertUserCanAccessCentro(
      req.userId,
      empresaId,
      centroId,
    );

    await this.recordWorkersExportExcel(req, empresaId, centroId, {
      origen: 'cliente',
      filtered: dto.filtered ?? true,
      rowCount: dto.rowCount,
      filename: dto.filename,
      ...(dto.columnKeys != null ? { columnKeys: dto.columnKeys } : {}),
      ...(dto.columnCount != null ? { columnCount: dto.columnCount } : {}),
      ...(dto.showEmptyColumns != null
        ? { showEmptyColumns: dto.showEmptyColumns }
        : {}),
    });

    return { ok: true };
  }

  @Post('registrar-trabajador')
  @ApiOperation({ summary: 'Registra un trabajador nuevo ' })
  @ApiResponse({
    status: 201,
    description: 'Trabajador registrado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description:
      'Solicitud Incorrecta *(Muestra violaciones de reglas de validación)*',
  })
  async create(
    @Body() createTrabajadorDto: CreateTrabajadorDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.assertCanManageTrabajadores(req.userId);
    const { trabajador, posibleDuplicado } =
      await this.trabajadoresService.create(createTrabajadorDto);
    return {
      message: 'Trabajador registrado',
      data: trabajador,
      posibleDuplicado,
    };
  }

  @Get('/trabajadores')
  @ApiOperation({
    summary: 'Obtiene todos los trabajadores de un centro de trabajo',
  })
  @ApiResponse({
    status: 200,
    description:
      'Trabajadores encontrados exitosamente | Este centro de trabajo no tiene trabajadores registrados',
  })
  @ApiResponse({ status: 400, description: 'El ID proporcionado no es válido' })
  async findWorkersByCenter(
    @Param('empresaId') empresaId: string,
    @Param('centroId') centroId: string,
  ) {
    if (!isValidObjectId(empresaId)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    if (!isValidObjectId(centroId)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    const trabajadores =
      await this.trabajadoresService.findWorkersByCenter(centroId);

    if (!trabajadores || trabajadores.length === 0) {
      return {
        message: 'No hay trabajadores registrados en este centro de trabajo',
      };
    }

    return trabajadores;
  }

  @Get('/trabajadores-count')
  @ApiOperation({
    summary: 'Cuenta los trabajadores de un centro de trabajo (sin payload)',
  })
  @ApiResponse({ status: 200, description: 'Conteo de trabajadores' })
  async countWorkersByCenter(
    @Param('empresaId') empresaId: string,
    @Param('centroId') centroId: string,
  ): Promise<{ count: number }> {
    if (!isValidObjectId(empresaId) || !isValidObjectId(centroId)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }
    const count = await this.trabajadoresService.countByCenter(centroId);
    return { count };
  }

  @Get('/trabajadores-con-historia')
  @ApiOperation({
    summary:
      'Obtiene trabajadores con campos seleccionados de historia clínica',
  })
  @ApiResponse({
    status: 200,
    description: 'Trabajadores encontrados con información médica',
  })
  @ApiResponse({ status: 400, description: 'El ID proporcionado no es válido' })
  async findWorkersWithHistoria(
    @Param('empresaId') empresaId: string,
    @Param('centroId') centroId: string,
  ) {
    if (!isValidObjectId(empresaId)) {
      throw new BadRequestException('El ID de empresa no es válido');
    }

    if (!isValidObjectId(centroId)) {
      throw new BadRequestException('El ID de centro de trabajo no es válido');
    }

    const trabajadoresConHistoria =
      await this.trabajadoresService.findWorkersWithHistoriaDataByCenter(
        centroId,
      );

    if (!trabajadoresConHistoria || trabajadoresConHistoria.length === 0) {
      return [];
    }

    return trabajadoresConHistoria;
  }

  @Get('/sexos-y-fechas-nacimiento-activos')
  async findSexosYFechasNacimientoActivos(
    @Param('empresaId') empresaId: string,
    @Param('centroId') centroId: string,
  ) {
    if (!isValidObjectId(empresaId)) {
      throw new BadRequestException('El ID de empresa no es válido');
    }

    if (!isValidObjectId(centroId)) {
      throw new BadRequestException('El ID de centro de trabajo no es válido');
    }

    const sexosYFechasNacimiento =
      await this.trabajadoresService.findSexosYFechasNacimientoActivos(
        centroId,
      );

    if (!sexosYFechasNacimiento || sexosYFechasNacimiento.length === 0) {
      return {
        message:
          'No hay trabajadores con historia clínica en este centro de trabajo',
      };
    }

    return sexosYFechasNacimiento;
  }

  @Get('dashboard/')
  async getDashboardData(
    @Param('empresaId') empresaId: string,
    @Param('centroId') centroId: string,
    @Query('inicio') inicio?: string,
    @Query('fin') fin?: string,
  ) {
    const dashboardData = await this.trabajadoresService.getDashboardData(
      centroId,
      inicio,
      fin,
    );
    if (!dashboardData) {
      throw new BadRequestException(
        'No se encontraron datos para el dashboard',
      );
    }
    return dashboardData;
  }

  @Get('/centros-disponibles-transferencia')
  @ApiOperation({
    summary:
      'Obtiene empresas y centros de trabajo disponibles para transferencia según permisos del usuario',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de empresas con sus centros disponibles',
  })
  @ApiResponse({
    status: 401,
    description: 'Token de autorización requerido o inválido',
  })
  @ApiResponse({ status: 403, description: 'Usuario no encontrado' })
  async getCentrosDisponiblesTransferencia(
    @Param('empresaId') empresaId: string,
    @Param('centroId') centroId: string,
    @Req() req: AuthenticatedRequest,
    @Query('excluirCentroId') excluirCentroId?: string,
    @Query('idProveedorSalud') idProveedorSalud?: string,
  ) {
    if (excluirCentroId && !isValidObjectId(excluirCentroId)) {
      throw new BadRequestException(
        '[TRANSFER-CENTROS] El ID de centro a excluir no es válido',
      );
    }

    if (idProveedorSalud && !isValidObjectId(idProveedorSalud)) {
      throw new BadRequestException(
        '[TRANSFER-CENTROS] El ID de proveedor de salud no es válido',
      );
    }

    const userId = req.userId;

    return await this.trabajadoresService.getCentrosDisponiblesParaTransferencia(
      userId,
      excluirCentroId,
      idProveedorSalud,
    );
  }

  @Get('/duplicados-pendientes')
  @ApiOperation({ summary: 'Lista alertas de duplicados pendientes del centro' })
  @ApiResponse({ status: 200, description: 'Alertas pendientes', type: [WorkerDuplicateAlertDto] })
  @ApiResponse({ status: 403, description: 'Sin permiso gestionarTrabajadores' })
  async getDuplicadosPendientes(
    @Param('centroId') centroId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!isValidObjectId(centroId)) {
      throw new BadRequestException('El ID de centro no es válido');
    }
    await this.assertCanManageTrabajadores(req.userId);
    return this.workerFusionService.getPendingAlertsForCentro(centroId);
  }

  @Get('/trabajadores/fusion-preview')
  @ApiOperation({ summary: 'Vista previa de fusión manual entre dos trabajadores' })
  @ApiQuery({ name: 'destinoId', required: true })
  @ApiQuery({ name: 'fuenteId', required: true })
  @ApiResponse({ status: 200, description: 'Preview de fusión' })
  @ApiResponse({ status: 409, description: 'Conflictos detectados' })
  async getFusionPreview(
    @Query('destinoId') destinoId: string,
    @Query('fuenteId') fuenteId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!isValidObjectId(destinoId) || !isValidObjectId(fuenteId)) {
      throw new BadRequestException('IDs de trabajador no válidos');
    }
    await this.assertCanManageTrabajadores(req.userId);
    return this.workerFusionService.getFusionPreview(destinoId, fuenteId);
  }

  @Get('/trabajadores/:id/duplicados')
  @ApiOperation({ summary: 'Candidatos a duplicado para un trabajador' })
  async getDuplicadosDeTrabajador(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }
    await this.assertCanManageTrabajadores(req.userId);
    return this.workerFusionService.findAllDuplicatesInEmpresa(id);
  }

  @Post('/fusionar-trabajadores')
  @ApiOperation({ summary: 'Fusión manual de dos registros del mismo trabajador (DGIS)' })
  @ApiResponse({ status: 200, description: 'Fusión completada' })
  @ApiResponse({ status: 403, description: 'Sin permiso' })
  @ApiResponse({ status: 409, description: 'Conflicto numeroEmpleado' })
  async fusionarTrabajadores(
    @Param('empresaId') empresaId: string,
    @Body() body: FusionarTrabajadoresDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!isValidObjectId(empresaId)) {
      throw new BadRequestException('El ID de empresa no es válido');
    }
    await this.assertCanManageTrabajadores(req.userId);
    try {
      const result = await this.trabajadoresService.fusionarTrabajadores({
        trabajadorDestinoId: body.trabajadorDestinoId,
        trabajadorFuenteId: body.trabajadorFuenteId,
        userId: req.userId,
        idEmpresa: empresaId,
        confirmacion: body.confirmacion,
        numeroEmpleadoResuelto: body.numeroEmpleadoResuelto,
        migrarArchivos: body.migrarArchivos,
      });
      return { message: 'Trabajadores fusionados exitosamente', data: result };
    } catch (error) {
      if (error?.status === 409) throw new ConflictException(error.message);
      throw error;
    }
  }

  @Patch('/duplicados/:alertId/descartar')
  @ApiOperation({ summary: 'Descartar alerta de duplicado (no es la misma persona)' })
  async descartarDuplicado(
    @Param('alertId') alertId: string,
    @Body() _body: DescartarDuplicadoDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!isValidObjectId(alertId)) {
      throw new BadRequestException('ID de alerta no válido');
    }
    await this.assertCanManageTrabajadores(req.userId);
    const alert = await this.workerFusionService.descartarAlerta(
      alertId,
      req.userId,
    );
    return { message: 'Alerta descartada', data: alert };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un trabajador por su ID' })
  @ApiResponse({ status: 200, description: 'trabajador obtenido exitosamente' })
  @ApiResponse({ status: 400, description: 'El ID proporcionado no es válido' })
  @ApiResponse({ status: 404, description: 'No se encontró el trabajador' })
  @ApiResponse({ status: 410, description: 'Trabajador fusionado — redirectTo disponible' })
  async findOne(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    try {
      const trabajador = await this.trabajadoresService.findOne(id);

      if (trabajador?.fused && trabajador?.redirectTo) {
        throw new GoneException({
          message: 'Este trabajador fue fusionado con otro registro',
          redirectTo: trabajador.redirectTo,
        });
      }

      if (!trabajador) {
        throw new NotFoundException('No se encontró el trabajador');
      }

      return trabajador;
    } catch (error) {
      if (error?.message === 'Trabajador no encontrado') {
        throw new NotFoundException('No se encontró el trabajador');
      }
      throw error;
    }
  }

  @Patch('/actualizar-trabajador/:id')
  @ApiOperation({ summary: 'Actualiza un trabajador' })
  @ApiResponse({
    status: 200,
    description: 'Trabajador actualizado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description:
      'El ID de trabajador proporcionado no es válido | Solicitud Incorrecta *(Muestra violaciones de reglas de validación)*',
  })
  async update(
    @Param('id') id: string,
    @Body() updateTrabajadorDto: UpdateTrabajadorDto,
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    const updatedTrabajador = await this.trabajadoresService.update(
      id,
      updateTrabajadorDto,
    );

    if (!updatedTrabajador) {
      return { message: `No se pudo actualizar el trabajador con id ${id}` };
    }

    return { message: 'Trabajador actualizado', data: updatedTrabajador };
  }

  @Patch('/transferir-trabajador/:id')
  @ApiOperation({
    summary: 'Transfiere un trabajador a otro centro de trabajo',
  })
  @ApiResponse({
    status: 200,
    description: 'Trabajador transferido exitosamente',
  })
  @ApiResponse({
    status: 400,
    description:
      'El ID proporcionado no es válido | Trabajador no encontrado | Centro de trabajo destino no encontrado | El trabajador ya pertenece a este centro de trabajo',
  })
  @ApiResponse({
    status: 403,
    description: 'No tiene permiso para transferir a este centro de trabajo',
  })
  async transferirTrabajador(
    @Param('id') id: string,
    @Body() transferData: TransferirTrabajadorDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(
        'El ID de trabajador proporcionado no es válido',
      );
    }

    if (!isValidObjectId(transferData.nuevoCentroId)) {
      throw new BadRequestException(
        'El ID de centro de trabajo destino no es válido',
      );
    }

    const userId = req.userId;

    const { trabajador, posibleDuplicado } =
      await this.trabajadoresService.transferirTrabajador(
        id,
        transferData.nuevoCentroId,
        userId,
      );

    return {
      message: 'Trabajador transferido exitosamente',
      data: trabajador,
      posibleDuplicado,
    };
  }

  @Post('importar-trabajadores')
  @UseInterceptors(FileInterceptor('file'))
  async importarTrabajadores(
    @UploadedFile() file: Express.Multer.File,
    @Param('centroId') centroId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.assertCanManageTrabajadores(req.userId);
    if (!file) {
      throw new BadRequestException('No se proporcionó un archivo');
    }

    // Procesa el archivo Excel
    const workbook = xlsx.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    // Llama al servicio para importar trabajadores
    const result = await this.trabajadoresService.importarTrabajadores(
      data,
      centroId,
      req.userId,
    );

    // Retornar el resultado completo del servicio (exitosos + fallidos)
    return result;
  }

  @Delete('/eliminar-trabajador/:id')
  @UseGuards(DeletionPasswordGuard)
  @ApiOperation({ summary: 'Elimina un trabajador' })
  @ApiResponse({
    status: 200,
    description:
      'Trabajador eliminado exitosamente | El trabajador del ID proporcionado no existe o ya ha sido eliminado',
  })
  @ApiResponse({
    status: 400,
    description: 'El ID de trabajador proporcionado no es válido',
  })
  async remove(
    @Param('centroId') centroId: string,
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.assertCanManageTrabajadores(req.userId);
    if (!isValidObjectId(centroId)) {
      throw new BadRequestException(
        'El ID de centro de trabajo proporcionado no es válido',
      );
    }

    if (!isValidObjectId(id)) {
      throw new BadRequestException(
        'El ID de trabajador proporcionado no es válido',
      );
    }

    try {
      const deletedTrabajador = await this.trabajadoresService.remove(id);

      if (!deletedTrabajador) {
        throw new NotFoundException(
          `El trabajador con ID ${id} no existe o ya ha sido eliminado.`,
        );
      }

      return { message: 'Trabajador/a eliminado exitosamente' };
    } catch (error) {
      throw new InternalServerErrorException(
        'Ocurrió un error al eliminar el trabajador',
      );
    }
  }
}
