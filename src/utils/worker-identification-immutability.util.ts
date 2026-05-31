import { CreateTrabajadorDto } from 'src/modules/trabajadores/dto/create-trabajador.dto';
import { RegulatoryPolicy } from './regulatory-policy.service';
import { policyFeatures } from './regulatory-policy-helpers';
import { isGenericCURP } from './curp-validator.util';
import { RegulatoryErrorCode } from './regulatory-error-codes';
import { createRegulatoryError } from './regulatory-error-helper';

export const WORKER_IMMUTABLE_IDENTIFICATION_FIELDS = [
  'curp',
  'nombre',
  'primerApellido',
  'segundoApellido',
  'fechaNacimiento',
  'sexo',
  'entidadNacimiento',
  'paisNacimiento',
] as const;

export const WORKER_CURP_CONFORMATION_FIELDS = [
  'nombre',
  'primerApellido',
  'segundoApellido',
  'fechaNacimiento',
  'sexo',
  'entidadNacimiento',
] as const;

export type WorkerImmutableIdentificationField =
  (typeof WORKER_IMMUTABLE_IDENTIFICATION_FIELDS)[number];

export const PAIS_NACIMIENTO_MEXICO = 142;

const MEXICAN_ENTIDAD_NACIMIENTO_PATTERN = /^(0[1-9]|[12][0-9]|3[0-2])$/;

/** Snapshot mínimo del trabajador para validar inmutabilidad (compatible con documentos Mongoose). */
export interface WorkerIdentificationCurrent {
  curp?: string;
  nombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  fechaNacimiento?: Date | string;
  sexo?: string;
  entidadNacimiento?: string;
  paisNacimiento?: number;
  toObject?: () => Record<string, unknown>;
}

export function isMexicanEntidadNacimiento(code: string | undefined): boolean {
  if (!code) return false;
  return MEXICAN_ENTIDAD_NACIMIENTO_PATTERN.test(code.trim().toUpperCase());
}

function hasStoredPaisNacimiento(paisNacimiento: unknown): boolean {
  return paisNacimiento !== null && paisNacimiento !== undefined && paisNacimiento !== '';
}

/**
 * paisNacimiento solo es inmutable si hay valor almacenado, CURP real,
 * país 142 (México) y entidad de nacimiento estatal MX (01-32).
 */
export function isPaisNacimientoImmutable(
  current: Pick<
    WorkerIdentificationCurrent,
    'curp' | 'paisNacimiento' | 'entidadNacimiento'
  >,
): boolean {
  if (isGenericCURP(current.curp ?? '')) {
    return false;
  }

  if (!hasStoredPaisNacimiento(current.paisNacimiento)) {
    return false;
  }

  if (Number(current.paisNacimiento) !== PAIS_NACIMIENTO_MEXICO) {
    return false;
  }

  return isMexicanEntidadNacimiento(current.entidadNacimiento);
}

/**
 * Campos de identificación que no pueden modificarse en update, según CURP almacenada.
 * Si la CURP almacenada es genérica, se eximen curp y campos de conformación CURP.
 * paisNacimiento solo se incluye si cumple isPaisNacimientoImmutable.
 */
export function getWorkerImmutableIdentificationFields(
  current: Pick<
    WorkerIdentificationCurrent,
    'curp' | 'paisNacimiento' | 'entidadNacimiento'
  >,
): readonly WorkerImmutableIdentificationField[] {
  let fields = [...WORKER_IMMUTABLE_IDENTIFICATION_FIELDS];

  if (isGenericCURP(current.curp ?? '')) {
    const exempt = new Set<string>([
      'curp',
      ...WORKER_CURP_CONFORMATION_FIELDS,
    ]);
    fields = fields.filter((f) => !exempt.has(f));
  }

  if (!isPaisNacimientoImmutable(current)) {
    fields = fields.filter((f) => f !== 'paisNacimiento');
  }

  return fields as WorkerImmutableIdentificationField[];
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
): void {
  if (!policyFeatures.workerIdentificationImmutable(policy)) {
    return;
  }

  const immutableFields = getWorkerImmutableIdentificationFields(current);
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
