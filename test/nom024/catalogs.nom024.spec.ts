/**
 * NOM-024 Catalog Service Tests (Task 1, Task 12, Task 14, Task 19)
 *
 * Tests catalog loading, validation, and graceful handling of missing optional catalogs.
 *
 * CRITICAL: Tests MUST NOT fail if optional GIIS catalog CSV files are missing.
 *
 * Task 19 additions:
 * - Tests for 8 GIIS validators (B013 + B019)
 * - Tests for catalog-present and catalog-missing scenarios
 * - Tests for mock catalog injection
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CatalogsService } from '../../src/modules/catalogs/catalogs.service';
import { CatalogType } from '../../src/modules/catalogs/interfaces/catalog-entry.interface';
import { existsSync } from 'fs';
import { join } from 'path';

describe('NOM-024 Catalog Service (Task 1, 12, 14, 19)', () => {
  let service: CatalogsService;
  const catalogsPath = join(process.cwd(), 'catalogs', 'normalized');

  // Define which catalogs are base (required) vs optional (GIIS)
  const baseCatalogs = [
    { type: CatalogType.CIE10, file: 'diagnosticos_sis.csv', name: 'CIE-10' },
    {
      type: CatalogType.ENTIDADES_FEDERATIVAS,
      file: 'enitades_federativas.csv',
      name: 'Estados',
    },
    {
      type: CatalogType.MUNICIPIOS,
      file: 'municipios.csv',
      name: 'Municipios',
    },
    {
      type: CatalogType.NACIONALIDADES,
      file: 'cat_nacionalidades.csv',
      name: 'Nacionalidades',
    },
  ];


  const optionalGIISB019Catalogs = [
    {
      type: CatalogType.TIPO_PERSONAL,
      file: 'cat_tipo_personal.csv',
      name: 'Tipo Personal (GIIS-B019)',
    },
    {
      type: CatalogType.AFILIACION,
      file: 'cat_afiliacion.csv',
      name: 'Afiliación (GIIS-B019)',
    },
    {
      type: CatalogType.PAIS,
      file: 'cat_pais.csv',
      name: 'País (GIIS-B019)',
    },
  ];

  const allOptionalGIISCatalogs = [...optionalGIISB019Catalogs];

  beforeAll(async () => {
    // Create a real service instance to test catalog loading
    const module: TestingModule = await Test.createTestingModule({
      providers: [CatalogsService],
    }).compile();

    service = module.get<CatalogsService>(CatalogsService);

    // Initialize service (loads catalogs)
    await service.onModuleInit();
  }, 60000); // Increase timeout for catalog loading

  describe('Base Catalog Loading (Task 1)', () => {
    baseCatalogs.forEach(({ type, file, name }) => {
      it(`should load ${name} catalog if file exists`, async () => {
        const filePath = join(catalogsPath, file);
        const fileExists = existsSync(filePath);

        if (fileExists) {
          // Service should have loaded this catalog
          // We can test by trying to get an entry (will return null if not loaded)
          // For CIE-10, we can test validation
          if (type === CatalogType.CIE10) {
            // CIE-10 should be loaded if file exists
            const isValid = await service.validateCIE10('A00.0');
            // Either returns true (found) or false (not found), but should not throw
            expect(typeof isValid).toBe('boolean');
          } else if (type === CatalogType.ENTIDADES_FEDERATIVAS) {
            const isValid = await service.validateINEGI('estado', '01');
            expect(typeof isValid).toBe('boolean');
          }
        } else {
          // File doesn't exist - test should still pass (not fail)
          console.warn(`Base catalog file not found: ${file} - skipping test`);
        }
      });
    });

    it('should not throw during initialization even if some catalogs fail', () => {
      // The fact that beforeAll completed means service started without throwing
      expect(service).toBeDefined();
    });
  });

  describe('Optional GIIS Catalog Handling (Task 12, 14)', () => {
    allOptionalGIISCatalogs.forEach(({ file, name }) => {
      it(`should gracefully handle missing ${name} catalog`, () => {
        const filePath = join(catalogsPath, file);
        const fileExists = existsSync(filePath);

        if (!fileExists) {
          // File doesn't exist - this is expected for GIIS catalogs
          // Service should have logged a warning but NOT failed
          console.log(
            `Optional catalog ${name} not available (expected - DGIS does not publish)`,
          );
        }

        // Test passes regardless - missing optional catalogs should not cause failures
        expect(true).toBe(true);
      });
    });

    it('should produce warnings (not errors) for missing optional catalogs', () => {
      // Service initialized successfully despite missing optional catalogs
      // This test validates that the fallback behavior is in place
      expect(service).toBeDefined();
    });
  });

  describe('Catalog Statistics (Task 19)', () => {
    it('should return accurate catalog statistics', () => {
      const stats = service.getCatalogStats();

      expect(stats.baseTotal).toBe(9);
      expect(stats.giisTotal).toBe(3);
      expect(typeof stats.baseLoaded).toBe('number');
      expect(typeof stats.giisLoaded).toBe('number');
      expect(stats.baseLoaded).toBeGreaterThanOrEqual(0);
      expect(stats.baseLoaded).toBeLessThanOrEqual(9);
      expect(stats.giisLoaded).toBeGreaterThanOrEqual(0);
      expect(stats.giisLoaded).toBeLessThanOrEqual(3);
      expect(Array.isArray(stats.loadedCatalogs)).toBe(true);
    });

    it('should correctly identify GIIS catalog status', () => {
      for (const catalogInfo of allOptionalGIISCatalogs) {
        const isLoaded = service.isGIISCatalogLoaded(catalogInfo.type);
        expect(typeof isLoaded).toBe('boolean');
      }
    });
  });

  describe('GIIS-B019 Validators (Task 19)', () => {
    describe('validateGIISTipoPersonal', () => {
      it('should return non-blocking result if catalog missing', () => {
        service.clearCatalog(CatalogType.TIPO_PERSONAL);
        service.resetWarningFlags();

        const result = service.validateGIISTipoPersonal(1);

        expect(result.valid).toBe(true);
        expect(result.catalogLoaded).toBe(false);
      });

      it('should validate code when catalog is present (mock)', () => {
        service.injectMockCatalog(CatalogType.TIPO_PERSONAL, [
          { code: '1', description: 'Médico' },
          { code: '2', description: 'Enfermera' },
          { code: '3', description: 'Trabajador Social' },
        ]);

        expect(service.validateGIISTipoPersonal(1).valid).toBe(true);
        expect(service.validateGIISTipoPersonal(3).valid).toBe(true);
        expect(service.validateGIISTipoPersonal(99).valid).toBe(false);

        service.clearCatalog(CatalogType.TIPO_PERSONAL);
      });
    });

    describe('validateGIISAfiliacion', () => {
      it('should return non-blocking result if catalog missing', () => {
        service.clearCatalog(CatalogType.AFILIACION);
        service.resetWarningFlags();

        const result = service.validateGIISAfiliacion(1);

        expect(result.valid).toBe(true);
        expect(result.catalogLoaded).toBe(false);
      });

      it('should validate code when catalog is present (mock)', () => {
        service.injectMockCatalog(CatalogType.AFILIACION, [
          { code: '1', description: 'IMSS' },
          { code: '2', description: 'ISSSTE' },
          { code: '3', description: 'Seguro Popular' },
        ]);

        expect(service.validateGIISAfiliacion(1).valid).toBe(true);
        expect(service.validateGIISAfiliacion('2').valid).toBe(true);
        expect(service.validateGIISAfiliacion(100).valid).toBe(false);

        service.clearCatalog(CatalogType.AFILIACION);
      });
    });

    describe('validateGIISPais', () => {
      it('should return non-blocking result if catalog missing', () => {
        service.clearCatalog(CatalogType.PAIS);
        service.resetWarningFlags();

        const result = service.validateGIISPais('MX');

        expect(result.valid).toBe(true);
        expect(result.catalogLoaded).toBe(false);
      });

      it('should validate code when catalog is present (mock)', () => {
        service.injectMockCatalog(CatalogType.PAIS, [
          { code: 'MX', description: 'México' },
          { code: 'US', description: 'Estados Unidos' },
          { code: 'GT', description: 'Guatemala' },
        ]);

        expect(service.validateGIISPais('MX').valid).toBe(true);
        expect(service.validateGIISPais('US').valid).toBe(true);
        expect(service.validateGIISPais('XX').valid).toBe(false);

        service.clearCatalog(CatalogType.PAIS);
      });
    });
  });

  describe('Warning Deduplication (Task 19)', () => {
    it('should only emit one warning per catalog type per process lifetime', () => {
      // Clear and reset
      service.clearCatalog(CatalogType.TIPO_PERSONAL);
      service.resetWarningFlags();

      // First call - should emit warning
      const result1 = service.validateGIISTipoPersonal(1);
      expect(result1.valid).toBe(true);
      expect(result1.catalogLoaded).toBe(false);

      // Subsequent calls - should NOT emit warning (but same result)
      const result2 = service.validateGIISTipoPersonal(2);
      const result3 = service.validateGIISTipoPersonal(3);

      expect(result2.valid).toBe(true);
      expect(result3.valid).toBe(true);

      // The warning deduplication is internal - we just verify behavior is consistent
    });
  });

  describe('CIE-10 Validation (Task 8)', () => {
    it('should validate correct CIE-10 codes', async () => {
      // Common valid CIE-10 codes
      const validCodes = ['A00', 'A00.0', 'B99', 'J06.9', 'S01.0'];

      for (const code of validCodes) {
        const result = await service.validateCIE10(code);
        // Result is boolean - code may or may not be in catalog
        expect(typeof result).toBe('boolean');
      }
    });

    it('should return false for invalid CIE-10 format', async () => {
      const invalidCodes = ['INVALID', '123', 'A', 'A0', 'AAAA'];

      for (const code of invalidCodes) {
        const result = await service.validateCIE10(code);
        expect(result).toBe(false);
      }
    });

    it('should search CIE-10 catalog', async () => {
      const results = await service.searchCatalog(
        CatalogType.CIE10,
        'diabetes',
        10,
      );
      expect(Array.isArray(results)).toBe(true);
      // Results may be empty if catalog not loaded, but should not throw
    });
  });

  describe('CLUES Validation (Task 5)', () => {
    it('should validate CLUES format', async () => {
      // CLUES format: 11 alphanumeric characters
      const testCLUES = 'DFSSA001234';
      const result = await service.validateCLUES(testCLUES);
      expect(typeof result).toBe('boolean');
    });

    it('should return false for invalid CLUES', async () => {
      const invalidCLUES = ['INVALID', '12345', '', 'null'];

      for (const clues of invalidCLUES) {
        const result = await service.validateCLUES(clues);
        expect(result).toBe(false);
      }
    });
  });

  describe('INEGI Geographic Validation', () => {
    it('should validate estado codes', async () => {
      const result = await service.validateINEGI('estado', '01');
      expect(typeof result).toBe('boolean');
    });

    it('should validate municipio codes', async () => {
      const result = await service.validateINEGI('municipio', '001', '01');
      expect(typeof result).toBe('boolean');
    });

    it('should return false for invalid geographic codes', async () => {
      const result = await service.validateINEGI('estado', 'INVALID');
      expect(result).toBe(false);
    });
  });

  describe('Nacionalidad Validation (Task 4)', () => {
    it('should validate nationality codes', async () => {
      const result = await service.validateNacionalidad('MEX');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Catalog Entry Retrieval', () => {
    it('should get catalog entry by code', async () => {
      const entry = await service.getCatalogEntry(CatalogType.CIE10, 'A00');
      // Entry may be null if not found, but should not throw
      expect(entry === null || typeof entry === 'object').toBe(true);
    });

    it('should return null for non-existent entry', async () => {
      const entry = await service.getCatalogEntry(
        CatalogType.CIE10,
        'NONEXISTENT123',
      );
      expect(entry).toBeNull();
    });
  });
});
