import { Module, Global } from '@nestjs/common';
import { CatalogsService } from './catalogs.service';
import { CatalogsController } from './catalogs.controller';
import { GeographyValidator } from './validators/geography.validator';
import { CexCatalogResolver } from './cex-catalog.resolver';

/**
 * Catalogs Module
 *
 * Provides catalog loading, caching, and validation services for NOM-024 compliance.
 * This module is global so it can be used across the application without explicit imports.
 */
@Global()
@Module({
  controllers: [CatalogsController],
  providers: [CatalogsService, GeographyValidator, CexCatalogResolver],
  exports: [CatalogsService, GeographyValidator, CexCatalogResolver],
})
export class CatalogsModule {}
