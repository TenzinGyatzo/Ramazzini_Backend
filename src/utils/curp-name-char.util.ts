/**
 * Extracción carácter a carácter para segmentos CURP (RENAPO).
 * Opera sobre el texto original del token para respetar apóstrofos, Ñ y diéresis.
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

/** Diéresis en vocal (Ä/Ë/Ï/Ö) → X; Ü/ü → U. Mayúsculas y minúsculas. */
const DIERESIS_TO_X = new Set(['Ä', 'Ë', 'Ï', 'Ö', 'ä', 'ë', 'ï', 'ö']);

const SPECIAL_CURP_CHARS = new Set(["'", '/', '.', '-']);

export interface NormalizedCurpChar {
  value: string | null;
  isSpecial: boolean;
}

function isAsciiLetter(char: string): boolean {
  return /^[A-ZÑ]$/.test(char);
}

/**
 * Normaliza un carácter para uso en clave CURP.
 * Ü/ü → U; acentos → letra base; diéresis Ä/Ë/Ï/Ö → X; apóstrofo/diagonal/punto/guión → X.
 */
export function isDieresisVowel(char: string): boolean {
  return DIERESIS_TO_X.has(char);
}

export function normalizeCurpChar(char: string): NormalizedCurpChar {
  if (!char) {
    return { value: null, isSpecial: false };
  }

  if (SPECIAL_CURP_CHARS.has(char)) {
    return { value: null, isSpecial: true };
  }

  if (char === 'Ü' || char === 'ü') {
    return { value: 'U', isSpecial: false };
  }

  if (isDieresisVowel(char)) {
    return { value: null, isSpecial: true };
  }

  const upper = char.toUpperCase();
  const base = ACCENT_TO_BASE[upper] ?? upper;

  if (isAsciiLetter(base)) {
    return { value: base, isSpecial: false };
  }

  return { value: null, isSpecial: false };
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
 * Primera letra del token para posiciones 1, 3 o 4 (regla 1.1, 1.4).
 */
export function getCurpInitial(rawWord: string): string {
  if (!rawWord?.trim()) {
    return 'X';
  }

  for (const char of rawWord.trim()) {
    const normalized = normalizeCurpChar(char);
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
 */
export function getCurpFirstInternalVowel(rawWord: string): string {
  if (!rawWord?.trim()) {
    return 'X';
  }

  let passedInitial = false;

  for (const char of rawWord.trim()) {
    const normalized = normalizeCurpChar(char);

    if (!passedInitial) {
      if (normalized.isSpecial) {
        return 'X';
      }
      if (normalized.value) {
        passedInitial = true;
      }
      continue;
    }

    const vowel = curpLetterForInternalVowel(normalized);
    if (vowel !== null) {
      return vowel;
    }
  }

  return 'X';
}

/**
 * Primera consonante interna después del carácter inicial (reglas 1.12, 1.13, 1.18).
 */
export function getCurpFirstInternalConsonant(rawWord: string): string {
  if (!rawWord?.trim()) {
    return 'X';
  }

  let passedInitial = false;

  for (const char of rawWord.trim()) {
    const normalized = normalizeCurpChar(char);

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
