import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { canManageTenantUsers } from 'src/utils/user-role-helpers';

describe('UsersService — gobernanza tenant (H-06)', () => {
  let service: UsersService;
  let userModel: jest.Mock & {
    findById: jest.Mock;
  };

  const principalActor = {
    _id: 'actor-id',
    role: 'Principal',
    idProveedorSalud: '507f1f77bcf86cd799439011',
  };

  const targetSameTenant = {
    _id: 'target-id',
    role: 'Médico',
    idProveedorSalud: '507f1f77bcf86cd799439011',
  };

  const targetOtherTenant = {
    _id: 'target-other',
    role: 'Médico',
    idProveedorSalud: '507f1f77bcf86cd799439012',
  };

  beforeEach(() => {
    userModel = jest.fn() as unknown as typeof userModel;
    userModel.findById = jest.fn();

    service = new UsersService(
      userModel as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  function mockFindByIdSequence(users: Array<Record<string, unknown> | null>) {
    let call = 0;
    userModel.findById.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockImplementation(async () => users[call++] ?? null),
      }),
    }));
  }

  it('assertActorCanManageTargetUser permite Principal en mismo tenant', async () => {
    mockFindByIdSequence([principalActor, targetSameTenant]);

    const result = await service.assertActorCanManageTargetUser(
      'actor-id',
      'target-id',
    );

    expect(result.actor.role).toBe('Principal');
    expect(result.target._id).toBe('target-id');
  });

  it('rechaza Médico como actor', async () => {
    mockFindByIdSequence([
      { ...principalActor, role: 'Médico' },
      targetSameTenant,
    ]);

    await expect(
      service.assertActorCanManageTargetUser('actor-id', 'target-id'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rechaza target de otro tenant', async () => {
    mockFindByIdSequence([principalActor, targetOtherTenant]);

    await expect(
      service.assertActorCanManageTargetUser('actor-id', 'target-other'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rechaza actor inexistente', async () => {
    mockFindByIdSequence([null]);

    await expect(
      service.assertActorCanManageTargetUser('missing', 'target-id'),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('UsersService — lectura de asignaciones (actor → target)', () => {
  let service: UsersService;
  let userModel: jest.Mock & {
    findById: jest.Mock;
  };

  const principalActor = {
    _id: 'actor-id',
    role: 'Principal',
    idProveedorSalud: '507f1f77bcf86cd799439011',
  };

  const targetSameTenant = {
    _id: 'target-id',
    role: 'Médico',
    idProveedorSalud: '507f1f77bcf86cd799439011',
  };

  const targetOtherTenant = {
    _id: 'target-other',
    role: 'Médico',
    idProveedorSalud: '507f1f77bcf86cd799439012',
  };

  beforeEach(() => {
    userModel = jest.fn() as unknown as typeof userModel;
    userModel.findById = jest.fn();

    service = new UsersService(
      userModel as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  function mockFindByIdSequence(users: Array<Record<string, unknown> | null>) {
    let call = 0;
    userModel.findById.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockImplementation(async () => users[call++] ?? null),
      }),
    }));
  }

  it('permite self-read sin exigir rol de gestión', async () => {
    await expect(
      service.assertActorCanReadTargetAssignments('medico-1', 'medico-1'),
    ).resolves.toBeUndefined();
    expect(userModel.findById).not.toHaveBeenCalled();
  });

  it('usuario restringido no puede leer asignaciones de otro usuario', async () => {
    mockFindByIdSequence([
      { ...principalActor, role: 'Médico' },
      targetSameTenant,
    ]);

    await expect(
      service.assertActorCanReadTargetAssignments('actor-id', 'target-id'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('Principal puede leer target del mismo proveedor', async () => {
    mockFindByIdSequence([principalActor, targetSameTenant]);

    await expect(
      service.assertActorCanReadTargetAssignments('actor-id', 'target-id'),
    ).resolves.toBeUndefined();
  });

  it('Administrador puede leer target del mismo proveedor', async () => {
    mockFindByIdSequence([
      { ...principalActor, role: 'Administrador' },
      targetSameTenant,
    ]);

    await expect(
      service.assertActorCanReadTargetAssignments('actor-id', 'target-id'),
    ).resolves.toBeUndefined();
  });

  it('Principal no puede leer target de otro proveedor', async () => {
    mockFindByIdSequence([principalActor, targetOtherTenant]);

    await expect(
      service.assertActorCanReadTargetAssignments('actor-id', 'target-other'),
    ).rejects.toThrow(ForbiddenException);
  });
});

describe('canManageTenantUsers', () => {
  it('incluye Administrador', () => {
    expect(canManageTenantUsers('Administrador')).toBe(true);
  });
});
