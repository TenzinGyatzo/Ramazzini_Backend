import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { CentrosTrabajoService } from './centros-trabajo.service';
import { CentroTrabajo } from './schemas/centro-trabajo.schema';
import { GeographyValidator } from '../catalogs/validators/geography.validator';
import { TrabajadoresService } from '../trabajadores/trabajadores.service';
import { Empresa } from '../empresas/schemas/empresa.schema';
import { AuditService } from '../audit/audit.service';
import { DeletionCascadeService } from 'src/utils/services/deletion-cascade.service';
import { RegulatoryPolicyService } from 'src/utils/regulatory-policy.service';

describe('CentrosTrabajoService - Geographic Hierarchy Validation (A3)', () => {
  let service: CentrosTrabajoService;
  let mockGeographyValidator: any;

  // Create mock model factory
  const createMockModel = () => ({
    create: jest.fn(),
    findById: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
      exec: jest.fn().mockResolvedValue(null),
    }),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
        exec: jest.fn().mockResolvedValue([]),
      }),
      lean: jest.fn().mockResolvedValue([]),
      exec: jest.fn().mockResolvedValue([]),
    }),
    findByIdAndUpdate: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
      exec: jest.fn().mockResolvedValue(null),
    }),
    findByIdAndDelete: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    }),
    findOne: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
      exec: jest.fn().mockResolvedValue(null),
    }),
    save: jest.fn(),
    countDocuments: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    }),
    db: {
      startSession: jest.fn().mockResolvedValue({
        withTransaction: jest.fn(),
        endSession: jest.fn(),
      }),
    },
  });

  beforeEach(async () => {
    mockGeographyValidator = {
      validateEntidad: jest.fn().mockResolvedValue(true),
      validateMunicipio: jest.fn().mockResolvedValue(true),
      validateLocalidad: jest.fn().mockResolvedValue(true),
      validateGeography: jest.fn().mockResolvedValue({
        valid: true,
        errors: [],
      }),
    };

    const mockTrabajadoresService = {
      remove: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CentrosTrabajoService,
        {
          provide: getModelToken(CentroTrabajo.name),
          useValue: createMockModel(),
        },
        { provide: getModelToken('Trabajador'), useValue: createMockModel() },
        { provide: getModelToken('Antidoping'), useValue: createMockModel() },
        {
          provide: getModelToken('AptitudPuesto'),
          useValue: createMockModel(),
        },
        { provide: getModelToken('Certificado'), useValue: createMockModel() },
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
        { provide: getModelToken('User'), useValue: createMockModel() },
        { provide: getModelToken(Empresa.name), useValue: createMockModel() },
        {
          provide: TrabajadoresService,
          useValue: mockTrabajadoresService,
        },
        { provide: GeographyValidator, useValue: mockGeographyValidator },
        {
          provide: AuditService,
          useValue: { record: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: DeletionCascadeService,
          useValue: {
            countResguardedDocsByCentro: jest.fn().mockResolvedValue(0),
            countResguardedDocsByEmpresa: jest.fn().mockResolvedValue(0),
          },
        },
        {
          provide: RegulatoryPolicyService,
          useValue: {
            getRegulatoryPolicy: jest.fn().mockResolvedValue({
              regime: 'SIN_REGIMEN',
              features: {},
              validation: {},
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CentrosTrabajoService>(CentrosTrabajoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Validación A3 - Geographic Hierarchy', () => {
    it('debe rechazar crear centro con municipio fuera de entidad', async () => {
      mockGeographyValidator.validateGeography.mockResolvedValue({
        valid: false,
        errors: [
          {
            field: 'municipio',
            reason: 'El municipio "999" no pertenece a la entidad "25"',
          },
        ],
      });

      const dto = {
        nombreCentro: 'Centro de Prueba',
        estado: '25',
        municipio: '999', // Municipio inválido para entidad 25
        idEmpresa: '507f1f77bcf86cd799439011',
        createdBy: '507f1f77bcf86cd799439012',
        updatedBy: '507f1f77bcf86cd799439012',
      };

      await expect(service.create(dto as any)).rejects.toThrow(
        BadRequestException,
      );

      await expect(service.create(dto as any)).rejects.toMatchObject({
        response: {
          code: 'VALIDATION_ERROR',
          ruleId: 'A3',
          message: 'La información geográfica es inconsistente',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'municipio',
              reason: expect.stringContaining('no pertenece'),
            }),
          ]),
        },
      });
    });

    it('debe permitir crear centro con jerarquía válida', async () => {
      mockGeographyValidator.validateGeography.mockResolvedValue({
        valid: true,
        errors: [],
      });

      const dto = {
        nombreCentro: 'Centro de Prueba',
        estado: '25',
        municipio: '001',
        idEmpresa: '507f1f77bcf86cd799439011',
        createdBy: '507f1f77bcf86cd799439012',
        updatedBy: '507f1f77bcf86cd799439012',
      };

      const mockCentroTrabajoModel = createMockModel();
      const ctor: any = jest.fn().mockImplementation(() => ({
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439013',
          ...dto,
        }),
      }));
      Object.assign(ctor, mockCentroTrabajoModel);
      (service as any).centroTrabajoModel = ctor;

      const result = await service.create(dto as any);
      expect(result).toBeDefined();
      expect(mockGeographyValidator.validateGeography).toHaveBeenCalledWith({
        entidad: '25',
        municipio: '001',
      });
    });

    it('debe rechazar actualizar centro con jerarquía inválida', async () => {
      const centroId = '507f1f77bcf86cd799439013';
      const mockCentroActual = {
        _id: centroId,
        toObject: jest.fn().mockReturnValue({
          nombreCentro: 'Centro Existente',
          estado: '25',
          municipio: '001',
        }),
      };

      (service as any).centroTrabajoModel = {
        findById: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockCentroActual),
        }),
        findByIdAndUpdate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: centroId,
            ...mockCentroActual.toObject(),
            municipio: '999',
          }),
        }),
      };

      mockGeographyValidator.validateGeography.mockResolvedValue({
        valid: false,
        errors: [
          {
            field: 'municipio',
            reason: 'El municipio "999" no pertenece a la entidad "25"',
          },
        ],
      });

      const updateDto = {
        municipio: '999', // Municipio inválido
      };

      await expect(service.update(centroId, updateDto as any)).rejects.toThrow(
        BadRequestException,
      );

      await expect(
        service.update(centroId, updateDto as any),
      ).rejects.toMatchObject({
        response: {
          code: 'VALIDATION_ERROR',
          ruleId: 'A3',
        },
      });
    });

    it('debe permitir crear centro sin información geográfica', async () => {
      mockGeographyValidator.validateGeography.mockResolvedValue({
        valid: true,
        errors: [],
      });

      const dto = {
        nombreCentro: 'Centro de Prueba',
        idEmpresa: '507f1f77bcf86cd799439011',
        createdBy: '507f1f77bcf86cd799439012',
        updatedBy: '507f1f77bcf86cd799439012',
      };

      const mockCentroTrabajoModel = createMockModel();
      // Model constructor + save used by service.create
      const ctor: any = jest.fn().mockImplementation(() => ({
        save: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439013',
          ...dto,
        }),
      }));
      Object.assign(ctor, mockCentroTrabajoModel);
      (service as any).centroTrabajoModel = ctor;

      const result = await service.create(dto as any);
      expect(result).toBeDefined();
      expect(mockGeographyValidator.validateGeography).not.toHaveBeenCalled();
    });
  });
});
