import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MedicosFirmantesService } from './medicos-firmantes.service';
import { CreateMedicoFirmanteDto } from './dto/create-medico-firmante.dto';
import { MedicoFirmante } from './schemas/medico-firmante.schema';
import { User } from '../users/schemas/user.schema';
import { ProveedorSalud } from '../proveedores-salud/schemas/proveedor-salud.schema';
import {
  RegulatoryPolicyService,
  RegulatoryPolicy,
} from '../../utils/regulatory-policy.service';
import { CatalogsService } from '../catalogs/catalogs.service';
import { GeographyValidator } from '../catalogs/validators/geography.validator';

describe('MedicosFirmantesService', () => {
  let service: MedicosFirmantesService;
  let mockMedicoFirmanteModel: any;
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

  const validCURP = 'GALJ900515HDFRPN08';
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

  const validFechaNacimiento = getFechaNacimientoYearsAgo(45);

  const siresDemographics = {
    paisNacimiento: defaultPaisNacimiento,
    paisResidencia: defaultPaisNacimiento,
    sexo: 'Masculino',
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
    mockMedicoFirmanteModel = {
      ...createMockModel(),
      constructor: jest.fn().mockImplementation(function (dto) {
        return {
          ...dto,
          save: jest.fn().mockResolvedValue({ ...dto, _id: 'new-id' }),
        };
      }),
    };

    // Mock constructor for create operations
    const MockMedicoModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      save: jest.fn().mockResolvedValue({ ...dto, _id: 'new-id' }),
    }));
    Object.assign(MockMedicoModel, mockMedicoFirmanteModel);

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
        MedicosFirmantesService,
        {
          provide: getModelToken(MedicoFirmante.name),
          useValue: MockMedicoModel,
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
      ],
    }).compile();

    service = module.get<MedicosFirmantesService>(MedicosFirmantesService);
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
          nombre: 'Dr. Juan Pérez',
          idUser: mxUserId,
          paisNacimiento: defaultPaisNacimiento,
          sexo: 'Masculino',
          entidadNacimiento: '09',
          fechaNacimiento: siresDemographics.fechaNacimiento,
        };

        await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
      });

      it('should accept valid CURP for MX providers', async () => {
        const dto = {
          nombre: 'Dr. Juan Pérez',
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
          nombre: 'Dr. Juan Pérez',
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
            pais: 'GT',
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
          nombre: 'Dr. Carlos García',
          idUser: nonMxUserId,
          paisNacimiento: defaultPaisNacimiento,
          fechaNacimiento: validFechaNacimiento,
          // No curp - should be allowed for non-MX
        };

        const result = await service.create(dto as any);
        expect(result).toBeDefined();
        expect(result._id).toBe('new-id');
      });

      it('should accept valid CURP for non-MX providers (optional)', async () => {
        const dto = {
          nombre: 'Dr. Carlos García',
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
          nombre: 'Dr. Carlos García',
          idUser: nonMxUserId,
          curp: invalidCURPFormat,
          paisNacimiento: defaultPaisNacimiento,
          fechaNacimiento: validFechaNacimiento,
        };

        await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
      });
    });

    describe('Edge Cases', () => {
      it('should handle user without provider gracefully', async () => {
        mockUserModel.findById.mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: 'orphan-user',
            idProveedorSalud: null,
          }),
        });

        const dto = {
          nombre: 'Dr. Orphan User',
          idUser: 'orphan-user',
          paisNacimiento: defaultPaisNacimiento,
          fechaNacimiento: validFechaNacimiento,
          // No curp - should be allowed since no provider = not MX
        };

        const result = await service.create(dto as any);
        expect(result).toBeDefined();
      });

      it('should handle non-existent user gracefully', async () => {
        mockUserModel.findById.mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        });

        const dto = {
          nombre: 'Dr. Ghost User',
          idUser: 'non-existent-user',
          paisNacimiento: defaultPaisNacimiento,
          fechaNacimiento: validFechaNacimiento,
          // No curp - should be allowed since user not found = not MX
        };

        const result = await service.create(dto as any);
        expect(result).toBeDefined();
      });

      it('should normalize CURP to uppercase', async () => {
        mockUserModel.findById.mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: nonMxUserId,
            idProveedorSalud: nonMxProveedorId,
          }),
        });
        mockProveedorSaludModel.findById.mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: nonMxProveedorId,
            pais: 'GT',
          }),
        });

        const dto = {
          nombre: 'Dr. Test',
          idUser: nonMxUserId,
          curp: validCURP.toLowerCase(), // Lowercase input
          paisNacimiento: defaultPaisNacimiento,
          fechaNacimiento: validFechaNacimiento,
        };

        const result = await service.create(dto as any);
        expect(result.curp).toBe(validCURP.toUpperCase());
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
          nombre: 'Dr. Juan Pérez',
          idUser: siresUserId,
          paisNacimiento: defaultPaisNacimiento,
          sexo: 'Masculino',
          entidadNacimiento: '09',
          fechaNacimiento: siresDemographics.fechaNacimiento,
        };

        await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
      });

      it('should accept valid CURP for SIRES_NOM024', async () => {
        const dto = {
          nombre: 'Dr. Juan Pérez',
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

      it('should reject generic CURP for SIRES_NOM024 firmantes', async () => {
        const dto = {
          nombre: 'Dr. Juan Pérez',
          idUser: siresUserId,
          curp: 'XXXX999999XXXXXX99',
          ...siresDemographics,
        };

        await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
        await expect(service.create(dto as any)).rejects.toThrow(/genérica/i);
      });

      it('should reject invalid CURP format for SIRES_NOM024', async () => {
        const dto = {
          nombre: 'Dr. Juan Pérez',
          idUser: siresUserId,
          curp: invalidCURPFormat,
          ...siresDemographics,
        };

        await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
      });

      it('should require paisNacimiento', async () => {
        const dto = {
          nombre: 'Dr. Juan Pérez',
          idUser: siresUserId,
            fechaNacimiento: validFechaNacimiento,
        } as CreateMedicoFirmanteDto;

        await expect(service.create(dto as any)).rejects.toThrow(
          'El país de nacimiento es obligatorio',
        );
      });

      it('should require entidadResidencia for SIRES_NOM024', async () => {
        const dto = {
          nombre: 'Dr. Juan Pérez',
          idUser: siresUserId,
          curp: validCURP,
          paisNacimiento: defaultPaisNacimiento,
          sexo: 'Masculino',
          entidadNacimiento: '09',
          fechaNacimiento: siresDemographics.fechaNacimiento,
        };

        await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
      });

      it('should require paisResidencia for SIRES_NOM024', async () => {
        const dto = {
          nombre: 'Dr. Juan Pérez',
          idUser: siresUserId,
          curp: validCURP,
          paisNacimiento: defaultPaisNacimiento,
          sexo: 'Masculino',
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
          nombre: 'Dr. Juan Pérez',
          idUser: siresUserId,
          curp: validCURP,
          ...siresDemographics,
        };

        const result = await service.create(dto as any);
        expect(result).toBeDefined();
        expect(mockGeographyValidator.validateGeography).toHaveBeenCalled();
      });

      it('should reject inconsistent residency hierarchy (A3)', async () => {
        mockGeographyValidator.validateGeography.mockResolvedValueOnce({
          valid: false,
          errors: [{ field: 'municipio', reason: 'Municipio inválido' }],
        });

        const dto = {
          nombre: 'Dr. Juan Pérez',
          idUser: siresUserId,
          curp: validCURP,
          ...siresDemographics,
        };

        await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
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
          nombre: 'Dr. Carlos García',
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

      it('should accept valid CURP for SIN_REGIMEN (optional)', async () => {
        const dto = {
          nombre: 'Dr. Carlos García',
          idUser: sinRegimenUserId,
          curp: validCURP,
          paisNacimiento: defaultPaisNacimiento,
          fechaNacimiento: validFechaNacimiento,
        };

        const result = await service.create(dto as any);
        expect(result).toBeDefined();
      });

      it('should reject invalid CURP even for SIN_REGIMEN when provided', async () => {
        const dto = {
          nombre: 'Dr. Carlos García',
          idUser: sinRegimenUserId,
          curp: invalidCURPFormat,
          paisNacimiento: defaultPaisNacimiento,
          fechaNacimiento: validFechaNacimiento,
        };

        await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
        // Should validate format even if optional
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
          pais: 'GT',
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
        nombre: 'Dr. Sin Fecha',
        idUser: nonMxUserId,
      } as any;

      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto as any)).rejects.toThrow(
        'La fecha de nacimiento es obligatoria',
      );
    });

    it('should reject edad menor a 18 años', async () => {
      const dto = {
        nombre: 'Dr. Joven',
        primerApellido: 'PEREZ',
        idUser: nonMxUserId,
        paisNacimiento: defaultPaisNacimiento,
        fechaNacimiento: getFechaNacimientoYearsAgo(17),
      };

      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto as any)).rejects.toThrow(
        'debe estar entre 18 y 90 años cumplidos',
      );
    });

    it('should reject edad mayor a 90 años', async () => {
      const dto = {
        nombre: 'Dr. Anciano',
        primerApellido: 'PEREZ',
        idUser: nonMxUserId,
        paisNacimiento: defaultPaisNacimiento,
        fechaNacimiento: getFechaNacimientoYearsAgo(91),
      };

      await expect(service.create(dto as any)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto as any)).rejects.toThrow(
        'debe estar entre 18 y 90 años cumplidos',
      );
    });

    it('should accept edad within range', async () => {
      const dto = {
        nombre: 'Dr. Válido',
        primerApellido: 'PEREZ',
        idUser: nonMxUserId,
        paisNacimiento: defaultPaisNacimiento,
          fechaNacimiento: validFechaNacimiento,
      };

      const result = await service.create(dto as any);
      expect(result).toBeDefined();
    });

    it('should accept exactly 18 years old today', async () => {
      const dto = {
        nombre: 'Dr. 18 años',
        primerApellido: 'PEREZ',
        idUser: nonMxUserId,
        paisNacimiento: defaultPaisNacimiento,
        fechaNacimiento: getFechaNacimientoYearsAgo(18),
      };

      const result = await service.create(dto as any);
      expect(result).toBeDefined();
    });

    it('should accept exactly 90 years old today', async () => {
      const dto = {
        nombre: 'Dr. 90 años',
        primerApellido: 'PEREZ',
        idUser: nonMxUserId,
        paisNacimiento: defaultPaisNacimiento,
        fechaNacimiento: getFechaNacimientoYearsAgo(90),
      };

      const result = await service.create(dto as any);
      expect(result).toBeDefined();
    });

    it('should reject update when existing record has no fechaNacimiento and dto omits it', async () => {
      const existingId = '507f1f77bcf86cd799439099';
      mockMedicoFirmanteModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: existingId,
          idUser: nonMxUserId,
          nombre: 'Dr. Legacy',
        }),
      });

      await expect(
        service.update(existingId, {
          nombre: 'Dr. Legacy',
          idUser: nonMxUserId,
        }),
      ).rejects.toThrow('La fecha de nacimiento es obligatoria');
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
        workerIdentificationImmutable: true,
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
      mockMedicoFirmanteModel.findById.mockReturnValue({
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
      mockMedicoFirmanteModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...existingFirmante,
          tituloProfesional: 'Dr.',
        }),
      });

      const result = await service.update(existingId, {
        idUser: mxUserId,
        tituloProfesional: 'Dr.',
      });

      expect(result.tituloProfesional).toBe('Dr.');
    });
  });
});
