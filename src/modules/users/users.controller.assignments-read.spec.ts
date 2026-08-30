import { ForbiddenException } from '@nestjs/common';
import { UsersController } from './users.controller';
import * as authHelpers from 'src/utils/auth-helpers';

describe('UsersController — lectura de asignaciones (IDOR)', () => {
  let controller: UsersController;
  let usersService: {
    assertActorCanReadTargetAssignments: jest.Mock;
    assertActorCanManageTargetUser: jest.Mock;
    getUserAssignments: jest.Mock;
    getUserCentrosTrabajo: jest.Mock;
    findById: jest.Mock;
    updateUserAssignments: jest.Mock;
    getIdProveedorSaludByUserId: jest.Mock;
  };
  let auditService: { record: jest.Mock };

  const actorId = '507f1f77bcf86cd799439011';
  const otherUserId = '507f1f77bcf86cd799439012';

  const req = { headers: { authorization: 'Bearer token' } } as never;
  const res = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usersService = {
      assertActorCanReadTargetAssignments: jest.fn().mockResolvedValue(undefined),
      assertActorCanManageTargetUser: jest.fn().mockResolvedValue(undefined),
      getUserAssignments: jest.fn(),
      getUserCentrosTrabajo: jest.fn(),
      findById: jest.fn(),
      updateUserAssignments: jest.fn(),
      getIdProveedorSaludByUserId: jest.fn().mockResolvedValue('prov-a'),
    };
    auditService = { record: jest.fn().mockResolvedValue(undefined) };

    controller = new UsersController(
      usersService as never,
      {} as never,
      {} as never,
      auditService as never,
      {} as never,
      {} as never,
    );

    jest.spyOn(authHelpers, 'getUserIdFromRequest').mockReturnValue(actorId);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET asignaciones/:userId', () => {
    it('usuario restringido puede consultar sus propias asignaciones', async () => {
      usersService.getUserAssignments.mockResolvedValue({
        empresasAsignadas: ['emp-1'],
        centrosTrabajoAsignados: ['centro-1'],
      });

      await controller.getUserAssignments(actorId, req, res as never);

      expect(
        usersService.assertActorCanReadTargetAssignments,
      ).toHaveBeenCalledWith(actorId, actorId);
      expect(usersService.getUserAssignments).toHaveBeenCalledWith(actorId);
      expect(res.json).toHaveBeenCalledWith({
        empresasAsignadas: ['emp-1'],
        centrosTrabajoAsignados: ['centro-1'],
      });
    });

    it('usuario restringido A no puede consultar usuario B', async () => {
      usersService.assertActorCanReadTargetAssignments.mockRejectedValue(
        new ForbiddenException(
          'No tienes permisos para gestionar usuarios de este proveedor de salud',
        ),
      );

      await expect(
        controller.getUserAssignments(otherUserId, req, res as never),
      ).rejects.toThrow(ForbiddenException);
      expect(usersService.getUserAssignments).not.toHaveBeenCalled();
    });

    it('usuario de proveedor A no puede consultar target de proveedor B', async () => {
      usersService.assertActorCanReadTargetAssignments.mockRejectedValue(
        new ForbiddenException(
          'No puedes modificar usuarios de otro proveedor de salud',
        ),
      );

      await expect(
        controller.getUserAssignments(otherUserId, req, res as never),
      ).rejects.toThrow(ForbiddenException);
      expect(usersService.getUserAssignments).not.toHaveBeenCalled();
    });

    it('Principal/Administrador puede consultar target permitido de su proveedor', async () => {
      usersService.getUserAssignments.mockResolvedValue({
        empresasAsignadas: ['emp-2'],
        centrosTrabajoAsignados: ['centro-2'],
      });

      await controller.getUserAssignments(otherUserId, req, res as never);

      expect(
        usersService.assertActorCanReadTargetAssignments,
      ).toHaveBeenCalledWith(actorId, otherUserId);
      expect(res.json).toHaveBeenCalledWith({
        empresasAsignadas: ['emp-2'],
        centrosTrabajoAsignados: ['centro-2'],
      });
    });

    it('contrato de respuesta permanece { empresasAsignadas, centrosTrabajoAsignados }', async () => {
      usersService.getUserAssignments.mockResolvedValue({
        _id: otherUserId,
        role: 'Médico',
        empresasAsignadas: [],
        centrosTrabajoAsignados: [],
      });

      await controller.getUserAssignments(otherUserId, req, res as never);

      expect(res.json).toHaveBeenCalledWith({
        empresasAsignadas: [],
        centrosTrabajoAsignados: [],
      });
      const payload = res.json.mock.calls[0][0];
      expect(Object.keys(payload)).toEqual([
        'empresasAsignadas',
        'centrosTrabajoAsignados',
      ]);
    });
  });

  describe('GET asignaciones/:userId/centros-trabajo', () => {
    it('actor no autorizado no puede consultar otro target', async () => {
      usersService.assertActorCanReadTargetAssignments.mockRejectedValue(
        new ForbiddenException(
          'No tienes permisos para gestionar usuarios de este proveedor de salud',
        ),
      );

      await expect(
        controller.getUserCentrosTrabajo(otherUserId, req, res as never),
      ).rejects.toThrow(ForbiddenException);
      expect(usersService.getUserCentrosTrabajo).not.toHaveBeenCalled();
    });

    it('actor del proveedor A no puede consultar target del proveedor B', async () => {
      usersService.assertActorCanReadTargetAssignments.mockRejectedValue(
        new ForbiddenException(
          'No puedes modificar usuarios de otro proveedor de salud',
        ),
      );

      await expect(
        controller.getUserCentrosTrabajo(otherUserId, req, res as never),
      ).rejects.toThrow(ForbiddenException);
      expect(usersService.getUserCentrosTrabajo).not.toHaveBeenCalled();
    });

    it('self-read autorizado delega al servicio de centros', async () => {
      usersService.getUserCentrosTrabajo.mockResolvedValue([
        { _id: 'centro-1', nombreCentro: 'Planta A' },
      ]);

      await controller.getUserCentrosTrabajo(actorId, req, res as never);

      expect(
        usersService.assertActorCanReadTargetAssignments,
      ).toHaveBeenCalledWith(actorId, actorId);
      expect(usersService.getUserCentrosTrabajo).toHaveBeenCalledWith(actorId);
      expect(res.json).toHaveBeenCalledWith([
        { _id: 'centro-1', nombreCentro: 'Planta A' },
      ]);
    });
  });

  describe('PATCH asignaciones/:userId — gestión legítima', () => {
    it('sigue exigiendo assertActorCanManageTargetUser antes de persistir', async () => {
      usersService.findById.mockResolvedValue({
        empresasAsignadas: [],
        centrosTrabajoAsignados: [],
      });
      usersService.updateUserAssignments.mockResolvedValue({
        empresasAsignadas: ['emp-1'],
        centrosTrabajoAsignados: ['centro-1'],
      });

      await controller.updateUserAssignments(
        otherUserId,
        {
          empresasAsignadas: ['emp-1'],
          centrosTrabajoAsignados: ['centro-1'],
        },
        req,
        res as never,
      );

      expect(usersService.assertActorCanManageTargetUser).toHaveBeenCalledWith(
        actorId,
        otherUserId,
      );
      expect(usersService.updateUserAssignments).toHaveBeenCalled();
    });
  });
});
