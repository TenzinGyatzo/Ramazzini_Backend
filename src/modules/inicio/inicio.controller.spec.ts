import { UnauthorizedException } from '@nestjs/common';
import { InicioController } from './inicio.controller';

describe('InicioController', () => {
  it('usa req.userId y no un userId de query', async () => {
    const inicioResumenService = {
      getResumen: jest.fn().mockResolvedValue({ hasActivity: false }),
    };
    const controller = new InicioController(inicioResumenService as any);

    await controller.getResumen({
      userId: 'jwt-user',
      query: { userId: 'attacker' },
    } as any);

    expect(inicioResumenService.getResumen).toHaveBeenCalledWith('jwt-user');
    expect(inicioResumenService.getResumen).not.toHaveBeenCalledWith(
      'attacker',
    );
  });

  it('expone los listados de hoy con el userId del JWT', async () => {
    const inicioResumenService = {
      listHoyTrabajadores: jest.fn().mockResolvedValue({ items: [], total: 0, truncated: false }),
      listHoyDocumentos: jest.fn().mockResolvedValue({ items: [], total: 0, truncated: false }),
      listHoyCentros: jest.fn().mockResolvedValue({ items: [], total: 0, truncated: false }),
    };
    const controller = new InicioController(inicioResumenService as any);
    const req = { userId: 'jwt-user' } as any;
    await controller.listHoyTrabajadores(req);
    await controller.listHoyDocumentos(req);
    await controller.listHoyCentros(req);
    expect(inicioResumenService.listHoyTrabajadores).toHaveBeenCalledWith('jwt-user');
    expect(inicioResumenService.listHoyDocumentos).toHaveBeenCalledWith('jwt-user');
    expect(inicioResumenService.listHoyCentros).toHaveBeenCalledWith('jwt-user');
  });

  it('rechaza peticiones sin usuario autenticado', async () => {
    const controller = new InicioController({ getResumen: jest.fn() } as any);
    await expect(controller.getResumen({ query: {} } as any)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(
      controller.listHoyTrabajadores({ query: {} } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
