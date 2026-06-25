import { ForbiddenException } from '@nestjs/common';
import { InformesController } from './informes.controller';
import { AuditActionType } from '../audit/constants/audit-action-type';
import { AuditEventClass } from '../audit/constants/audit-event-class';
import { getUserIdFromRequest } from '../../utils/auth-helpers';

jest.mock('../../utils/auth-helpers', () => ({
  getUserIdFromRequest: jest.fn(),
}));

describe('InformesController — registrar exportación dashboard', () => {
  const empresaId = '507f1f77bcf86cd799439012';
  const userId = '507f1f77bcf86cd799439015';
  const proveedorSaludId = '507f1f77bcf86cd799439099';

  let controller: InformesController;
  let auditService: { record: jest.Mock };
  let usersService: { findById: jest.Mock };
  let organizationalAccessService: {
    assertUserCanAccessDashboardExport: jest.Mock;
  };

  beforeEach(() => {
    jest.mocked(getUserIdFromRequest).mockReturnValue(userId);
    auditService = { record: jest.fn().mockResolvedValue(undefined) };
    usersService = { findById: jest.fn() };
    organizationalAccessService = {
      assertUserCanAccessDashboardExport: jest.fn().mockResolvedValue(undefined),
    };
    controller = new InformesController(
      {} as any,
      auditService as any,
      usersService as any,
      organizationalAccessService as any,
    );
  });

  it('registra auditoría cuando el acceso es válido', async () => {
    usersService.findById.mockResolvedValue({ idProveedorSalud: proveedorSaludId });

    const result = await controller.registrarExportacionDashboard(
      {
        empresaId,
        periodo: '2026-01-01 — 2026-06-01',
        centroTrabajo: 'Todos',
        totalTrabajadores: 42,
        modo: 'download',
      },
      { userId } as any,
    );

    expect(result).toEqual({ ok: true });
    expect(
      organizationalAccessService.assertUserCanAccessDashboardExport,
    ).toHaveBeenCalledWith(userId, empresaId, 'Todos');
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        proveedorSaludId,
        actorId: userId,
        actionType: AuditActionType.DASHBOARD_REPORT_EXPORTED,
        resourceType: 'Empresa',
        resourceId: empresaId,
        payload: {
          modo: 'download',
          periodo: '2026-01-01 — 2026-06-01',
          centroTrabajo: 'Todos',
          totalTrabajadores: 42,
        },
        eventClass: AuditEventClass.CLASS_2_SOFT_FAIL,
      }),
    );
  });

  it('rechaza cuando no hay acceso organizacional', async () => {
    organizationalAccessService.assertUserCanAccessDashboardExport.mockRejectedValue(
      new ForbiddenException('No tiene permiso'),
    );

    await expect(
      controller.registrarExportacionDashboard(
        {
          empresaId,
          periodo: '2026',
          centroTrabajo: 'Planta Norte',
          modo: 'view',
        },
        { userId } as any,
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(auditService.record).not.toHaveBeenCalled();
  });
});
