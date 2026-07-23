/**
 * Reasons for organizational delete audit payloads (empresa / centro / auth).
 */
export const DeletionAuditReason = {
  MISSING_PASSWORD: 'MISSING_PASSWORD',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  RESGUARDED_DOCS_PRESENT: 'RESGUARDED_DOCS_PRESENT',
  CASCADE_CHILD_FAILED: 'CASCADE_CHILD_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  FILE_CLEANUP_FAILED: 'FILE_CLEANUP_FAILED',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
} as const;

export type DeletionAuditReasonValue =
  (typeof DeletionAuditReason)[keyof typeof DeletionAuditReason];

export type DeletionAuditResourceType =
  | 'empresa'
  | 'centroTrabajo'
  | 'usuario'
  | 'trabajador'
  | 'unknown';
