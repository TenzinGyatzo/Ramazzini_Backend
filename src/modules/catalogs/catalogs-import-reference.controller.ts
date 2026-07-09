import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CatalogsService } from './catalogs.service';
import { getUserIdFromRequest } from '../../utils/auth-helpers';
import { UsersService } from '../users/users.service';
import { RegulatoryPolicyService } from '../../utils/regulatory-policy.service';

const IMPORT_REFERENCE_TYPES = [
  'paises',
  'entidades',
  'municipios',
  'localidades',
] as const;

type ImportReferenceType = (typeof IMPORT_REFERENCE_TYPES)[number];

const FILENAMES: Record<ImportReferenceType, string> = {
  paises: 'catalogo-paises-importacion.csv',
  entidades: 'catalogo-entidades-importacion.csv',
  municipios: 'catalogo-municipios-importacion.csv',
  localidades: 'catalogo-localidades-importacion.csv',
};

@Controller('api/catalogs/import-reference')
export class CatalogsImportReferenceController {
  constructor(
    private readonly catalogsService: CatalogsService,
    private readonly usersService: UsersService,
    private readonly regulatoryPolicyService: RegulatoryPolicyService,
  ) {}

  private parseType(typeParam: string): ImportReferenceType {
    const normalized = typeParam.trim().toLowerCase();
    if (!IMPORT_REFERENCE_TYPES.includes(normalized as ImportReferenceType)) {
      throw new BadRequestException(
        `Tipo inválido. Valores permitidos: ${IMPORT_REFERENCE_TYPES.join(', ')}`,
      );
    }
    return normalized as ImportReferenceType;
  }

  private async assertSiresImportReferenceAccess(req: Request): Promise<void> {
    const userId = getUserIdFromRequest(req);
    const user = await this.usersService.findById(userId, 'idProveedorSalud');
    if (!user?.idProveedorSalud) {
      throw new ForbiddenException(
        'La descarga de catálogos de importación requiere un proveedor de salud asociado.',
      );
    }
    const policy = await this.regulatoryPolicyService.getRegulatoryPolicy(
      user.idProveedorSalud.toString(),
    );
    if (policy.regime !== 'SIRES_NOM024') {
      throw new ForbiddenException(
        'Los catálogos de referencia para importación solo están disponibles en régimen SIRES_NOM024.',
      );
    }
  }

  @Get(':type/export')
  async exportImportReference(
    @Req() req: Request,
    @Param('type') typeParam: string,
    @Query('entidadCode') entidadCode: string | undefined,
    @Query('municipioCode') municipioCode: string | undefined,
    @Res() res: Response,
  ) {
    await this.assertSiresImportReferenceAccess(req);
    const type = this.parseType(typeParam);

    if (type === 'localidades') {
      if (!entidadCode?.trim() || !municipioCode?.trim()) {
        throw new BadRequestException(
          'Para exportar localidades se requieren entidadCode y municipioCode.',
        );
      }
    }

    let buffer: Buffer;
    let filename = FILENAMES[type];

    switch (type) {
      case 'paises':
        buffer = this.catalogsService.buildImportReferencePaisesCsv();
        break;
      case 'entidades':
        buffer = this.catalogsService.buildImportReferenceEntidadesCsv();
        break;
      case 'municipios':
        buffer = this.catalogsService.buildImportReferenceMunicipiosCsv();
        break;
      case 'localidades':
        buffer = this.catalogsService.buildImportReferenceLocalidadesCsv(
          entidadCode!,
          municipioCode!,
        );
        filename = `catalogo-localidades-${entidadCode!.padStart(2, '0')}-${municipioCode!.padStart(3, '0')}-importacion.csv`;
        break;
      default:
        throw new BadRequestException('Tipo de catálogo no soportado');
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
