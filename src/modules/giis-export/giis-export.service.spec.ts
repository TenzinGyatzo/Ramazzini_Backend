import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException } from '@nestjs/common';
import { Model } from 'mongoose';
import { GIISExportService } from './giis-export.service';
import { Lesion } from '../expedientes/schemas/lesion.schema';
import { Trabajador } from '../trabajadores/schemas/trabajador.schema';
import { ProveedorSalud } from '../proveedores-salud/schemas/proveedor-salud.schema';
import { CentroTrabajo } from '../centros-trabajo/schemas/centro-trabajo.schema';
import { Empresa } from '../empresas/schemas/empresa.schema';
import {
  RegulatoryPolicyService,
  RegulatoryPolicy,
} from '../../utils/regulatory-policy.service';

describe('GIISExportService - Regulatory Policy Enforcement', () => {
  let service: GIISExportService;
  let mockRegulatoryPolicyService: jest.Mocked<RegulatoryPolicyService>;

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
      dailyConsentEnabled: false,
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
    },
    validation: {
      curpFirmantes: 'optional',
      workerCurp: 'optional',
      cie10Principal: 'optional',
      geoFields: 'optional',
    },
  });

  // Create mock model factory (chain: find/lean/exec)
  const createMockModel = () => ({
    find: jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    }),
    findById: jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    }),
  });

  beforeEach(async () => {
    mockRegulatoryPolicyService = {
      getRegulatoryPolicy: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GIISExportService,
        {
          provide: getModelToken(Lesion.name),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken(Trabajador.name),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken(ProveedorSalud.name),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken(CentroTrabajo.name),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken(Empresa.name),
          useValue: createMockModel(),
        },
        {
          provide: RegulatoryPolicyService,
          useValue: mockRegulatoryPolicyService,
        },
      ],
    }).compile();

    service = module.get<GIISExportService>(GIISExportService);
  });

  describe('exportLesionesGIIS - Regulatory Policy', () => {
    const proveedorSaludId = '507f1f77bcf86cd799439014';

    it('should throw ForbiddenException for SIN_REGIMEN', async () => {
      mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(
        createSinRegimenPolicy(),
      );

      await expect(
        service.exportLesionesGIIS({ proveedorSaludId }),
      ).rejects.toThrow(ForbiddenException);

      expect(
        mockRegulatoryPolicyService.getRegulatoryPolicy,
      ).toHaveBeenCalledWith(proveedorSaludId);
    });

    it('should allow export for SIRES_NOM024', async () => {
      mockRegulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(
        createSiresPolicy(),
      );

      // Mock empty results to avoid data processing errors
      const mockLesionModel = service['lesionModel'] as jest.Mocked<
        Model<Lesion>
      >;
      mockLesionModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await service.exportLesionesGIIS({ proveedorSaludId });

      expect(result).toBeDefined();
      expect(result.records).toEqual([]);
      expect(
        mockRegulatoryPolicyService.getRegulatoryPolicy,
      ).toHaveBeenCalledWith(proveedorSaludId);
    });

    it('should throw ForbiddenException when proveedorSaludId is not provided', async () => {
      await expect(service.exportLesionesGIIS({})).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
