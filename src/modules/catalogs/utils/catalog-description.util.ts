/**
 * Normaliza descripciones de catálogos DGIS para búsqueda por texto.
 * trim, mayúsculas, colapsar espacios, quitar acentos.
 */
export function normalizeCatalogDescription(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}
