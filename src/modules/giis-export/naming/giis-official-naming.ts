/**
 * Official GIIS file naming: [TIPO]-[ENTIDAD][INST]-[AA][MM].[EXT]
 * ENTIDAD+INST = first 5 chars of CLUES, or 99SMP when clues is 9998 or empty.
 */

export type GiisGuideType = 'CEX';
export type GiisFileExt = 'TXT' | 'CIF' | 'ZIP';

/**
 * Returns segment ENTIDAD+INST (5 chars): 99SMP for 9998 or empty, else first 5 of CLUES (uppercase).
 */
export function getEntidadInst(clues: string): string {
  const t = (clues ?? '').trim();
  if (t === '9998' || t === '') return '99SMP';
  return t.toUpperCase().slice(0, 5);
}

/**
 * Returns base name without extension: [TIPO]-[ENTIDAD][INST]-[AA][MM]
 */
export function getOfficialBaseName(
  tipo: GiisGuideType,
  clues: string,
  year: number,
  month: number,
): string {
  const entidadInst = getEntidadInst(clues);
  const aa = String(year).slice(-2);
  const mm = String(month).padStart(2, '0');
  return `${tipo}-${entidadInst}-${aa}${mm}`;
}

/**
 * Returns full file name with extension.
 */
export function getOfficialFileName(
  baseName: string,
  ext: GiisFileExt,
): string {
  return `${baseName}.${ext}`;
}
