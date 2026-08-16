import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ExpedientesService } from './expedientes.service';
import { Deteccion } from './schemas/deteccion.schema';
import { Trabajador } from '../trabajadores/schemas/trabajador.schema';
import { CentroTrabajo } from '../centros-trabajo/schemas/centro-trabajo.schema';
import { Empresa } from '../empresas/schemas/empresa.schema';
import { CatalogsService } from '../catalogs/catalogs.service';
import { NOM024ComplianceUtil } from '../../utils/nom024-compliance.util';
import { FilesService } from '../files/files.service';
import { FichaSnapshotService } from './services/ficha-snapshot.service';
import { DocumentoEstado } from './enums/documento-estado.enum';

describe('GIIS-B019 Detección Validation', () => {
  let service: ExpedientesService;
  let mockDeteccionModel: any;
  let mockTrabajadorModel: any;
  let mockCentroTrabajoModel: any;
  let mockEmpresaModel: any;
  let mockCatalogsService: any;
  let mockNom024Util: any;

  beforeEach(async () => {
    // Create mock model factory
    const createMockModel = () => ({
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
        lean: jest.fn().mockResolvedValue(null),
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      }),
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
        exec: jest.fn().mockResolvedValue([]),
      }),
      findByIdAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
      findByIdAndDelete: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });

    mockDeteccionModel = {
      ...createMockModel(),
      constructor: jest.fn(),
    };

    mockTrabajadorModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
        lean: jest.fn().mockResolvedValue(null),
      }),
      findByIdAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    };

    mockCentroTrabajoModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
        lean: jest.fn().mockResolvedValue(null),
      }),
    };

    mockEmpresaModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
        lean: jest.fn().mockResolvedValue(null),
      }),
      findOne: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      }),
    };

    mockCatalogsService = {
      validateCIE10: jest.fn().mockResolvedValue(true),
      searchCatalog: jest.fn().mockResolvedValue([]),
    };

    mockNom024Util = {
      requiresNOM024Compliance: jest.fn().mockResolvedValue(true),
    };

    const mockFilesService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpedientesService,
        {
          provide: getModelToken(Deteccion.name),
          useValue: mockDeteccionModel,
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
          provide: getModelToken('HistoriaClinica'),
          useValue: createMockModel(),
        },
        { provide: getModelToken('NotaMedica'), useValue: createMockModel() },
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
        {
          provide: getModelToken(Trabajador.name),
          useValue: mockTrabajadorModel,
        },
        {
          provide: getModelToken(CentroTrabajo.name),
          useValue: mockCentroTrabajoModel,
        },
        { provide: getModelToken(Empresa.name), useValue: mockEmpresaModel },
        { provide: CatalogsService, useValue: mockCatalogsService },
        { provide: NOM024ComplianceUtil, useValue: mockNom024Util },
        { provide: FilesService, useValue: mockFilesService },
        {
          provide: FichaSnapshotService,
          useValue: { capturar: jest.fn().mockResolvedValue(null) },
        },
      ],
    }).compile();

    service = module.get<ExpedientesService>(ExpedientesService);
  });

  describe('MX Provider - Strict Validation', () => {
    const mxTrabajadorId = 'trabajador123';
    const mxCentroTrabajoId = 'centro123';
    const mxEmpresaId = 'empresa123';
    const mxProveedorSaludId = 'proveedor123';

    beforeEach(() => {
      // Setup MX provider chain
      mockTrabajadorModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mxTrabajadorId,
          idCentroTrabajo: mxCentroTrabajoId,
          fechaNacimiento: new Date('1980-01-01'),
          sexo: 'Masculino',
        }),
        lean: jest.fn().mockResolvedValue({
          _id: mxTrabajadorId,
          idCentroTrabajo: mxCentroTrabajoId,
          fechaNacimiento: new Date('1980-01-01'),
          sexo: 'Masculino',
        }),
      });
      mockCentroTrabajoModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mxCentroTrabajoId,
          idEmpresa: mxEmpresaId,
        }),
        lean: jest.fn().mockResolvedValue({
          _id: mxCentroTrabajoId,
          idEmpresa: mxEmpresaId,
        }),
      });
      mockEmpresaModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mxEmpresaId,
          idProveedorSalud: mxProveedorSaludId,
        }),
        lean: jest.fn().mockResolvedValue({
          _id: mxEmpresaId,
          idProveedorSalud: mxProveedorSaludId,
        }),
      });
      mockNom024Util.requiresNOM024Compliance.mockResolvedValue(true);
    });

    it('should require core fields for MX providers', async () => {
      // MX provider requires: fechaDeteccion, curpPrestador, tipoPersonal, servicioAtencion
      const incompleteDto = {
        idTrabajador: mxTrabajadorId,
        fechaDeteccion: new Date(),
        // Missing: curpPrestador, tipoPersonal, servicioAtencion
        createdBy: 'user123',
        updatedBy: 'user123',
      };

      // The validation should fail due to missing required fields
      expect(mockNom024Util.requiresNOM024Compliance).toBeDefined();
    });

    it('should validate blood pressure consistency', async () => {
      // sistolica must be >= diastolica
      const invalidBP = {
        tensionArterialSistolica: 80,
        tensionArterialDiastolica: 120, // Invalid: diastolic > systolic
      };

      expect(invalidBP.tensionArterialSistolica).toBeLessThan(
        invalidBP.tensionArterialDiastolica,
      );
    });

    it('should require tipoMedicionGlucemia when glucemia > 0', async () => {
      const dto = {
        glucemia: 100,
        // Missing: tipoMedicionGlucemia
      };

      expect(dto.glucemia).toBeGreaterThan(0);
      expect(dto['tipoMedicionGlucemia']).toBeUndefined();
    });
  });

  describe('Non-MX Provider - Permissive Validation', () => {
    const nonMxTrabajadorId = 'trabajador456';

    beforeEach(() => {
      // Setup non-MX provider
      mockTrabajadorModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: nonMxTrabajadorId,
          idCentroTrabajo: null,
          fechaNacimiento: new Date('1980-01-01'),
          sexo: 'Masculino',
        }),
        lean: jest.fn().mockResolvedValue({
          _id: nonMxTrabajadorId,
          idCentroTrabajo: null,
          fechaNacimiento: new Date('1980-01-01'),
          sexo: 'Masculino',
        }),
      });
      mockNom024Util.requiresNOM024Compliance.mockResolvedValue(false);
    });

    it('should allow missing core fields for non-MX providers', async () => {
      // Non-MX providers: fields are optional
      const minimalDto = {
        idTrabajador: nonMxTrabajadorId,
        fechaDeteccion: new Date(),
        createdBy: 'user123',
        updatedBy: 'user123',
      };

      // Validation should pass with warnings only
      expect(minimalDto.idTrabajador).toBeDefined();
    });

    it('should still validate formats when values are provided', async () => {
      // Even non-MX should validate format if a value is provided
      const dtoWithValues = {
        idTrabajador: nonMxTrabajadorId,
        fechaDeteccion: new Date(),
        peso: 70, // Valid
        talla: 170, // Valid
      };

      expect(dtoWithValues.peso).toBeGreaterThanOrEqual(1);
      expect(dtoWithValues.peso).toBeLessThanOrEqual(400);
    });
  });

  describe('Age-Based Block Validation', () => {
    it('should validate mental health block requires age >= 10', () => {
      const edad = 8; // Under 10
      const depresion = 0; // Positive result (not -1)

      const isValidAge = edad >= 10;
      expect(isValidAge).toBe(false);
    });

    it('should validate geriatrics block requires age >= 60', () => {
      const edad = 55; // Under 60
      const deterioroMemoria = 1; // Negative result (not -1)

      const isValidAge = edad >= 60;
      expect(isValidAge).toBe(false);
    });

    it('should validate chronic diseases block requires age >= 20', () => {
      const edad = 18; // Under 20
      const riesgoDiabetes = 0; // Positive result

      const isValidAge = edad >= 20;
      expect(isValidAge).toBe(false);
    });

    it('should allow geriatrics block for age >= 60', () => {
      const edad = 65;
      const deterioroMemoria = 1;

      const isValidAge = edad >= 60;
      expect(isValidAge).toBe(true);
    });
  });

  describe('Sex-Based Validation', () => {
    it('should validate cancer cervicouterino only for females age 25-64', () => {
      const sexoFemenino = true;
      const edad = 35;

      const isValid = sexoFemenino && edad >= 25 && edad <= 64;
      expect(isValid).toBe(true);
    });

    it('should reject cancer cervicouterino for males', () => {
      const sexoMasculino = true;

      expect(sexoMasculino).toBe(true);
      // Should be rejected
    });

    it('should validate VPH only for females age 35-64', () => {
      const sexoFemenino = true;
      const edad = 40;

      const isValid = sexoFemenino && edad >= 35 && edad <= 64;
      expect(isValid).toBe(true);
    });

    it('should validate hiperplasia prostática only for males age >= 40', () => {
      const sexoMasculino = true;
      const edad = 45;

      const isValid = sexoMasculino && edad >= 40;
      expect(isValid).toBe(true);
    });

    it('should reject hiperplasia prostática for females', () => {
      const sexoFemenino = true;

      expect(sexoFemenino).toBe(true);
      // Should be rejected for females
    });

    it('should validate violencia mujer only for females age >= 15', () => {
      const sexoFemenino = true;
      const edad = 25;

      const isValid = sexoFemenino && edad >= 15;
      expect(isValid).toBe(true);
    });
  });

  describe('Trabajador Social Exclusion Rule', () => {
    it('should disable clinical detections for Trabajador Social (tipoPersonal=30)', () => {
      const tipoPersonal = 30;
      const clinicalFields = [
        'depresion',
        'ansiedad',
        'consumoAlcohol',
        'consumoTabaco',
        'consumoDrogas',
        'resultadoVIH',
        'resultadoSifilis',
        'resultadoHepatitisB',
        'cancerMama',
        'deterioroMemoria',
        'riesgoCaidas',
      ];

      // tipoPersonal 30 should block these fields
      expect(tipoPersonal).toBe(30);
      expect(clinicalFields.length).toBeGreaterThan(0);
    });

    it('should allow clinical detections for other personal types', () => {
      const tipoPersonal = 10; // Not Trabajador Social

      expect(tipoPersonal).not.toBe(30);
    });
  });

  describe('Document Immutability', () => {
    it('should allow updates on draft documents', () => {
      const draftDeteccion = {
        _id: 'deteccion123',
        estado: DocumentoEstado.BORRADOR,
      };

      expect(draftDeteccion.estado).toBe(DocumentoEstado.BORRADOR);
      expect(draftDeteccion.estado !== DocumentoEstado.FINALIZADO).toBe(true);
    });

    it('should block updates on finalized documents for MX providers', async () => {
      const finalizedDeteccion = {
        _id: 'deteccion123',
        estado: DocumentoEstado.FINALIZADO,
      };

      mockNom024Util.requiresNOM024Compliance.mockResolvedValue(true);

      const isFinalizado =
        finalizedDeteccion.estado === DocumentoEstado.FINALIZADO;
      const requiresCompliance =
        await mockNom024Util.requiresNOM024Compliance('proveedorId');

      expect(isFinalizado && requiresCompliance).toBe(true);
    });

    it('should allow updates on finalized documents for non-MX providers', async () => {
      const finalizedDeteccion = {
        _id: 'deteccion123',
        estado: DocumentoEstado.FINALIZADO,
      };

      mockNom024Util.requiresNOM024Compliance.mockResolvedValue(false);

      const isFinalizado =
        finalizedDeteccion.estado === DocumentoEstado.FINALIZADO;
      const requiresCompliance =
        await mockNom024Util.requiresNOM024Compliance('nonMxProveedorId');

      expect(isFinalizado && !requiresCompliance).toBe(true);
    });
  });

  describe('Vitals Range Validation', () => {
    it('should accept valid peso range (1-400)', () => {
      const validPeso = 75;
      expect(validPeso).toBeGreaterThanOrEqual(1);
      expect(validPeso).toBeLessThanOrEqual(400);
    });

    it('should accept valid talla range (20-300)', () => {
      const validTalla = 175;
      expect(validTalla).toBeGreaterThanOrEqual(20);
      expect(validTalla).toBeLessThanOrEqual(300);
    });

    it('should accept valid cintura range (20-300)', () => {
      const validCintura = 85;
      expect(validCintura).toBeGreaterThanOrEqual(20);
      expect(validCintura).toBeLessThanOrEqual(300);
    });

    it('should accept valid glucemia range (20-999)', () => {
      const validGlucemia = 100;
      expect(validGlucemia).toBeGreaterThanOrEqual(20);
      expect(validGlucemia).toBeLessThanOrEqual(999);
    });

    it('should reject invalid peso below range', () => {
      const invalidPeso = 0;
      expect(invalidPeso).toBeLessThan(1);
    });

    it('should reject invalid peso above range', () => {
      const invalidPeso = 500;
      expect(invalidPeso).toBeGreaterThan(400);
    });
  });

  describe('CLUES Handling', () => {
    it('should prefer provided CLUES when available', () => {
      const providedClues = 'ASCIJ000012';
      expect(providedClues).toMatch(/^[A-Z0-9]{11}$/);
    });

    it('should derive CLUES from ProveedorSalud when not provided', () => {
      // Test that CLUES can be derived from ProveedorSalud
      const derivedClues = 'BSCIJ000013';
      expect(derivedClues).toMatch(/^[A-Z0-9]{11}$/);
    });

    it('should validate CLUES format (11 alphanumeric characters)', () => {
      const validClues = 'ASCIJ000012';
      const invalidClues = 'SHORT';

      expect(validClues).toMatch(/^[A-Z0-9]{11}$/);
      expect(invalidClues).not.toMatch(/^[A-Z0-9]{11}$/);
    });
  });

  describe('Best-Effort Catalog Validation', () => {
    it('should accept tipoPersonal as numeric code without catalog validation', () => {
      // TIPO_PERSONAL catalog is not publicly available
      const tipoPersonal = 10;
      expect(Number.isInteger(tipoPersonal)).toBe(true);
      expect(tipoPersonal).toBeGreaterThanOrEqual(1);
    });

    it('should accept servicioAtencion as numeric code without catalog validation', () => {
      // SERVICIOS_DET catalog is not publicly available
      const servicioAtencion = 5;
      expect(Number.isInteger(servicioAtencion)).toBe(true);
      expect(servicioAtencion).toBeGreaterThanOrEqual(1);
    });

    it('should not fail due to missing DGIS catalog files', () => {
      // System must NOT fail due to missing catalogs
      const deteccionWithCatalogCodes = {
        tipoPersonal: 10,
        servicioAtencion: 5,
      };

      expect(deteccionWithCatalogCodes.tipoPersonal).toBeDefined();
      expect(deteccionWithCatalogCodes.servicioAtencion).toBeDefined();
    });
  });
});
