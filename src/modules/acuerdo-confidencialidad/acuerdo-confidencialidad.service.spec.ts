import { AcuerdoConfidencialidadService } from './acuerdo-confidencialidad.service';

describe('AcuerdoConfidencialidadService gate cache', () => {
  const userId = '507f1f77bcf86cd799439011';
  const proveedorId = '507f1f77bcf86cd799439012';

  function createService(overrides?: {
    getIdProveedorSaludByUserId?: jest.Mock;
    getRegulatoryPolicy?: jest.Mock;
    findOne?: jest.Mock;
  }) {
    const getIdProveedorSaludByUserId =
      overrides?.getIdProveedorSaludByUserId ??
      jest.fn().mockResolvedValue(proveedorId);
    const getRegulatoryPolicy =
      overrides?.getRegulatoryPolicy ??
      jest.fn().mockResolvedValue({
        features: { confidentialityAgreementEnabled: true },
      });
    const findOne =
      overrides?.findOne ??
      jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

    const service = new AcuerdoConfidencialidadService(
      { findOne, create: jest.fn() } as any,
      { getRegulatoryPolicy } as any,
      { getIdProveedorSaludByUserId } as any,
      { record: jest.fn() } as any,
    );

    return {
      service,
      getIdProveedorSaludByUserId,
      getRegulatoryPolicy,
      findOne,
    };
  }

  it('resolveAgreementGate reutiliza cache y no repite lookups', async () => {
    const { service, getIdProveedorSaludByUserId, getRegulatoryPolicy, findOne } =
      createService();

    const first = await service.resolveAgreementGate(userId);
    const second = await service.resolveAgreementGate(userId);

    expect(first).toEqual({ required: true, accepted: false });
    expect(second).toEqual(first);
    expect(getIdProveedorSaludByUserId).toHaveBeenCalledTimes(1);
    expect(getRegulatoryPolicy).toHaveBeenCalledTimes(1);
    expect(findOne).toHaveBeenCalledTimes(1);
  });

  it('hasAcceptedCurrentVersion no re-resuelve required por separado', async () => {
    const { service, getIdProveedorSaludByUserId, getRegulatoryPolicy, findOne } =
      createService({
        findOne: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            versionAco: '1.0',
            fechaHoraAceptacion: new Date(),
          }),
        }),
      });

    await expect(service.isAgreementRequiredForUser(userId)).resolves.toBe(
      true,
    );
    await expect(service.hasAcceptedCurrentVersion(userId)).resolves.toBe(true);

    expect(getIdProveedorSaludByUserId).toHaveBeenCalledTimes(1);
    expect(getRegulatoryPolicy).toHaveBeenCalledTimes(1);
    expect(findOne).toHaveBeenCalledTimes(1);
  });

  it('si no aplica, accepted=true sin consultar aceptación', async () => {
    const findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });
    const { service, findOne: findOneMock } = createService({
      getRegulatoryPolicy: jest.fn().mockResolvedValue({
        features: { confidentialityAgreementEnabled: false },
      }),
      findOne,
    });

    await expect(service.resolveAgreementGate(userId)).resolves.toEqual({
      required: false,
      accepted: true,
    });
    expect(findOneMock).not.toHaveBeenCalled();
  });

  it('reutiliza proveedorSaludId pre-cargado sin lookup de user', async () => {
    const { service, getIdProveedorSaludByUserId, getRegulatoryPolicy } =
      createService();

    await expect(
      service.resolveAgreementGate(userId, {
        proveedorSaludId: proveedorId,
      }),
    ).resolves.toEqual({ required: true, accepted: false });

    expect(getIdProveedorSaludByUserId).not.toHaveBeenCalled();
    expect(getRegulatoryPolicy).toHaveBeenCalledWith(proveedorId);
  });
});
