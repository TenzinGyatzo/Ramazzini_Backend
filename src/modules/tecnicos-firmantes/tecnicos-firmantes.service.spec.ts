import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TecnicosFirmantesService } from './tecnicos-firmantes.service';
import { TecnicoFirmante } from './schemas/tecnico-firmante.schema';
import { User } from '../users/schemas/user.schema';
import { ProveedorSalud } from '../proveedores-salud/schemas/proveedor-salud.schema';
import {
  RegulatoryPolicyService,
  RegulatoryPolicy,
} from '../../utils/regulatory-policy.service';
import { CatalogsService } from '../catalogs/catalogs.service';
import { GeographyValidator } from '../catalogs/validators/geography.validator';
import { ClinicalAttentionQueryService } from '../expedientes/services/clinical-attention-query.service';

describe('TecnicosFirmantesService', () => {
  let service: TecnicosFirmantesService;
  let mockTecnicoModel: any;
  let mockUserModel: any;
  let mockRegulatoryPolicyService: jest.Mocked<RegulatoryPolicyService>;

  const defaultPaisNacimiento = 142;
  const mxUserId = '507f1f77bcf86cd799439011';
  const mxProveedorId = '507f1f77bcf86cd799439033';
  const validCURP = 'GALJ900515HDFRPN08';

  const createMockModel = () => ({
    findById: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    findOne: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
    findByIdAndUpdate: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    findByIdAndDelete: jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
  });

  const getFechaNacimientoYearsAgo = (years: number): string => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - years);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };

  const validFechaNacimiento = getFechaNacimientoYearsAgo(45);

  beforeEach(async () => {
    mockTecnicoModel = {
      ...createMockModel(),
      constructor: jest.fn().mockImplementation(function (dto) {
        return {
          ...dto,
          save: jest.fn().mockResolvedValue({ ...dto, _id: 'new-id' }),
        };
      }),
    };

    const MockTecnicoModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      save: jest.fn().mockResolvedValue({ ...dto, _id: 'new-id' }),
    }));
    Object.assign(MockTecnicoModel, mockTecnicoModel);

    mockUserModel = createMockModel();
    mockRegulatoryPolicyService = {
      getRegulatoryPolicy: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TecnicosFirmantesService,
        {
          provide: getModelToken(TecnicoFirmante.name),
          useValue: MockTecnicoModel,
        },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        {
          provide: getModelToken(ProveedorSalud.name),
          useValue: createMockModel(),
        },
        {
          provide: RegulatoryPolicyService,
          useValue: mockRegulatoryPolicyService,
        },
        {
          provide: CatalogsService,
          useValue: {
            validateINEGI: jest.fn().mockResolvedValue(true),
            validateGIISPais: jest.fn().mockReturnValue({
              valid: true,
              catalogLoaded: true,
            }),
          },
        },
        {
          provide: GeographyValidator,
          useValue: {
            validateGeography: jest
              .fn()
              .mockResolvedValue({ valid: true, errors: [] }),
          },
        },
        {
          provide: ClinicalAttentionQueryService,
          useValue: {
            hasFinalizedClinicalDocumentByUser: jest.fn().mockResolvedValue(false),
            withFirmanteAttentionFlag: jest.fn(async (doc) =>
              doc
                ? { ...doc, tieneDocumentoClinicoFinalizado: false }
                : doc,
            ),
          },
        },
      ],
    }).compile();

    service = module.get<TecnicosFirmantesService>(TecnicosFirmantesService);

    mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue({
      regime: 'SIN_REGIMEN',
      features: {
        sessionTimeoutEnabled: false,
        enforceDocumentImmutabilityUI: false,
        documentImmutabilityEnabled: false,
        showSiresUI: false,
        giisExportEnabled: false,
        notaAclaratoriaEnabled: false,
        cluesFieldVisible: false,
        dailyConsentEnabled: false,
        confidentialityAgreementEnabled: false,
        workerIdentificationImmutable: false,
        auditTrailEnabled: false,
        controlPrenatalEnabled: true,
      },
      validation: {
        curpFirmantes: 'optional',
        workerCurp: 'optional',
        cie10Principal: 'optional',
        geoFields: 'optional',
      },
    });
  });

  describe('identification immutability (SIRES_NOM024)', () => {
    const siresPolicy: RegulatoryPolicy = {
      regime: 'SIRES_NOM024',
      features: {
        sessionTimeoutEnabled: true,
        enforceDocumentImmutabilityUI: true,
        documentImmutabilityEnabled: true,
        showSiresUI: true,
        giisExportEnabled: true,
        notaAclaratoriaEnabled: true,
        cluesFieldVisible: true,
        dailyConsentEnabled: true,
        confidentialityAgreementEnabled: true,
        workerIdentificationImmutable: true,
        auditTrailEnabled: true,
        controlPrenatalEnabled: false,
      },
      validation: {
        curpFirmantes: 'required',
        workerCurp: 'required_strict',
        cie10Principal: 'required',
        geoFields: 'required',
      },
    };

    const existingId = '507f1f77bcf86cd799439088';
    const existingFirmante = {
      _id: existingId,
      idUser: mxUserId,
      curp: validCURP,
      nombre: 'JUAN',
      primerApellido: 'GARCIA',
      segundoApellido: 'LOPEZ',
      sexo: 'Masculino',
      entidadNacimiento: '09',
      paisNacimiento: defaultPaisNacimiento,
      paisResidencia: defaultPaisNacimiento,
      entidadResidencia: '09',
      municipioResidencia: '001',
      localidadResidencia: '0001',
      fechaNacimiento: new Date('1990-05-15'),
      toObject() {
        return { ...this };
      },
    };

    beforeEach(() => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: mxUserId,
          idProveedorSalud: mxProveedorId,
        }),
      });
      mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(
        siresPolicy,
      );
      mockTecnicoModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingFirmante),
      });
    });

    it('should reject update that changes primerApellido when CURP is real', async () => {
      await expect(
        service.update(existingId, {
          idUser: mxUserId,
          primerApellido: 'PEREZ',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow update of non-identification fields', async () => {
      mockTecnicoModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...existingFirmante,
          tituloProfesional: 'Tec.',
        }),
      });

      const result = await service.update(existingId, {
        idUser: mxUserId,
        tituloProfesional: 'Tec.',
      });

      expect(result.tituloProfesional).toBe('Tec.');
    });

    it('should preserve nombre when update only sends tituloProfesional with stored values', async () => {
      mockTecnicoModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...existingFirmante,
          tituloProfesional: 'Tec.',
        }),
      });

      await service.update(existingId, {
        idUser: mxUserId,
        nombre: 'JUAN',
        primerApellido: 'GARCIA',
        tituloProfesional: 'Tec.',
      });

      const updatePayload = mockTecnicoModel.findByIdAndUpdate.mock.calls[0][1];
      expect(updatePayload.nombre).toBe('JUAN');
      expect(updatePayload.primerApellido).toBe('GARCIA');
    });
  });

  describe('fechaNacimiento validation', () => {
    it('should reject create without fechaNacimiento', async () => {
      await expect(
        service.create({
          nombre: 'Tec. Sin Fecha',
          primerApellido: 'PEREZ',
          idUser: mxUserId,
          paisNacimiento: defaultPaisNacimiento,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept create with valid fechaNacimiento', async () => {
      const result = await service.create({
        nombre: 'Tec. Válido',
        primerApellido: 'PEREZ',
        idUser: mxUserId,
        paisNacimiento: defaultPaisNacimiento,
        fechaNacimiento: validFechaNacimiento,
      } as any);

      expect(result).toBeDefined();
    });
  });
});
