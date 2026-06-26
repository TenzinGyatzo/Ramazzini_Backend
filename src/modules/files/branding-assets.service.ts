import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Response } from 'express';
import { User } from 'src/modules/users/schemas/user.schema';
import { MedicoFirmante } from '../medicos-firmantes/schemas/medico-firmante.schema';
import { EnfermeraFirmante } from '../enfermeras-firmantes/schemas/enfermera-firmante.schema';
import { TecnicoFirmante } from '../tecnicos-firmantes/schemas/tecnico-firmante.schema';
import { ProveedorSalud } from '../proveedores-salud/schemas/proveedor-salud.schema';
import {
  resolveProvidersLogosDir,
  resolveSignatoriesDir,
} from 'src/utils/branding-assets-dir.util';

const ALLOWED_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.svg']);

const MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

type SignatoryModel = Model<{
  idUser: unknown;
  firma?: { data?: string };
  firmaConAntefirma?: { data?: string };
}>;

@Injectable()
export class BrandingAssetsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(MedicoFirmante.name)
    private readonly medicoFirmanteModel: SignatoryModel,
    @InjectModel(EnfermeraFirmante.name)
    private readonly enfermeraFirmanteModel: SignatoryModel,
    @InjectModel(TecnicoFirmante.name)
    private readonly tecnicoFirmanteModel: SignatoryModel,
    @InjectModel(ProveedorSalud.name)
    private readonly proveedorSaludModel: Model<ProveedorSalud>,
  ) {}

  resolveSafeFilename(filename: string): string {
    const withoutQuery = filename.split('?')[0];
    const decoded = decodeURIComponent(withoutQuery);

    if (
      !decoded ||
      decoded.includes('..') ||
      decoded.includes('/') ||
      decoded.includes('\\')
    ) {
      throw new ForbiddenException('Nombre de archivo no permitido');
    }

    const base = path.basename(decoded);

    const extension = path.extname(base).toLowerCase();
    if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
      throw new ForbiddenException('Tipo de archivo no permitido');
    }

    return base;
  }

  resolveSignatoryAbsolutePath(filename: string): string {
    const safeFilename = this.resolveSafeFilename(filename);
    const signatoriesDir = resolveSignatoriesDir();
    const absolute = path.resolve(signatoriesDir, safeFilename);

    if (
      absolute !== signatoriesDir &&
      !absolute.startsWith(signatoriesDir + path.sep)
    ) {
      throw new ForbiddenException('Ruta no permitida');
    }

    return absolute;
  }

  resolveProviderLogoAbsolutePath(filename: string): string {
    const safeFilename = this.resolveSafeFilename(filename);
    const logosDir = resolveProvidersLogosDir();
    const absolute = path.resolve(logosDir, safeFilename);

    if (absolute !== logosDir && !absolute.startsWith(logosDir + path.sep)) {
      throw new ForbiddenException('Ruta no permitida');
    }

    return absolute;
  }

  async assertUserCanAccessSignatory(
    userId: string,
    filename: string,
  ): Promise<void> {
    const safeFilename = this.resolveSafeFilename(filename);
    const requester = await this.userModel
      .findById(userId)
      .select('idProveedorSalud')
      .exec();

    if (!requester?.idProveedorSalud) {
      throw new ForbiddenException('No tiene permiso para acceder a este recurso');
    }

    const ownerUserId = await this.findSignatoryOwnerUserIdForProveedor(
      safeFilename,
      String(requester.idProveedorSalud),
    );

    if (!ownerUserId) {
      throw new ForbiddenException('No tiene permiso para acceder a este recurso');
    }
  }

  async assertUserCanAccessProviderLogo(
    userId: string,
    filename: string,
  ): Promise<void> {
    const safeFilename = this.resolveSafeFilename(filename);
    const user = await this.userModel
      .findById(userId)
      .select('idProveedorSalud')
      .exec();

    if (!user?.idProveedorSalud) {
      throw new ForbiddenException('No tiene permiso para acceder a este recurso');
    }

    const proveedor = await this.proveedorSaludModel
      .findOne({
        _id: user.idProveedorSalud,
        'logotipoEmpresa.data': safeFilename,
      })
      .select('_id')
      .lean()
      .exec();

    if (!proveedor) {
      throw new ForbiddenException('No tiene permiso para acceder a este recurso');
    }
  }

  async sendSignatoryForUser(
    userId: string,
    filename: string,
    res: Response,
  ): Promise<void> {
    await this.assertUserCanAccessSignatory(userId, filename);
    const absolutePath = this.resolveSignatoryAbsolutePath(filename);
    await this.sendImageFile(absolutePath, res);
  }

  async sendProviderLogoForUser(
    userId: string,
    filename: string,
    res: Response,
  ): Promise<void> {
    await this.assertUserCanAccessProviderLogo(userId, filename);
    const absolutePath = this.resolveProviderLogoAbsolutePath(filename);
    await this.sendImageFile(absolutePath, res);
  }

  private async findSignatoryOwnerUserIdForProveedor(
    filename: string,
    idProveedorSalud: string,
  ): Promise<string | null> {
    const users = await this.userModel
      .find({ idProveedorSalud })
      .select('_id')
      .lean()
      .exec();

    const userIds = users
      .map((user) => user._id)
      .filter((id): id is Types.ObjectId => Boolean(id));

    if (userIds.length === 0) {
      return null;
    }

    const query = {
      idUser: { $in: userIds },
      $or: [
        { 'firma.data': filename },
        { 'firmaConAntefirma.data': filename },
      ],
    };

    const models = [
      this.medicoFirmanteModel,
      this.enfermeraFirmanteModel,
      this.tecnicoFirmanteModel,
    ];

    for (const model of models) {
      const record = await model.findOne(query).select('idUser').lean().exec();
      if (record?.idUser) {
        return this.extractUserId(record.idUser);
      }
    }

    return null;
  }

  private extractUserId(idUser: unknown): string {
    if (
      idUser &&
      typeof idUser === 'object' &&
      '_id' in (idUser as Record<string, unknown>)
    ) {
      return String((idUser as { _id: unknown })._id);
    }

    return String(idUser);
  }

  private async sendImageFile(absolutePath: string, res: Response): Promise<void> {
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

    const contentType =
      MIME_BY_EXTENSION[path.extname(absolutePath).toLowerCase()] ??
      'application/octet-stream';
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
