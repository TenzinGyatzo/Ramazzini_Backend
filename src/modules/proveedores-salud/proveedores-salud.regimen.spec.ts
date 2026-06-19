import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException } from '@nestjs/common';
import { ProveedoresSaludService } from './proveedores-salud.service';
import { ProveedorSalud } from './schemas/proveedor-salud.schema';
import { NOM024ComplianceUtil } from '../../utils/nom024-compliance.util';
import { CatalogsService } from '../catalogs/catalogs.service';
import { RegulatoryPolicyService } from 'src/utils/regulatory-policy.service';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '../audit/constants/audit-action-type';
import { AuditEventClass } from '../audit/constants/audit-event-class';

const PROVEEDOR_ID = '507f1f77bcf86cd799439011';
const USER_ID = '507f1f77bcf86cd799439012';

describe('ProveedoresSaludService — changeRegimenRegulatorio (H-09)', () => {
  let service: ProveedoresSaludService;
  let mockUserModel: { findById: jest.Mock };
  let mockProveedorModel: { findById: jest.Mock; findByIdAndUpdate: jest.Mock };
  let mockAuditService: { record: jest.Mock };
  let mockRegulatoryPolicyService: { getRegulatoryPolicy: jest.Mock };
  let mockNom024Util: { clearProviderCache: jest.Mock };

  beforeEach(async () => {
    mockUserModel = {
      findById: jest.fn(),
    };
    mockProveedorModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };
    mockAuditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };
    mockRegulatoryPolicyService = {
      getRegulatoryPolicy: jest.fn().mockResolvedValue({ regime: 'SIRES_NOM024' }),
    };
    mockNom024Util = {
      clearProviderCache: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProveedoresSaludService,
        {
          provide: getModelToken(ProveedorSalud.name),
          useValue: mockProveedorModel,
        },
        {
          provide: getModelToken('User'),
          useValue: mockUserModel,
        },
        { provide: NOM024ComplianceUtil, useValue: mockNom024Util },
        { provide: CatalogsService, useValue: {} },
        { provide: RegulatoryPolicyService, useValue: mockRegulatoryPolicyService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<ProveedoresSaludService>(ProveedoresSaludService);
  });

  it('rechaza cambio de régimen si el usuario no es Principal', async () => {
    mockUserModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        role: 'Médico',
        idProveedorSalud: PROVEEDOR_ID,
      }),
    });

    await expect(
      service.changeRegimenRegulatorio(PROVEEDOR_ID, USER_ID, {
        regimenRegulatorio: 'SIRES_NOM024',
        reason: 'prueba',
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(mockProveedorModel.findById).not.toHaveBeenCalled();
    expect(mockAuditService.record).not.toHaveBeenCalled();
  });

  it('rechaza cambio si el Principal pertenece a otro proveedor', async () => {
    mockUserModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        role: 'Principal',
        idProveedorSalud: '507f1f77bcf86cd799439099',
      }),
    });

    await expect(
      service.changeRegimenRegulatorio(PROVEEDOR_ID, USER_ID, {
        regimenRegulatorio: 'SIRES_NOM024',
        reason: 'prueba',
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(mockAuditService.record).not.toHaveBeenCalled();
  });

  it('permite upgrade SIN_REGIMEN → SIRES_NOM024 y registra ADMIN_CONFIG_SIRES', async () => {
    const updatedProveedor = {
      regimenRegulatorio: 'SIRES_NOM024',
      toObject: () => ({ regimenRegulatorio: 'SIRES_NOM024' }),
    };

    mockUserModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        role: 'Principal',
        idProveedorSalud: PROVEEDOR_ID,
      }),
    });
    mockProveedorModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        regimenRegulatorio: 'SIN_REGIMEN',
      }),
    });
    mockProveedorModel.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(updatedProveedor),
    });

    const result = await service.changeRegimenRegulatorio(PROVEEDOR_ID, USER_ID, {
      regimenRegulatorio: 'SIRES_NOM024',
      reason: 'Activación SIRES',
    });

    expect(result.proveedorSalud).toBe(updatedProveedor);
    expect(mockNom024Util.clearProviderCache).toHaveBeenCalledWith(PROVEEDOR_ID);
    expect(mockAuditService.record).toHaveBeenCalledWith({
      proveedorSaludId: PROVEEDOR_ID,
      actorId: USER_ID,
      actionType: AuditActionType.ADMIN_CONFIG_SIRES,
      resourceType: 'PROVEEDOR_SALUD',
      resourceId: PROVEEDOR_ID,
      payload: {
        regimenAnterior: 'SIN_REGIMEN',
        regimenNuevo: 'SIRES_NOM024',
        reason: 'Activación SIRES',
        proveedorSaludId: PROVEEDOR_ID,
      },
      eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
    });
  });
});
