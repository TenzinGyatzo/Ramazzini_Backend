import { UnauthorizedException } from '@nestjs/common';
import { ExpedientesController } from './expedientes.controller';
import { ExpedientesService } from './expedientes.service';
import { IS_PUBLIC_KEY } from 'src/utils/decorators/public.decorator';

describe('ExpedientesController — removeDocument (H-08)', () => {
  it('removeDocument no está marcado como @Public', () => {
    const isPublic = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      ExpedientesController.prototype.removeDocument,
    );
    expect(isPublic).toBeUndefined();
  });

  it('pasa el userId del JWT al servicio', async () => {
    const removeDocument = jest.fn().mockResolvedValue({ deleted: true });
    const controller = new ExpedientesController(
      { removeDocument } as unknown as ExpedientesService,
      {} as never,
      {} as never,
    );

    await controller.removeDocument(
      'notaMedica',
      '507f1f77bcf86cd799439011',
      undefined,
      { userId: 'actor-123' } as Parameters<
        ExpedientesController['removeDocument']
      >[3],
    );

    expect(removeDocument).toHaveBeenCalledWith(
      'notaMedica',
      '507f1f77bcf86cd799439011',
      'actor-123',
      undefined,
    );
  });
});

describe('ExpedientesService — removeDocument (H-08)', () => {
  it('rechaza eliminación sin actorUserId', async () => {
    const { ExpedientesService: Service } = await import('./expedientes.service');
    const service = Object.create(Service.prototype) as ExpedientesService;

    await expect(
      service.removeDocument('notaMedica', '507f1f77bcf86cd799439011', ''),
    ).rejects.toThrow(UnauthorizedException);
  });
});
