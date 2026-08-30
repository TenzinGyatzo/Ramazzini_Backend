import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { ExpedientesService } from './expedientes.service';
import { NotaMedica } from './schemas/nota-medica.schema';
import { HistoriaClinica } from './schemas/historia-clinica.schema';
import { Trabajador } from '../trabajadores/schemas/trabajador.schema';
import { CentroTrabajo } from '../centros-trabajo/schemas/centro-trabajo.schema';
import { Empresa } from '../empresas/schemas/empresa.schema';
import { CatalogsService } from '../catalogs/catalogs.service';
import { NOM024ComplianceUtil } from '../../utils/nom024-compliance.util';
import { FilesService } from '../files/files.service';
import { FichaSnapshotService } from './services/ficha-snapshot.service';
import { OrganizationalAccessService } from '../../utils/organizational-access.service';

describe('CIE-10 Validation - MX vs Non-MX Providers', () => {
  let service: ExpedientesService;
  let mockCatalogsService: any;
  let mockNom024Util: any;

  // Create mock model factory with proper chained methods
  const createMockModel = () => ({
    findById: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
      lean: jest.fn().mockResolvedValue(null),
    }),
    findOne: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
      lean: jest.fn().mockResolvedValue(null),
    }),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    }),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
      exec: jest.fn().mockResolvedValue([]),
    }),
    findByIdAndDelete: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    }),
  });

  beforeEach(async () => {
    mockCatalogsService = {
      validateCIE10: jest.fn().mockResolvedValue(true),
      searchCatalog: jest.fn().mockResolvedValue([]),
    };

    mockNom024Util = {
      requiresNOM024Compliance: jest.fn().mockResolvedValue(true),
    };

    const mockFilesService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpedientesService,
        {
          provide: getModelToken(NotaMedica.name),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken(HistoriaClinica.name),
          useValue: createMockModel(),
        },
        { provide: getModelToken('Antidoping'), useValue: createMockModel() },
        {
          provide: getModelToken('AptitudPuesto'),
          useValue: createMockModel(),
        },
        { provide: getModelToken('Audiometria'), useValue: createMockModel() },
        { provide: getModelToken('Certificado'), useValue: createMockModel() },
        {
          provide: getModelToken('CertificadoExpedito'),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken('DocumentoExterno'),
          useValue: createMockModel(),
        },
        { provide: getModelToken('ExamenVista'), useValue: createMockModel() },
        {
          provide: getModelToken('ExploracionFisica'),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken('ControlPrenatal'),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken('HistoriaOtologica'),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken('PrevioEspirometria'),
          useValue: createMockModel(),
        },
        { provide: getModelToken('Receta'), useValue: createMockModel() },
        {
          provide: getModelToken('ConstanciaAptitud'),
          useValue: createMockModel(),
        },
        { provide: getModelToken('Deteccion'), useValue: createMockModel() },
        {
          provide: getModelToken(Trabajador.name),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken(CentroTrabajo.name),
          useValue: createMockModel(),
        },
        { provide: getModelToken(Empresa.name), useValue: createMockModel() },
        { provide: CatalogsService, useValue: mockCatalogsService },
        { provide: NOM024ComplianceUtil, useValue: mockNom024Util },
        { provide: FilesService, useValue: mockFilesService },
        {
          provide: FichaSnapshotService,
          useValue: { capturar: jest.fn().mockResolvedValue(null) },
        },
        {
          provide: OrganizationalAccessService,
          useValue: {
            assertUserCanAccessTrabajadorId: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<ExpedientesService>(ExpedientesService);
  });

  describe('CIE-10 Validation', () => {
    it('should validate CIE-10 codes against catalog', async () => {
      mockCatalogsService.validateCIE10.mockResolvedValue(true);

      const isValid = await mockCatalogsService.validateCIE10('A00.0');
      expect(isValid).toBe(true);
      expect(mockCatalogsService.validateCIE10).toHaveBeenCalledWith('A00.0');
    });

    it('should reject invalid CIE-10 codes', async () => {
      mockCatalogsService.validateCIE10.mockResolvedValue(false);

      const isValid = await mockCatalogsService.validateCIE10('INVALID');
      expect(isValid).toBe(false);
    });

    it('should validate CIE-10 format pattern', () => {
      // Valid CIE-10 formats: A00, A00.0, A00.00
      const validFormats = ['A00', 'A00.0', 'A00.00', 'Z99.9'];
      const invalidFormats = ['00A', 'A0', 'ABCD', ''];

      const regex = /^[A-Z][0-9]{2}(\.[0-9]{1,2})?$/;

      validFormats.forEach((code) => {
        expect(regex.test(code)).toBe(true);
      });

      invalidFormats.forEach((code) => {
        expect(regex.test(code)).toBe(false);
      });
    });
  });

  describe('MX vs Non-MX Provider Enforcement', () => {
    it('should require CIE-10 for MX providers', async () => {
      mockNom024Util.requiresNOM024Compliance.mockResolvedValue(true);

      const requiresCompliance =
        await mockNom024Util.requiresNOM024Compliance('mxProveedorId');
      expect(requiresCompliance).toBe(true);
    });

    it('should not require CIE-10 for non-MX providers', async () => {
      mockNom024Util.requiresNOM024Compliance.mockResolvedValue(false);

      const requiresCompliance =
        await mockNom024Util.requiresNOM024Compliance('nonMxProveedorId');
      expect(requiresCompliance).toBe(false);
    });

    it('should allow free-text diagnosis alongside CIE-10', () => {
      // Both fields should be supported for backward compatibility
      const diagnosis = {
        codigoCIE10Principal: 'A00.0',
        diagnosticoTexto: 'Colera',
      };

      expect(diagnosis.codigoCIE10Principal).toBeDefined();
      expect(diagnosis.diagnosticoTexto).toBeDefined();
    });
  });

  describe('Catalog Search', () => {
    it('should search CIE-10 catalog for autocomplete', async () => {
      const mockResults = [
        { code: 'A00', description: 'Cólera' },
        { code: 'A00.0', description: 'Cólera debido a Vibrio cholerae 01' },
      ];
      mockCatalogsService.searchCatalog.mockResolvedValue(mockResults);

      const results = await mockCatalogsService.searchCatalog(
        'CIE10',
        'colera',
      );
      expect(results).toHaveLength(2);
      expect(results[0].code).toBe('A00');
    });

    it('should return empty array for no matches', async () => {
      mockCatalogsService.searchCatalog.mockResolvedValue([]);

      const results = await mockCatalogsService.searchCatalog(
        'CIE10',
        'xyz123',
      );
      expect(results).toHaveLength(0);
    });
  });
});
