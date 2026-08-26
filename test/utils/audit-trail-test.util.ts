import { RegulatoryPolicyService } from '../../src/utils/regulatory-policy.service';

export const AUDIT_TRAIL_PERSIST_ENV = 'AUDIT_TRAIL_PERSIST';

export function enableAuditTrailPersist(): void {
  process.env[AUDIT_TRAIL_PERSIST_ENV] = 'true';
}

export function disableAuditTrailPersist(): void {
  delete process.env[AUDIT_TRAIL_PERSIST_ENV];
}

export const mockRegulatoryPolicyServiceSires = {
  provide: RegulatoryPolicyService,
  useValue: {
    getRegulatoryPolicy: jest.fn().mockResolvedValue({
      regime: 'SIRES_NOM024',
      features: { auditTrailEnabled: true },
      validation: {},
    }),
  },
};

export const mockRegulatoryPolicyServiceSinRegimen = {
  provide: RegulatoryPolicyService,
  useValue: {
    getRegulatoryPolicy: jest.fn().mockResolvedValue({
      regime: 'SIN_REGIMEN',
      features: { auditTrailEnabled: true },
      validation: {},
    }),
  },
};
