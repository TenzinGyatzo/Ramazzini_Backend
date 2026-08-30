import { UsersService } from './users.service';

describe('UsersService account status (IMP-010)', () => {
  let service: UsersService;
  let findByIdAndUpdate: jest.Mock;
  let findById: jest.Mock;

  beforeEach(() => {
    findByIdAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ cuentaActiva: false }),
    });
    findById = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            cuentaActiva: true,
            verified: true,
            idProveedorSalud: 'prov-1',
            tokensInvalidBefore: null,
          }),
        }),
      }),
    });

    service = new UsersService(
      {
        findByIdAndUpdate,
        findById,
      } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it('suspender setea cuentaActiva=false y tokensInvalidBefore=now', async () => {
    const before = Date.now();
    await service.toggleAccountStatus('user-1', false);
    const after = Date.now();

    expect(findByIdAndUpdate).toHaveBeenCalledTimes(1);
    const [, update] = findByIdAndUpdate.mock.calls[0];
    expect(update.$set.cuentaActiva).toBe(false);
    expect(update.$set.tokensInvalidBefore).toBeInstanceOf(Date);
    const ts = (update.$set.tokensInvalidBefore as Date).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('G: reactivar solo setea cuentaActiva=true y no toca tokensInvalidBefore', async () => {
    findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        cuentaActiva: true,
        tokensInvalidBefore: new Date('2026-08-30T12:00:00.000Z'),
      }),
    });
    await service.toggleAccountStatus('user-1', true);

    const [, update] = findByIdAndUpdate.mock.calls[0];
    expect(update.$set).toEqual({ cuentaActiva: true });
    expect(update.$unset).toBeUndefined();
    expect(update.$set.tokensInvalidBefore).toBeUndefined();
  });

  it('L: findAuthStatusById expone tokensInvalidBefore null', async () => {
    const status = await service.findAuthStatusById('user-1');
    expect(status).toEqual({
      cuentaActiva: true,
      verified: true,
      idProveedorSalud: 'prov-1',
      tokensInvalidBefore: null,
    });
  });
});
