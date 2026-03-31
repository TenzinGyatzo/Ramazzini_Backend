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
} from '@nestjs/common';
import { ExpedientesService } from './expedientes.service';
import { isValidObjectId } from 'mongoose';
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
import { CreateControlPrenatalDto } from './dto/create-control-prenatal.dto';
import { UpdateControlPrenatalDto } from './dto/update-control-prenatal.dto';
import { CreateHistoriaOtologicaDto } from './dto/create-historia-otologica.dto';
import { UpdateHistoriaOtologicaDto } from './dto/update-historia-otologica.dto';
import { CreatePrevioEspirometriaDto } from './dto/create-previo-espirometria.dto';
import { UpdatePrevioEspirometriaDto } from './dto/update-previo-espirometria.dto';
import { CreateConstanciaAptitudDto } from './dto/create-constancia-aptitud.dto';
import { UpdateConstanciaAptitudDto } from './dto/update-constancia-aptitud.dto';
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

@Controller('api/expedientes/:trabajadorId/documentos')
export class ExpedientesController {
  constructor(private readonly expedientesService: ExpedientesService) {}

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
    controlPrenatal: CreateControlPrenatalDto,
    historiaOtologica: CreateHistoriaOtologicaDto,
    previoEspirometria: CreatePrevioEspirometriaDto,
    receta: CreateRecetaDto,
    constanciaAptitud: CreateConstanciaAptitudDto,
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
    controlPrenatal: UpdateControlPrenatalDto,
    historiaOtologica: UpdateHistoriaOtologicaDto,
    previoEspirometria: UpdatePrevioEspirometriaDto,
    receta: UpdateRecetaDto,
    constanciaAptitud: UpdateConstanciaAptitudDto,
    entrevistaPsicologica: UpdateEntrevistaPsicologicaDto,
    trastornosEstadoAnimo: UpdateTrastornosEstadoAnimoDto,
    cuestionarioProdromalBreve: UpdateCuestionarioProdromalBreveDto,
    trastornoLimitePersonalidad: UpdateTrastornoLimitePersonalidadDto,
  };

  @Post(':documentType/crear')
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
              console.error('Error: rutaDocumento no está definida en req.body.');
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
          const uniqueFilename = `${nombreDocumento} ${fechaDocumento}${extension}`.replace(
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
    @UploadedFile() file: Express.Multer.File,
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
      const alturaData = await this.expedientesService.getAlturaDisponible(trabajadorId);
      return {
        message: 'Altura consultada exitosamente',
        data: alturaData
      };
    } catch (error) {
      console.error('Error al consultar altura:', error);
      throw new BadRequestException('Error al consultar la altura disponible');
    }
  }

  @Get('historiaClinica/motivo-examen-reciente')
  async getMotivoExamenReciente(@Param('trabajadorId') trabajadorId: string) {
    try {
      const motivoExamenData = await this.expedientesService.getMotivoExamenReciente(trabajadorId);
      return {
        message: 'MotivoExamen consultado exitosamente',
        data: motivoExamenData
      };
    } catch (error) {
      console.error('Error al consultar motivoExamen:', error);
      throw new BadRequestException('Error al consultar el motivoExamen reciente');
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
      Object.fromEntries(Object.entries(updateDto).filter(([_, v]) => v !== undefined))
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
      console.error('Error detallado:', error);
      throw new BadRequestException(`Error al actualizar el ${documentType}`);
    }
  }
  
  @Delete(':documentType/eliminar/:id')
  async removeDocument(
    @Param('documentType') documentType: string,
    @Param('id') id: string,
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    const deletedDocument = await this.expedientesService.removeDocument(
      documentType,
      id,
    );

    if (!deletedDocument) {
      return {
        message: `El documento de tipo ${documentType} con id ${id} no existe o ya ha sido eliminado`,
      };
    }
    return {
      message: `El documento de tipo ${documentType} con id ${id} ha sido eliminado exitosamente`,
    };
  }
}
