import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EmpresasService } from './empresas.service';
import { AuditActionType } from '../audit/constants/audit-action-type';
import { DeletionAuditReason } from 'src/utils/constants/deletion-audit.constants';
import { RegulatoryErrorCode } from 'src/utils/regulatory-error-codes';

describe('EmpresasService — audit + SIRES delete gate', () => {
  const empresaId = '507f1f77bcf86cd799439011';
  const actorId = '507f1f77bcf86cd799439099';
  const proveedorSaludId = '507f1f77bcf86cd799439033';

  let service: EmpresasService;
  let empresaModel: any;
  let auditService: { record: jest.Mock };
  let deletionCascadeService: {
    countResguardedDocsByEmpresa: jest.Mock;
  };
  let regulatoryPolicyService: { getRegulatoryPolicy: jest.Mock };
  let centrosTrabajoService: { remove: jest.Mock };

  const empresaDoc = {
    _id: empresaId,
    nombreComercial: 'Acme',
    idProveedorSalud: proveedorSaludId,
  };

  beforeEach(() => {
    empresaModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(empresaDoc),
      }),
      findByIdAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...empresaDoc,
          nombreComercial: 'Acme Updated',
        }),
      }),
      findByIdAndDelete: jest.fn().mockReturnValue({
        session: jest.fn().mockResolvedValue(empresaDoc),
      }),
      db: {
        startSession: jest.fn().mockResolvedValue({
          withTransaction: jest.fn(async (fn: () => Promise<void>) => fn()),
          endSession: jest.fn(),
        }),
      },
    };

    const emptyModel = {
      find: jest.fn().mockReturnValue({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
        exec: jest.fn().mockResolvedValue([]),
      }),
    };

    auditService = { record: jest.fn().mockResolvedValue(undefined) };
    deletionCascadeService = {
      countResguardedDocsByEmpresa: jest.fn().mockResolvedValue(0),
    };
    regulatoryPolicyService = {
      getRegulatoryPolicy: jest.fn().mockResolvedValue({
        regime: 'SIRES_NOM024',
      }),
    };
    centrosTrabajoService = {
      remove: jest.fn().mockResolvedValue(undefined),
    };

    service = new EmpresasService(
      empresaModel,
      emptyModel as any,
      emptyModel as any,
      emptyModel as any,
      emptyModel as any,
      emptyModel as any,
      emptyModel as any,
      emptyModel as any,
      emptyModel as any,
      emptyModel as any,
      emptyModel as any,
      emptyModel as any,
      centrosTrabajoService as any,
      auditService as any,
      deletionCascadeService as any,
      regulatoryPolicyService as any,
    );
  });

  it('EMPRESA_UPDATED en update exitoso', async () => {
    await service.update(empresaId, { nombreComercial: 'Acme Updated' } as any, actorId);
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: AuditActionType.EMPRESA_UPDATED,
        resourceId: empresaId,
        actorId,
      }),
    );
  });

  it('SIRES con docs resguardados → DELETE_DENIED + ForbiddenException', async () => {
    deletionCascadeService.countResguardedDocsByEmpresa.mockResolvedValue(3);
    const err = await service.remove(empresaId, actorId).catch((e) => e);
    expect(err).toBeInstanceOf(ForbiddenException);
    expect(err.getResponse().errorCode).toBe(
      RegulatoryErrorCode.ORG_DELETE_BLOCKED_RESGUARDED_DOCS,
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: AuditActionType.EMPRESA_DELETE_DENIED,
        payload: expect.objectContaining({
          reason: DeletionAuditReason.RESGUARDED_DOCS_PRESENT,
          resguardedDocCount: 3,
        }),
      }),
    );
  });

  it('SIRES sin docs resguardados → EMPRESA_DELETED', async () => {
    await service.remove(empresaId, actorId);
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: AuditActionType.EMPRESA_DELETED,
        resourceId: empresaId,
        actorId,
      }),
    );
  });

  it('SIN_REGIMEN con resguardados → permite delete y EMPRESA_DELETED', async () => {
    regulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue({
      regime: 'SIN_REGIMEN',
    });
    deletionCascadeService.countResguardedDocsByEmpresa.mockResolvedValue(5);
    await service.remove(empresaId, actorId);
    expect(
      deletionCascadeService.countResguardedDocsByEmpresa,
    ).not.toHaveBeenCalled();
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: AuditActionType.EMPRESA_DELETED,
      }),
    );
  });

  it('empresa inexistente → NOT_FOUND + DELETE_DENIED', async () => {
    empresaModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    await expect(service.remove(empresaId, actorId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: AuditActionType.EMPRESA_DELETE_DENIED,
        payload: expect.objectContaining({
          reason: DeletionAuditReason.NOT_FOUND,
        }),
      }),
    );
  });
});
