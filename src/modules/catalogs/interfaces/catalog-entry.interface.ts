/**
 * Interface representing a catalog entry with common fields
 */
export interface CatalogEntry {
  code: string;
  description: string;
  source?: string;
  version?: string;
  [key: string]: any; // Allow additional fields for catalog-specific data
}

/**
 * Interface for INEGI geographic hierarchy entries
 */
export interface INEGIEntry extends CatalogEntry {
  estado?: string;
  estadoCode?: string;
  municipio?: string;
  municipioCode?: string;
  localidad?: string;
  localidadCode?: string;
}

/**
 * Interface for CIE-10 diagnostic entries
 */
export interface CIE10Entry extends CatalogEntry {
  catalogKey?: string;
  nombre?: string;
  lsex?: string; // Sex restriction: "NO", "MUJER", "HOMBRE", "SI"
  linf?: number; // Lower age limit (parsed number, may be undefined if format is "010A")
  lsup?: number; // Upper age limit (parsed number, may be undefined if format is "120A")
  linfRaw?: string; // Raw lower age limit from catalog (e.g., "010A", "028D", "NO")
  lsupRaw?: string; // Raw upper age limit from catalog (e.g., "120A", "NO")
  /** DIAGNOSTICO_SIS: MT / CP — restricción de tipo de personal (cat_tipo_personal DGIS) */
  letra?: string;
  /** Prestadores permitidos cuando relacionTemporal/primeraVez = 0 (primera vez) */
  tipoPersonal1VezCe?: number[];
  /** Prestadores permitidos cuando relacionTemporal/primeraVez = 1 (subsecuente) */
  tipoPersonalSubsecCe?: number[];
  /** DIAGNOSTICO_SIS: DIA_CRONICOS = SI */
  diaCronicos?: boolean;
  /** DIAGNOSTICO_SIS: DIA_CAINFANTIL = SI */
  diaCaInfantil?: boolean;
}

/**
 * Interface for CLUES establishment entries
 */
export interface CLUESEntry extends CatalogEntry {
  clues?: string;
  nombreInstitucion?: string;
  entidad?: string;
  municipio?: string;
  localidad?: string;
  estatus?: string;
}

/**
 * Interface for SEPOMEX postal code entries
 */
export interface CPEntry extends CatalogEntry {
  cp: string;
  asentamiento: string;
  municipio: string;
  estado: string;
  ciudad?: string;
  tipoAsentamiento?: string;
  cEstado?: string;
  cMunicipio?: string;
  cCveCiudad?: string;
}

/**
 * Catalog type identifiers
 */
export enum CatalogType {
  // Base catalogs (9) - Required
  CIE10 = 'diagnosticos',
  CLUES = 'establecimientos_salud',
  ENTIDADES_FEDERATIVAS = 'enitades_federativas',
  MUNICIPIOS = 'municipios',
  LOCALIDADES = 'localidades',
  CODIGOS_POSTALES = 'codigos_postales',
  FORMACION_ACADEMICA = 'formacion_academica',
  ESCOLARIDAD = 'escolaridad',

  // GIIS catalogs - Optional
  TIPO_PERSONAL = 'cat_tipo_personal',
  AFILIACION = 'cat_afiliacion',
  PAIS = 'cat_pais',
  SERVICIOS_ATENCION_CE = 'servicios_atencion_por_tipo_personal_sis_ce',
}
