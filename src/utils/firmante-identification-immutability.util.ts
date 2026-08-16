import { RegulatoryPolicy } from './regulatory-policy.service';
import { policyFeatures } from './regulatory-policy-helpers';
import { isGenericCURP } from './curp-validator.util';
import { RegulatoryErrorCode } from './regulatory-error-codes';
import { createRegulatoryError } from './regulatory-error-helper';

export const FIRMANTE_IMMUTABLE_IDENTIFICATION_FIELDS = [
  'curp',
  'nombre',
  'primerApellido',
  'segundoApellido',
  'fechaNacimiento',
  'sexo',
  'sexoCURP',
  'entidadNacimiento',
  'paisNacimiento',
] as const;

export const FIRMANTE_CURP_CONFORMATION_FIELDS = [
  'nombre',
  'primerApellido',
  'segundoApellido',
  'fechaNacimiento',
  'sexo',
  'sexoCURP',
  'entidadNacimiento',
  'paisNacimiento',
] as const;

export type FirmanteImmutableIdentificationField =
  (typeof FIRMANTE_IMMUTABLE_IDENTIFICATION_FIELDS)[number];

/** Snapshot mínimo del firmante para validar inmutabilidad (compatible con documentos Mongoose). */
export interface FirmanteIdentificationCurrent {
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
 * Campos de identificación que no pueden modificarse en update, según CURP almacenada.
 * Si la CURP almacenada es genérica, se eximen curp y campos de conformación CURP.
 */
export function getFirmanteImmutableIdentificationFields(
  current: Pick<FirmanteIdentificationCurrent, 'curp'>,
): readonly FirmanteImmutableIdentificationField[] {
  const all = [...FIRMANTE_IMMUTABLE_IDENTIFICATION_FIELDS];

  if (isGenericCURP(current.curp ?? '')) {
    const exempt = new Set<string>([
      'curp',
      ...FIRMANTE_CURP_CONFORMATION_FIELDS,
    ]);
    return all.filter(
      (f) => !exempt.has(f),
    ) as FirmanteImmutableIdentificationField[];
  }

  return all;
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

function normalizePaisNacimiento(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  return String(value);
}

function getNormalizedFieldValue(
  field: FirmanteImmutableIdentificationField,
  source: Record<string, unknown>,
): string {
  const raw = source[field];

  switch (field) {
    case 'fechaNacimiento':
      return normalizeFechaNacimiento(raw);
    case 'paisNacimiento':
      return normalizePaisNacimiento(raw);
    case 'curp':
    case 'nombre':
    case 'primerApellido':
    case 'segundoApellido':
    case 'entidadNacimiento':
      return normalizeUpperString(raw);
    case 'sexo':
      return normalizeOptionalString(raw);
    case 'sexoCURP':
      return raw == null || raw === '' ? '' : String(raw);
    default:
      return normalizeOptionalString(raw);
  }
}

function hasFieldChanged(
  field: FirmanteImmutableIdentificationField,
  updateDto: Record<string, unknown>,
  current: FirmanteIdentificationCurrent,
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
 * Reutiliza workerIdentificationImmutable de la policy (misma regla post-alta).
 */
export function validateFirmanteIdentificationImmutable(
  updateDto: Record<string, unknown>,
  current: FirmanteIdentificationCurrent,
  policy: RegulatoryPolicy,
): void {
  if (!policyFeatures.workerIdentificationImmutable(policy)) {
    return;
  }

  const immutableFields = getFirmanteImmutableIdentificationFields(current);
  const changedFields: string[] = [];

  for (const field of immutableFields) {
    if (updateDto[field] === undefined) {
      continue;
    }
    if (hasFieldChanged(field, updateDto, current)) {
      changedFields.push(field);
    }
  }

  if (changedFields.length > 0) {
    throw createRegulatoryError({
      errorCode: RegulatoryErrorCode.REGIMEN_WORKER_IDENTIFICATION_IMMUTABLE,
      details: { immutableFields: changedFields, subject: 'firmante' },
      regime: policy.regime,
    });
  }
}
