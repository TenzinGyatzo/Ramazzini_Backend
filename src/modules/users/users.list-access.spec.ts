import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { IS_PUBLIC_KEY } from 'src/utils/decorators/public.decorator';

describe('UsersService — listado y productividad (H-07)', () => {
  let service: UsersService;
  let userModel: jest.Mock & { findById: jest.Mock };

  const tenantId = '507f1f77bcf86cd799439011';
  const otherTenantId = '507f1f77bcf86cd799439012';

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

  function mockActor(role: string, idProveedorSalud = tenantId) {
    userModel.findById.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'actor-id',
          role,
          idProveedorSalud,
        }),
      }),
    }));
  }

  describe('assertActorCanAccessProveedor', () => {
    it('permite Principal de su propio tenant', async () => {
      mockActor('Principal');
      const actor = await service.assertActorCanAccessProveedor(
        'actor-id',
        tenantId,
      );
      expect(actor.role).toBe('Principal');
    });

    it('permite Administrador en cualquier tenant', async () => {
      mockActor('Administrador', tenantId);
      await expect(
        service.assertActorCanAccessProveedor('actor-id', otherTenantId),
      ).resolves.toBeDefined();
    });

    it('rechaza Principal en tenant ajeno', async () => {
      mockActor('Principal');
      await expect(
        service.assertActorCanAccessProveedor('actor-id', otherTenantId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza Médico', async () => {
      mockActor('Médico');
      await expect(
        service.assertActorCanAccessProveedor('actor-id', tenantId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('assertActorIsPlatformAdministrador', () => {
    it('permite Administrador', async () => {
      mockActor('Administrador');
      const actor = await service.assertActorIsPlatformAdministrador('actor-id');
      expect(actor.role).toBe('Administrador');
    });

    it('rechaza Principal', async () => {
      mockActor('Principal');
      await expect(
        service.assertActorIsPlatformAdministrador('actor-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza actor inexistente', async () => {
      userModel.findById.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      }));

      await expect(
        service.assertActorIsPlatformAdministrador('missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

describe('UsersController — metadata H-07', () => {
  const protectedHandlers = [
    'getUsersByProveedorId',
    'getAllProductivityStats',
    'getProductivityStatsByProveedor',
    'getUserDetailedStats',
  ] as const;

  it.each(protectedHandlers)('%s no está marcado como @Public', (handler) => {
    const isPublic = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      UsersController.prototype[handler],
    );
    expect(isPublic).toBeUndefined();
  });
});
