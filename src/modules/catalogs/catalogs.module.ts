import { Module, Global, forwardRef } from '@nestjs/common';
import { CatalogsService } from './catalogs.service';
import { CatalogsController } from './catalogs.controller';
import { CatalogsAdminController } from './catalogs-admin.controller';
import { CatalogsImportReferenceController } from './catalogs-import-reference.controller';
import { CatalogCsvStoreService } from './catalog-csv.store.service';
import { GeographyValidator } from './validators/geography.validator';
import { CexCatalogResolver } from './cex-catalog.resolver';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';
import { ProveedoresSaludModule } from '../proveedores-salud/proveedores-salud.module';

/**
 * Catalogs Module
 *
 * Provides catalog loading, caching, and validation services for NOM-024 compliance.
 * This module is global so it can be used across the application without explicit imports.
 */
@Global()
@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => AuditModule),
    forwardRef(() => ProveedoresSaludModule),
  ],
  controllers: [CatalogsController, CatalogsAdminController, CatalogsImportReferenceController],
  providers: [
    CatalogsService,
    CatalogCsvStoreService,
    GeographyValidator,
    CexCatalogResolver,
  ],
  exports: [CatalogsService, GeographyValidator, CexCatalogResolver],
})
export class CatalogsModule {}
