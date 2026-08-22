import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { EnfermerasFirmantesService } from './enfermeras-firmantes.service';
import { CreateEnfermeraFirmanteDto } from './dto/create-enfermera-firmante.dto';
import { EnfermeraFirmante } from './schemas/enfermera-firmante.schema';
import { User } from '../users/schemas/user.schema';
import { ProveedorSalud } from '../proveedores-salud/schemas/proveedor-salud.schema';
import {
  RegulatoryPolicyService,
  RegulatoryPolicy,
} from '../../utils/regulatory-policy.service';
import { CatalogsService } from '../catalogs/catalogs.service';
import { GeographyValidator } from '../catalogs/validators/geography.validator';
import { ClinicalAttentionQueryService } from '../expedientes/services/clinical-attention-query.service';

describe('EnfermerasFirmantesService', () => {
  let service: EnfermerasFirmantesService;
  let mockEnfermeraFirmanteModel: any;
  let mockUserModel: any;
  let mockProveedorSaludModel: any;
  let mockRegulatoryPolicyService: jest.Mocked<RegulatoryPolicyService>;
  let mockCatalogsService: jest.Mocked<CatalogsService>;
  let mockGeographyValidator: jest.Mocked<GeographyValidator>;

  const defaultPaisNacimiento = 142;

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

  const validCURP = 'GALJ900515MDFRPN08';
  const invalidCURPFormat = 'INVALID123';
  const mxUserId = '507f1f77bcf86cd799439011';
  const nonMxUserId = '507f1f77bcf86cd799439022';
  const mxProveedorId = '507f1f77bcf86cd799439033';
  const nonMxProveedorId = '507f1f77bcf86cd799439044';

  const getFechaNacimientoYearsAgo = (years: number): string => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - years);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };

  const getFechaNacimientoYearsAgoMinusOneDay = (years: number): string => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - years);
    d.setDate(d.getDate() - 1);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };

  const validFechaNacimiento = getFechaNacimientoYearsAgo(45);

  const siresDemographics = {
    paisNacimiento: defaultPaisNacimiento,
    paisResidencia: defaultPaisNacimiento,
    sexo: 'Femenino',
    entidadNacimiento: '09',
    entidadResidencia: '09',
    municipioResidencia: '001',
    localidadResidencia: '0001',
    fechaNacimiento: '1990-05-15',
    nombre: 'JUAN',
    primerApellido: 'GARCIA',
    segundoApellido: 'LOPEZ',
  };

  beforeEach(async () => {
    mockEnfermeraFirmanteModel = {
      ...createMockModel(),
    };

    const MockEnfermeraModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      save: jest.fn().mockResolvedValue({ ...dto, _id: 'new-id' }),
    }));
    Object.assign(MockEnfermeraModel, mockEnfermeraFirmanteModel);

    mockUserModel = createMockModel();
    mockProveedorSaludModel = createMockModel();
    mockRegulatoryPolicyService = {
      getRegulatoryPolicy: jest.fn(),
    } as any;
    mockCatalogsService = {
      validateINEGI: jest.fn().mockResolvedValue(true),
      validateGIISPais: jest.fn().mockReturnValue({
        valid: true,
        catalogLoaded: true,
      }),
    } as any;
    mockGeographyValidator = {
      validateGeography: jest.fn().mockResolvedValue({ valid: true, errors: [] }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnfermerasFirmantesService,
        {
          provide: getModelToken(EnfermeraFirmante.name),
          useValue: MockEnfermeraModel,
        },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        {
          provide: getModelToken(ProveedorSalud.name),
          useValue: mockProveedorSaludModel,
        },
        {
          provide: RegulatoryPolicyService,
          useValue: mockRegulatoryPolicyService,
        },
        {
          provide: CatalogsService,
          useValue: mockCatalogsService,
        },
        {
          provide: GeographyValidator,
          useValue: mockGeographyValidator,
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

    service = module.get<EnfermerasFirmantesService>(
      EnfermerasFirmantesService,
    );
  });

  describe('NOM-024 CURP Validation', () => {
    describe('MX Provider (pais === MX)', () => {
      beforeEach(() => {
        mockUserModel.findById.mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: mxUserId,
            idProveedorSalud: mxProveedorId,
          }),
        });
        mockProveedorSaludModel.findById.mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: mxProveedorId,
            pais: 'MX',
          }),
        });
        mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue({
          regime: 'SIRES_NOM024',
          features: {} as any,
          validation: {
            curpFirmantes: 'required',
            workerCurp: 'required_strict',
            cie10Principal: 'required',
            geoFields: 'required',
          },
        });
      });

      it('should require CURP for MX providers', async () => {
        const dto = {
          nombre: 'María López',
          idUser: mxUserId,
          ...siresDemographics,
        };

        await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
      });

      it('should accept valid CURP for MX providers', async () => {
        const dto = {
          nombre: 'María López',
          idUser: mxUserId,
          curp: validCURP,
          ...siresDemographics,
        };

        const result = await service.create(dto as any);
        expect(result).toBeDefined();
        expect(result._id).toBe('new-id');
      });

      it('should reject invalid CURP format for MX providers', async () => {
        const dto = {
          nombre: 'María López',
          idUser: mxUserId,
          curp: invalidCURPFormat,
          ...siresDemographics,
        };

        await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
      });
    });

    describe('Non-MX Provider (pais !== MX)', () => {
      beforeEach(() => {
        mockUserModel.findById.mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: nonMxUserId,
            idProveedorSalud: nonMxProveedorId,
          }),
        });
        mockProveedorSaludModel.findById.mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: nonMxProveedorId,
            pais: 'PA',
          }),
        });
        mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue({
          regime: 'SIN_REGIMEN',
          features: {} as any,
          validation: {
            curpFirmantes: 'optional',
            workerCurp: 'optional',
            cie10Principal: 'optional',
            geoFields: 'optional',
          },
        });
      });

      it('should allow creation without CURP for non-MX providers', async () => {
        const dto = {
          nombre: 'Ana Rodríguez',
          idUser: nonMxUserId,
          paisNacimiento: defaultPaisNacimiento,
          fechaNacimiento: validFechaNacimiento,
        };

        const result = await service.create(dto as any);
        expect(result).toBeDefined();
        expect(result._id).toBe('new-id');
      });

      it('should accept valid CURP for non-MX providers (optional)', async () => {
        const dto = {
          nombre: 'Ana Rodríguez',
          idUser: nonMxUserId,
          curp: validCURP,
          paisNacimiento: defaultPaisNacimiento,
          fechaNacimiento: validFechaNacimiento,
        };

        const result = await service.create(dto as any);
        expect(result).toBeDefined();
      });

      it('should reject invalid CURP even for non-MX providers when provided', async () => {
        const dto = {
          nombre: 'Ana Rodríguez',
          idUser: nonMxUserId,
          curp: invalidCURPFormat,
          paisNacimiento: defaultPaisNacimiento,
          fechaNacimiento: validFechaNacimiento,
        };

        await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
      });
    });

    describe('Update Operations', () => {
      it('should validate CURP on update for MX providers', async () => {
        mockUserModel.findById.mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: mxUserId,
            idProveedorSalud: mxProveedorId,
          }),
        });
        mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue({
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
            workerIdentificationImmutable: true,
          },
          validation: {
            curpFirmantes: 'required',
            workerCurp: 'required_strict',
            cie10Principal: 'required',
            geoFields: 'required',
          },
        });

        mockEnfermeraFirmanteModel.findById.mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: 'existing-id',
            nombre: 'JUAN',
            primerApellido: 'GARCIA',
            segundoApellido: 'LOPEZ',
            idUser: mxUserId,
            curp: validCURP,
            paisNacimiento: defaultPaisNacimiento,
            paisResidencia: defaultPaisNacimiento,
            sexo: 'Femenino',
            entidadNacimiento: '09',
            entidadResidencia: '09',
            municipioResidencia: '001',
            localidadResidencia: '0001',
            fechaNacimiento: new Date(siresDemographics.fechaNacimiento),
            toObject() {
              return { ...this };
            },
          }),
        });

        mockEnfermeraFirmanteModel.findByIdAndUpdate.mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: 'existing-id',
            tituloProfesional: 'Enf.',
            curp: validCURP,
          }),
        });

        const updateDto = {
          tituloProfesional: 'Enf.',
        };

        const result = await service.update('existing-id', updateDto);
        expect(result).toBeDefined();
      });
    });
  });

  describe('CURP Validation - Regulatory Policy', () => {
    const siresProveedorId = '507f1f77bcf86cd799439055';
    const sinRegimenProveedorId = '507f1f77bcf86cd799439066';
    const siresUserId = '507f1f77bcf86cd799439077';
    const sinRegimenUserId = '507f1f77bcf86cd799439088';

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
        dailyConsentEnabled: true,
        workerIdentificationImmutable: true,
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
        dailyConsentEnabled: false,
        workerIdentificationImmutable: false,
      },
      validation: {
        curpFirmantes: 'optional',
        workerCurp: 'optional',
        cie10Principal: 'optional',
        geoFields: 'optional',
      },
    });

    describe('SIRES_NOM024 - CURP Required', () => {
      beforeEach(() => {
        mockUserModel.findById.mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: siresUserId,
            idProveedorSalud: siresProveedorId,
          }),
        });
        mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(
          createSiresPolicy(),
        );
      });

      it('should require CURP for SIRES_NOM024', async () => {
        const dto = {
          nombre: 'Enf. María López',
          idUser: siresUserId,
          ...siresDemographics,
        };

        await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
      });

      it('should accept valid CURP for SIRES_NOM024', async () => {
        const dto = {
          nombre: 'Enf. María López',
          idUser: siresUserId,
          curp: validCURP,
          ...siresDemographics,
        };

        const result = await service.create(dto as any);
        expect(result).toBeDefined();
        expect(
          mockRegulatoryPolicyService.getRegulatoryPolicy,
        ).toHaveBeenCalledWith(siresProveedorId);
      });

      it('should reject generic CURP for SIRES_NOM024 firmantes born in Mexico', async () => {
        const dto = {
          nombre: 'Enf. María López',
          idUser: siresUserId,
          curp: 'XXXX999999XXXXXX99',
          ...siresDemographics,
        };

        await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
        await expect(service.create(dto as any)).rejects.toThrow(/genérica/i);
      });

      it('should accept generic CURP for SIRES_NOM024 firmantes born abroad', async () => {
        const dto = {
          nombre: 'Enf. María López',
          idUser: siresUserId,
          curp: 'XXXX999999XXXXXX99',
          ...siresDemographics,
          paisNacimiento: 246,
          entidadNacimiento: '88',
          sexoCURP: 2,
        };

        const result = await service.create(dto as any);
        expect(result).toBeDefined();
      });

      it('should reject invalid CURP format for SIRES_NOM024', async () => {
        const dto = {
          nombre: 'Enf. María López',
          idUser: siresUserId,
          curp: invalidCURPFormat,
          ...siresDemographics,
        };

        await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
      });

      it('should require paisNacimiento', async () => {
        const dto = {
          nombre: 'Enf. María López',
          idUser: siresUserId,
          fechaNacimiento: validFechaNacimiento,
        } as CreateEnfermeraFirmanteDto;

        await expect(service.create(dto as any)).rejects.toThrow(
          'El país de nacimiento es obligatorio',
        );
      });

      it('should require entidadResidencia for SIRES_NOM024', async () => {
        const dto = {
          nombre: 'Enf. María López',
          idUser: siresUserId,
          curp: validCURP,
          paisNacimiento: defaultPaisNacimiento,
          sexo: 'Femenino',
          entidadNacimiento: '09',
          fechaNacimiento: siresDemographics.fechaNacimiento,
        };

        await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
      });

      it('should require paisResidencia for SIRES_NOM024', async () => {
        const dto = {
          nombre: 'Enf. María López',
          idUser: siresUserId,
          curp: validCURP,
          paisNacimiento: defaultPaisNacimiento,
          sexo: 'Femenino',
          entidadNacimiento: '09',
          entidadResidencia: '09',
          municipioResidencia: '001',
          localidadResidencia: '0001',
          fechaNacimiento: siresDemographics.fechaNacimiento,
        };

        await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
      });

      it('should accept valid residency fields for SIRES_NOM024', async () => {
        const dto = {
          nombre: 'Enf. María López',
          idUser: siresUserId,
          curp: validCURP,
          ...siresDemographics,
        };

        const result = await service.create(dto as any);
        expect(result).toBeDefined();
        expect(mockGeographyValidator.validateGeography).toHaveBeenCalled();
      });
    });

    describe('SIN_REGIMEN - CURP Optional', () => {
      beforeEach(() => {
        mockUserModel.findById.mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: sinRegimenUserId,
            idProveedorSalud: sinRegimenProveedorId,
          }),
        });
        mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(
          createSinRegimenPolicy(),
        );
      });

      it('should allow creation without CURP for SIN_REGIMEN', async () => {
        const dto = {
          nombre: 'Enf. Ana García',
          idUser: sinRegimenUserId,
          paisNacimiento: defaultPaisNacimiento,
          fechaNacimiento: validFechaNacimiento,
        };

        const result = await service.create(dto as any);
        expect(result).toBeDefined();
        expect(
          mockRegulatoryPolicyService.getRegulatoryPolicy,
        ).toHaveBeenCalledWith(sinRegimenProveedorId);
      });

      it('should reject invalid CURP even for SIN_REGIMEN when provided', async () => {
        const dto = {
          nombre: 'Enf. Ana García',
          idUser: sinRegimenUserId,
          curp: invalidCURPFormat,
          paisNacimiento: defaultPaisNacimiento,
          fechaNacimiento: validFechaNacimiento,
        };

        await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('fechaNacimiento validation', () => {
    beforeEach(() => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: nonMxUserId,
          idProveedorSalud: nonMxProveedorId,
        }),
      });
      mockProveedorSaludModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: nonMxProveedorId,
          pais: 'PA',
        }),
      });
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
          workerIdentificationImmutable: false,
        },
        validation: {
          curpFirmantes: 'optional',
          workerCurp: 'optional',
          cie10Principal: 'optional',
          geoFields: 'optional',
        },
      });
    });

    it('should reject create without fechaNacimiento', async () => {
      const dto = {
        nombre: 'Enf. Sin Fecha',
        idUser: nonMxUserId,
      } as any;

      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto as any)).rejects.toThrow(
        'La fecha de nacimiento es obligatoria',
      );
    });

    it('should reject edad menor a 18 años', async () => {
      const dto = {
        nombre: 'Enf. Joven',
        idUser: nonMxUserId,
        paisNacimiento: defaultPaisNacimiento,
        fechaNacimiento: getFechaNacimientoYearsAgo(17),
      };

      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto as any)).rejects.toThrow(
        'incluyendo meses y días',
      );
    });

    it('should reject edad mayor a 90 años exactos (90a 0m 1d)', async () => {
      const dto = {
        nombre: 'Enf. Anciana',
        idUser: nonMxUserId,
        paisNacimiento: defaultPaisNacimiento,
        fechaNacimiento: getFechaNacimientoYearsAgoMinusOneDay(90),
      };

      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto as any)).rejects.toThrow(
        'incluyendo meses y días',
      );
    });

    it('should reject edad mayor a 90 años', async () => {
      const dto = {
        nombre: 'Enf. Anciana',
        idUser: nonMxUserId,
        paisNacimiento: defaultPaisNacimiento,
        fechaNacimiento: getFechaNacimientoYearsAgo(91),
      };

      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto as any)).rejects.toThrow(
        'incluyendo meses y días',
      );
    });

    it('should accept edad within range', async () => {
      const dto = {
        nombre: 'Enf. Válida',
        idUser: nonMxUserId,
        paisNacimiento: defaultPaisNacimiento,
        fechaNacimiento: validFechaNacimiento,
      };

      const result = await service.create(dto as any);
      expect(result).toBeDefined();
    });

    it('should accept exactly 18 years old today', async () => {
      const dto = {
        nombre: 'Enf. 18 años',
        idUser: nonMxUserId,
        paisNacimiento: defaultPaisNacimiento,
        fechaNacimiento: getFechaNacimientoYearsAgo(18),
      };

      const result = await service.create(dto as any);
      expect(result).toBeDefined();
    });

    it('should accept exactly 90 years old today', async () => {
      const dto = {
        nombre: 'Enf. 90 años',
        idUser: nonMxUserId,
        paisNacimiento: defaultPaisNacimiento,
        fechaNacimiento: getFechaNacimientoYearsAgo(90),
      };

      const result = await service.create(dto as any);
      expect(result).toBeDefined();
    });

    it('should reject update when existing record has no fechaNacimiento and dto omits it', async () => {
      const existingId = '507f1f77bcf86cd799439099';
      mockEnfermeraFirmanteModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: existingId,
          idUser: nonMxUserId,
          nombre: 'Enf. Legacy',
        }),
      });

      await expect(
        service.update(existingId, {
          nombre: 'Enf. Legacy',
          idUser: nonMxUserId,
        }),
      ).rejects.toThrow('La fecha de nacimiento es obligatoria');
    });
  });
});
