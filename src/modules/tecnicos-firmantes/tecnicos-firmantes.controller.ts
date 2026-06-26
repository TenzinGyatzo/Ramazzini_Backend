import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { isValidObjectId } from 'mongoose';
import { CreateTecnicoFirmanteDto } from './dto/create-tecnico-firmante.dto';
import { UpdateTecnicoFirmanteDto } from './dto/update-tecnico-firmante.dto';
import { TecnicosFirmantesService } from './tecnicos-firmantes.service';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '../audit/constants/audit-action-type';
import { AuditEventClass } from '../audit/constants/audit-event-class';
import { UsersService } from '../users/users.service';
import { getUserIdFromRequest } from '../../utils/auth-helpers';
import { toSignerPayloadSnapshot } from '../../utils/signer-audit-payload.util';
import { sanitizarNombreFirmanteParaArchivo } from 'src/utils/names';
import { resolveSignatoriesDir } from 'src/utils/branding-assets-dir.util';

@Controller('tecnicos-firmantes')
export class TecnicosFirmantesController {
  constructor(
    private readonly tecnicosService: TecnicosFirmantesService,
    private readonly auditService: AuditService,
    private readonly usersService: UsersService,
  ) {}

  @Post('registrar-tecnico')
  @UseInterceptors(
    FileInterceptor('firma', {
      storage: diskStorage({
        destination: resolveSignatoriesDir(),
        filename: (req, file, callback) => {
          const sanitizedName = sanitizarNombreFirmanteParaArchivo({
            nombre: req.body.nombre,
            primerApellido: req.body.primerApellido,
            segundoApellido: req.body.segundoApellido,
          }) || 'firmante';
          const uniqueFilename = `${sanitizedName}-firma${path.extname(file.originalname)}`;
          callback(null, uniqueFilename);
        },
      }),
    }),
  )
  async create(
    @Body() createTecnicoFirmanteDto: CreateTecnicoFirmanteDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    console.log('Archivo recibido:', file);
    console.log('Datos del técnico firmante:', createTecnicoFirmanteDto);

    try {
      if (file) {
        createTecnicoFirmanteDto.firma = {
          data: file.filename,
          contentType: file.mimetype,
        };
      }

      const tecnico = await this.tecnicosService.create(
        createTecnicoFirmanteDto,
      );
      const actorId = getUserIdFromRequest(req);
      const proveedorSaludId =
        await this.usersService.getIdProveedorSaludByUserId(actorId);
      await this.auditService.record({
        proveedorSaludId: proveedorSaludId ?? null,
        actorId,
        actionType: AuditActionType.SIGNER_PROFILE_CREATED,
        resourceType: 'tecnicoFirmante',
        resourceId: (tecnico as any)._id?.toString?.() ?? null,
        payload: toSignerPayloadSnapshot(tecnico),
        eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
      });
      return { message: 'Creado exitosamente', data: tecnico };
    } catch (error: any) {
      // Propagar el error real (auth → 401, validación → 400)
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      const message =
        error?.response?.message ??
        error?.message ??
        'Error al registrar datos del técnico firmante';
      throw new BadRequestException(message);
    }
  }

  @Get('obtener-tecnicos')
  async findAll() {
    const tecnicos = await this.tecnicosService.findAll();

    if (!tecnicos || tecnicos.length === 0) {
      return { message: 'No se encontraron técnicos firmantes' };
    }

    return tecnicos;
  }

  @Get('obtener-tecnico/:id')
  async findOne(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    const tecnico = await this.tecnicosService.findOne(id);
    if (!tecnico) {
      throw new BadRequestException('No se encontró el técnico firmante');
    }
    return tecnico;
  }

  @Get('obtener-tecnico-por-usuario/:idUser')
  async findOneByUser(@Param('idUser') idUser: string) {
    if (!isValidObjectId(idUser)) {
      throw new BadRequestException(
        'El ID de usuario proporcionado no es válido',
      );
    }

    const tecnico = await this.tecnicosService.findOneByUserId(idUser);
    if (!tecnico) {
      return { message: 'No se encontró el técnico firmante', data: null };
    }
    return tecnico;
  }

  @Patch('actualizar-tecnico/:id')
  @UseInterceptors(
    FileInterceptor('firma', {
      storage: diskStorage({
        destination: resolveSignatoriesDir(),
        filename: (req, file, callback) => {
          const sanitizedName = sanitizarNombreFirmanteParaArchivo({
            nombre: req.body.nombre,
            primerApellido: req.body.primerApellido,
            segundoApellido: req.body.segundoApellido,
          }) || 'firmante';
          const uniqueFilename = `${sanitizedName}-firma${path.extname(file.originalname)}`;
          callback(null, uniqueFilename);
        },
      }),
    }),
  )
  async update(
    @Param('id') id: string,
    @Body() updateTecnicoFirmanteDto: UpdateTecnicoFirmanteDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('El ID proporcionado no es válido');
    }

    const existing = await this.tecnicosService.findOne(id);
    if (file) {
      updateTecnicoFirmanteDto.firma = {
        data: file.filename,
        contentType: file.mimetype,
      };
    }

    const tecnico = await this.tecnicosService.update(
      id,
      updateTecnicoFirmanteDto,
    );
    if (!tecnico) {
      return {
        message: `No se pudo actualizar el técnico firmante con id ${id}`,
      };
    }

    const actorId = getUserIdFromRequest(req);
    const proveedorSaludId =
      await this.usersService.getIdProveedorSaludByUserId(actorId);
    await this.auditService.record({
      proveedorSaludId: proveedorSaludId ?? null,
      actorId,
      actionType: AuditActionType.SIGNER_PROFILE_UPDATED,
      resourceType: 'tecnicoFirmante',
      resourceId: id,
      payload: {
        before: existing ? toSignerPayloadSnapshot(existing) : null,
        after: toSignerPayloadSnapshot(tecnico),
      },
      eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
    });

    return {
      message: 'Actualizado exitosamente',
      data: tecnico,
    };
  }
}
