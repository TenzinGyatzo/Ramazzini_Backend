import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DeletionPasswordGuard } from './deletion-password.guard';
import { DELETION_PASSWORD_HEADER } from '../constants/deletion-auth';
import { DELETION_CASCADE_CHECK_KEY } from '../decorators/deletion-cascade-check.decorator';
import { AuditActionType } from 'src/modules/audit/constants/audit-action-type';
import { DeletionAuditReason } from '../constants/deletion-audit.constants';

describe('DeletionPasswordGuard — DELETION_AUTH_FAIL', () => {
  const userId = '507f1f77bcf86cd799439011';
  const empresaId = '507f1f77bcf86cd799439022';
  const proveedorSaludId = '507f1f77bcf86cd799439033';

  let guard: DeletionPasswordGuard;
  let auditService: { record: jest.Mock };
  let deletionCascadeService: {
    countCentrosByEmpresa: jest.Mock;
    countTrabajadoresByCentro: jest.Mock;
  };
  let userModel: { findById: jest.Mock };
  let reflector: { get: jest.Mock };

  const buildContext = (params: Record<string, string>, headers: Record<string, string> = {}) => {
    const request = {
      userId,
      params,
      headers,
      path: '/api/eliminar-empresa/' + (params.id ?? ''),
      route: { path: '/eliminar-empresa/:id' },
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
    } as any;
  };

  beforeEach(() => {
    auditService = { record: jest.fn().mockResolvedValue(undefined) };
    deletionCascadeService = {
      countCentrosByEmpresa: jest.fn().mockResolvedValue(1),
      countTrabajadoresByCentro: jest.fn().mockResolvedValue(1),
    };
    userModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: userId,
          idProveedorSalud: proveedorSaludId,
          checkPassword: jest.fn().mockResolvedValue(false),
        }),
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue({
              idProveedorSalud: proveedorSaludId,
            }),
          }),
        }),
      }),
    };
    reflector = {
      get: jest.fn((key: string) =>
        key === DELETION_CASCADE_CHECK_KEY ? 'empresa' : undefined,
      ),
    };

    guard = new DeletionPasswordGuard(
      userModel as any,
      deletionCascadeService as any,
      reflector as unknown as Reflector,
      auditService as any,
    );
  });

  it('emite DELETION_AUTH_FAIL con MISSING_PASSWORD', async () => {
    const ctx = buildContext({ id: empresaId });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: AuditActionType.DELETION_AUTH_FAIL,
        actorId: userId,
        resourceType: 'empresa',
        resourceId: empresaId,
        payload: { reason: DeletionAuditReason.MISSING_PASSWORD },
      }),
    );
  });

  it('emite DELETION_AUTH_FAIL con INVALID_PASSWORD', async () => {
    const ctx = buildContext(
      { id: empresaId },
      { [DELETION_PASSWORD_HEADER]: 'wrong-password' },
    );
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: AuditActionType.DELETION_AUTH_FAIL,
        payload: { reason: DeletionAuditReason.INVALID_PASSWORD },
        proveedorSaludId,
      }),
    );
  });

  it('no exige password ni audita cuando no hay centros hijos', async () => {
    deletionCascadeService.countCentrosByEmpresa.mockResolvedValue(0);
    const ctx = buildContext({ id: empresaId });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(auditService.record).not.toHaveBeenCalled();
  });
});
