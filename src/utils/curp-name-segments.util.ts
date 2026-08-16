/**
 * Extracción canónica de segmentos de nombre para validación CURP (RENAPO).
 *
 * Iteración 1: reglas básicas (iniciales 1-4, consonantes internas 14-16).
 * Iteración 2: casos especiales RENAPO (partículas, compuestos, MARIA/JOSE, Ñ,
 * caracteres especiales, palabras inconvenientes, apellidos ausentes, etc.).
 *
 * Pendiente (opcional): checksum bloqueante en posición 18.
 */

import { applyInconvenientWordFilter } from './curp-inconvenient-words.util';
import {
  getCurpFirstInternalConsonant,
  getCurpFirstInternalVowel,
  getCurpInitial,
} from './curp-name-char.util';
import {
  resolveCurpNameParts,
  resolveGivenWordForConsonant,
} from './curp-name-resolve.util';

const ACCENT_REPLACEMENTS: Record<string, string> = {
  Á: 'A',
  À: 'A',
  Ä: 'A',
  Â: 'A',
  É: 'E',
  È: 'E',
  Ë: 'E',
  Ê: 'E',
  Í: 'I',
  Ì: 'I',
  Ï: 'I',
  Î: 'I',
  Ó: 'O',
  Ò: 'O',
  Ö: 'O',
  Ô: 'O',
  Ú: 'U',
  Ù: 'U',
  Ü: 'U',
  Û: 'U',
};

export interface CurpNameData {
  nombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
}

export interface CurpNameSegments {
  iniciales: string;
  inicialesRaw: string;
  consonantes: string;
}

/**
 * Normaliza texto para comparaciones auxiliares: trim, uppercase, quita acentos, conserva Ñ.
 * No usar para extracción posicional CURP (usar curp-name-char.util).
 */
export function normalizeForCurp(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let normalized = text.trim().toUpperCase();

  normalized = normalized
    .split('')
    .map((char) => ACCENT_REPLACEMENTS[char] ?? char)
    .join('');

  return normalized.replace(/[^A-ZÑ\s]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * @deprecated Usar resolveEffectiveGivenName vía deriveCurpNameSegments.
 * Mantenido por compatibilidad de tests legacy.
 */
export function getPrimerNombre(nombre: string): string {
  const normalized = normalizeForCurp(nombre);
  return normalized.split(/\s+/).filter(Boolean)[0] ?? '';
}

/**
 * Primera vocal interna; delega a reglas RENAPO completas.
 */
export function getFirstInternalVowel(word: string): string {
  return getCurpFirstInternalVowel(word);
}

/**
 * Primera consonante interna; delega a reglas RENAPO completas.
 */
export function getFirstInternalConsonant(word: string): string {
  return getCurpFirstInternalConsonant(word);
}

/**
 * Deriva los segmentos de nombre esperados en la CURP (posiciones 1-4 y 14-16).
 */
export function deriveCurpNameSegments(data: CurpNameData): CurpNameSegments {
  const parts = resolveCurpNameParts(data);
  const nombreConsonantWord = resolveGivenWordForConsonant(data);

  let pos1 = 'X';
  let pos2 = 'X';
  let pos3 = 'X';
  let pos4 = 'X';
  let pos14 = 'X';
  let pos15 = 'X';
  let pos16 = 'X';

  if (parts.sinApellidos) {
    pos4 = getCurpInitial(parts.nombre);
    pos16 = getCurpFirstInternalConsonant(nombreConsonantWord);
  } else if (parts.unSoloApellido) {
    pos1 = getCurpInitial(parts.primerApellido);
    pos2 = getCurpFirstInternalVowel(parts.primerApellido);
    pos3 = 'X';
    pos4 = getCurpInitial(parts.nombre);
    pos14 = getCurpFirstInternalConsonant(parts.primerApellido);
    pos15 = 'X';
    pos16 = getCurpFirstInternalConsonant(nombreConsonantWord);
  } else {
    pos1 = getCurpInitial(parts.primerApellido);
    pos2 = getCurpFirstInternalVowel(parts.primerApellido);
    pos3 = getCurpInitial(parts.segundoApellido);
    pos4 = getCurpInitial(parts.nombre);
    pos14 = getCurpFirstInternalConsonant(parts.primerApellido);
    pos15 = getCurpFirstInternalConsonant(parts.segundoApellido);
    pos16 = getCurpFirstInternalConsonant(nombreConsonantWord);
  }

  const inicialesRaw = `${pos1}${pos2}${pos3}${pos4}`;

  return {
    iniciales: applyInconvenientWordFilter(inicialesRaw),
    inicialesRaw,
    consonantes: `${pos14}${pos15}${pos16}`,
  };
}

/**
 * Valida que la homoclave (posición 17) cumpla la regla de siglo según fecha de nacimiento.
 */
export function getExpectedHomoclavePattern(birthYear: number): {
  pattern: RegExp;
  label: string;
} {
  if (birthYear < 2000) {
    return { pattern: /^[0-9]$/, label: '0-9' };
  }

  return { pattern: /^[A-J]$/, label: 'A-J' };
}
