import { CatalogType } from '../interfaces/catalog-entry.interface';

export const CATALOG_NORMALIZED_DIR = 'catalogs/normalized';
export const CATALOG_BACKUPS_DIR = 'catalogs/normalized/backups';

export const CATALOG_FILES: Partial<Record<CatalogType, string>> = {
  [CatalogType.CIE10]: 'diagnosticos_sis.csv',
  [CatalogType.CLUES]: 'establecimiento_de_salud_sis.csv',
  [CatalogType.ENTIDADES_FEDERATIVAS]: 'enitades_federativas.csv',
  [CatalogType.MUNICIPIOS]: 'municipios.csv',
  [CatalogType.LOCALIDADES]: 'localidades.csv',
  [CatalogType.CODIGOS_POSTALES]: 'codigos_postales.csv',
  [CatalogType.ESCOLARIDAD]: 'escolaridad.csv',
  [CatalogType.TIPO_PERSONAL]: 'cat_tipo_personal.csv',
  [CatalogType.AFILIACION]: 'cat_afiliacion.csv',
  [CatalogType.PAIS]: 'cat_pais.csv',
  [CatalogType.SERVICIOS_ATENCION_CE]:
    'servicios_atencion_por_tipo_personal_sis_ce.csv',
};

export const OPTIONAL_CATALOG_TYPES: CatalogType[] = [
  CatalogType.TIPO_PERSONAL,
  CatalogType.AFILIACION,
  CatalogType.PAIS,
  CatalogType.SERVICIOS_ATENCION_CE,
];

export const BASE_CATALOG_TYPES: CatalogType[] = [
  CatalogType.CIE10,
  CatalogType.CLUES,
  CatalogType.ENTIDADES_FEDERATIVAS,
  CatalogType.MUNICIPIOS,
  CatalogType.LOCALIDADES,
  CatalogType.CODIGOS_POSTALES,
  CatalogType.ESCOLARIDAD,
];

export const ALL_CATALOG_TYPES: CatalogType[] = [
  ...BASE_CATALOG_TYPES,
  ...OPTIONAL_CATALOG_TYPES,
];

export function resolveCatalogType(param: string): CatalogType | null {
  const normalized = param.trim().toLowerCase();
  const found = ALL_CATALOG_TYPES.find(
    (t) => t === normalized || t.toLowerCase() === normalized,
  );
  return found ?? null;
}
