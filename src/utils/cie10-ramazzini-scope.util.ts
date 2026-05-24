/**
 * Alcance Ramazzini: códigos DIAGNOSTICO_SIS con LETRA MT/CP fuera del perfil del sistema.
 */

export type RamazziniLetraFueraDeAlcance = 'MT' | 'CP';

export function getRamazziniLetraFromCatalogKey(
  catalogKey: string | null | undefined,
): RamazziniLetraFueraDeAlcance | null {
  if (!catalogKey) return null;
  const k = catalogKey.replace(/\./g, '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(k)) return null;
  if (k.startsWith('MT')) return 'MT';
  if (k.startsWith('CP')) return 'CP';
  return null;
}

export function getRamazziniLetraFromRuleLetra(
  letra: string | null | undefined,
): RamazziniLetraFueraDeAlcance | null {
  const l = letra?.trim().toUpperCase();
  if (l === 'MT' || l === 'CP') return l;
  return null;
}

export function resolveRamazziniLetraFueraDeAlcance(
  catalogKey: string,
  letra?: string | null,
): RamazziniLetraFueraDeAlcance | null {
  return (
    getRamazziniLetraFromRuleLetra(letra) ??
    getRamazziniLetraFromCatalogKey(catalogKey)
  );
}

export function getRamazziniLetraBlockMessage(
  letra: RamazziniLetraFueraDeAlcance,
  catalogKey: string,
  contextLabel?: string,
): string {
  const prefix = contextLabel ? `${contextLabel}: ` : '';
  if (letra === 'MT') {
    return (
      `${prefix}El código ${catalogKey} pertenece a la serie MT (medicina tradicional) ` +
      'y solo puede registrarse con médica/o tradicional indígena. ' +
      'Ramazzini no incluye ese perfil de médico.'
    );
  }
  return (
    `${prefix}El código ${catalogKey} pertenece a la serie CP (oncología pediátrica) ` +
    'y está fuera del alcance de Ramazzini, orientado a salud en el trabajo.'
  );
}
