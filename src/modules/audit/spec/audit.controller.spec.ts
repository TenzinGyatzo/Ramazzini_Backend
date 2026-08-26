import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AuditController } from '../audit.controller';
import { AuditService } from '../audit.service';
import { UsersService } from '../../users/users.service';
import { RegulatoryPolicyService } from '../../../utils/regulatory-policy.service';
import { getUserIdFromRequest } from '../../../utils/auth-helpers';

jest.mock('../../../utils/auth-helpers', () => ({
  getUserIdFromRequest: jest.fn(),
}));

describe('AuditController — acceso solo Principal', () => {
  let controller: AuditController;
  let usersService: { findById: jest.Mock };
  let getRegulatoryPolicy: jest.Mock;
  let auditService: {
    findEvents: jest.Mock;
    exportEvents: jest.Mock;
    verifyExport: jest.Mock;
    record: jest.Mock;
  };

  const proveedorSaludId = new Types.ObjectId().toString();
  const mockReq = {} as Parameters<AuditController['getEvents']>[1];

  beforeEach(async () => {
    usersService = {
      findById: jest.fn(),
    };
    getRegulatoryPolicy = jest.fn().mockResolvedValue({
      regime: 'SIRES_NOM024',
      features: { auditTrailEnabled: true },
    });
    auditService = {
      findEvents: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      exportEvents: jest.fn().mockResolvedValue(Buffer.from('[]')),
      verifyExport: jest.fn().mockResolvedValue({ valid: true }),
      record: jest.fn().mockResolvedValue(undefined),
    };

    (getUserIdFromRequest as jest.Mock).mockReturnValue('actor-user-id');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        { provide: AuditService, useValue: auditService },
        { provide: UsersService, useValue: usersService },
        {
          provide: RegulatoryPolicyService,
          useValue: { getRegulatoryPolicy },
        },
      ],
    }).compile();

    controller = module.get<AuditController>(AuditController);
  });

  it('permite GET /events al rol Principal', async () => {
    usersService.findById.mockResolvedValue({
      role: 'Principal',
      idProveedorSalud: proveedorSaludId,
    });

    const result = await controller.getEvents({}, mockReq);

    expect(result).toEqual({ items: [], total: 0, page: 1, limit: 50 });
    expect(auditService.findEvents).toHaveBeenCalledWith(
      proveedorSaludId,
      {},
    );
  });

  it('permite GET /events al Principal de SIN_REGIMEN cuando auditTrailEnabled', async () => {
    getRegulatoryPolicy.mockResolvedValue({
      regime: 'SIN_REGIMEN',
      features: { auditTrailEnabled: true },
    });
    usersService.findById.mockResolvedValue({
      role: 'Principal',
      idProveedorSalud: proveedorSaludId,
    });

    const result = await controller.getEvents({}, mockReq);

    expect(result).toEqual({ items: [], total: 0, page: 1, limit: 50 });
    expect(auditService.findEvents).toHaveBeenCalledWith(
      proveedorSaludId,
      {},
    );
  });

  it('rechaza GET /events si auditTrailEnabled es false', async () => {
    getRegulatoryPolicy.mockResolvedValue({
      regime: 'SIN_REGIMEN',
      features: { auditTrailEnabled: false },
    });
    usersService.findById.mockResolvedValue({
      role: 'Principal',
      idProveedorSalud: proveedorSaludId,
    });

    await expect(controller.getEvents({}, mockReq)).rejects.toThrow(
      ForbiddenException,
    );
    expect(auditService.findEvents).not.toHaveBeenCalled();
  });

  it.each(['Medico', 'Enfermera', 'Administrador'])(
    'rechaza GET /events para rol %s',
    async (role) => {
      usersService.findById.mockResolvedValue({
        role,
        idProveedorSalud: proveedorSaludId,
      });

      await expect(controller.getEvents({}, mockReq)).rejects.toThrow(
        ForbiddenException,
      );
      expect(auditService.findEvents).not.toHaveBeenCalled();
    },
  );

  it('rechaza GET /events si Principal no tiene proveedor de salud', async () => {
    usersService.findById.mockResolvedValue({
      role: 'Principal',
      idProveedorSalud: null,
    });

    await expect(controller.getEvents({}, mockReq)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza GET /verify para Administrador', async () => {
    usersService.findById.mockResolvedValue({
      role: 'Administrador',
      idProveedorSalud: proveedorSaludId,
    });

    await expect(
      controller.verify('2024-01-01', '2024-01-31', mockReq),
    ).rejects.toThrow(ForbiddenException);
    expect(auditService.verifyExport).not.toHaveBeenCalled();
  });

  it('permite GET /verify al rol Principal', async () => {
    usersService.findById.mockResolvedValue({
      role: 'Principal',
      idProveedorSalud: proveedorSaludId,
    });

    const result = await controller.verify('2024-01-01', '2024-01-31', mockReq);

    expect(result).toEqual({ valid: true });
    expect(auditService.verifyExport).toHaveBeenCalledWith(
      proveedorSaludId,
      '2024-01-01',
      '2024-01-31',
    );
  });

  it('rechaza GET /export para Medico', async () => {
    usersService.findById.mockResolvedValue({
      role: 'Medico',
      idProveedorSalud: proveedorSaludId,
    });

    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };

    await expect(
      controller.export(
        '2024-01-01',
        '2024-01-31',
        'json',
        mockReq,
        res as never,
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(auditService.record).not.toHaveBeenCalled();
    expect(auditService.exportEvents).not.toHaveBeenCalled();
  });
});
