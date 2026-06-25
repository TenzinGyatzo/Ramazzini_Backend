import { SetMetadata } from '@nestjs/common';

export interface RequireTreatmentConsentOptions {
  action?: string;
  skipIfNoTrabajadorId?: boolean;
}

export const REQUIRE_TREATMENT_CONSENT_KEY = 'requireTreatmentConsent';

/**
 * Marca endpoints que requieren consentimiento para tratamiento de información (versión vigente).
 */
export const RequireTreatmentConsent = (
  options?: RequireTreatmentConsentOptions,
) => SetMetadata(REQUIRE_TREATMENT_CONSENT_KEY, options || {});
