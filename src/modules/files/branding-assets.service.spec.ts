import { ForbiddenException } from '@nestjs/common';
import { PLATFORM_ADMIN_EMAIL } from 'src/utils/user-role-helpers';
import { BrandingAssetsService } from './branding-assets.service';

describe('BrandingAssetsService', () => {
  let service: BrandingAssetsService;
  let userModel: { findById: jest.Mock; find: jest.Mock };
  let medicoFirmanteModel: { findOne: jest.Mock };
  let enfermeraFirmanteModel: { findOne: jest.Mock };
  let tecnicoFirmanteModel: { findOne: jest.Mock };
  let proveedorSaludModel: { findOne: jest.Mock };

  const userId = '507f1f77bcf86cd799439015';
  const ownerUserId = '507f1f77bcf86cd799439016';
  const proveedorId = '507f1f77bcf86cd799439011';
  const filename = 'juan-perez-firma.png';

  beforeEach(() => {
    userModel = { findById: jest.fn(), find: jest.fn() };
    medicoFirmanteModel = { findOne: jest.fn() };
    enfermeraFirmanteModel = { findOne: jest.fn() };
    tecnicoFirmanteModel = { findOne: jest.fn() };
    proveedorSaludModel = { findOne: jest.fn() };

    service = new BrandingAssetsService(
      userModel as any,
      medicoFirmanteModel as any,
      enfermeraFirmanteModel as any,
      tecnicoFirmanteModel as any,
      proveedorSaludModel as any,
    );
  });

  function mockLeanExec<T>(value: T) {
    return {
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(value),
        }),
      }),
    };
  }

  function mockRequester(proveedor: string) {
    userModel.findById.mockReturnValue({
      select: () => ({
        exec: jest.fn().mockResolvedValue({ idProveedorSalud: proveedor }),
      }),
    });
  }

  function mockProveedorUsers(...ids: string[]) {
    userModel.find.mockReturnValue({
      select: () => ({
        lean: () => ({
          exec: jest.fn().mockResolvedValue(ids.map((id) => ({ _id: id }))),
        }),
      }),
    });
  }

  describe('resolveSafeFilename', () => {
    it('rechaza path traversal', () => {
      expect(() => service.resolveSafeFilename('../secret.png')).toThrow(
        ForbiddenException,
      );
    });

    it('rechaza extensiones no permitidas', () => {
      expect(() => service.resolveSafeFilename('archivo.pdf')).toThrow(
        ForbiddenException,
      );
    });

    it('ignora query string de cache busting', () => {
      expect(service.resolveSafeFilename(`${filename}?t=123456`)).toBe(filename);
    });
  });

  describe('assertUserCanAccessSignatory', () => {
    it('permite cuando el firmante pertenece al mismo proveedor', async () => {
      mockRequester(proveedorId);
      mockProveedorUsers(userId, ownerUserId);
      medicoFirmanteModel.findOne.mockReturnValue(
        mockLeanExec({ idUser: ownerUserId }),
      );
      enfermeraFirmanteModel.findOne.mockReturnValue(mockLeanExec(null));
      tecnicoFirmanteModel.findOne.mockReturnValue(mockLeanExec(null));

      await expect(
        service.assertUserCanAccessSignatory(userId, filename),
      ).resolves.toBeUndefined();

      expect(medicoFirmanteModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          idUser: { $in: expect.any(Array) },
          $or: [
            { 'firma.data': filename },
            { 'firmaConAntefirma.data': filename },
          ],
        }),
      );
    });

    it('rechaza cuando el firmante no pertenece al proveedor del solicitante', async () => {
      mockRequester(proveedorId);
      mockProveedorUsers(userId);
      medicoFirmanteModel.findOne.mockReturnValue(mockLeanExec(null));
      enfermeraFirmanteModel.findOne.mockReturnValue(mockLeanExec(null));
      tecnicoFirmanteModel.findOne.mockReturnValue(mockLeanExec(null));

      await expect(
        service.assertUserCanAccessSignatory(userId, filename),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('assertUserCanAccessProviderLogo', () => {
    it('permite logo del mismo proveedor', async () => {
      proveedorSaludModel.findOne.mockReturnValue(
        mockLeanExec({ _id: proveedorId }),
      );
      userModel.findById.mockReturnValue({
        select: () => ({
          exec: jest.fn().mockResolvedValue({ idProveedorSalud: proveedorId }),
        }),
      });

      await expect(
        service.assertUserCanAccessProviderLogo(userId, 'logo.png'),
      ).resolves.toBeUndefined();

      expect(proveedorSaludModel.findOne).toHaveBeenCalledWith({
        _id: proveedorId,
        'logotipoEmpresa.data': 'logo.png',
      });
    });

    it('rechaza cuando el logo no está registrado para el proveedor del usuario', async () => {
      proveedorSaludModel.findOne.mockReturnValue(mockLeanExec(null));
      userModel.findById.mockReturnValue({
        select: () => ({
          exec: jest.fn().mockResolvedValue({ idProveedorSalud: proveedorId }),
        }),
      });

      await expect(
        service.assertUserCanAccessProviderLogo(userId, 'logo.png'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite al operador de plataforma leer el logo de otro proveedor', async () => {
      proveedorSaludModel.findOne.mockReturnValue(
        mockLeanExec({ _id: '507f1f77bcf86cd799439099' }),
      );
      userModel.findById.mockReturnValue({
        select: () => ({
          exec: jest.fn().mockResolvedValue({
            idProveedorSalud: proveedorId,
            email: PLATFORM_ADMIN_EMAIL,
          }),
        }),
      });

      await expect(
        service.assertUserCanAccessProviderLogo(userId, 'otro-proveedor-logo.png'),
      ).resolves.toBeUndefined();

      expect(proveedorSaludModel.findOne).toHaveBeenCalledWith({
        'logotipoEmpresa.data': 'otro-proveedor-logo.png',
      });
    });

    it('sigue rechazando a un usuario no admin si el logo es de otro proveedor', async () => {
      proveedorSaludModel.findOne.mockReturnValue(mockLeanExec(null));
      userModel.findById.mockReturnValue({
        select: () => ({
          exec: jest.fn().mockResolvedValue({
            idProveedorSalud: proveedorId,
            email: 'otro@example.com',
          }),
        }),
      });

      await expect(
        service.assertUserCanAccessProviderLogo(userId, 'otro-proveedor-logo.png'),
      ).rejects.toThrow(ForbiddenException);

      expect(proveedorSaludModel.findOne).toHaveBeenCalledWith({
        _id: proveedorId,
        'logotipoEmpresa.data': 'otro-proveedor-logo.png',
      });
    });
  });
});
