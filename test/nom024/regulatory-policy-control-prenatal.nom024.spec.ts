/**
 * Regulatory Policy - Control Prenatal availability by régimen
 */

import { RegulatoryPolicyService } from '../../src/utils/regulatory-policy.service';
import { policyFeatures } from '../../src/utils/regulatory-policy-helpers';
import { ProveedoresSaludService } from '../../src/modules/proveedores-salud/proveedores-salud.service';

describe('Regulatory Policy - Control Prenatal (SIN_REGIMEN only)', () => {
  let service: RegulatoryPolicyService;
  let proveedoresSaludService: jest.Mocked<Pick<ProveedoresSaludService, 'findOne'>>;

  beforeEach(() => {
    proveedoresSaludService = {
      findOne: jest.fn(),
    };
    service = new RegulatoryPolicyService(
      proveedoresSaludService as unknown as ProveedoresSaludService,
    );
  });

  it('should disable controlPrenatal for SIRES_NOM024', async () => {
    proveedoresSaludService.findOne.mockResolvedValue({
      regimenRegulatorio: 'SIRES_NOM024',
    } as any);

    const policy = await service.getRegulatoryPolicy('507f1f77bcf86cd799439011');

    expect(policy.regime).toBe('SIRES_NOM024');
    expect(policy.features.controlPrenatalEnabled).toBe(false);
    expect(policyFeatures.controlPrenatalEnabled(policy)).toBe(false);
  });

  it('should enable controlPrenatal for SIN_REGIMEN', async () => {
    proveedoresSaludService.findOne.mockResolvedValue({
      regimenRegulatorio: 'SIN_REGIMEN',
    } as any);

    const policy = await service.getRegulatoryPolicy('507f1f77bcf86cd799439011');

    expect(policy.regime).toBe('SIN_REGIMEN');
    expect(policy.features.controlPrenatalEnabled).toBe(true);
    expect(policyFeatures.controlPrenatalEnabled(policy)).toBe(true);
  });

  it('should default to SIN_REGIMEN policy (controlPrenatal enabled) when régimen is missing', async () => {
    proveedoresSaludService.findOne.mockResolvedValue({
      regimenRegulatorio: undefined,
    } as any);

    const policy = await service.getRegulatoryPolicy('507f1f77bcf86cd799439011');

    expect(policy.regime).toBe('SIN_REGIMEN');
    expect(policy.features.controlPrenatalEnabled).toBe(true);
  });
});
