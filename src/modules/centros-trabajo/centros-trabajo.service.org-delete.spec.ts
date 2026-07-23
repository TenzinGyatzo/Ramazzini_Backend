import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CentrosTrabajoService } from './centros-trabajo.service';
import { AuditActionType } from '../audit/constants/audit-action-type';
import { DeletionAuditReason } from 'src/utils/constants/deletion-audit.constants';
import { RegulatoryErrorCode } from 'src/utils/regulatory-error-codes';

describe('CentrosTrabajoService — audit + SIRES delete gate', () => {
  const centroId = '507f1f77bcf86cd799439044';
  const empresaId = '507f1f77bcf86cd799439011';
  const actorId = '507f1f77bcf86cd799439099';
  const proveedorSaludId = '507f1f77bcf86cd799439033';

  let service: CentrosTrabajoService;
  let centroModel: any;
  let empresaModel: any;
  let auditService: { record: jest.Mock };
  let deletionCascadeService: { countResguardedDocsByCentro: jest.Mock };
  let regulatoryPolicyService: { getRegulatoryPolicy: jest.Mock };
  let trabajadoresService: { remove: jest.Mock };

  const centroDoc = {
    _id: centroId,
    nombreCentro: 'Planta 1',
    idEmpresa: empresaId,
    toObject: () => ({
      _id: centroId,
      nombreCentro: 'Planta 1',
      idEmpresa: empresaId,
    }),
  };

  beforeEach(() => {
    centroModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(centroDoc),
      }),
      findByIdAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...centroDoc,
          nombreCentro: 'Planta 2',
        }),
      }),
      findByIdAndDelete: jest.fn().mockReturnValue({
        session: jest.fn().mockResolvedValue(centroDoc),
      }),
      db: {
        startSession: jest.fn().mockResolvedValue({
          withTransaction: jest.fn(async (fn: () => Promise<void>) => fn()),
          endSession: jest.fn(),
        }),
      },
    };

    empresaModel = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({
              idProveedorSalud: proveedorSaludId,
            }),
          }),
        }),
      }),
    };

    const emptyModel = {
      find: jest.fn().mockReturnValue({
        session: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
        exec: jest.fn().mockResolvedValue([]),
      }),
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      }),
    };

    auditService = { record: jest.fn().mockResolvedValue(undefined) };
    deletionCascadeService = {
      countResguardedDocsByCentro: jest.fn().mockResolvedValue(0),
    };
    regulatoryPolicyService = {
      getRegulatoryPolicy: jest.fn().mockResolvedValue({
        regime: 'SIRES_NOM024',
      }),
    };
    trabajadoresService = {
      remove: jest.fn().mockResolvedValue(true),
    };

    service = new CentrosTrabajoService(
      centroModel,
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
      empresaModel,
      trabajadoresService as any,
      {
        validateGeography: jest.fn().mockResolvedValue({ valid: true, errors: [] }),
      } as any,
      auditService as any,
      deletionCascadeService as any,
      regulatoryPolicyService as any,
    );
  });

  it('CENTRO_UPDATED en update exitoso', async () => {
    await service.update(centroId, { nombreCentro: 'Planta 2' } as any, actorId);
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: AuditActionType.CENTRO_UPDATED,
        resourceId: centroId,
        actorId,
      }),
    );
  });

  it('SIRES con docs resguardados → DELETE_DENIED + ForbiddenException', async () => {
    deletionCascadeService.countResguardedDocsByCentro.mockResolvedValue(2);
    const err = await service.remove(centroId, actorId).catch((e) => e);
    expect(err).toBeInstanceOf(ForbiddenException);
    expect(err.getResponse().errorCode).toBe(
      RegulatoryErrorCode.ORG_DELETE_BLOCKED_RESGUARDED_DOCS,
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: AuditActionType.CENTRO_DELETE_DENIED,
        payload: expect.objectContaining({
          reason: DeletionAuditReason.RESGUARDED_DOCS_PRESENT,
        }),
      }),
    );
  });

  it('SIRES sin docs resguardados → CENTRO_DELETED', async () => {
    await service.remove(centroId, actorId);
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: AuditActionType.CENTRO_DELETED,
        resourceId: centroId,
      }),
    );
  });

  it('SIN_REGIMEN con resguardados → permite delete', async () => {
    regulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue({
      regime: 'SIN_REGIMEN',
    });
    deletionCascadeService.countResguardedDocsByCentro.mockResolvedValue(9);
    await service.remove(centroId, actorId);
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: AuditActionType.CENTRO_DELETED,
      }),
    );
  });

  it('centro inexistente → NOT_FOUND', async () => {
    centroModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    await expect(service.remove(centroId, actorId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
