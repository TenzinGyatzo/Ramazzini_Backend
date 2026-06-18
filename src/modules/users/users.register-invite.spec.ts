import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { IS_PUBLIC_KEY } from 'src/utils/decorators/public.decorator';

describe('UsersService — register / invite (H-05)', () => {
  let service: UsersService;
  let userModel: jest.Mock & {
    countDocuments: jest.Mock;
    findById: jest.Mock;
    findOne: jest.Mock;
  };
  let proveedorSaludModel: { findById: jest.Mock };

  const principalDto = {
    username: 'jorge01',
    email: 'jorge@test.com',
    phone: '1234567890',
    country: 'MX',
    password: 'Secret123',
    role: 'Principal',
    idProveedorSalud: '507f1f77bcf86cd799439011',
  };

  const inviteDto = {
    username: 'medico1',
    email: 'medico@test.com',
    phone: '1234567890',
    country: 'MX',
    password: 'Secret123',
    role: 'Médico',
  };

  beforeEach(() => {
    const defaultActor = {
      _id: 'actor-id',
      role: 'Principal',
      idProveedorSalud: '507f1f77bcf86cd799439011',
    };

    userModel = jest.fn().mockImplementation((data: Record<string, unknown>) => ({
      ...data,
      username: data.username,
      email: data.email,
      token: 'verify-token',
      save: jest.fn().mockResolvedValue({
        ...data,
        token: 'verify-token',
      }),
    })) as unknown as typeof userModel;

    userModel.countDocuments = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    });
    userModel.findById = jest.fn().mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(defaultActor),
      }),
    }));
    userModel.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    proveedorSaludModel = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: principalDto.idProveedorSalud }),
      }),
    };

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
      proveedorSaludModel as any,
      {} as any,
    );
  });

  describe('registerOnboardingPrincipal', () => {
    it('crea Principal en tenant vacío', async () => {
      const user = await service.registerOnboardingPrincipal(principalDto);
      expect(user).toBeDefined();
      expect(userModel).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'Principal' }),
      );
    });

    it('rechaza roles distintos de Principal', async () => {
      await expect(
        service.registerOnboardingPrincipal({
          ...principalDto,
          role: 'Médico',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza si el tenant ya tiene usuarios', async () => {
      userModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      await expect(
        service.registerOnboardingPrincipal(principalDto),
      ).rejects.toThrow(ConflictException);
    });

    it('rechaza si el proveedor no existe', async () => {
      proveedorSaludModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.registerOnboardingPrincipal(principalDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('inviteUser', () => {
    it('invita rol subordinado con idProveedorSalud del actor', async () => {
      const user = await service.inviteUser('actor-id', inviteDto);
      expect(user).toBeDefined();
      expect(userModel).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'Médico',
          idProveedorSalud: '507f1f77bcf86cd799439011',
        }),
      );
    });

    it('rechaza invitación de Principal', async () => {
      await expect(
        service.inviteUser('actor-id', {
          ...inviteDto,
          role: 'Principal',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza actor sin permisos de invitación', async () => {
      userModel.findById.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: 'actor-id',
            role: 'Médico',
            idProveedorSalud: '507f1f77bcf86cd799439011',
          }),
        }),
      }));

      await expect(service.inviteUser('actor-id', inviteDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('permite invitar al pseudo-rol Administrador', async () => {
      userModel.findById.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: 'actor-id',
            role: 'Administrador',
            idProveedorSalud: '507f1f77bcf86cd799439011',
          }),
        }),
      }));

      await expect(service.inviteUser('actor-id', inviteDto)).resolves.toBeDefined();
    });
  });
});

describe('UsersController — metadata H-05', () => {
  it('register está marcado como @Public', () => {
    const isPublic = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      UsersController.prototype.register,
    );
    expect(isPublic).toBe(true);
  });

  it('invite no está marcado como @Public', () => {
    const isPublic = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      UsersController.prototype.inviteUser,
    );
    expect(isPublic).toBeUndefined();
  });
});
