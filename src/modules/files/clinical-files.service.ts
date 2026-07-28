import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Response } from 'express';
import { EXPEDIENTES_DIR } from 'src/utils/expedientes-dir';
import { OrganizationalAccessService } from 'src/utils/organizational-access.service';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '../audit/constants/audit-action-type';
import { AuditEventClass } from '../audit/constants/audit-event-class';
import { UsersService } from '../users/users.service';
import { RegistrarDescargaArchivoClinicoDto } from './dto/registrar-descarga-archivo-clinico.dto';

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg']);

const MIME_BY_EXTENSION: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

@Injectable()
export class ClinicalFilesService {
  constructor(
    private readonly organizationalAccessService: OrganizationalAccessService,
    private readonly auditService: AuditService,
    private readonly usersService: UsersService,
  ) {}

  resolveSafePath(relativePath: string): string {
    const withoutPrefix = relativePath
      .replace(/^\/+/, '')
      .replace(/^expedientes-medicos\/?/, '');

    const absolute = path.resolve(EXPEDIENTES_DIR, withoutPrefix);

    if (
      absolute !== EXPEDIENTES_DIR &&
      !absolute.startsWith(EXPEDIENTES_DIR + path.sep)
    ) {
      throw new ForbiddenException('Ruta no permitida');
    }

    const extension = path.extname(absolute).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new ForbiddenException('Tipo de archivo no permitido');
    }

    return absolute;
  }

  async assertClinicalFileAccessibleForUser(
    userId: string,
    relativePath: string,
  ): Promise<string> {
    const absolutePath = this.resolveSafePath(relativePath);
    await this.organizationalAccessService.assertUserCanAccessClinicalPath(
      userId,
      relativePath,
    );
    await this.assertFileExists(absolutePath);
    return absolutePath;
  }

  async sendClinicalFileForUser(
    userId: string,
    relativePath: string,
    res: Response,
  ): Promise<void> {
    const absolutePath = await this.assertClinicalFileAccessibleForUser(
      userId,
      relativePath,
    );
    await this.sendClinicalFile(absolutePath, res);
  }

  async recordClinicalFileDownload(
    userId: string,
    dto: RegistrarDescargaArchivoClinicoDto,
  ): Promise<void> {
    await this.organizationalAccessService.assertUserCanAccessTrabajadorId(
      userId,
      dto.trabajadorId,
    );

    const user = await this.usersService.findById(userId, 'idProveedorSalud');
    if (!user?.idProveedorSalud) {
      return;
    }

    await this.auditService.record({
      proveedorSaludId: String(user.idProveedorSalud),
      actorId: userId,
      actionType: AuditActionType.CLINICAL_FILE_DOWNLOAD,
      resourceType: dto.documentType,
      resourceId: dto.documentId,
      payload: {
        documentId: dto.documentId,
        documentType: dto.documentType,
        trabajadorId: dto.trabajadorId,
        ...(dto.filename != null ? { filename: dto.filename } : {}),
        ...(dto.mediaKind != null ? { mediaKind: dto.mediaKind } : {}),
        ...(dto.origen != null ? { origen: dto.origen } : {}),
      },
      eventClass: AuditEventClass.CLASS_2_SOFT_FAIL,
    });
  }

  async assertFileExists(absolutePath: string): Promise<void> {
    try {
      const stat = await fs.stat(absolutePath);
      if (!stat.isFile()) {
        throw new NotFoundException('Archivo no encontrado');
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new NotFoundException('Archivo no encontrado');
    }
  }

  getContentType(absolutePath: string): string {
    const extension = path.extname(absolutePath).toLowerCase();
    return MIME_BY_EXTENSION[extension] ?? 'application/octet-stream';
  }

  async sendClinicalFile(absolutePath: string, res: Response): Promise<void> {
    await this.assertFileExists(absolutePath);

    const contentType = this.getContentType(absolutePath);
    const fileName = path.basename(absolutePath);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

    return new Promise((resolve, reject) => {
      res.sendFile(absolutePath, (error) => {
        if (error) {
          reject(new NotFoundException('Archivo no encontrado'));
          return;
        }
        resolve();
      });
    });
  }
}
