import { ForbiddenException } from '@nestjs/common';
import { TrabajadoresController } from './trabajadores.controller';
import { IS_PUBLIC_KEY } from 'src/utils/decorators/public.decorator';
import { AuditActionType } from '../audit/constants/audit-action-type';
import { AuditEventClass } from '../audit/constants/audit-event-class';

describe('TrabajadoresController — exportar (H-04)', () => {
  const empresaId = '507f1f77bcf86cd799439012';
  const centroId = '507f1f77bcf86cd799439013';
  const userId = '507f1f77bcf86cd799439015';
  const proveedorSaludId = '507f1f77bcf86cd799439099';

  let controller: TrabajadoresController;
  let trabajadoresService: { exportarTrabajadores: jest.Mock };
  let usersService: { findById: jest.Mock };
  let organizationalAccessService: { assertUserCanAccessCentro: jest.Mock };
  let auditService: { record: jest.Mock };
  let res: { setHeader: jest.Mock; send: jest.Mock };

  beforeEach(() => {
    trabajadoresService = { exportarTrabajadores: jest.fn() };
    usersService = { findById: jest.fn() };
    organizationalAccessService = {
      assertUserCanAccessCentro: jest.fn().mockResolvedValue(undefined),
    };
    auditService = { record: jest.fn().mockResolvedValue(undefined) };
    controller = new TrabajadoresController(
      trabajadoresService as any,
      {} as any,
      usersService as any,
      organizationalAccessService as any,
      auditService as any,
    );
    res = { setHeader: jest.fn(), send: jest.fn() };
  });

  it('exportar-trabajadores no está marcado como @Public', () => {
    const isPublic = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      TrabajadoresController.prototype.exportarTrabajadores,
    );
    expect(isPublic).toBeUndefined();
  });

  it('rechaza exportación sin permiso gestionarTrabajadores', async () => {
    usersService.findById.mockResolvedValue({
      role: 'Médico',
      permisos: { gestionarTrabajadores: false },
    });

    await expect(
      controller.exportarTrabajadores(
        empresaId,
        centroId,
        { userId } as any,
        res as any,
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(organizationalAccessService.assertUserCanAccessCentro).not.toHaveBeenCalled();
    expect(trabajadoresService.exportarTrabajadores).not.toHaveBeenCalled();
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('valida acceso al centro antes de exportar', async () => {
    usersService.findById.mockResolvedValue({
      role: 'Principal',
      permisos: {},
    });
    trabajadoresService.exportarTrabajadores.mockResolvedValue(Buffer.from('xlsx'));
    organizationalAccessService.assertUserCanAccessCentro.mockRejectedValue(
      new ForbiddenException('No tiene permiso'),
    );

    await expect(
      controller.exportarTrabajadores(
        empresaId,
        centroId,
        { userId } as any,
        res as any,
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(organizationalAccessService.assertUserCanAccessCentro).toHaveBeenCalledWith(
      userId,
      empresaId,
      centroId,
    );
    expect(trabajadoresService.exportarTrabajadores).not.toHaveBeenCalled();
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('exporta cuando permisos y tenant son válidos y registra auditoría', async () => {
    usersService.findById
      .mockResolvedValueOnce({
        role: 'Principal',
        permisos: {},
      })
      .mockResolvedValueOnce({
        idProveedorSalud: proveedorSaludId,
      });
    trabajadoresService.exportarTrabajadores.mockResolvedValue(Buffer.from('xlsx'));

    await controller.exportarTrabajadores(
      empresaId,
      centroId,
      { userId } as any,
      res as any,
    );

    expect(trabajadoresService.exportarTrabajadores).toHaveBeenCalledWith(centroId);
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        proveedorSaludId,
        actorId: userId,
        actionType: AuditActionType.WORKERS_EXPORT_EXCEL,
        resourceType: 'CentroTrabajo',
        resourceId: centroId,
        payload: { empresaId, origen: 'servidor', filtered: false },
        eventClass: AuditEventClass.CLASS_2_SOFT_FAIL,
      }),
    );
    expect(res.send).toHaveBeenCalledWith(Buffer.from('xlsx'));
  });

  it('rechaza registrar-exportacion-excel sin permiso gestionarTrabajadores', async () => {
    usersService.findById.mockResolvedValue({
      role: 'Médico',
      permisos: { gestionarTrabajadores: false },
    });

    await expect(
      controller.registrarExportacionExcel(
        empresaId,
        centroId,
        { rowCount: 12, filename: 'trabajadores_filtrados.xlsx', filtered: true },
        { userId } as any,
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(organizationalAccessService.assertUserCanAccessCentro).not.toHaveBeenCalled();
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('registrar-exportacion-excel registra auditoría para exportación en cliente', async () => {
    usersService.findById
      .mockResolvedValueOnce({
        role: 'Principal',
        permisos: {},
      })
      .mockResolvedValueOnce({
        idProveedorSalud: proveedorSaludId,
      });

    const result = await controller.registrarExportacionExcel(
      empresaId,
      centroId,
      {
        rowCount: 12,
        filename: 'trabajadores_filtrados.xlsx',
        filtered: true,
        columnKeys: ['nombre', 'aptitud'],
        columnCount: 2,
        showEmptyColumns: false,
      },
      { userId } as any,
    );

    expect(result).toEqual({ ok: true });
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: AuditActionType.WORKERS_EXPORT_EXCEL,
        payload: expect.objectContaining({
          origen: 'cliente',
          filtered: true,
          rowCount: 12,
          filename: 'trabajadores_filtrados.xlsx',
          columnKeys: ['nombre', 'aptitud'],
          columnCount: 2,
          showEmptyColumns: false,
        }),
      }),
    );
  });
});
