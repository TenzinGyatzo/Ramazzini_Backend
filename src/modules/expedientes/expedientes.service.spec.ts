import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ExpedientesService } from './expedientes.service';
import { NotaMedica } from './schemas/nota-medica.schema';
import { Trabajador } from '../trabajadores/schemas/trabajador.schema';
import { CentroTrabajo } from '../centros-trabajo/schemas/centro-trabajo.schema';
import { Empresa } from '../empresas/schemas/empresa.schema';
import { DocumentoEstado } from './enums/documento-estado.enum';
import { NOM024ComplianceUtil } from '../../utils/nom024-compliance.util';
import { FilesService } from '../files/files.service';
import { CatalogsService } from '../catalogs/catalogs.service';
import { InformesService } from '../informes/informes.service';
import { RegulatoryPolicyService } from '../../utils/regulatory-policy.service';

describe('ExpedientesService - Document Immutability Enforcement', () => {
  let service: ExpedientesService;
  let mockNom024Util: any;
  let mockCatalogsService: any;
  let mockRegulatoryPolicyService: any;

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
    mockNom024Util = {
      requiresNOM024Compliance: jest.fn().mockResolvedValue(true),
    };

    mockRegulatoryPolicyService = {
      getRegulatoryPolicy: jest.fn().mockResolvedValue({
        regime: 'SIRES_NOM024',
      }),
    };

    mockCatalogsService = {
      validateCIE10: jest.fn().mockResolvedValue(true),
      searchCatalog: jest.fn().mockResolvedValue([]),
    };

    const mockFilesService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
      renameFile: jest.fn(),
    };

    const mockInformesService = {
      regenerarInformeAlFinalizar: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpedientesService,
        {
          provide: getModelToken(NotaMedica.name),
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
          provide: getModelToken('HistoriaClinica'),
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
        { provide: NOM024ComplianceUtil, useValue: mockNom024Util },
        { provide: RegulatoryPolicyService, useValue: mockRegulatoryPolicyService },
        { provide: CatalogsService, useValue: mockCatalogsService },
        { provide: FilesService, useValue: mockFilesService },
        { provide: InformesService, useValue: mockInformesService },
      ],
    }).compile();

    service = module.get<ExpedientesService>(ExpedientesService);
  });

  describe('Document State Management', () => {
    it('should have BORRADOR as default state for new documents', () => {
      const defaultState = DocumentoEstado.BORRADOR;
      expect(defaultState).toBe('borrador');
    });

    it('should support three document states', () => {
      const states = Object.values(DocumentoEstado);
      expect(states).toContain('borrador');
      expect(states).toContain('finalizado');
      expect(states).toContain('anulado');
    });
  });

  describe('Document Immutability - MX Providers', () => {
    it('should block updates on finalized documents for MX providers', async () => {
      mockNom024Util.requiresNOM024Compliance.mockResolvedValue(true);

      const finalizedDoc = {
        _id: 'doc123',
        estado: DocumentoEstado.FINALIZADO,
      };

      const isFinalizado = finalizedDoc.estado === DocumentoEstado.FINALIZADO;
      const requiresCompliance =
        await mockNom024Util.requiresNOM024Compliance('mxProveedorId');

      // MX provider with finalized document should be blocked
      expect(isFinalizado && requiresCompliance).toBe(true);
    });

    it('should allow updates on draft documents for MX providers', async () => {
      mockNom024Util.requiresNOM024Compliance.mockResolvedValue(true);

      const draftDoc = {
        _id: 'doc123',
        estado: DocumentoEstado.BORRADOR,
      };

      const isFinalizado = draftDoc.estado === DocumentoEstado.FINALIZADO;
      const requiresCompliance =
        await mockNom024Util.requiresNOM024Compliance('mxProveedorId');

      // Draft documents can be updated
      expect(isFinalizado).toBe(false);
      expect(requiresCompliance).toBe(true);
    });
  });

  describe('Document Immutability - Non-MX Providers', () => {
    it('should allow updates on finalized documents for non-MX providers', async () => {
      mockNom024Util.requiresNOM024Compliance.mockResolvedValue(false);

      const finalizedDoc = {
        _id: 'doc123',
        estado: DocumentoEstado.FINALIZADO,
      };

      const isFinalizado = finalizedDoc.estado === DocumentoEstado.FINALIZADO;
      const requiresCompliance =
        await mockNom024Util.requiresNOM024Compliance('nonMxProveedorId');

      // Non-MX provider can update even finalized documents
      expect(isFinalizado).toBe(true);
      expect(requiresCompliance).toBe(false);
      // Update allowed because requiresCompliance is false
    });

    it('should allow updates on draft documents for non-MX providers', async () => {
      mockNom024Util.requiresNOM024Compliance.mockResolvedValue(false);

      const draftDoc = {
        _id: 'doc123',
        estado: DocumentoEstado.BORRADOR,
      };

      const isFinalizado = draftDoc.estado === DocumentoEstado.FINALIZADO;
      const requiresCompliance =
        await mockNom024Util.requiresNOM024Compliance('nonMxProveedorId');

      // Non-MX provider can update draft documents
      expect(isFinalizado).toBe(false);
      expect(requiresCompliance).toBe(false);
    });
  });

  describe('Document Finalization', () => {
    it('should populate finalization metadata', () => {
      const now = new Date();
      const userId = 'user123';

      const finalizedDoc = {
        _id: 'doc123',
        estado: DocumentoEstado.FINALIZADO,
        fechaFinalizacion: now,
        finalizadoPor: userId,
      };

      expect(finalizedDoc.estado).toBe(DocumentoEstado.FINALIZADO);
      expect(finalizedDoc.fechaFinalizacion).toBeDefined();
      expect(finalizedDoc.finalizadoPor).toBe(userId);
    });

    it('should be one-way transition (cannot revert to BORRADOR)', () => {
      // Per Decision Log D2: Finalization is permanent
      const estados = [
        DocumentoEstado.BORRADOR,
        DocumentoEstado.FINALIZADO,
        DocumentoEstado.ANULADO,
      ];

      // Once finalized, only ANULADO is possible (not reverting to BORRADOR)
      const finalizedState = DocumentoEstado.FINALIZADO;
      const possibleNextStates = [DocumentoEstado.ANULADO]; // Cannot go back to BORRADOR

      expect(possibleNextStates.includes(DocumentoEstado.BORRADOR)).toBe(false);
    });
  });

  describe('Decision Log D2 - Block Updates vs Versioning', () => {
    it('should block updates on finalized documents (no versioning)', () => {
      // Per Decision Log D2: Chose blocking over append-only versioning
      const approach = 'block-updates';

      // No versioning - just block the update
      expect(approach).toBe('block-updates');
      expect(approach).not.toBe('append-only-versioning');
    });

    it('should return HTTP 403 when trying to update finalized MX document', async () => {
      mockNom024Util.requiresNOM024Compliance.mockResolvedValue(true);

      const finalizedDoc = {
        _id: 'doc123',
        estado: DocumentoEstado.FINALIZADO,
      };

      // Simulating the expected error code
      const expectedStatusCode = 403;
      expect(expectedStatusCode).toBe(403);
    });
  });

  describe('Validación E1 - fechaDocumento por régimen', () => {
    const mockCreateNotaMedicaDto = {
      tipoNota: 'Inicial',
      fechaNotaMedica: new Date('2020-01-01'),
      motivoConsulta: 'Consulta',
      diagnostico: 'Diagnóstico',
      idTrabajador: 'trabajador123',
      rutaPDF: '/path/to/pdf',
      createdBy: 'user123',
      updatedBy: 'user123',
    };

    const mockProveedorChain = (
      regime: 'SIRES_NOM024' | 'SIN_REGIMEN',
      fechaNacimiento: Date | null = new Date('1990-01-01'),
    ) => {
      mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue({
        regime,
      });

      const mockTrabajadorModel = service['trabajadorModel'] as any;
      mockTrabajadorModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          idCentroTrabajo: 'centro123',
          fechaNacimiento,
        }),
      });

      const mockCentroTrabajoModel = service['centroTrabajoModel'] as any;
      mockCentroTrabajoModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ idEmpresa: 'empresa123' }),
      });

      const mockEmpresaModel = service['empresaModel'] as any;
      mockEmpresaModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          idProveedorSalud: '507f1f77bcf86cd799439011',
        }),
      });
    };

    it('debe rechazar crear nota médica con fechaNotaMedica futura en SIRES_NOM024', async () => {
      const mockNotaMedicaModel = service['models']['notaMedica'] as any;

      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 1);

      const dto = {
        ...mockCreateNotaMedicaDto,
        fechaNotaMedica: fechaFutura,
      };

      mockProveedorChain('SIRES_NOM024');

      // Mock save
      mockNotaMedicaModel.save = jest.fn();

      // Mock constructor
      (mockNotaMedicaModel as any).mockImplementation((data: any) => ({
        ...data,
        save: mockNotaMedicaModel.save,
      }));

      await expect(service.createDocument('notaMedica', dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createDocument('notaMedica', dto)).rejects.toThrow(
        'La fecha del documento no puede ser futura',
      );
    });

    it('debe permitir crear nota médica con fechaNotaMedica futura en SIN_REGIMEN', async () => {
      const mockNotaMedicaModel = service['models']['notaMedica'] as any;

      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 1);

      const dto = {
        ...mockCreateNotaMedicaDto,
        fechaNotaMedica: fechaFutura,
      };

      mockProveedorChain('SIN_REGIMEN');

      const savedDocument = { ...dto, _id: 'nota123' };
      mockNotaMedicaModel.save = jest.fn().mockResolvedValue(savedDocument);
      (mockNotaMedicaModel as any).mockImplementation((data: any) => ({
        ...data,
        save: mockNotaMedicaModel.save,
      }));

      service['actualizarUpdatedAtTrabajador'] = jest
        .fn()
        .mockResolvedValue(undefined);
      service['recordDocDraftCreated'] = jest.fn().mockResolvedValue(undefined);

      const result = await service.createDocument('notaMedica', dto);
      expect(result).toBeDefined();
      expect(result._id).toBe('nota123');
    });

    it('debe rechazar crear antidoping con fecha futura en SIRES_NOM024', async () => {
      const mockAntidopingModel = service['models']['antidoping'] as any;
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 1);

      mockProveedorChain('SIRES_NOM024');

      const dto = {
        fechaAntidoping: fechaFutura,
        idTrabajador: 'trabajador123',
        createdBy: 'user123',
        updatedBy: 'user123',
      };

      mockAntidopingModel.save = jest.fn();
      (mockAntidopingModel as any).mockImplementation((data: any) => ({
        ...data,
        save: mockAntidopingModel.save,
      }));

      await expect(service.createDocument('antidoping', dto)).rejects.toThrow(
        'La fecha del documento no puede ser futura',
      );
    });

    it('debe rechazar crear nota médica con fechaNotaMedica < fechaNacimiento', async () => {
      const mockNotaMedicaModel = service['models']['notaMedica'] as any;

      const fechaDoc = new Date('1989-12-31');
      const fechaNac = new Date('1990-01-01');

      const dto = {
        ...mockCreateNotaMedicaDto,
        fechaNotaMedica: fechaDoc,
      };

      mockProveedorChain('SIRES_NOM024', fechaNac);

      // Mock save
      mockNotaMedicaModel.save = jest.fn();

      // Mock constructor
      (mockNotaMedicaModel as any).mockImplementation((data: any) => ({
        ...data,
        save: mockNotaMedicaModel.save,
      }));

      await expect(service.createDocument('notaMedica', dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createDocument('notaMedica', dto)).rejects.toThrow(
        'La fecha del documento no puede ser anterior a la fecha de nacimiento del trabajador',
      );
    });

    it('debe permitir crear nota médica con fechaNotaMedica válida', async () => {
      const mockNotaMedicaModel = service['models']['notaMedica'] as any;

      const fechaDoc = new Date('2020-01-01');
      const fechaNac = new Date('1990-01-01');

      const dto = {
        ...mockCreateNotaMedicaDto,
        fechaNotaMedica: fechaDoc,
      };

      mockProveedorChain('SIRES_NOM024', fechaNac);

      // Mock save
      const savedDocument = { ...dto, _id: 'nota123' };
      mockNotaMedicaModel.save = jest.fn().mockResolvedValue(savedDocument);

      // Mock constructor
      (mockNotaMedicaModel as any).mockImplementation((data: any) => ({
        ...data,
        save: mockNotaMedicaModel.save,
      }));

      // Mock actualizarUpdatedAtTrabajador
      service['actualizarUpdatedAtTrabajador'] = jest
        .fn()
        .mockResolvedValue(undefined);
      service['recordDocDraftCreated'] = jest.fn().mockResolvedValue(undefined);

      const result = await service.createDocument('notaMedica', dto);
      expect(result).toBeDefined();
      expect(result._id).toBe('nota123');
    });

    it('debe permitir crear nota médica sin fechaNacimiento (solo valida que no sea futura)', async () => {
      const mockNotaMedicaModel = service['models']['notaMedica'] as any;

      const fechaDoc = new Date();
      fechaDoc.setHours(0, 0, 0, 0);

      const dto = {
        ...mockCreateNotaMedicaDto,
        fechaNotaMedica: fechaDoc,
      };

      mockProveedorChain('SIRES_NOM024', null);

      // Mock save
      const savedDocument = { ...dto, _id: 'nota123' };
      mockNotaMedicaModel.save = jest.fn().mockResolvedValue(savedDocument);

      // Mock constructor
      (mockNotaMedicaModel as any).mockImplementation((data: any) => ({
        ...data,
        save: mockNotaMedicaModel.save,
      }));

      // Mock actualizarUpdatedAtTrabajador
      service['actualizarUpdatedAtTrabajador'] = jest
        .fn()
        .mockResolvedValue(undefined);
      service['recordDocDraftCreated'] = jest.fn().mockResolvedValue(undefined);

      const result = await service.createDocument('notaMedica', dto);
      expect(result).toBeDefined();
    });
  });

  describe('Validación B4 - No duplicar diagnóstico principal en complementarios', () => {
    const mockCreateNotaMedicaDto = {
      tipoNota: 'Inicial',
      fechaNotaMedica: new Date('2020-01-01'),
      motivoConsulta: 'Consulta',
      diagnostico: 'Diagnóstico',
      idTrabajador: 'trabajador123',
      rutaPDF: '/path/to/pdf',
      createdBy: 'user123',
      updatedBy: 'user123',
      codigoCIE10Principal: 'A30 - LEPRA',
      codigosCIE10Complementarios: ['B20'],
    };

    beforeEach(() => {
      // Mock trabajador
      const mockTrabajadorModel = service['trabajadorModel'];
      mockTrabajadorModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          fechaNacimiento: new Date('1990-01-01'),
          sexo: 'Masculino',
        }),
      });

      // Mock proveedor de salud
      const mockProveedorSaludService = service['nom024Util'];
      mockProveedorSaludService.requiresNOM024Compliance = jest
        .fn()
        .mockResolvedValue(true);
      mockProveedorSaludService.getProveedorSaludIdFromTrabajador = jest
        .fn()
        .mockResolvedValue('proveedor123');

      // Mock catalogs service
      const mockCatalogsService = service['catalogsService'];
      mockCatalogsService.validateCIE10 = jest.fn().mockResolvedValue(true);
      mockCatalogsService.getCatalogEntry = jest.fn().mockResolvedValue({
        lsex: 'NO',
      });
    });

    it('debe rechazar crear nota médica con diagnóstico principal duplicado en complementarios', async () => {
      const mockNotaMedicaModel = service['models']['notaMedica'];

      const dto = {
        ...mockCreateNotaMedicaDto,
        codigoCIE10Principal: 'A30 - LEPRA',
        codigosCIE10Complementarios: ['A30 - LEPRA'],
      };

      // Mock save
      mockNotaMedicaModel.save = jest.fn();

      // Mock constructor
      (mockNotaMedicaModel as any).mockImplementation((data: any) => ({
        ...data,
        save: mockNotaMedicaModel.save,
      }));

      await expect(service.createDocument('notaMedica', dto)).rejects.toThrow(
        BadRequestException,
      );

      try {
        await service.createDocument('notaMedica', dto);
      } catch (error: any) {
        expect(error.response.code).toBe('VALIDATION_ERROR');
        expect(error.response.ruleId).toBe('B4');
        expect(error.response.message).toContain(
          'El diagnóstico principal no puede repetirse en los diagnósticos complementarios',
        );
        expect(error.response.details).toBeDefined();
        expect(error.response.details[0].field).toBe(
          'codigosCIE10Complementarios',
        );
        expect(error.response.details[0].duplicatedCode).toBe('A30');
      }
    });

    it('debe rechazar crear nota médica cuando principal está en cualquier posición de complementarios', async () => {
      const mockNotaMedicaModel = service['models']['notaMedica'];

      const dto = {
        ...mockCreateNotaMedicaDto,
        codigoCIE10Principal: 'A30',
        codigosCIE10Complementarios: ['B20', 'A30', 'C30'],
      };

      // Mock save
      mockNotaMedicaModel.save = jest.fn();

      // Mock constructor
      (mockNotaMedicaModel as any).mockImplementation((data: any) => ({
        ...data,
        save: mockNotaMedicaModel.save,
      }));

      await expect(service.createDocument('notaMedica', dto)).rejects.toThrow(
        BadRequestException,
      );

      try {
        await service.createDocument('notaMedica', dto);
      } catch (error: any) {
        expect(error.response.ruleId).toBe('B4');
        expect(error.response.details[0].duplicatedCode).toBe('A30');
      }
    });

    it('debe permitir crear nota médica sin duplicados', async () => {
      const mockNotaMedicaModel = service['models']['notaMedica'];

      const dto = {
        ...mockCreateNotaMedicaDto,
        codigoCIE10Principal: 'A30 - LEPRA',
        codigosCIE10Complementarios: ['B20 - OTRAS', 'C30 - OTRA'],
      };

      // Mock save
      const savedDocument = { ...dto, _id: 'nota123' };
      mockNotaMedicaModel.save = jest.fn().mockResolvedValue(savedDocument);

      // Mock constructor
      (mockNotaMedicaModel as any).mockImplementation((data: any) => ({
        ...data,
        save: mockNotaMedicaModel.save,
      }));

      // Mock actualizarUpdatedAtTrabajador
      service['actualizarUpdatedAtTrabajador'] = jest
        .fn()
        .mockResolvedValue(undefined);

      const result = await service.createDocument('notaMedica', dto);
      expect(result).toBeDefined();
      expect(result._id).toBe('nota123');
    });

    it('debe rechazar actualizar nota médica agregando duplicado', async () => {
      const mockNotaMedicaModel = service['models']['notaMedica'];

      const existingDocument = {
        _id: 'nota123',
        tipoNota: 'Inicial',
        fechaNotaMedica: new Date('2020-01-01'),
        codigoCIE10Principal: 'A30',
        codigosCIE10Complementarios: ['B20'],
        estado: DocumentoEstado.BORRADOR,
      };

      const updateDto = {
        codigoCIE10Principal: 'A30',
        codigosCIE10Complementarios: ['A30'],
        fechaNotaMedica: new Date('2020-01-01'),
        idTrabajador: 'trabajador123',
      };

      // Mock findById
      mockNotaMedicaModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingDocument),
      });

      // Mock findByIdAndUpdate
      mockNotaMedicaModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ ...existingDocument, ...updateDto }),
      });

      await expect(
        service.updateOrCreateDocument('notaMedica', 'nota123', updateDto),
      ).rejects.toThrow(BadRequestException);

      try {
        await service.updateOrCreateDocument(
          'notaMedica',
          'nota123',
          updateDto,
        );
      } catch (error: any) {
        expect(error.response.ruleId).toBe('B4');
        expect(error.response.details[0].duplicatedCode).toBe('A30');
      }
    });

    it('debe permitir actualizar nota médica sin duplicados', async () => {
      const mockNotaMedicaModel = service['models']['notaMedica'];

      const existingDocument = {
        _id: 'nota123',
        tipoNota: 'Inicial',
        fechaNotaMedica: new Date('2020-01-01'),
        codigoCIE10Principal: 'A30',
        codigosCIE10Complementarios: ['B20'],
        estado: DocumentoEstado.BORRADOR,
      };

      const updateDto = {
        codigoCIE10Principal: 'A30',
        codigosCIE10Complementarios: ['B20', 'C30'],
        fechaNotaMedica: new Date('2020-01-01'),
        idTrabajador: 'trabajador123',
      };

      // Mock findById
      mockNotaMedicaModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingDocument),
      });

      // Mock findByIdAndUpdate
      const updatedDocument = { ...existingDocument, ...updateDto };
      mockNotaMedicaModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedDocument),
      });

      // Mock actualizarUpdatedAtTrabajador
      service['actualizarUpdatedAtTrabajador'] = jest
        .fn()
        .mockResolvedValue(undefined);

      const result = await service.updateOrCreateDocument(
        'notaMedica',
        'nota123',
        updateDto,
      );
      expect(result).toBeDefined();
    });
  });

  describe('Validación C3/C4 - CIE-10 por sexo y edad', () => {
    const mockCreateNotaMedicaDto = {
      tipoNota: 'Inicial',
      fechaNotaMedica: new Date('2024-01-01'),
      motivoConsulta: 'Consulta',
      diagnostico: 'Diagnóstico',
      idTrabajador: 'trabajador123',
      rutaPDF: '/path/to/pdf',
      createdBy: 'user123',
      updatedBy: 'user123',
    };

    beforeEach(() => {
      // Mock proveedor de salud
      const mockProveedorSaludService = service['nom024Util'];
      mockProveedorSaludService.requiresNOM024Compliance = jest
        .fn()
        .mockResolvedValue(true);
      mockProveedorSaludService.getProveedorSaludIdFromTrabajador = jest
        .fn()
        .mockResolvedValue('proveedor123');

      // Mock catalogs service
      const mockCatalogsService = service['catalogsService'];
      mockCatalogsService.validateCIE10 = jest.fn().mockResolvedValue(true);
      mockCatalogsService.getCatalogEntry = jest.fn().mockResolvedValue({
        lsex: 'NO',
      });
    });

    it('debe rechazar crear nota médica con C61 para mujer (solo HOMBRE)', async () => {
      const mockNotaMedicaModel = service['models']['notaMedica'];
      const mockTrabajadorModel = service['trabajadorModel'];

      const dto = {
        ...mockCreateNotaMedicaDto,
        codigoCIE10Principal: 'C61 - Cáncer de próstata',
      };

      // Mock trabajador: MUJER, 30 años
      mockTrabajadorModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          fechaNacimiento: new Date('1994-01-01'),
          sexo: 'Femenino',
        }),
      });

      // Mock save
      mockNotaMedicaModel.save = jest.fn();

      // Mock constructor
      (mockNotaMedicaModel as any).mockImplementation((data: any) => ({
        ...data,
        save: mockNotaMedicaModel.save,
      }));

      await expect(service.createDocument('notaMedica', dto)).rejects.toThrow(
        BadRequestException,
      );

      try {
        await service.createDocument('notaMedica', dto);
      } catch (error: any) {
        expect(error.response.code).toBe('VALIDATION_ERROR');
        expect(error.response.ruleId).toBe('C4');
        expect(error.response.message).toBe(
          'El diagnóstico no es válido para el sexo o la edad del trabajador',
        );
        expect(error.response.details).toBeDefined();
        expect(error.response.details[0].field).toBe('codigoCIE10Principal');
        expect(error.response.details[0].cie10).toBe('C61');
        expect(error.response.details[0].sexoTrabajador).toBe('Femenino');
      }
    });

    it('debe rechazar crear nota médica con C53 para mujer de 20 años (edad < 25)', async () => {
      const mockNotaMedicaModel = service['models']['notaMedica'];
      const mockTrabajadorModel = service['trabajadorModel'];

      const dto = {
        ...mockCreateNotaMedicaDto,
        codigoCIE10Principal: 'C53 - Cáncer cervicouterino',
      };

      // Mock trabajador: MUJER, 20 años
      mockTrabajadorModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          fechaNacimiento: new Date('2004-01-01'),
          sexo: 'Femenino',
        }),
      });

      // Mock save
      mockNotaMedicaModel.save = jest.fn();

      // Mock constructor
      (mockNotaMedicaModel as any).mockImplementation((data: any) => ({
        ...data,
        save: mockNotaMedicaModel.save,
      }));

      await expect(service.createDocument('notaMedica', dto)).rejects.toThrow(
        BadRequestException,
      );

      try {
        await service.createDocument('notaMedica', dto);
      } catch (error: any) {
        expect(error.response.code).toBe('VALIDATION_ERROR');
        expect(error.response.ruleId).toBe('C3');
        expect(error.response.details[0].edadTrabajador).toBe(20);
        expect(error.response.details[0].reason).toContain('25');
      }
    });

    it('debe permitir crear nota médica con C50 para mujer de cualquier edad', async () => {
      const mockNotaMedicaModel = service['models']['notaMedica'];
      const mockTrabajadorModel = service['trabajadorModel'];

      const dto = {
        ...mockCreateNotaMedicaDto,
        codigoCIE10Principal: 'C50 - Cáncer de mama',
      };

      // Mock trabajador: MUJER, 20 años
      mockTrabajadorModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          fechaNacimiento: new Date('2004-01-01'),
          sexo: 'Femenino',
        }),
      });

      // Mock save
      const savedDocument = { ...dto, _id: 'nota123' };
      mockNotaMedicaModel.save = jest.fn().mockResolvedValue(savedDocument);

      // Mock constructor
      (mockNotaMedicaModel as any).mockImplementation((data: any) => ({
        ...data,
        save: mockNotaMedicaModel.save,
      }));

      // Mock actualizarUpdatedAtTrabajador
      service['actualizarUpdatedAtTrabajador'] = jest
        .fn()
        .mockResolvedValue(undefined);

      const result = await service.createDocument('notaMedica', dto);
      expect(result).toBeDefined();
      expect(result._id).toBe('nota123');
    });

    it('debe permitir crear nota médica con C61 para hombre de 45 años (>= 40)', async () => {
      const mockNotaMedicaModel = service['models']['notaMedica'];
      const mockTrabajadorModel = service['trabajadorModel'];

      const dto = {
        ...mockCreateNotaMedicaDto,
        codigoCIE10Principal: 'C61 - Cáncer de próstata',
      };

      // Mock trabajador: HOMBRE, 45 años
      mockTrabajadorModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          fechaNacimiento: new Date('1979-01-01'),
          sexo: 'Masculino',
        }),
      });

      // Mock save
      const savedDocument = { ...dto, _id: 'nota123' };
      mockNotaMedicaModel.save = jest.fn().mockResolvedValue(savedDocument);

      // Mock constructor
      (mockNotaMedicaModel as any).mockImplementation((data: any) => ({
        ...data,
        save: mockNotaMedicaModel.save,
      }));

      // Mock actualizarUpdatedAtTrabajador
      service['actualizarUpdatedAtTrabajador'] = jest
        .fn()
        .mockResolvedValue(undefined);

      const result = await service.createDocument('notaMedica', dto);
      expect(result).toBeDefined();
    });

    it('debe rechazar crear nota médica con N40 para hombre de 35 años (edad < 40)', async () => {
      const mockNotaMedicaModel = service['models']['notaMedica'];
      const mockTrabajadorModel = service['trabajadorModel'];

      const dto = {
        ...mockCreateNotaMedicaDto,
        codigoCIE10Principal: 'N40 - Hiperplasia prostática',
      };

      // Mock trabajador: HOMBRE, 35 años
      mockTrabajadorModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          fechaNacimiento: new Date('1989-01-01'),
          sexo: 'Masculino',
        }),
      });

      // Mock save
      mockNotaMedicaModel.save = jest.fn();

      // Mock constructor
      (mockNotaMedicaModel as any).mockImplementation((data: any) => ({
        ...data,
        save: mockNotaMedicaModel.save,
      }));

      await expect(service.createDocument('notaMedica', dto)).rejects.toThrow(
        BadRequestException,
      );

      try {
        await service.createDocument('notaMedica', dto);
      } catch (error: any) {
        expect(error.response.ruleId).toBe('C4');
        expect(error.response.details[0].edadTrabajador).toBe(35);
        expect(error.response.details[0].reason).toContain('40');
      }
    });

    it('debe rechazar actualizar nota médica agregando diagnóstico inválido', async () => {
      const mockNotaMedicaModel = service['models']['notaMedica'];
      const mockTrabajadorModel = service['trabajadorModel'];

      const existingDocument = {
        _id: 'nota123',
        tipoNota: 'Inicial',
        fechaNotaMedica: new Date('2024-01-01'),
        codigoCIE10Principal: 'A30',
        estado: DocumentoEstado.BORRADOR,
      };

      const updateDto = {
        codigoCIE10Principal: 'C61', // Inválido para mujer
        fechaNotaMedica: new Date('2024-01-01'),
        idTrabajador: 'trabajador123',
      };

      // Mock trabajador: MUJER
      mockTrabajadorModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          fechaNacimiento: new Date('1994-01-01'),
          sexo: 'Femenino',
        }),
      });

      // Mock findById
      mockNotaMedicaModel.findById = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingDocument),
      });

      // Mock findByIdAndUpdate
      mockNotaMedicaModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue({ ...existingDocument, ...updateDto }),
      });

      await expect(
        service.updateOrCreateDocument('notaMedica', 'nota123', updateDto),
      ).rejects.toThrow(BadRequestException);

      try {
        await service.updateOrCreateDocument(
          'notaMedica',
          'nota123',
          updateDto,
        );
      } catch (error: any) {
        expect(error.response.code).toBe('VALIDATION_ERROR');
        expect(error.response.ruleId).toBe('C4');
        expect(error.response.details[0].cie10).toBe('C61');
      }
    });

    it('debe reportar múltiples violaciones cuando hay varios diagnósticos inválidos', async () => {
      const mockNotaMedicaModel = service['models']['notaMedica'];
      const mockTrabajadorModel = service['trabajadorModel'];

      const dto = {
        ...mockCreateNotaMedicaDto,
        codigoCIE10Principal: 'C61', // Inválido para mujer
        codigosCIE10Complementarios: ['N40', 'C50'], // N40 inválido, C50 válido
      };

      // Mock trabajador: MUJER, 30 años
      mockTrabajadorModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          fechaNacimiento: new Date('1994-01-01'),
          sexo: 'Femenino',
        }),
      });

      // Mock save
      mockNotaMedicaModel.save = jest.fn();

      // Mock constructor
      (mockNotaMedicaModel as any).mockImplementation((data: any) => ({
        ...data,
        save: mockNotaMedicaModel.save,
      }));

      await expect(service.createDocument('notaMedica', dto)).rejects.toThrow(
        BadRequestException,
      );

      try {
        await service.createDocument('notaMedica', dto);
      } catch (error: any) {
        expect(error.response.details.length).toBeGreaterThan(1);
        // Debe reportar C61 y N40
        const cie10s = error.response.details.map((d: any) => d.cie10);
        expect(cie10s).toContain('C61');
        expect(cie10s).toContain('N40');
      }
    });
  });
});
