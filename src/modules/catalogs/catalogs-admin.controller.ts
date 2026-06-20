import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { CatalogsService } from './catalogs.service';
import { CatalogCsvStoreService } from './catalog-csv.store.service';
import {
  ALL_CATALOG_TYPES,
  CATALOG_FILES,
  resolveCatalogType,
} from './constants/catalog-files.constant';
import { CatalogType, CatalogEntry } from './interfaces/catalog-entry.interface';
import { getUserIdFromRequest } from '../../utils/auth-helpers';
import { UsersService } from '../users/users.service';
import { assertCatalogAdminRole } from './utils/catalog-admin-auth.util';
import { assertCatalogAdminFeature } from './utils/assert-catalog-admin-feature.util';
import { CatalogEntryMutationDto } from './dto/catalog-entry-mutation.dto';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '../audit/constants/audit-action-type';
import { AuditEventClass } from '../audit/constants/audit-event-class';
import { RegulatoryPolicyService } from '../../utils/regulatory-policy.service';

@Controller('api/catalogs/admin')
export class CatalogsAdminController {
  constructor(
    private readonly catalogsService: CatalogsService,
    private readonly csvStore: CatalogCsvStoreService,
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
    private readonly regulatoryPolicyService: RegulatoryPolicyService,
  ) {}

  private async assertAdminAndFeature(req: Request): Promise<{
    userId: string;
    proveedorSaludId: string | null;
  }> {
    assertCatalogAdminFeature();
    const ctx = await this.assertAdmin(req);
    if (ctx.proveedorSaludId) {
      const policy = await this.regulatoryPolicyService.getRegulatoryPolicy(
        ctx.proveedorSaludId,
      );
      if (policy.regime !== 'SIRES_NOM024') {
        throw new ForbiddenException(
          'La administración de catálogos solo está disponible en régimen SIRES_NOM024.',
        );
      }
    }
    return ctx;
  }

  private async assertAdmin(req: Request): Promise<{
    userId: string;
    proveedorSaludId: string | null;
  }> {
    const userId = getUserIdFromRequest(req);
    const user = await this.usersService.findById(userId, 'role idProveedorSalud');
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }
    assertCatalogAdminRole(user.role);
    return {
      userId,
      proveedorSaludId: user.idProveedorSalud
        ? String(user.idProveedorSalud)
        : null,
    };
  }

  private parseCatalogTypeParam(param: string): CatalogType {
    const catalogType = resolveCatalogType(param);
    if (!catalogType) {
      throw new BadRequestException(
        `Tipo de catálogo inválido. Valores: ${ALL_CATALOG_TYPES.join(', ')}`,
      );
    }
    return catalogType;
  }

  private dtoToEntry(dto: CatalogEntryMutationDto): CatalogEntry {
    return { ...dto } as CatalogEntry;
  }

  private async recordCatalogAudit(
    proveedorSaludId: string | null,
    actorId: string,
    actionType: (typeof AuditActionType)[keyof typeof AuditActionType],
    catalogType: CatalogType,
    resourceId: string | null,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.auditService.record({
      proveedorSaludId,
      actorId,
      actionType,
      resourceType: 'catalog_entry',
      resourceId,
      payload: { catalogType, filename: CATALOG_FILES[catalogType], ...payload },
      eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
    });
  }

  @Get('types')
  async listTypes(@Req() req: Request) {
    await this.assertAdminAndFeature(req);
    return Promise.all(
      ALL_CATALOG_TYPES.map(async (catalogType) => {
        const meta = await this.csvStore.getFileMeta(catalogType);
        return {
          catalogType,
          filename: meta.filename,
          loaded: this.catalogsService.isCatalogLoaded(catalogType),
          rowCountInCache: this.catalogsService.getCacheRowCount(catalogType),
          rowCountOnDisk: meta.rowCount,
          fileSize: meta.fileSize,
          lastModified: meta.lastModified,
        };
      }),
    );
  }

  @Get(':catalogType/export')
  async exportCsv(
    @Req() req: Request,
    @Param('catalogType') catalogTypeParam: string,
    @Res() res: Response,
  ) {
    await this.assertAdminAndFeature(req);
    const catalogType = this.parseCatalogTypeParam(catalogTypeParam);
    const filePath = this.csvStore.getFilePath(catalogType);
    if (!existsSync(filePath)) {
      throw new NotFoundException('Archivo de catálogo no encontrado');
    }
    const filename = CATALOG_FILES[catalogType]!;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    createReadStream(filePath).pipe(res);
  }

  @Get(':catalogType')
  async listEntries(
    @Req() req: Request,
    @Param('catalogType') catalogTypeParam: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('estadoCode') estadoCode?: string,
    @Query('municipioCode') municipioCode?: string,
  ) {
    await this.assertAdminAndFeature(req);
    const catalogType = this.parseCatalogTypeParam(catalogTypeParam);
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.catalogsService.listCatalogPaginated(
      catalogType,
      pageNum,
      limitNum,
      q,
      { estadoCode, municipioCode },
    );
  }

  @Get(':catalogType/:code')
  async getEntry(
    @Req() req: Request,
    @Param('catalogType') catalogTypeParam: string,
    @Param('code') code: string,
  ) {
    await this.assertAdminAndFeature(req);
    const catalogType = this.parseCatalogTypeParam(catalogTypeParam);
    const entry = await this.catalogsService.getCatalogEntry(
      catalogType,
      decodeURIComponent(code),
    );
    if (!entry) {
      throw new NotFoundException(`Código ${code} no encontrado`);
    }
    const { _csvRow, ...safe } = entry;
    return safe;
  }

  @Post(':catalogType/import')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 250 * 1024 * 1024 },
    }),
  )
  async importCsv(
    @Req() req: Request,
    @Param('catalogType') catalogTypeParam: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const { userId, proveedorSaludId } = await this.assertAdminAndFeature(req);
    const catalogType = this.parseCatalogTypeParam(catalogTypeParam);
    if (!file?.buffer?.length) {
      throw new BadRequestException('Archivo CSV requerido (campo "file")');
    }
    const result = await this.csvStore.importFile(catalogType, file.buffer);
    await this.recordCatalogAudit(
      proveedorSaludId,
      userId,
      AuditActionType.ADMIN_CATALOG_IMPORT,
      catalogType,
      null,
      { rowCount: result.rowCount },
    );
    return result;
  }

  @Post(':catalogType/reload-cache')
  async reloadCache(
    @Req() req: Request,
    @Param('catalogType') catalogTypeParam: string,
  ) {
    const { userId, proveedorSaludId } = await this.assertAdminAndFeature(req);
    const catalogType = this.parseCatalogTypeParam(catalogTypeParam);
    await this.catalogsService.reloadCatalog(catalogType);
    await this.recordCatalogAudit(
      proveedorSaludId,
      userId,
      AuditActionType.ADMIN_CATALOG_RELOAD,
      catalogType,
      null,
      {},
    );
    return {
      catalogType,
      rowCountInCache: this.catalogsService.getCacheRowCount(catalogType),
    };
  }

  @Post(':catalogType')
  async createEntry(
    @Req() req: Request,
    @Param('catalogType') catalogTypeParam: string,
    @Body() dto: CatalogEntryMutationDto,
  ) {
    const { userId, proveedorSaludId } = await this.assertAdminAndFeature(req);
    const catalogType = this.parseCatalogTypeParam(catalogTypeParam);
    const created = await this.csvStore.createEntry(
      catalogType,
      this.dtoToEntry(dto),
    );
    await this.recordCatalogAudit(
      proveedorSaludId,
      userId,
      AuditActionType.ADMIN_CATALOG_CREATE,
      catalogType,
      created.code,
      { code: created.code },
    );
    const { _csvRow, ...safe } = created;
    return safe;
  }

  @Patch(':catalogType/:code')
  async updateEntry(
    @Req() req: Request,
    @Param('catalogType') catalogTypeParam: string,
    @Param('code') code: string,
    @Body() dto: Partial<CatalogEntryMutationDto>,
  ) {
    const { userId, proveedorSaludId } = await this.assertAdminAndFeature(req);
    const catalogType = this.parseCatalogTypeParam(catalogTypeParam);
    const decoded = decodeURIComponent(code);
    const { code: _omit, ...patch } = dto;
    const updated = await this.csvStore.updateEntry(
      catalogType,
      decoded,
      patch as Partial<CatalogEntry>,
    );
    await this.recordCatalogAudit(
      proveedorSaludId,
      userId,
      AuditActionType.ADMIN_CATALOG_UPDATE,
      catalogType,
      decoded,
      { patch: Object.keys(patch) },
    );
    const { _csvRow, ...safe } = updated;
    return safe;
  }

  @Delete(':catalogType/:code')
  async deleteEntry(
    @Req() req: Request,
    @Param('catalogType') catalogTypeParam: string,
    @Param('code') code: string,
  ) {
    const { userId, proveedorSaludId } = await this.assertAdminAndFeature(req);
    const catalogType = this.parseCatalogTypeParam(catalogTypeParam);
    const decoded = decodeURIComponent(code);
    await this.csvStore.deleteEntry(catalogType, decoded);
    await this.recordCatalogAudit(
      proveedorSaludId,
      userId,
      AuditActionType.ADMIN_CATALOG_DELETE,
      catalogType,
      decoded,
      {},
    );
    return { success: true, code: decoded };
  }

}
