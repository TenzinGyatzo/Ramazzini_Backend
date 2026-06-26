import { ForbiddenException } from '@nestjs/common';
import { InformeAccessInterceptor } from './informe-access.interceptor';
import { getUserIdFromRequest } from '../../utils/auth-helpers';

jest.mock('../../utils/auth-helpers', () => ({
  getUserIdFromRequest: jest.fn(),
}));

describe('InformeAccessInterceptor', () => {
  const empresaId = '507f1f77bcf86cd799439012';
  const trabajadorId = '507f1f77bcf86cd799439014';
  const userId = '507f1f77bcf86cd799439015';

  let interceptor: InformeAccessInterceptor;
  let organizationalAccessService: {
    assertUserCanAccessTrabajador: jest.Mock;
  };

  const next = { handle: jest.fn().mockReturnValue('ok') };

  beforeEach(() => {
    jest.mocked(getUserIdFromRequest).mockReturnValue(userId);
    organizationalAccessService = {
      assertUserCanAccessTrabajador: jest.fn().mockResolvedValue(undefined),
    };
    interceptor = new InformeAccessInterceptor(
      organizationalAccessService as any,
    );
    next.handle.mockClear();
  });

  function buildContext(params: Record<string, string>, routePath: string) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          params,
          route: { path: routePath },
        }),
      }),
    } as any;
  }

  it('valida acceso organizacional cuando hay empresaId y trabajadorId', async () => {
    await interceptor.intercept(
      buildContext(
        { empresaId, trabajadorId, userId },
        '/informes/notaMedica/:empresaId/:trabajadorId/:notaMedicaId/:userId',
      ),
      next,
    );

    expect(
      organizationalAccessService.assertUserCanAccessTrabajador,
    ).toHaveBeenCalledWith(userId, empresaId, trabajadorId);
    expect(next.handle).toHaveBeenCalled();
  });

  it('omite validación en registrar-exportacion', async () => {
    await interceptor.intercept(
      buildContext(
        { empresaId },
        '/informes/dashboard/registrar-exportacion',
      ),
      next,
    );

    expect(
      organizationalAccessService.assertUserCanAccessTrabajador,
    ).not.toHaveBeenCalled();
    expect(next.handle).toHaveBeenCalled();
  });

  it('propaga ForbiddenException cuando no hay acceso', async () => {
    organizationalAccessService.assertUserCanAccessTrabajador.mockRejectedValue(
      new ForbiddenException('No tiene permiso'),
    );

    await expect(
      interceptor.intercept(
        buildContext(
          { empresaId, trabajadorId, userId },
          '/informes/aptitud/:empresaId/:trabajadorId/:aptitudId/:userId',
        ),
        next,
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(next.handle).not.toHaveBeenCalled();
  });
});
