import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersController } from './users.controller';
import * as authHelpers from 'src/utils/auth-helpers';

describe('UsersController — delete-user (IDOR tenant)', () => {
  let controller: UsersController;
  let usersService: {
    findByEmail: jest.Mock;
    assertActorCanManageTargetUser: jest.Mock;
    removeUserByEmail: jest.Mock;
    getIdProveedorSaludByUserId: jest.Mock;
  };
  let auditService: { record: jest.Mock };
  let refreshTokenService: { revokeAllForUser: jest.Mock };
  let sessionActivityService: { revokeAllForUser: jest.Mock };

  const actorId = '507f1f77bcf86cd799439011';
  const targetId = '507f1f77bcf86cd799439012';
  const targetEmail = 'victim@example.com';

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      assertActorCanManageTargetUser: jest.fn(),
      removeUserByEmail: jest.fn(),
      getIdProveedorSaludByUserId: jest.fn(),
    };
    auditService = { record: jest.fn().mockResolvedValue(undefined) };
    refreshTokenService = {
      revokeAllForUser: jest.fn().mockResolvedValue(undefined),
    };
    sessionActivityService = {
      revokeAllForUser: jest.fn().mockResolvedValue(undefined),
    };

    controller = new UsersController(
      usersService as any,
      {} as any,
      refreshTokenService as any,
      auditService as any,
      {} as any,
      sessionActivityService as any,
    );

    jest.spyOn(authHelpers, 'getUserIdFromRequest').mockReturnValue(actorId);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rechaza eliminación cross-tenant antes de borrar', async () => {
    usersService.findByEmail.mockResolvedValue({
      _id: targetId,
      email: targetEmail,
      username: 'victim',
      role: 'Médico',
    });
    usersService.assertActorCanManageTargetUser.mockRejectedValue(
      new ForbiddenException(
        'No puedes modificar usuarios de otro proveedor de salud',
      ),
    );

    const req = { headers: { authorization: 'Bearer token' } } as any;
    const res = { json: jest.fn() } as any;

    await expect(
      controller.removeUserByEmail(targetEmail, req, res),
    ).rejects.toThrow(ForbiddenException);

    expect(usersService.assertActorCanManageTargetUser).toHaveBeenCalledWith(
      actorId,
      targetId,
    );
    expect(usersService.removeUserByEmail).not.toHaveBeenCalled();
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('elimina solo después de validar gobernanza del actor', async () => {
    usersService.findByEmail.mockResolvedValue({
      _id: targetId,
      email: targetEmail,
      username: 'victim',
      role: 'Médico',
    });
    usersService.assertActorCanManageTargetUser.mockResolvedValue({
      actor: { role: 'Principal' },
      target: { _id: targetId },
    });
    usersService.removeUserByEmail.mockResolvedValue({ email: targetEmail });
    usersService.getIdProveedorSaludByUserId.mockResolvedValue(
      '507f1f77bcf86cd799439099',
    );

    const req = { headers: { authorization: 'Bearer token' } } as any;
    const res = { json: jest.fn() } as any;

    await controller.removeUserByEmail(targetEmail, req, res);

    expect(usersService.removeUserByEmail).toHaveBeenCalledWith(targetEmail);
    expect(refreshTokenService.revokeAllForUser).toHaveBeenCalledWith(targetId);
    expect(sessionActivityService.revokeAllForUser).toHaveBeenCalledWith(
      targetId,
    );
    expect(auditService.record).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
  });

  it('responde 404 si el usuario no existe', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    const req = { headers: {} } as any;
    const res = { json: jest.fn() } as any;

    await expect(
      controller.removeUserByEmail('missing@example.com', req, res),
    ).rejects.toThrow(NotFoundException);

    expect(usersService.assertActorCanManageTargetUser).not.toHaveBeenCalled();
  });
});
