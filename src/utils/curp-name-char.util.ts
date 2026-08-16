/**
 * Extracción carácter a carácter para segmentos CURP (RENAPO).
 * Opera sobre el texto original del token para respetar apóstrofos, Ñ y diéresis.
 *
 * Iniciales (pos. 1–4): Ä/Ë/Ï/Ö → X; Ü → U.
 * Consonantes internas (pos. 14–16): diéresis se tratan como vocal (no consonante).
 */

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

const ACCENT_TO_BASE: Record<string, string> = {
  Á: 'A',
  À: 'A',
  Â: 'A',
  É: 'E',
  È: 'E',
  Ê: 'E',
  Í: 'I',
  Ì: 'I',
  Î: 'I',
  Ó: 'O',
  Ò: 'O',
  Ô: 'O',
  Ú: 'U',
  Ù: 'U',
  Û: 'U',
};

/** Pos. 1–4: sustituir por X en conformación CURP. */
const DIERESIS_INICIALES_TO_X = new Set(['Ä', 'Ë', 'Ï', 'Ö', 'ä', 'ë', 'ï', 'ö']);

/** Pos. 1–4: sustituir por U. Pos. 14–16: tratar como vocal U. */
const DIERESIS_UMLAUT_U = new Set(['Ü', 'ü']);

/** Pos. 14–16: equivalencia vocal para omitir al buscar consonante interna. */
const DIERESIS_TO_VOWEL: Record<string, string> = {
  Ä: 'A',
  ä: 'A',
  Ë: 'E',
  ë: 'E',
  Ï: 'I',
  ï: 'I',
  Ö: 'O',
  ö: 'O',
  Ü: 'U',
  ü: 'U',
};

const SPECIAL_CURP_CHARS = new Set(["'", '/', '.', '-']);

export interface NormalizedCurpChar {
  value: string | null;
  isSpecial: boolean;
}

function isAsciiLetter(char: string): boolean {
  return /^[A-ZÑ]$/.test(char);
}

export function isDieresisVowel(char: string): boolean {
  return char in DIERESIS_TO_VOWEL;
}

function normalizeCurpCharBase(char: string): NormalizedCurpChar {
  if (!char) {
    return { value: null, isSpecial: false };
  }

  if (SPECIAL_CURP_CHARS.has(char)) {
    return { value: null, isSpecial: true };
  }

  const upper = char.toUpperCase();
  const base = ACCENT_TO_BASE[upper] ?? upper;

  if (isAsciiLetter(base)) {
    return { value: base, isSpecial: false };
  }

  return { value: null, isSpecial: false };
}

/** Normalización para búsqueda de consonante interna (pos. 14–16). */
function normalizeCurpCharForConsonantScan(char: string): NormalizedCurpChar {
  if (!char) {
    return { value: null, isSpecial: false };
  }

  if (SPECIAL_CURP_CHARS.has(char)) {
    return { value: null, isSpecial: true };
  }

  const dieresisVowel = DIERESIS_TO_VOWEL[char];
  if (dieresisVowel) {
    return { value: dieresisVowel, isSpecial: false };
  }

  return normalizeCurpCharBase(char);
}

function curpLetterForInitial(normalized: NormalizedCurpChar): string {
  if (normalized.isSpecial || !normalized.value) {
    return 'X';
  }

  if (normalized.value === 'Ñ') {
    return 'X';
  }

  return normalized.value;
}

function curpLetterForInternalVowel(normalized: NormalizedCurpChar): string | null {
  if (normalized.isSpecial || !normalized.value) {
    return 'X';
  }

  if (VOWELS.has(normalized.value)) {
    return normalized.value;
  }

  return null;
}

function curpLetterForInternalConsonant(normalized: NormalizedCurpChar): string | null {
  if (normalized.isSpecial || !normalized.value) {
    return 'X';
  }

  if (normalized.value === 'Ñ') {
    return 'X';
  }

  if (VOWELS.has(normalized.value)) {
    return null;
  }

  return normalized.value;
}

/**
 * Normaliza un carácter para uso general (compatibilidad exportada).
 * Para iniciales usa reglas de pos. 1–4; preferir funciones getCurp*.
 */
export function normalizeCurpChar(char: string): NormalizedCurpChar {
  if (!char) {
    return { value: null, isSpecial: false };
  }

  if (SPECIAL_CURP_CHARS.has(char)) {
    return { value: null, isSpecial: true };
  }

  if (DIERESIS_INICIALES_TO_X.has(char)) {
    return { value: null, isSpecial: true };
  }

  if (DIERESIS_UMLAUT_U.has(char)) {
    return { value: 'U', isSpecial: false };
  }

  return normalizeCurpCharBase(char);
}

/**
 * Primera letra del token para posiciones 1, 3 o 4 (regla 1.1, 1.4).
 */
export function getCurpInitial(rawWord: string): string {
  if (!rawWord?.trim()) {
    return 'X';
  }

  for (const char of rawWord.trim()) {
    if (SPECIAL_CURP_CHARS.has(char)) {
      return 'X';
    }

    if (DIERESIS_INICIALES_TO_X.has(char)) {
      return 'X';
    }

    if (DIERESIS_UMLAUT_U.has(char)) {
      return 'U';
    }

    const normalized = normalizeCurpCharBase(char);
    if (normalized.isSpecial) {
      return 'X';
    }
    if (normalized.value) {
      return curpLetterForInitial(normalized);
    }
  }

  return 'X';
}

/**
 * Primera vocal interna A|E|I|O|U después del carácter inicial (reglas 1.4, 1.9).
 * Pos. 2 de iniciales: Ä/Ë/Ï/Ö → X; Ü → U.
 */
export function getCurpFirstInternalVowel(rawWord: string): string {
  if (!rawWord?.trim()) {
    return 'X';
  }

  let passedInitial = false;

  for (const char of rawWord.trim()) {
    if (!passedInitial) {
      if (SPECIAL_CURP_CHARS.has(char)) {
        return 'X';
      }

      if (DIERESIS_INICIALES_TO_X.has(char) || DIERESIS_UMLAUT_U.has(char)) {
        passedInitial = true;
        continue;
      }

      const normalized = normalizeCurpCharBase(char);
      if (normalized.isSpecial) {
        return 'X';
      }
      if (normalized.value) {
        passedInitial = true;
      }
      continue;
    }

    if (SPECIAL_CURP_CHARS.has(char)) {
      return 'X';
    }

    if (DIERESIS_INICIALES_TO_X.has(char)) {
      return 'X';
    }

    if (DIERESIS_UMLAUT_U.has(char)) {
      return 'U';
    }

    const vowel = curpLetterForInternalVowel(normalizeCurpCharBase(char));
    if (vowel !== null) {
      return vowel;
    }
  }

  return 'X';
}

/**
 * Primera consonante interna después del carácter inicial (reglas 1.12, 1.13, 1.18).
 * Diéresis en vocal no cuenta como consonante.
 */
export function getCurpFirstInternalConsonant(rawWord: string): string {
  if (!rawWord?.trim()) {
    return 'X';
  }

  let passedInitial = false;

  for (const char of rawWord.trim()) {
    const normalized = normalizeCurpCharForConsonantScan(char);

    if (!passedInitial) {
      if (normalized.isSpecial) {
        return 'X';
      }
      if (normalized.value) {
        passedInitial = true;
      }
      continue;
    }

    const consonant = curpLetterForInternalConsonant(normalized);
    if (consonant !== null) {
      return consonant;
    }
  }

  return 'X';
}
