import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ExpedientesService } from './expedientes.service';
import { NotaAclaratoria } from './schemas/nota-aclaratoria.schema';
import { NotaMedica } from './schemas/nota-medica.schema';
import { Trabajador } from '../trabajadores/schemas/trabajador.schema';
import { CentroTrabajo } from '../centros-trabajo/schemas/centro-trabajo.schema';
import { Empresa } from '../empresas/schemas/empresa.schema';
import { DocumentoEstado } from './enums/documento-estado.enum';
import {
  RegulatoryPolicyService,
  RegulatoryPolicy,
} from '../../utils/regulatory-policy.service';
import { NOM024ComplianceUtil } from '../../utils/nom024-compliance.util';
import { FilesService } from '../files/files.service';
import { CatalogsService } from '../catalogs/catalogs.service';
import { InformesService } from '../informes/informes.service';
import { ProveedoresSaludService } from '../proveedores-salud/proveedores-salud.service';
import { Cie10CatalogLookupService } from './services/cie10-catalog-lookup.service';
import { FichaSnapshotService } from './services/ficha-snapshot.service';

describe('ExpedientesService - Regulatory Policy Enforcement', () => {
  let service: ExpedientesService;
  let mockRegulatoryPolicyService: jest.Mocked<RegulatoryPolicyService>;
  let mockNom024Util: any;
  let mockCatalogsService: any;
  let mockProveedoresSaludService: any;

  // Factory functions para crear policies
  const createSiresPolicy = (): RegulatoryPolicy => ({
    regime: 'SIRES_NOM024',
    features: {
      sessionTimeoutEnabled: true,
      enforceDocumentImmutabilityUI: true,
      documentImmutabilityEnabled: true,
      showSiresUI: true,
      giisExportEnabled: true,
      notaAclaratoriaEnabled: true,
      cluesFieldVisible: true,
    },
    validation: {
      curpFirmantes: 'required',
      workerCurp: 'required_strict',
      cie10Principal: 'required',
      geoFields: 'required',
    },
  });

  const createSinRegimenPolicy = (): RegulatoryPolicy => ({
    regime: 'SIN_REGIMEN',
    features: {
      sessionTimeoutEnabled: false,
      enforceDocumentImmutabilityUI: false,
      documentImmutabilityEnabled: false,
      showSiresUI: false,
      giisExportEnabled: false,
      notaAclaratoriaEnabled: false,
      cluesFieldVisible: false,
    },
    validation: {
      curpFirmantes: 'optional',
      workerCurp: 'optional',
      cie10Principal: 'required',
      geoFields: 'optional',
    },
  });

  // Create mock model factory
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
    mockRegulatoryPolicyService = {
      getRegulatoryPolicy: jest.fn(),
    } as any;

    mockNom024Util = {
      requiresNOM024Compliance: jest.fn().mockResolvedValue(true),
    };

    mockCatalogsService = {
      validateCIE10: jest.fn().mockResolvedValue(true),
      searchCatalog: jest.fn().mockResolvedValue([]),
    };

    mockProveedoresSaludService = {
      findOne: jest.fn(),
    };

    const mockFilesService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
      renameFile: jest.fn(),
    };

    const mockInformesService = {
      regenerarInformeAlFinalizar: jest.fn().mockResolvedValue(undefined),
    };

    const mockCie10CatalogLookupService = {
      lookup: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpedientesService,
        {
          provide: getModelToken(NotaAclaratoria.name),
          useValue: createMockModel(),
        },
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
        {
          provide: RegulatoryPolicyService,
          useValue: mockRegulatoryPolicyService,
        },
        { provide: NOM024ComplianceUtil, useValue: mockNom024Util },
        { provide: CatalogsService, useValue: mockCatalogsService },
        { provide: FilesService, useValue: mockFilesService },
        { provide: InformesService, useValue: mockInformesService },
        {
          provide: FichaSnapshotService,
          useValue: { capturar: jest.fn().mockResolvedValue(null) },
        },
        {
          provide: ProveedoresSaludService,
          useValue: mockProveedoresSaludService,
        },
        {
          provide: Cie10CatalogLookupService,
          useValue: mockCie10CatalogLookupService,
        },
      ],
    }).compile();

    service = module.get<ExpedientesService>(ExpedientesService);
  });

  describe('Notas Aclaratorias - Regulatory Policy', () => {
    const trabajadorId = '507f1f77bcf86cd799439011';
    const centroTrabajoId = '507f1f77bcf86cd799439012';
    const empresaId = '507f1f77bcf86cd799439013';
    const proveedorSaludId = '507f1f77bcf86cd799439014';
    const documentoOrigenId = '507f1f77bcf86cd799439015';

    const createNotaAclaratoriaDto = {
      fechaNotaAclaratoria: new Date(),
      documentoOrigenId,
      documentoOrigenTipo: 'notaMedica',
      motivoAclaracion: 'Test motivo',
      descripcionAclaracion: 'Test descripción',
      alcanceAclaracion: 'ACLARA',
      impactoClinico: 'LEVE',
      idTrabajador: trabajadorId,
      rutaPDF: '/path/to/pdf',
      createdBy: '507f1f77bcf86cd799439016',
      updatedBy: '507f1f77bcf86cd799439016',
    };

    beforeEach(() => {
      // Setup mocks comunes
      const mockTrabajadorModel = service['trabajadorModel'];
      const mockCentroTrabajoModel = service['centroTrabajoModel'];
      const mockEmpresaModel = service['empresaModel'];
      const mockNotaMedicaModel = service['models']['notaMedica'];
      const mockNotaAclaratoriaModel = service['models']['notaAclaratoria'];

      mockTrabajadorModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: trabajadorId,
          idCentroTrabajo: centroTrabajoId,
        }),
      });

      mockCentroTrabajoModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: centroTrabajoId,
          idEmpresa: empresaId,
        }),
      });

      mockEmpresaModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: empresaId,
          idProveedorSalud: proveedorSaludId,
        }),
      });

      mockNotaMedicaModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: documentoOrigenId,
          estado: DocumentoEstado.FINALIZADO,
        }),
      });

      mockNotaAclaratoriaModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      // Mock save
      const mockSave = jest.fn().mockResolvedValue({
        ...createNotaAclaratoriaDto,
        _id: 'new-id',
        save: mockSave,
      });
      mockNotaAclaratoriaModel.constructor = jest
        .fn()
        .mockImplementation((dto) => ({
          ...dto,
          save: mockSave,
        }));
    });

    it('should allow nota aclaratoria creation for SIRES_NOM024 with FINALIZADO documento origen', async () => {
      mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(
        createSiresPolicy(),
      );

      const result = await service.createDocument(
        'notaAclaratoria',
        createNotaAclaratoriaDto,
      );

      expect(result).toBeDefined();
      expect(
        mockRegulatoryPolicyService.getRegulatoryPolicy,
      ).toHaveBeenCalledWith(proveedorSaludId);
    });

    it('should allow nota aclaratoria creation for SIRES_NOM024 with ANULADO documento origen', async () => {
      mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(
        createSiresPolicy(),
      );

      const mockNotaMedicaModel = service['models']['notaMedica'];
      mockNotaMedicaModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: documentoOrigenId,
          estado: DocumentoEstado.ANULADO,
        }),
      });

      const result = await service.createDocument(
        'notaAclaratoria',
        createNotaAclaratoriaDto,
      );

      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException for SIN_REGIMEN when creating nota aclaratoria', async () => {
      mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(
        createSinRegimenPolicy(),
      );

      await expect(
        service.createDocument('notaAclaratoria', createNotaAclaratoriaDto),
      ).rejects.toThrow(ForbiddenException);

      expect(
        mockRegulatoryPolicyService.getRegulatoryPolicy,
      ).toHaveBeenCalledWith(proveedorSaludId);
    });

    it('should throw BadRequestException when documento origen is not FINALIZADO or ANULADO', async () => {
      mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(
        createSiresPolicy(),
      );

      const mockNotaMedicaModel = service['models']['notaMedica'];
      mockNotaMedicaModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: documentoOrigenId,
          estado: DocumentoEstado.BORRADOR,
        }),
      });

      await expect(
        service.createDocument('notaAclaratoria', createNotaAclaratoriaDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Document Immutability - Regulatory Policy', () => {
    const trabajadorId = '507f1f77bcf86cd799439011';
    const proveedorSaludId = '507f1f77bcf86cd799439014';
    const documentoId = '507f1f77bcf86cd799439015';

    const updateDto = {
      fechaNotaMedica: new Date(),
      motivoConsulta: 'Updated motivo',
      idTrabajador: trabajadorId,
    };

    beforeEach(() => {
      const mockNotaMedicaModel = service['models']['notaMedica'];
      const mockTrabajadorModel = service['trabajadorModel'];

      mockTrabajadorModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: trabajadorId,
          fechaNacimiento: new Date('1990-01-01'),
          idCentroTrabajo: '507f1f77bcf86cd799439012',
        }),
      });

      // Mock getProveedorSaludIdFromDocument
      jest
        .spyOn(service as any, 'getProveedorSaludIdFromDocument')
        .mockResolvedValue(proveedorSaludId);
    });

    it('should throw ForbiddenException when updating FINALIZADO document for SIRES_NOM024', async () => {
      mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(
        createSiresPolicy(),
      );

      const mockNotaMedicaModel = service['models']['notaMedica'];
      const mockDocument = {
        _id: documentoId,
        estado: DocumentoEstado.FINALIZADO,
        fechaNotaMedica: new Date(),
        idTrabajador: trabajadorId,
        save: jest.fn().mockResolvedValue({}),
      };

      mockNotaMedicaModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDocument),
      });

      await expect(
        service.updateOrCreateDocument('notaMedica', documentoId, updateDto),
      ).rejects.toThrow(ForbiddenException);

      expect(
        mockRegulatoryPolicyService.getRegulatoryPolicy,
      ).toHaveBeenCalledWith(proveedorSaludId);
    });

    it('should throw ForbiddenException when updating ANULADO document for SIRES_NOM024', async () => {
      mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(
        createSiresPolicy(),
      );

      const mockNotaMedicaModel = service['models']['notaMedica'];
      const mockDocument = {
        _id: documentoId,
        estado: DocumentoEstado.ANULADO,
        fechaNotaMedica: new Date(),
        idTrabajador: trabajadorId,
        save: jest.fn().mockResolvedValue({}),
      };

      mockNotaMedicaModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDocument),
      });

      await expect(
        service.updateOrCreateDocument('notaMedica', documentoId, updateDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow updating FINALIZADO document for SIN_REGIMEN', async () => {
      mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(
        createSinRegimenPolicy(),
      );

      const mockNotaMedicaModel = service['models']['notaMedica'];
      const mockSave = jest.fn().mockResolvedValue({
        _id: documentoId,
        ...updateDto,
      });
      const mockDocument = {
        _id: documentoId,
        estado: DocumentoEstado.FINALIZADO,
        fechaNotaMedica: new Date(),
        idTrabajador: trabajadorId,
        save: mockSave,
      };

      mockNotaMedicaModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDocument),
      });

      // Mock validateVitalSignsForNOM024 to avoid errors
      jest
        .spyOn(service as any, 'validateVitalSignsForNOM024')
        .mockResolvedValue(undefined);

      const result = await service.updateOrCreateDocument(
        'notaMedica',
        documentoId,
        updateDto,
      );

      expect(result).toBeDefined();
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('CIE-10 Principal - Regulatory Policy', () => {
    const trabajadorId = '507f1f77bcf86cd799439011';
    const proveedorSaludId = '507f1f77bcf86cd799439014';

    beforeEach(() => {
      const mockTrabajadorModel = service['trabajadorModel'];
      mockTrabajadorModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: trabajadorId,
          fechaNacimiento: new Date('1990-01-01'),
          sexo: 'Masculino',
          idCentroTrabajo: '507f1f77bcf86cd799439012',
        }),
      });

      jest
        .spyOn(service as any, 'getProveedorSaludIdFromTrabajador')
        .mockResolvedValue(proveedorSaludId);
    });

    it('should require CIE-10 principal for SIRES_NOM024 when creating notaMedica', async () => {
      mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(
        createSiresPolicy(),
      );

      const mockNotaMedicaModel = service['models']['notaMedica'];
      const mockSave = jest.fn().mockResolvedValue({
        _id: 'new-id',
        codigoCIE10Principal: 'A30',
      });
      mockNotaMedicaModel.constructor = jest.fn().mockImplementation((dto) => ({
        ...dto,
        save: mockSave,
      }));

      const createDto = {
        tipoNota: 'Inicial',
        fechaNotaMedica: new Date(),
        motivoConsulta: 'Test motivo',
        idTrabajador: trabajadorId,
        createdBy: '507f1f77bcf86cd799439016',
        updatedBy: '507f1f77bcf86cd799439016',
        // No codigoCIE10Principal provided
      };

      await expect(
        service.createDocument('notaMedica', createDto),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createDocument('notaMedica', createDto),
      ).rejects.toThrow('Código CIE-10 principal es obligatorio');
    });

    it('should require CIE-10 principal for SIN_REGIMEN when creating notaMedica', async () => {
      mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(
        createSinRegimenPolicy(),
      );

      // Mock validateVitalSignsForNOM024
      jest
        .spyOn(service as any, 'validateVitalSignsForNOM024')
        .mockResolvedValue(undefined);

      const createDto = {
        tipoNota: 'Inicial',
        fechaNotaMedica: new Date(),
        motivoConsulta: 'Test motivo',
        idTrabajador: trabajadorId,
        createdBy: '507f1f77bcf86cd799439016',
        updatedBy: '507f1f77bcf86cd799439016',
        // No codigoCIE10Principal provided - should throw error
      };

      await expect(
        service.createDocument('notaMedica', createDto),
      ).rejects.toThrow();

      expect(
        mockRegulatoryPolicyService.getRegulatoryPolicy,
      ).toHaveBeenCalled();
    });
  });
});
