import { RegulatoryPolicyService } from './regulatory-policy.service';

describe('RegulatoryPolicyService cache', () => {
  const proveedorId = '507f1f77bcf86cd799439011';

  it('reutiliza política dentro del TTL sin volver a consultar proveedor', async () => {
    const findOne = jest.fn().mockResolvedValue({
      regimenRegulatorio: 'SIRES_NOM024',
    });
    const service = new RegulatoryPolicyService({
      findOne,
    } as any);

    const first = await service.getRegulatoryPolicy(proveedorId);
    const second = await service.getRegulatoryPolicy(proveedorId);

    expect(first.regime).toBe('SIRES_NOM024');
    expect(second.regime).toBe('SIRES_NOM024');
    expect(findOne).toHaveBeenCalledTimes(1);
  });
});
