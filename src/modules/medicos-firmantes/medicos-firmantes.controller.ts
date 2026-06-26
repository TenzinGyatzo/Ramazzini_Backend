import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { MedicosFirmantesService } from './medicos-firmantes.service';
import { CreateMedicoFirmanteDto } from './dto/create-medico-firmante.dto';
import { UpdateMedicoFirmanteDto } from './dto/update-medico-firmante.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import path from 'path';
import { isValidObjectId } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '../audit/constants/audit-action-type';
import { AuditEventClass } from '../audit/constants/audit-event-class';
import { UsersService } from '../users/users.service';
import { getUserIdFromRequest } from '../../utils/auth-helpers';
import { toSignerPayloadSnapshot } from '../../utils/signer-audit-payload.util';
import { sanitizarNombreFirmanteParaArchivo } from 'src/utils/names';
import { resolveSignatoriesDir } from 'src/utils/branding-assets-dir.util';

@Controller('medicos-firmantes')
export class MedicosFirmantesController {
  constructor(
    private readonly medicosFirmantesService: MedicosFirmantesService,
    private readonly auditService: AuditService,
    private readonly usersService: UsersService,
  ) {}

  @Post('registrar-medico')
  @UseInterceptors(
    FileInterceptor('firma', {
      storage: diskStorage({
        destination: resolveSignatoriesDir(),
        filename: (req, file, callback) => {
          const sanitizedDoctorName = sanitizarNombreFirmanteParaArchivo({
            nombre: req.body.nombre,
            primerApellido: req.body.primerApellido,
            segundoApellido: req.body.segundoApellido,
          }) || 'firmante';
          let uniqueFilename = `${sanitizedDoctorName}-firma${path.extname(file.originalname)}`;
          if (file.fieldname === 'firmaConAntefirma') {
            uniqueFilename = `${sanitizedDoctorName}-firma-con-antefirma${path.extname(file.originalname)}`;
          }
          callback(null, uniqueFilename);
        },
      }),
    }),
  )
  async create(
    @Body() createMedicoFirmanteDto: CreateMedicoFirmanteDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    console.log('Archivo recibidos:', file);
    console.log('Datos del médico firmante:', createMedicoFirmanteDto);

    try {
      if (file) {
        createMedicoFirmanteDto.firma = {
          data: file.filename,
          contentType: file.mimetype,
        };
      }

      const medico = await this.medicosFirmantesService.create(
        createMedicoFirmanteDto,
      );
      const actorId = getUserIdFromRequest(req);
      const proveedorSaludId =
        await this.usersService.getIdProveedorSaludByUserId(actorId);
      await this.auditService.record({
        proveedorSaludId: proveedorSaludId ?? null,
        actorId,
        actionType: AuditActionType.SIGNER_PROFILE_CREATED,
        resourceType: 'medicoFirmante',
        resourceId: (medico as any)._id?.toString?.() ?? null,
        payload: toSignerPayloadSnapshot(medico),
        eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
      });
      return { message: 'Creado exitosamente', data: medico };
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      const message =
        error?.response?.message ??
        error?.message ??
        'Error al registrar datos del médico firmante';
      throw new BadRequestException(message);
    }
  }

  @Get('obtener-medicos')
  async findAll() {
    const medicos = await this.medicosFirmantesService.findAll();

    if (!medicos || medicos.length === 0) {
      return { message: 'No se encontraron medicos' };
    }

    return medicos;
  }

  @Get('obtener-medico/:id')
  async findOne(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    const medico = await this.medicosFirmantesService.findOne(id);

    if (!medico) {
      throw new NotFoundException('No se encontró el médico firmante');
    }

    return medico;
  }

  @Get('obtener-medico-por-usuario/:idUser')
  async findOneByUserId(@Param('idUser') idUser: string) {
    // Validar si el idUser es un ObjectId válido (si es necesario)
    if (!isValidObjectId(idUser)) {
      throw new BadRequestException(
        'El ID de usuario proporcionado no es válido',
      );
    }

    // Llamar al servicio para buscar por idUser
    const medico = await this.medicosFirmantesService.findOneByUserId(idUser);

    // Si no se encuentra el médico, lanzar una excepción
    if (!medico) {
      return { message: 'No se encontró el médico firmante', data: null };
    }

    return medico;
  }

  @Patch('actualizar-medico/:id')
  @UseInterceptors(
    FileInterceptor('firma', {
      storage: diskStorage({
        destination: resolveSignatoriesDir(),
        filename: (req, file, callback) => {
          const sanitizedDoctorName = sanitizarNombreFirmanteParaArchivo({
            nombre: req.body.nombre,
            primerApellido: req.body.primerApellido,
            segundoApellido: req.body.segundoApellido,
          }) || 'firmante';
          let uniqueFilename = `${sanitizedDoctorName}-firma${path.extname(file.originalname)}`;
          if (file.fieldname === 'firmaConAntefirma') {
            uniqueFilename = `${sanitizedDoctorName}-firma-con-antefirma${path.extname(file.originalname)}`;
          }
          callback(null, uniqueFilename);
        },
      }),
    }),
  )
  async update(
    @Param('id') id: string,
    @Body() updateMedicoFirmanteDto: UpdateMedicoFirmanteDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }
    const existing = await this.medicosFirmantesService.findOne(id);
    // Si se sube un archivo, se añade al DTO para actualizar el logotipo
    if (file) {
      updateMedicoFirmanteDto.firma = {
        data: file.filename,
        contentType: file.mimetype,
      };
    }

    const medico = await this.medicosFirmantesService.update(
      id,
      updateMedicoFirmanteDto,
    );

    if (!medico) {
      return {
        message: `No se pudo actualziar el medico firmante con id ${id}`,
      };
    }

    const actorId = getUserIdFromRequest(req);
    const proveedorSaludId =
      await this.usersService.getIdProveedorSaludByUserId(actorId);
    await this.auditService.record({
      proveedorSaludId: proveedorSaludId ?? null,
      actorId,
      actionType: AuditActionType.SIGNER_PROFILE_UPDATED,
      resourceType: 'medicoFirmante',
      resourceId: id,
      payload: {
        before: existing ? toSignerPayloadSnapshot(existing) : null,
        after: toSignerPayloadSnapshot(medico),
      },
      eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
    });

    return {
      message: 'Actualizado exitosamente',
      data: medico,
    };
  }

  @Delete('eliminar-medico/:id')
  async remove(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    const deletedMedicoFirmante = await this.medicosFirmantesService.remove(id);

    if (!deletedMedicoFirmante) {
      return {
        message: `El médico firmante con ID ${id} no existe o ya ha sido eliminada.`,
      };
    }

    return {
      message: 'Médico firmante eliminado exitosamente',
    };
  }
}
