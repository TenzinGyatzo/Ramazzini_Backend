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
import { EnfermerasFirmantesService } from './enfermeras-firmantes.service';
import { CreateEnfermeraFirmanteDto } from './dto/create-enfermera-firmante.dto';
import { UpdateEnfermeraFirmanteDto } from './dto/update-enfermera-firmante.dto';
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

@Controller('enfermeras-firmantes')
export class EnfermerasFirmantesController {
  constructor(
    private readonly enfermerasFirmantesService: EnfermerasFirmantesService,
    private readonly auditService: AuditService,
    private readonly usersService: UsersService,
  ) {}

  @Post('registrar-enfermera')
  @UseInterceptors(
    FileInterceptor('firma', {
      storage: diskStorage({
        destination: path.join(
          process.cwd(),
          process.env.SIGNATORIES_UPLOADS_DIR || 'assets/signatories',
        ),
        filename: (req, file, callback) => {
          const sanitizedDoctorName = req.body.nombre
            .replace(/\s+/g, '-')
            .replace(/[^a-zA-Z0-9\-]/g, '')
            .toLowerCase();
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
    @Body() createEnfermeraFirmanteDto: CreateEnfermeraFirmanteDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    console.log('Archivo recibidos:', file);
    console.log('Datos del enfermera firmante:', createEnfermeraFirmanteDto);

    try {
      if (file) {
        createEnfermeraFirmanteDto.firma = {
          data: file.filename,
          contentType: file.mimetype,
        };
      }

      const enfermera = await this.enfermerasFirmantesService.create(
        createEnfermeraFirmanteDto,
      );
      const actorId = getUserIdFromRequest(req);
      const proveedorSaludId =
        await this.usersService.getIdProveedorSaludByUserId(actorId);
      await this.auditService.record({
        proveedorSaludId: proveedorSaludId ?? null,
        actorId,
        actionType: AuditActionType.SIGNER_PROFILE_CREATED,
        resourceType: 'enfermeraFirmante',
        resourceId: (enfermera as any)._id?.toString?.() ?? null,
        payload: toSignerPayloadSnapshot(enfermera),
        eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
      });
      return { message: 'Creado exitosamente', data: enfermera };
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
        'Error al registrar datos de la enfermera firmante';
      throw new BadRequestException(message);
    }
  }

  @Get('obtener-enfermeras')
  async findAll() {
    const enfermeras = await this.enfermerasFirmantesService.findAll();

    if (!enfermeras || enfermeras.length === 0) {
      return { message: 'No se encontraron enfermeras' };
    }

    return enfermeras;
  }

  @Get('obtener-enfermera/:id')
  async findOne(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    const enfermera = await this.enfermerasFirmantesService.findOne(id);

    if (!enfermera) {
      throw new NotFoundException('No se encontró la enfermera firmante');
    }

    return enfermera;
  }

  @Get('obtener-enfermera-por-usuario/:idUser')
  async findOneByUserId(@Param('idUser') idUser: string) {
    // Validar si el idUser es un ObjectId válido (si es necesario)
    if (!isValidObjectId(idUser)) {
      throw new BadRequestException(
        'El ID de usuario proporcionado no es válido',
      );
    }

    // Llamar al servicio para buscar por idUser
    const enfermera =
      await this.enfermerasFirmantesService.findOneByUserId(idUser);

    // Si no se encuentra el médico, lanzar una excepción
    if (!enfermera) {
      return { message: 'No se encontró la enfermera firmante', data: null };
    }

    return enfermera;
  }

  @Patch('actualizar-enfermera/:id')
  @UseInterceptors(
    FileInterceptor('firma', {
      storage: diskStorage({
        destination: path.join(
          process.cwd(),
          process.env.SIGNATORIES_UPLOADS_DIR || 'assets/signatories',
        ),
        filename: (req, file, callback) => {
          const sanitizedDoctorName = req.body.nombre
            .replace(/\s+/g, '-')
            .replace(/[^a-zA-Z0-9\-]/g, '')
            .toLowerCase();
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
    @Body() updateEnfermeraFirmanteDto: UpdateEnfermeraFirmanteDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }
    const existing = await this.enfermerasFirmantesService.findOne(id);
    // Si se sube un archivo, se añade al DTO para actualizar el logotipo
    if (file) {
      updateEnfermeraFirmanteDto.firma = {
        data: file.filename,
        contentType: file.mimetype,
      };
    }

    const enfermera = await this.enfermerasFirmantesService.update(
      id,
      updateEnfermeraFirmanteDto,
    );

    if (!enfermera) {
      return {
        message: `No se pudo actualziar la enfermera firmante con id ${id}`,
      };
    }

    const actorId = getUserIdFromRequest(req);
    const proveedorSaludId =
      await this.usersService.getIdProveedorSaludByUserId(actorId);
    await this.auditService.record({
      proveedorSaludId: proveedorSaludId ?? null,
      actorId,
      actionType: AuditActionType.SIGNER_PROFILE_UPDATED,
      resourceType: 'enfermeraFirmante',
      resourceId: id,
      payload: {
        before: existing ? toSignerPayloadSnapshot(existing) : null,
        after: toSignerPayloadSnapshot(enfermera),
      },
      eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
    });

    return {
      message: 'Actualizado exitosamente',
      data: enfermera,
    };
  }

  @Delete('eliminar-enfermera/:id')
  async remove(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    const deletedEnfermeraFirmante =
      await this.enfermerasFirmantesService.remove(id);

    if (!deletedEnfermeraFirmante) {
      return {
        message: `La enfermera firmante con ID ${id} no existe o ya ha sido eliminada.`,
      };
    }

    return {
      message: 'Enfermera firmante eliminada exitosamente',
    };
  }
}
