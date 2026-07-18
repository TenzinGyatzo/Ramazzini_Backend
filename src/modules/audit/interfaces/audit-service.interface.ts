/**
 * Phase 4 AuditTrail — Contract for audit event recording (no persistence in this interface).
 */
import type { AuditActionTypeValue } from '../constants/audit-action-type';
import type { AuditEventClassValue } from '../constants/audit-event-class';

export interface AuditActorSnapshot {
  username: string;
  email: string;
  role: string;
}

export interface RecordAuditParams {
  proveedorSaludId: string | null;
  actorId: string | null;
  actionType: AuditActionTypeValue;
  resourceType?: string | null;
  resourceId?: string | null;
  payload?: Record<string, unknown> | null;
  eventClass: AuditEventClassValue;
  /** Si ya se resolvió el actor, evita un findById adicional en record(). */
  actorSnapshot?: AuditActorSnapshot | null;
}

export interface IAuditService {
  record(params: RecordAuditParams): Promise<void>;
}
