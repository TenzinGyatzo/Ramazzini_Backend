/**
 * Resolución de palabras efectivas para segmentos CURP (RENAPO).
 * Partículas, apellidos compuestos, nombres compuestos y excepciones MARIA/JOSE.
 */

import { CurpNameData } from './curp-name-segments.util';

export const CURP_SURNAME_PARTICLES = new Set([
  'DA',
  'DAS',
  'DE',
  'DEL',
  'DER',
  'DI',
  'DIE',
  'DD',
  'Y',
  'EL',
  'LA',
  'LOS',
  'LAS',
  'LE',
  'LES',
  'MAC',
  'MC',
  'VAN',
  'VON',
]);

export const CURP_COMMON_GIVEN_PREFIXES = new Set([
  'MARIA',
  'MA.',
  'MA',
  'M.',
  'M',
  'JOSE',
  'J.',
  'J',
]);

export interface ResolvedCurpNameParts {
  primerApellido: string;
  segundoApellido: string;
  nombre: string;
  sinApellidos: boolean;
  unSoloApellido: boolean;
}

const ACCENT_TO_BASE: Record<string, string> = {
  Á: 'A',
  À: 'A',
  Â: 'A',
  Ä: 'A',
  É: 'E',
  È: 'E',
  Ê: 'E',
  Ë: 'E',
  Í: 'I',
  Ì: 'I',
  Î: 'I',
  Ï: 'I',
  Ó: 'O',
  Ò: 'O',
  Ô: 'O',
  Ö: 'O',
  Ú: 'U',
  Ù: 'U',
  Û: 'U',
  Ü: 'U',
};

function normalizeTokenKey(token: string): string {
  return token
    .trim()
    .toUpperCase()
    .split('')
    .map((char) => ACCENT_TO_BASE[char] ?? char)
    .join('');
}

function isBlank(value?: string): boolean {
  return !value || value.trim() === '';
}

/**
 * Tokeniza un fragmento de nombre/apellido por espacios.
 */
export function tokenizeNamePart(raw: string): string[] {
  if (!raw?.trim()) {
    return [];
  }

  return raw.trim().split(/\s+/).filter(Boolean);
}

/**
 * Token de apellido para extracción CURP (regla 1.5: primera palabra por espacio).
 * El guión se conserva en el token; en conformación de clave se trata como X (regla 1.4).
 */
export function getSurnameTokenSegment(token: string): string {
  return token;
}

/**
 * Omite partículas al inicio de la lista de tokens.
 */
export function skipLeadingParticles(tokens: string[]): string[] {
  let index = 0;

  while (index < tokens.length) {
    const key = normalizeTokenKey(tokens[index]);
    if (!CURP_SURNAME_PARTICLES.has(key)) {
      break;
    }
    index++;
  }

  return tokens.slice(index);
}

/**
 * Primera palabra significativa de un apellido (reglas 1.5, 1.7).
 */
export function resolveEffectiveSurname(raw?: string): string {
  const tokens = skipLeadingParticles(tokenizeNamePart(raw ?? ''));
  if (tokens.length === 0) {
    return '';
  }

  return getSurnameTokenSegment(tokens[0]);
}

function isCommonGivenPrefix(token: string): boolean {
  return CURP_COMMON_GIVEN_PREFIXES.has(normalizeTokenKey(token));
}

/**
 * Palabra efectiva del nombre para posición 4 (reglas 1.2, 1.3).
 */
export function resolveEffectiveGivenName(raw?: string): string {
  let tokens = skipLeadingParticles(tokenizeNamePart(raw ?? ''));
  if (tokens.length === 0) {
    return '';
  }

  if (isCommonGivenPrefix(tokens[0])) {
    const remaining = skipLeadingParticles(tokens.slice(1));
    return remaining[0] ?? '';
  }

  return tokens[0];
}

/**
 * Palabra efectiva del nombre para consonante interna pos 16 (regla 1.16).
 */
export function resolveEffectiveGivenNameForConsonant(raw?: string): string {
  return resolveEffectiveGivenName(raw);
}

/**
 * Resuelve apellidos y nombre con flags estructurales (1.10, 1.11).
 */
export function resolveCurpNameParts(data: CurpNameData): ResolvedCurpNameParts {
  const hasPrimer = !isBlank(data.primerApellido);
  const hasSegundo = !isBlank(data.segundoApellido);
  const sinApellidos = !hasPrimer && !hasSegundo;
  const unSoloApellido = hasPrimer && !hasSegundo;

  return {
    primerApellido: resolveEffectiveSurname(data.primerApellido),
    segundoApellido: hasSegundo
      ? resolveEffectiveSurname(data.segundoApellido)
      : '',
    nombre: resolveEffectiveGivenName(data.nombre),
    sinApellidos,
    unSoloApellido,
  };
}

/**
 * Palabra para consonante interna del nombre (pos 16), con excepción MARIA/JOSE.
 */
export function resolveGivenWordForConsonant(data: CurpNameData): string {
  return resolveEffectiveGivenNameForConsonant(data.nombre);
}
