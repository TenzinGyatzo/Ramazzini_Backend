import { CatalogEntry, INEGIEntry } from '../interfaces/catalog-entry.interface';

/** NE (Renapo) va antes que códigos numéricos de entidad. */
export function getEstadoSortKey(code: string): number {
  const normalized = String(code ?? '')
    .trim()
    .toUpperCase();
  if (normalized === 'NE') return -1;
  const num = parseInt(normalized, 10);
  return Number.isNaN(num) ? Number.MAX_SAFE_INTEGER : num;
}

export function sortEstadosByCode(entries: CatalogEntry[]): CatalogEntry[] {
  return [...entries].sort(
    (a, b) => getEstadoSortKey(a.code) - getEstadoSortKey(b.code),
  );
}

export function getMunicipioSortKey(entry: CatalogEntry): number {
  const inegi = entry as INEGIEntry;
  const raw =
    inegi.municipioCode ??
    String(entry.code ?? '')
      .split('-')
      .pop() ??
    '';
  const num = parseInt(String(raw).trim(), 10);
  return Number.isNaN(num) ? Number.MAX_SAFE_INTEGER : num;
}

export function sortMunicipiosByCode(entries: CatalogEntry[]): CatalogEntry[] {
  return [...entries].sort(
    (a, b) => getMunicipioSortKey(a) - getMunicipioSortKey(b),
  );
}
