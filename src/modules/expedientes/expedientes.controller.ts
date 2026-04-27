// expedientes.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException,
  ValidationPipe,
  UseInterceptors,
  UploadedFile,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ExpedientesService } from './expedientes.service';
import { isValidObjectId } from 'mongoose';
import { CatalogsService } from '../catalogs/catalogs.service';
import { UsersService } from '../users/users.service';
import { CatalogType } from '../catalogs/interfaces/catalog-entry.interface';
import { Query } from '@nestjs/common';
import { CreateAntidopingDto } from './dto/create-antidoping.dto';
import { UpdateAntidopingDto } from './dto/update-antidoping.dto';
import { CreateAptitudDto } from './dto/create-aptitud.dto';
import { UpdateAptitudDto } from './dto/update-aptitud.dto';
import { CreateAudiometriaDto } from './dto/create-audiometria.dto';
import { UpdateAudiometriaDto } from './dto/update-audiometria.dto';
import { CreateCertificadoDto } from './dto/create-certificado.dto';
import { UpdateCertificadoDto } from './dto/update-certificado.dto';
import { CreateCertificadoExpeditoDto } from './dto/create-certificado-expedito.dto';
import { UpdateCertificadoExpeditoDto } from './dto/update-certificado-expedito.dto';
import { CreateDocumentoExternoDto } from './dto/create-documento-externo.dto';
import { UpdateDocumentoExternoDto } from './dto/update-documento-externo.dto';
import { CreateExamenVistaDto } from './dto/create-examen-vista.dto';
import { UpdateExamenVistaDto } from './dto/update-examen-vista.dto';
import { CreateExploracionFisicaDto } from './dto/create-exploracion-fisica.dto';
import { UpdateExploracionFisicaDto } from './dto/update-exploracion-fisica.dto';
import { CreateHistoriaClinicaDto } from './dto/create-historia-clinica.dto';
import { UpdateHistoriaClinicaDto } from './dto/update-historia-clinica.dto';
import { CreateNotaMedicaDto } from './dto/create-nota-medica.dto';
import { UpdateNotaMedicaDto } from './dto/update-nota-medica.dto';
import { CreateNotaAclaratoriaDto } from './dto/create-nota-aclaratoria.dto';
import { UpdateNotaAclaratoriaDto } from './dto/update-nota-aclaratoria.dto';
import { CreateControlPrenatalDto } from './dto/create-control-prenatal.dto';
import { UpdateControlPrenatalDto } from './dto/update-control-prenatal.dto';
import { CreateHistoriaOtologicaDto } from './dto/create-historia-otologica.dto';
import { UpdateHistoriaOtologicaDto } from './dto/update-historia-otologica.dto';
import { CreatePrevioEspirometriaDto } from './dto/create-previo-espirometria.dto';
import { UpdatePrevioEspirometriaDto } from './dto/update-previo-espirometria.dto';
import { CreateConstanciaAptitudDto } from './dto/create-constancia-aptitud.dto';
import { UpdateConstanciaAptitudDto } from './dto/update-constancia-aptitud.dto';
import { CreateLesionDto } from './dto/create-lesion.dto';
import { UpdateLesionDto } from './dto/update-lesion.dto';
import { CreateDeteccionDto } from './dto/create-deteccion.dto';
import { UpdateDeteccionDto } from './dto/update-deteccion.dto';
import { CreateRecetaDto } from './dto/create-receta.dto';
import { UpdateRecetaDto } from './dto/update-receta.dto';
import { CreateEntrevistaPsicologicaDto } from './dto/create-entrevista-psicologica.dto';
import { UpdateEntrevistaPsicologicaDto } from './dto/update-entrevista-psicologica.dto';
import { CreateTrastornosEstadoAnimoDto } from './dto/create-trastornos-estado-animo.dto';
import { UpdateTrastornosEstadoAnimoDto } from './dto/update-trastornos-estado-animo.dto';
import { CreateCuestionarioProdromalBreveDto } from './dto/create-cuestionario-prodromal-breve.dto';
import { UpdateCuestionarioProdromalBreveDto } from './dto/update-cuestionario-prodromal-breve.dto';
import { CreateTrastornoLimitePersonalidadDto } from './dto/create-trastorno-limite-personalidad.dto';
import { UpdateTrastornoLimitePersonalidadDto } from './dto/update-trastorno-limite-personalidad.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { convertirFechaISOaDDMMYYYY } from '../../utils/dates';
import jwt from 'jsonwebtoken';
import { DailyConsentGuard } from '../../utils/guards/daily-consent.guard';
import { RequireDailyConsent } from '../../utils/decorators/require-daily-consent.decorator';

interface JwtPayload {
  id: string;
}

@Controller('api/expedientes/:trabajadorId/documentos')
export class ExpedientesController {
  constructor(
    private readonly expedientesService: ExpedientesService,
    private readonly catalogsService: CatalogsService,
    private readonly usersService: UsersService,
  ) {}

  // Mapeo de los DTOs correspondientes a cada tipo de documento
  private createDtos = {
    antidoping: CreateAntidopingDto,
    aptitud: CreateAptitudDto,
    audiometria: CreateAudiometriaDto,
    certificado: CreateCertificadoDto,
    certificadoExpedito: CreateCertificadoExpeditoDto,
    documentoExterno: CreateDocumentoExternoDto,
    examenVista: CreateExamenVistaDto,
    exploracionFisica: CreateExploracionFisicaDto,
    historiaClinica: CreateHistoriaClinicaDto,
    notaMedica: CreateNotaMedicaDto,
    notaAclaratoria: CreateNotaAclaratoriaDto,
    controlPrenatal: CreateControlPrenatalDto,
    historiaOtologica: CreateHistoriaOtologicaDto,
    previoEspirometria: CreatePrevioEspirometriaDto,
    receta: CreateRecetaDto,
    constanciaAptitud: CreateConstanciaAptitudDto,
    lesion: CreateLesionDto,
    entrevistaPsicologica: CreateEntrevistaPsicologicaDto,
    trastornosEstadoAnimo: CreateTrastornosEstadoAnimoDto,
    cuestionarioProdromalBreve: CreateCuestionarioProdromalBreveDto,
    trastornoLimitePersonalidad: CreateTrastornoLimitePersonalidadDto,
  };

  private updateDtos = {
    antidoping: UpdateAntidopingDto,
    aptitud: UpdateAptitudDto,
    audiometria: UpdateAudiometriaDto,
    certificado: UpdateCertificadoDto,
    certificadoExpedito: UpdateCertificadoExpeditoDto,
    documentoExterno: UpdateDocumentoExternoDto,
    examenVista: UpdateExamenVistaDto,
    exploracionFisica: UpdateExploracionFisicaDto,
    historiaClinica: UpdateHistoriaClinicaDto,
    notaMedica: UpdateNotaMedicaDto,
    notaAclaratoria: UpdateNotaAclaratoriaDto,
    controlPrenatal: UpdateControlPrenatalDto,
    historiaOtologica: UpdateHistoriaOtologicaDto,
    previoEspirometria: UpdatePrevioEspirometriaDto,
    receta: UpdateRecetaDto,
    constanciaAptitud: UpdateConstanciaAptitudDto,
    lesion: UpdateLesionDto,
    entrevistaPsicologica: UpdateEntrevistaPsicologicaDto,
    trastornosEstadoAnimo: UpdateTrastornosEstadoAnimoDto,
    cuestionarioProdromalBreve: UpdateCuestionarioProdromalBreveDto,
    trastornoLimitePersonalidad: UpdateTrastornoLimitePersonalidadDto,
  };

  // Método privado para autenticar usuario desde el JWT
  private async authenticateUser(req: any): Promise<string> {
    if (
      !req.headers.authorization ||
      !req.headers.authorization.startsWith('Bearer ')
    ) {
      throw new BadRequestException('Token de autorización requerido');
    }

    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
      return decoded.id;
    } catch {
      throw new BadRequestException('Token inválido o expirado');
    }
  }

  @Post(':documentType/crear')
  @UseGuards(DailyConsentGuard)
  @RequireDailyConsent({ action: 'CREATE_DOCUMENT' })
  async createDocument(
    @Param('documentType') documentType: string,
    @Body() createDto: any,
  ) {
    const DtoClass = this.createDtos[documentType];
    if (!DtoClass) {
      throw new BadRequestException(
        `Tipo de documento ${documentType} no soportado`,
      );
    }

    const dtoInstance = Object.assign(new DtoClass(), createDto);
    await new ValidationPipe({ whitelist: true }).transform(dtoInstance, {
      type: 'body',
      metatype: DtoClass,
    });

    try {
      const document = await this.expedientesService.createDocument(
        documentType,
        dtoInstance,
      );
      return { message: `${documentType} creado exitosamente`, data: document };
    } catch (error) {
      console.error('Error detallado:', error);
      throw new BadRequestException(`Error al crear el ${documentType}`);
    }
  }

  @Post('documentoExterno/subir')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB límite
        fieldSize: 10 * 1024 * 1024, // 10MB límite para campos
      },
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dirPath = path.resolve(
            process.env.EXPEDIENTES_DIR || '',
            req.body.rutaDocumento,
          );

          try {
            if (!req.body.rutaDocumento) {
              console.error(
                'Error: rutaDocumento no está definida en req.body.',
              );
              throw new Error('La rutaDocumento no está definida en req.body.');
            }

            if (!existsSync(dirPath)) {
              mkdirSync(dirPath, { recursive: true });
            } else {
            }
          } catch (error) {
            console.error('Error al procesar la ruta destino:', error.message);
            return cb(error, dirPath);
          }

          cb(null, dirPath);
        },
        filename: (req, file, cb) => {
          const nombreDocumento = req.body.nombreDocumento || 'documento'; // Valor predeterminado si no se proporciona
          const fechaDocumento = convertirFechaISOaDDMMYYYY(
            req.body.fechaDocumento,
          );
          const extension = path.extname(file.originalname);
          const uniqueFilename =
            `${nombreDocumento} ${fechaDocumento}${extension}`.replace(
              /[<>:"\/\\|?*]/g,
              '-',
            );

          cb(null, uniqueFilename);
        },
      }),
    }),
  )
  async uploadDocument(
    @Param('trabajadorId') trabajadorId: string,
    @Body() createDocumentoExternoDto: CreateDocumentoExternoDto,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @UploadedFile() _file: Express.Multer.File,
  ) {
    try {
      const document = await this.expedientesService.uploadDocument(
        createDocumentoExternoDto,
      );
      return {
        message: 'Documento externo creado exitosamente',
        data: document,
      };
    } catch (error) {
      console.error('Error detallado durante uploadDocument:', error.message);
      throw new BadRequestException(
        'Error al crear el documento externo',
        error,
      );
    }
  }

  @Get('altura-disponible')
  async getAlturaDisponible(@Param('trabajadorId') trabajadorId: string) {
    try {
      const alturaData =
        await this.expedientesService.getAlturaDisponible(trabajadorId);
      return {
        message: 'Altura consultada exitosamente',
        data: alturaData,
      };
    } catch (error) {
      console.error('Error al consultar altura:', error);
      throw new BadRequestException('Error al consultar la altura disponible');
    }
  }

  @Get('historiaClinica/motivo-examen-reciente')
  async getMotivoExamenReciente(@Param('trabajadorId') trabajadorId: string) {
    try {
      const motivoExamenData =
        await this.expedientesService.getMotivoExamenReciente(trabajadorId);
      return {
        message: 'MotivoExamen consultado exitosamente',
        data: motivoExamenData,
      };
    } catch (error) {
      console.error('Error al consultar motivoExamen:', error);
      throw new BadRequestException(
        'Error al consultar el motivoExamen reciente',
      );
    }
  }

  @Get(':documentType')
  async findDocuments(
    @Param('trabajadorId') trabajadorId: string,
    @Param('documentType') documentType: string,
  ) {
    const documents = await this.expedientesService.findDocuments(
      documentType,
      trabajadorId,
    );

    if (!documents || documents.length === 0) {
      return {
        message: `No se encontraron documentos de tipo ${documentType}`,
      };
    }

    return documents;
  }

  @Get(':documentType/:id')
  async findDocument(
    @Param('documentType') documentType: string,
    @Param('id') id: string,
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es valido');
    }
    const document = await this.expedientesService.findDocument(
      documentType,
      id,
    );
    if (!document) {
      return {
        message: `No se encontró el documento de tipo ${documentType} con id ${id}`,
      };
    }
    return document;
  }

  @Patch(':documentType/actualizar/:id')
  async updateDocument(
    @Param('documentType') documentType: string,
    @Param('id') id: string,
    @Body() updateDto: any,
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    const DtoClass = this.updateDtos[documentType];
    if (!DtoClass) {
      throw new BadRequestException(
        `Tipo de documento ${documentType} no soportado`,
      );
    }

    const dtoInstance = Object.assign(
      new DtoClass(),
      Object.fromEntries(
        Object.entries(updateDto).filter(([, v]) => v !== undefined),
      ),
    );

    await new ValidationPipe({ whitelist: true }).transform(dtoInstance, {
      type: 'body',
      metatype: DtoClass,
    });

    try {
      let updatedDocument;
      if (documentType === 'documentoExterno') {
        updatedDocument = await this.expedientesService.upsertDocumentoExterno(
          id,
          dtoInstance,
        );
      } else {
        updatedDocument = await this.expedientesService.updateOrCreateDocument(
          documentType,
          id,
          dtoInstance,
        );
      }

      return { message: `${documentType} actualizado`, data: updatedDocument };
    } catch (error) {
      // Si el error ya es un BadRequestException con un mensaje estructurado, propagarlo
      if (error instanceof BadRequestException) {
        // Si tiene un response con message, code, ruleId, etc., propagarlo tal cual
        const errorResponse = error.getResponse();
        if (typeof errorResponse === 'object' && errorResponse !== null) {
          // Si tiene estructura de validación (code, ruleId, message, details), propagarlo
          if ('code' in errorResponse && 'message' in errorResponse) {
            throw error; // Propagar el error original con toda su estructura
          }
        }
      }
      // Para otros errores, log y usar mensaje genérico
      console.error('Error detallado:', error);
      throw new BadRequestException(`Error al actualizar el ${documentType}`);
    }
  }

  @Post(':documentType/:id/finalizar')
  async finalizarDocumento(
    @Param('documentType') documentType: string,
    @Param('id') id: string,
    @Body() body: { motivo?: string },
    @Request() req: any,
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    if (
      !this.expedientesService['models'] ||
      !this.expedientesService['models'][documentType]
    ) {
      throw new BadRequestException(
        `Tipo de documento ${documentType} no soportado`,
      );
    }

    // Decodificar el JWT del header para obtener el userId
    const userId = await this.authenticateUser(req);
    if (!userId) {
      throw new BadRequestException('Usuario no autenticado');
    }

    const user = await this.usersService.findById(userId, 'idProveedorSalud');
    const proveedorSaludId = user?.idProveedorSalud
      ? String(user.idProveedorSalud)
      : undefined;

    try {
      const finalizedDocument =
        await this.expedientesService.finalizarDocumento(
          documentType,
          id,
          userId,
          proveedorSaludId,
          body?.motivo != null ? { motivo: body.motivo } : undefined,
        );
      return { message: `${documentType} finalizado`, data: finalizedDocument };
    } catch (error) {
      throw error;
    }
  }

  @Get('cie10/search')
  async searchCIE10(@Query('q') query: string, @Query('limit') limit?: number) {
    if (!query || query.trim() === '') {
      throw new BadRequestException(
        'El parámetro de búsqueda "q" es requerido',
      );
    }

    const searchLimit = limit
      ? Math.min(Math.max(1, parseInt(limit.toString())), 100)
      : 50;
    const results = await this.catalogsService.searchCatalog(
      CatalogType.CIE10,
      query.trim(),
      searchLimit,
    );

    return {
      results: results.map((entry) => ({
        code: entry.code,
        description: entry.description,
      })),
      count: results.length,
    };
  }

  // GIIS-B013: Lesion CRUD Endpoints
  @Post('lesion')
  @UseGuards(DailyConsentGuard)
  @RequireDailyConsent({
    action: 'CREATE_DOCUMENT',
    skipIfNoTrabajadorId: true,
  })
  async createLesion(@Body() createLesionDto: CreateLesionDto) {
    try {
      const lesion =
        await this.expedientesService.createLesion(createLesionDto);
      return { message: 'Lesión creada exitosamente', data: lesion };
    } catch (error) {
      throw error;
    }
  }

  @Get('lesion/:id')
  async findLesion(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }
    const lesion = await this.expedientesService.findLesion(id);
    if (!lesion) {
      return {
        message: `No se encontró la lesión con id ${id}`,
      };
    }
    return lesion;
  }

  @Get('lesiones/:trabajadorId')
  async findLesionesByTrabajador(@Param('trabajadorId') trabajadorId: string) {
    if (!isValidObjectId(trabajadorId)) {
      throw new BadRequestException('El ID del trabajador no es válido');
    }
    const lesiones =
      await this.expedientesService.findLesionesByTrabajador(trabajadorId);
    return lesiones;
  }

  @Patch('lesion/:id')
  async updateLesion(
    @Param('id') id: string,
    @Body() updateLesionDto: UpdateLesionDto,
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    const dtoInstance = Object.assign(
      new UpdateLesionDto(),
      Object.fromEntries(
        Object.entries(updateLesionDto).filter(([, v]) => v !== undefined),
      ),
    );

    await new ValidationPipe({ whitelist: true }).transform(dtoInstance, {
      type: 'body',
      metatype: UpdateLesionDto,
    });

    try {
      const updatedLesion = await this.expedientesService.updateLesion(
        id,
        dtoInstance,
      );
      return {
        message: 'Lesión actualizada exitosamente',
        data: updatedLesion,
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete('lesion/:id')
  async deleteLesion(
    @Param('id') id: string,
    @Body() body?: { razonAnulacion?: string },
    @Request() req?: any,
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    // Decodificar el JWT del header para obtener el userId
    let userId: string | undefined;
    try {
      userId = await this.authenticateUser(req);
    } catch {}

    const result = await this.expedientesService.deleteLesion(
      id,
      userId,
      body?.razonAnulacion,
    );

    if (result.anulado) {
      return {
        message: `La lesión con id ${id} ha sido anulada exitosamente`,
        anulado: true,
      };
    }

    return {
      message: `La lesión con id ${id} ha sido eliminada exitosamente`,
      deleted: true,
    };
  }

  @Post('lesion/:id/finalizar')
  async finalizarLesion(@Param('id') id: string, @Request() req: any) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    // Decodificar el JWT del header para obtener el userId
    const userId = await this.authenticateUser(req);
    if (!userId) {
      throw new BadRequestException('Usuario no autenticado');
    }

    try {
      const finalizedLesion = await this.expedientesService.finalizarLesion(
        id,
        userId,
      );
      return {
        message: 'Lesión finalizada exitosamente',
        data: finalizedLesion,
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete(':documentType/eliminar/:id')
  async removeDocument(
    @Param('documentType') documentType: string,
    @Param('id') id: string,
    @Body() body?: { razonAnulacion?: string },
    @Request() req?: any,
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    // Decodificar el JWT del header para obtener el userId
    let userId: string | undefined;
    try {
      userId = await this.authenticateUser(req);
    } catch {}

    const result = await this.expedientesService.removeDocument(
      documentType,
      id,
      userId,
      body?.razonAnulacion,
    );

    if (result.anulado) {
      return {
        message: `${documentType} anulado exitosamente`,
        anulado: true,
      };
    }

    return {
      message: `${documentType} eliminado exitosamente`,
      deleted: true,
    };
  }

  // ==================== GIIS-B019 Detección CRUD Endpoints ====================

  @Post('deteccion')
  @UseGuards(DailyConsentGuard)
  @RequireDailyConsent({
    action: 'CREATE_DOCUMENT',
    skipIfNoTrabajadorId: true,
  })
  async createDeteccion(@Body() createDeteccionDto: CreateDeteccionDto) {
    try {
      const deteccion =
        await this.expedientesService.createDeteccion(createDeteccionDto);
      return { message: 'Detección creada exitosamente', data: deteccion };
    } catch (error) {
      throw error;
    }
  }

  @Get('deteccion/:id')
  async findDeteccion(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }
    const deteccion = await this.expedientesService.findDeteccion(id);
    if (!deteccion) {
      return {
        message: `No se encontró la detección con id ${id}`,
      };
    }
    return deteccion;
  }

  @Get('detecciones/:trabajadorId')
  async findDeteccionesByTrabajador(
    @Param('trabajadorId') trabajadorId: string,
  ) {
    if (!isValidObjectId(trabajadorId)) {
      throw new BadRequestException('El ID del trabajador no es válido');
    }
    const detecciones =
      await this.expedientesService.findDeteccionesByTrabajador(trabajadorId);
    return detecciones;
  }

  @Patch('deteccion/:id')
  async updateDeteccion(
    @Param('id') id: string,
    @Body() updateDeteccionDto: UpdateDeteccionDto,
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    const dtoInstance = Object.assign(
      new UpdateDeteccionDto(),
      Object.fromEntries(
        Object.entries(updateDeteccionDto).filter(([, v]) => v !== undefined),
      ),
    );

    await new ValidationPipe({ whitelist: true }).transform(dtoInstance, {
      type: 'body',
      metatype: UpdateDeteccionDto,
    });

    try {
      const updatedDeteccion = await this.expedientesService.updateDeteccion(
        id,
        dtoInstance,
      );
      return {
        message: 'Detección actualizada exitosamente',
        data: updatedDeteccion,
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete('deteccion/:id')
  async deleteDeteccion(
    @Param('id') id: string,
    @Body() body?: { razonAnulacion?: string },
    @Request() req?: any,
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    // Decodificar el JWT del header para obtener el userId
    let userId: string | undefined;
    try {
      userId = await this.authenticateUser(req);
    } catch {}

    const result = await this.expedientesService.deleteDeteccion(
      id,
      userId,
      body?.razonAnulacion,
    );

    if (result.anulado) {
      return {
        message: `La detección con id ${id} ha sido anulada exitosamente`,
        anulado: true,
      };
    }

    return {
      message: `La detección con id ${id} ha sido eliminada exitosamente`,
      deleted: true,
    };
  }

  @Post('deteccion/:id/finalizar')
  async finalizarDeteccion(@Param('id') id: string, @Request() req: any) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    // Decodificar el JWT del header para obtener el userId
    const userId = await this.authenticateUser(req);
    if (!userId) {
      throw new BadRequestException('Usuario no autenticado');
    }

    try {
      const finalizedDeteccion =
        await this.expedientesService.finalizarDeteccion(id, userId);
      return {
        message: 'Detección finalizada exitosamente',
        data: finalizedDeteccion,
      };
    } catch (error) {
      throw error;
    }
  }
}
