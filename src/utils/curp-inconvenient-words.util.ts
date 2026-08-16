/**
 * Catálogo RENAPO de palabras inconvenientes para posiciones 1-4 de la CURP.
 *
 * Si las iniciales crudas forman una palabra de este catálogo, la posición 2
 * (segundo carácter) se reemplaza por X antes de comparar con la CURP capturada.
 *
 * Iteración 2 (parcial): solo posiciones 1-4. Otros casos especiales RENAPO
 * (partículas, nombres compuestos, apóstrofo, etc.) se aplican en curp-name-segments.util.
 */

export const CURP_INCONVENIENT_WORDS: ReadonlySet<string> = new Set([
  'BACA',
  'BAKA',
  'BUEI',
  'BUEY',
  'CACA',
  'CACO',
  'CAGA',
  'CAGO',
  'CAKA',
  'CAKO',
  'COGE',
  'COGI',
  'COJA',
  'COJE',
  'COJI',
  'COJO',
  'COLA',
  'CULO',
  'FALO',
  'FETO',
  'GETA',
  'GUEI',
  'GUEY',
  'JETA',
  'JOTO',
  'KACA',
  'KACO',
  'KAGA',
  'KAGO',
  'KAKA',
  'KAKO',
  'KOGE',
  'KOGI',
  'KOJA',
  'KOJE',
  'KOJI',
  'KOJO',
  'KOLA',
  'KULO',
  'LILO',
  'LOCA',
  'LOCO',
  'LOKA',
  'LOKO',
  'MAME',
  'MAMO',
  'MEAR',
  'MEAS',
  'MEON',
  'MIAR',
  'MION',
  'MOCO',
  'MOKO',
  'MULA',
  'MULO',
  'NACA',
  'NACO',
  'PEDA',
  'PEDO',
  'PENE',
  'PIPI',
  'PITO',
  'POPO',
  'PUTA',
  'PUTO',
  'QULO',
  'RATA',
  'ROBA',
  'ROBE',
  'ROBO',
  'RUIN',
  'SENO',
  'TETA',
  'VACA',
  'VAGA',
  'VAGO',
  'VAKA',
  'VUEI',
  'VUEY',
  'WUEI',
  'WUEY',
]);

/**
 * Aplica el filtro RENAPO de palabras inconvenientes a un bloque de 4 letras.
 * Reemplaza el carácter en posición 2 por X si el bloque está en el catálogo.
 */
export function applyInconvenientWordFilter(iniciales: string): string {
  if (iniciales.length !== 4) {
    return iniciales;
  }

  const normalized = iniciales.toUpperCase();
  if (!CURP_INCONVENIENT_WORDS.has(normalized)) {
    return normalized;
  }

  return normalized.charAt(0) + 'X' + normalized.slice(2);
}

export function isInconvenientWord(block4: string): boolean {
  return (
    block4.length === 4 && CURP_INCONVENIENT_WORDS.has(block4.toUpperCase())
  );
}

export interface InconvenientWordVariants {
  raw: string;
  filtered: string;
  isInconvenient: boolean;
}

export function getInconvenientWordVariants(
  raw4: string,
): InconvenientWordVariants {
  const raw = raw4.toUpperCase();
  const filtered = applyInconvenientWordFilter(raw);
  return {
    raw,
    filtered,
    isInconvenient: raw.length === 4 && raw !== filtered,
  };
}

/** Acepta iniciales crudas o con sustituto X en posición 2. */
export function curpInicialesMatchExpected(
  got: string,
  rawExpected: string,
): boolean {
  const normalizedGot = got.toUpperCase();
  const { raw, filtered } = getInconvenientWordVariants(rawExpected);
  return normalizedGot === raw || normalizedGot === filtered;
}

/** true si pos. 1-4 de la CURP forman palabra inconveniente sin filtrar. */
export function curpHasUnfilteredInconvenientWord(curp: string): boolean {
  if (!curp || curp.length < 4) {
    return false;
  }
  return isInconvenientWord(curp.substring(0, 4));
}
