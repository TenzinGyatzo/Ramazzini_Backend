import { CreateTrabajadorDto } from 'src/modules/trabajadores/dto/create-trabajador.dto';
import { RegulatoryPolicy } from './regulatory-policy.service';
import { policyFeatures } from './regulatory-policy-helpers';
import { isGenericCURP } from './curp-validator.util';
import { RegulatoryErrorCode } from './regulatory-error-codes';
import { createRegulatoryError } from './regulatory-error-helper';

/** Campos bloqueados con CURP real o con atención clínica finalizada. */
export const WORKER_IMMUTABLE_IDENTIFICATION_FIELDS = [
  'curp',
  'nombre',
  'primerApellido',
  'segundoApellido',
  'fechaNacimiento',
  'sexoCURP',
  'entidadNacimiento',
  'paisNacimiento',
] as const;

export const WORKER_CURP_CONFORMATION_FIELDS = [
  'nombre',
  'primerApellido',
  'segundoApellido',
  'fechaNacimiento',
  'sexoCURP',
  'entidadNacimiento',
  'paisNacimiento',
] as const;

export type WorkerImmutableIdentificationField =
  | (typeof WORKER_IMMUTABLE_IDENTIFICATION_FIELDS)[number]
  | 'sexo';

export interface WorkerIdentificationLockOptions {
  hasFinalizedClinicalDocument?: boolean;
}

/** Snapshot mínimo del trabajador para validar inmutabilidad (compatible con documentos Mongoose). */
export interface WorkerIdentificationCurrent {
  curp?: string;
  nombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  fechaNacimiento?: Date | string;
  sexo?: string;
  sexoCURP?: number;
  entidadNacimiento?: string;
  paisNacimiento?: number;
  toObject?: () => Record<string, unknown>;
}

/**
 * Campos de identificación que no pueden modificarse en update.
 * - CURP genérica y sin atención: ninguno.
 * - CURP real y sin atención: lista común (sin sexo biológico).
 * - Con atención: lista común más sexo biológico, aunque la CURP sea genérica.
 */
export function getWorkerImmutableIdentificationFields(
  current: Pick<WorkerIdentificationCurrent, 'curp'>,
  options?: WorkerIdentificationLockOptions,
): readonly WorkerImmutableIdentificationField[] {
  if (options?.hasFinalizedClinicalDocument) {
    return [...WORKER_IMMUTABLE_IDENTIFICATION_FIELDS, 'sexo'];
  }

  if (isGenericCURP(current.curp ?? '')) {
    return [];
  }

  return [...WORKER_IMMUTABLE_IDENTIFICATION_FIELDS];
}

function normalizeOptionalString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function normalizeUpperString(value: unknown): string {
  return normalizeOptionalString(value).toUpperCase();
}

function normalizePaisNacimiento(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  return String(value);
}

function normalizeFechaNacimiento(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  const date = value instanceof Date ? value : new Date(value as string);
  if (Number.isNaN(date.getTime())) {
    return normalizeOptionalString(value);
  }
  return date.toISOString().slice(0, 10);
}

function getNormalizedFieldValue(
  field: WorkerImmutableIdentificationField,
  source: Record<string, unknown>,
): string {
  const raw = source[field];

  switch (field) {
    case 'fechaNacimiento':
      return normalizeFechaNacimiento(raw);
    case 'curp':
    case 'nombre':
    case 'primerApellido':
    case 'segundoApellido':
    case 'entidadNacimiento':
      return normalizeUpperString(raw);
    case 'paisNacimiento':
      return normalizePaisNacimiento(raw);
    case 'sexo':
      return normalizeOptionalString(raw);
    case 'sexoCURP':
      return raw == null || raw === '' ? '' : String(raw);
    default:
      return normalizeOptionalString(raw);
  }
}

function hasFieldChanged(
  field: WorkerImmutableIdentificationField,
  updateDto: Record<string, unknown>,
  current: WorkerIdentificationCurrent,
): boolean {
  const newValue = getNormalizedFieldValue(field, updateDto);
  const currentValue = getNormalizedFieldValue(
    field,
    current.toObject?.() ?? (current as unknown as Record<string, unknown>),
  );
  return newValue !== currentValue;
}

/**
 * Rechaza actualizaciones a campos de identificación inmutables en régimen SIRES.
 */
export function validateWorkerIdentificationImmutable(
  updateDto: Partial<CreateTrabajadorDto>,
  current: WorkerIdentificationCurrent,
  policy: RegulatoryPolicy,
  options?: WorkerIdentificationLockOptions,
): void {
  if (!policyFeatures.workerIdentificationImmutable(policy)) {
    return;
  }

  const immutableFields = getWorkerImmutableIdentificationFields(
    current,
    options,
  );
  const dtoRecord = updateDto as Record<string, unknown>;
  const changedFields: string[] = [];

  for (const field of immutableFields) {
    if (dtoRecord[field] === undefined) {
      continue;
    }
    if (hasFieldChanged(field, dtoRecord, current)) {
      changedFields.push(field);
    }
  }

  if (changedFields.length > 0) {
    throw createRegulatoryError({
      errorCode: RegulatoryErrorCode.REGIMEN_WORKER_IDENTIFICATION_IMMUTABLE,
      details: { immutableFields: changedFields },
      regime: policy.regime,
    });
  }
}
