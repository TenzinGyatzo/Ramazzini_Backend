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
}

/** Extended CIE10 for GIIS lesion catalog (diagnosticos.csv) with AF_PRIN, RUBRICA_TYPE */
export interface CIE10GIISLesionEntry extends CIE10Entry {
  rubricaType?: string; // "B" = encabezado rúbrica (no seleccionable), otros = sí
  afPrin?: string; // "SI" = apto como afección principal, "NO" = no
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
  // Base catalogs (10) - Required
  CIE10 = 'diagnosticos',
  CLUES = 'establecimientos_salud',
  ENTIDADES_FEDERATIVAS = 'enitades_federativas',
  MUNICIPIOS = 'municipios',
  LOCALIDADES = 'localidades',
  CODIGOS_POSTALES = 'codigos_postales',
  NACIONALIDADES = 'cat_nacionalidades',
  RELIGIONES = 'cat_religiones',
  LENGUAS_INDIGENAS = 'lenguas_indigenas',
  FORMACION_ACADEMICA = 'formacion_academica',
  ESCOLARIDAD = 'escolaridad',

  // GIIS-B013 Catalogs (4) - Optional
  SITIO_OCURRENCIA = 'cat_sitio_ocurrencia',
  AGENTE_LESION = 'cat_agente_lesion',
  AREA_ANATOMICA = 'cat_area_anatomica',
  CONSECUENCIA = 'cat_consecuencia',

  // GIIS-B019 Catalogs (4) - Optional
  TIPO_PERSONAL = 'cat_tipo_personal',
  SERVICIOS_DET = 'cat_servicios_det',
  AFILIACION = 'cat_afiliacion',
  PAIS = 'cat_pais',

  // GIIS Lesión catalogs (2) - Optional
  TIPO_VIALIDAD = 'cat_tipo_vialidad',
  TIPO_ASENTAMIENTO = 'cat_tipo_asentamiento',

  // CIE-10 GIIS para reportes de lesión/violencia (incluye V01-Y98)
  CIE10_GIIS_LESION = 'diagnosticos_giis',
}
