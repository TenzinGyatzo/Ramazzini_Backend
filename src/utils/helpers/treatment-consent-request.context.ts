import { RegulatoryPolicy } from '../regulatory-policy.service';

/**
 * Contexto resuelto por TreatmentConsentGuard para reutilizar en el handler
 * sin repetir canónico / cadena trabajador→proveedor / lectura de consentimiento.
 */
export interface TreatmentConsentRequestContext {
  canonicalTrabajadorId: string;
  proveedorSaludId: string;
  policy: RegulatoryPolicy;
  /** Presente solo si dailyConsentEnabled y existe consentimiento vigente */
  consentimientoId?: string | null;
  trabajador?: Record<string, any> | null;
}

export const TREATMENT_CONSENT_REQUEST_KEY = 'treatmentConsentContext';
