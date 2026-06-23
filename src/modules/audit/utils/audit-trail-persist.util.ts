/**
 * Opt-in persistence for NOM-024 audit trails (auditevents, giisexportaudits).
 * Only `true` or `1` enable writes; any other value or absence disables persistence.
 */
export function isAuditTrailPersistEnabled(
  raw: string | undefined = process.env.AUDIT_TRAIL_PERSIST,
): boolean {
  return raw === 'true' || raw === '1';
}
