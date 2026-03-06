/**
 * Folio Generator Utility
 *
 * Generates a deterministic 18-character alphanumeric folio from worker
 * identification data. Used for NOM-024-SSA3-2012 compliance and worker
 * record fusion (same person registered multiple times in same company).
 *
 * Same inputs always produce the same folio, enabling duplicate detection
 * even when CURP differs (e.g. one record has real CURP, another has generic).
 */

import { createHash } from 'crypto';

const FOLIO_LENGTH = 18;

/**
 * Normalizes a string: trim, uppercase, remove accents/diacritics
 */
function normalizeString(s: string): string {
  if (!s || typeof s !== 'string') return '';
  return s
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (á→a, ñ→n, etc.)
    .replace(/Ñ/g, 'N') // Explicit ñ→N for Spanish
    .replace(/\s+/g, ' '); // Collapse multiple spaces
}

/**
 * Formats date as YYYY-MM-DD for consistent hashing
 */
function formatDateISO(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generates a deterministic 18-character alphanumeric folio from worker data.
 *
 * Algorithm:
 * 1. Normalize: trim, uppercase, remove accents
 * 2. segundoApellido empty → "SIN"
 * 3. Build string: primerApellido|segundoApellido|nombre|fechaISO|sexo
 * 4. SHA-256 hash
 * 5. First 12 bytes → BigInt → base36 → take 18 chars (pad/truncate)
 *
 * @param data - Worker identification fields
 * @returns 18-character alphanumeric string (0-9, a-z)
 */
export function generateFolioFromWorkerData(data: {
  nombre: string;
  primerApellido: string;
  segundoApellido?: string;
  fechaNacimiento: Date;
  sexo: string;
}): string {
  const primerApellido = normalizeString(data.primerApellido || '');
  const segundoApellido = normalizeString(data.segundoApellido || '').trim()
    ? normalizeString(data.segundoApellido || '')
    : 'SIN';
  const nombre = normalizeString(data.nombre || '');
  const fechaISO = formatDateISO(data.fechaNacimiento);
  const sexo = normalizeString(data.sexo || '');

  const payload = `${primerApellido}|${segundoApellido}|${nombre}|${fechaISO}|${sexo}`;
  const hash = createHash('sha256').update(payload, 'utf8').digest();

  // Take first 12 bytes (96 bits), convert to BigInt
  const bytes = hash.subarray(0, 12);
  let bigInt = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    bigInt = (bigInt << BigInt(8)) | BigInt(bytes[i]);
  }

  // Convert to base36 (0-9, a-z)
  let base36 = bigInt.toString(36);

  // Ensure exactly 18 chars: pad with leading zeros or truncate
  if (base36.length < FOLIO_LENGTH) {
    base36 = base36.padStart(FOLIO_LENGTH, '0');
  } else if (base36.length > FOLIO_LENGTH) {
    base36 = base36.substring(0, FOLIO_LENGTH);
  }

  return base36;
}
