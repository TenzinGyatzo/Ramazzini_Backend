/**
 * CexCatalogResolver — resolves CEX tipoPersonal and servicioAtencion from CSV catalogs.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CatalogsService } from '../../src/modules/catalogs/catalogs.service';
import { CexCatalogResolver } from '../../src/modules/catalogs/cex-catalog.resolver';
import { CatalogType } from '../../src/modules/catalogs/interfaces/catalog-entry.interface';

describe('CexCatalogResolver', () => {
  let catalogsService: CatalogsService;
  let resolver: CexCatalogResolver;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CatalogsService, CexCatalogResolver],
    }).compile();

    catalogsService = module.get(CatalogsService);
    resolver = module.get(CexCatalogResolver);
    await catalogsService.onModuleInit();
    resolver.onApplicationBootstrap();
  }, 60000);

  it('should resolve 3 tipoPersonal codes and 1 servicioAtencion from real CSVs', () => {
    expect(resolver.isReady()).toBe(true);
    const codes = resolver.getCodes();
    expect(codes.tipoPersonal.medicoGeneral).toBe(2);
    expect(codes.tipoPersonal.medicoEspecialista).toBe(4);
    expect(codes.tipoPersonal.enfermera).toBe(6);
    expect(codes.servicioAtencion).toBe(4);
  });

  it('should reflect CATALOG_KEY changes after catalog refresh', () => {
    catalogsService.injectMockCatalog(CatalogType.TIPO_PERSONAL, [
      { code: '99', description: 'MÉDICA (O) GENERAL' },
      { code: '88', description: 'MÉDICA (O) ESPECIALISTA' },
      { code: '77', description: 'ENFERMERA (O)' },
    ]);
    catalogsService.injectMockCatalog(CatalogType.SERVICIOS_ATENCION_CE, [
      { code: '55', description: 'CONSULTA EXTERNA  GENERAL' },
    ]);
    resolver.refresh();

    const codes = resolver.getCodes();
    expect(codes.tipoPersonal.medicoGeneral).toBe(99);
    expect(codes.tipoPersonal.medicoEspecialista).toBe(88);
    expect(codes.tipoPersonal.enfermera).toBe(77);
    expect(codes.servicioAtencion).toBe(55);

    catalogsService.clearCatalog(CatalogType.TIPO_PERSONAL);
    catalogsService.clearCatalog(CatalogType.SERVICIOS_ATENCION_CE);
    resolver.refresh();
  });

  it('should fail readiness when required descriptions are missing', () => {
    catalogsService.clearCatalog(CatalogType.TIPO_PERSONAL);
    catalogsService.clearCatalog(CatalogType.SERVICIOS_ATENCION_CE);
    resolver.refresh();
    expect(resolver.isReady()).toBe(false);
    expect(resolver.getResolveErrors().length).toBeGreaterThan(0);
  });
});
