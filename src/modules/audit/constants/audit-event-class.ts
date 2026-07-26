/**
 * Phase 4 AuditTrail — D8: sync + criticality classes.
 * CLASS_1 (hard-fail): if audit write fails, the operation fails.
 * CLASS_2 (soft-fail): if audit write fails, fallback to audit_outbox + alert.
 */
export const AuditEventClass = {
  CLASS_1_HARD_FAIL: 'CLASS_1_HARD_FAIL',
  CLASS_2_SOFT_FAIL: 'CLASS_2_SOFT_FAIL',
} as const;

export type AuditEventClassValue =
  (typeof AuditEventClass)[keyof typeof AuditEventClass];

/**
 * Mapping: actionType → default event class.
 * Clase 1: finalizar, corrección, anular, export GIIS, roles/permisos.
 * Clase 2: login fail and other auxiliary events.
 */
import { AuditActionType } from './audit-action-type';

export const ACTION_TYPE_TO_CLASS: Record<
  string,
  | typeof AuditEventClass.CLASS_1_HARD_FAIL
  | typeof AuditEventClass.CLASS_2_SOFT_FAIL
> = {
  [AuditActionType.DOC_FINALIZE]: AuditEventClass.CLASS_1_HARD_FAIL,
  [AuditActionType.DOC_ANULATE]: AuditEventClass.CLASS_1_HARD_FAIL,
  [AuditActionType.ADMIN_ROLES_PERMISSIONS]: AuditEventClass.CLASS_1_HARD_FAIL,
  [AuditActionType.ADMIN_CONFIG_SIRES]: AuditEventClass.CLASS_1_HARD_FAIL,
  [AuditActionType.GIIS_EXPORT_FILE_GENERATED]:
    AuditEventClass.CLASS_1_HARD_FAIL,
  [AuditActionType.GIIS_EXPORT_DOWNLOADED]: AuditEventClass.CLASS_1_HARD_FAIL,
  [AuditActionType.AUDIT_EXPORT_DOWNLOAD]: AuditEventClass.CLASS_1_HARD_FAIL,
  [AuditActionType.LOGIN_SUCCESS]: AuditEventClass.CLASS_2_SOFT_FAIL,
  [AuditActionType.LOGIN_FAIL]: AuditEventClass.CLASS_2_SOFT_FAIL,
  [AuditActionType.SESSION_UNLOCK_SUCCESS]: AuditEventClass.CLASS_2_SOFT_FAIL,
  [AuditActionType.SESSION_UNLOCK_FAIL]: AuditEventClass.CLASS_2_SOFT_FAIL,
  [AuditActionType.DOC_CREATE_DRAFT]: AuditEventClass.CLASS_2_SOFT_FAIL,
  [AuditActionType.DOC_UPDATE_DRAFT]: AuditEventClass.CLASS_2_SOFT_FAIL,
  [AuditActionType.ADMIN_USER_ASSIGNMENTS]: AuditEventClass.CLASS_1_HARD_FAIL,
  // Phase 5: user and signer mutations
  [AuditActionType.USER_INVITATION_SENT]: AuditEventClass.CLASS_1_HARD_FAIL,
  [AuditActionType.USER_ACTIVATED]: AuditEventClass.CLASS_1_HARD_FAIL,
  [AuditActionType.USER_SUSPENDED]: AuditEventClass.CLASS_1_HARD_FAIL,
  [AuditActionType.USER_REACTIVATED]: AuditEventClass.CLASS_1_HARD_FAIL,
  [AuditActionType.USER_DELETED]: AuditEventClass.CLASS_1_HARD_FAIL,
  [AuditActionType.USER_PASSWORD_CHANGED]: AuditEventClass.CLASS_1_HARD_FAIL,
  [AuditActionType.SIGNER_PROFILE_CREATED]: AuditEventClass.CLASS_1_HARD_FAIL,
  [AuditActionType.SIGNER_PROFILE_UPDATED]: AuditEventClass.CLASS_1_HARD_FAIL,
  [AuditActionType.WORKER_FUSION_MANUAL]: AuditEventClass.CLASS_1_HARD_FAIL,
  [AuditActionType.WORKER_TRANSFER]: AuditEventClass.CLASS_1_HARD_FAIL,
  [AuditActionType.ACUERDO_CONFIDENCIALIDAD_ACEPTADO]:
    AuditEventClass.CLASS_1_HARD_FAIL,
  [AuditActionType.WORKERS_EXPORT_EXCEL]: AuditEventClass.CLASS_2_SOFT_FAIL,
  [AuditActionType.DASHBOARD_REPORT_EXPORTED]:
    AuditEventClass.CLASS_2_SOFT_FAIL,
  [AuditActionType.EMPRESA_UPDATED]: AuditEventClass.CLASS_2_SOFT_FAIL,
  [AuditActionType.EMPRESA_DELETED]: AuditEventClass.CLASS_1_HARD_FAIL,
  [AuditActionType.EMPRESA_DELETE_DENIED]: AuditEventClass.CLASS_2_SOFT_FAIL,
  [AuditActionType.CENTRO_UPDATED]: AuditEventClass.CLASS_2_SOFT_FAIL,
  [AuditActionType.CENTRO_DELETED]: AuditEventClass.CLASS_1_HARD_FAIL,
  [AuditActionType.CENTRO_DELETE_DENIED]: AuditEventClass.CLASS_2_SOFT_FAIL,
  [AuditActionType.DELETION_AUTH_FAIL]: AuditEventClass.CLASS_2_SOFT_FAIL,
};
