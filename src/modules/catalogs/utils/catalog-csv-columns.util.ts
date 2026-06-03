import { CatalogType } from '../interfaces/catalog-entry.interface';
import { CsvRow } from './catalog-record.mapper';

/** Orden de columnas para leer la etiqueta visible (primera coincidencia). */
const DESCRIPTION_READ_KEYS = [
  'DESCRIPCIÓN CORTA',
  'DESCRIPCION',
  'descripcion',
  'description',
  'NOMBRE',
  'NOMBRE DE LA INSTITUCION',
  'nombre_unidad',
  'nombre',
  'ENTIDAD_FEDERATIVA',
  'MUNICIPIO',
  'LOCALIDAD',
  'TIPO_PERSONAL',
  'ESCOLARIDAD',
  'AFILIACION',
  'PAIS',
  'DESCRIPCIÓN LARGA',
];

/** Columnas a actualizar al guardar descripción (todas las que existan en la fila). */
const DESCRIPTION_WRITE_KEYS = [
  'DESCRIPCION',
  'DESCRIPCIÓN CORTA',
  'descripcion',
  'description',
  'NOMBRE',
  'NOMBRE DE LA INSTITUCION',
  'nombre_unidad',
  'nombre',
  'ENTIDAD_FEDERATIVA',
  'MUNICIPIO',
  'LOCALIDAD',
  'TIPO_PERSONAL',
  'ESCOLARIDAD',
];

const CODE_READ_KEYS = [
  'CATALOG_KEY',
  'CLUES',
  'clues',
  'codigo',
  'code',
  'CODIGO',
];

/** Por tipo: columna principal si la fila nueva no tiene aún claves. */
const PRIMARY_DESCRIPTION_COLUMN: Partial<Record<CatalogType, string>> = {
  [CatalogType.SERVICIOS_ATENCION_CE]: 'DESCRIPCION',
  [CatalogType.AFILIACION]: 'DESCRIPCIÓN CORTA',
  [CatalogType.PAIS]: 'DESCRIPCION',
  [CatalogType.TIPO_PERSONAL]: 'TIPO_PERSONAL',
  [CatalogType.ESCOLARIDAD]: 'ESCOLARIDAD',
  [CatalogType.CIE10]: 'NOMBRE',
  [CatalogType.ENTIDADES_FEDERATIVAS]: 'ENTIDAD_FEDERATIVA',
  [CatalogType.MUNICIPIOS]: 'MUNICIPIO',
  [CatalogType.LOCALIDADES]: 'LOCALIDAD',
};

export function extractCodeFromRow(record: CsvRow): string {
  for (const key of CODE_READ_KEYS) {
    const v = record[key];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      return String(v).trim();
    }
  }
  return '';
}

export function extractDescriptionFromRow(record: CsvRow): string {
  for (const key of DESCRIPTION_READ_KEYS) {
    const v = record[key];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      return String(v).trim();
    }
  }
  for (const [key, v] of Object.entries(record)) {
    if (
      /descrip|nombre|escolaridad|tipo_personal|entidad_federativa|municipio|localidad|afiliacion/i.test(
        key,
      ) &&
      v !== undefined &&
      v !== null &&
      String(v).trim() !== ''
    ) {
      return String(v).trim();
    }
  }
  return '';
}

/**
 * Escribe la descripción en las columnas CSV que ya existen en la fila.
 * Si ninguna coincide, usa la columna principal del tipo de catálogo.
 */
export function writeDescriptionToRow(
  row: CsvRow,
  description: string,
  catalogType?: CatalogType,
): void {
  const text = description ?? '';
  let written = false;
  for (const key of DESCRIPTION_WRITE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      row[key] = text;
      written = true;
    }
  }
  if (!written) {
    for (const key of Object.keys(row)) {
      if (
        /descrip|nombre|escolaridad|tipo_personal|entidad_federativa|^municipio$|^localidad$/i.test(
          key,
        )
      ) {
        row[key] = text;
        written = true;
      }
    }
  }
  if (!written && catalogType && PRIMARY_DESCRIPTION_COLUMN[catalogType]) {
    row[PRIMARY_DESCRIPTION_COLUMN[catalogType]!] = text;
  }
}

export function writeCodeToRow(row: CsvRow, code: string): void {
  const c = code ?? '';
  if (Object.prototype.hasOwnProperty.call(row, 'CATALOG_KEY')) {
    row.CATALOG_KEY = c;
  }
  if (Object.prototype.hasOwnProperty.call(row, 'clues')) row.clues = c;
  if (Object.prototype.hasOwnProperty.call(row, 'CLUES')) row.CLUES = c;
  if (Object.prototype.hasOwnProperty.call(row, 'codigo')) row.codigo = c;
  if (Object.prototype.hasOwnProperty.call(row, 'code')) row.code = c;
  if (!Object.prototype.hasOwnProperty.call(row, 'CATALOG_KEY')) {
    row.CATALOG_KEY = c;
  }
}

/** Texto unificado para entry.description / entry.nombre tras merge. */
export function resolveEntryLabel(entry: {
  description?: string;
  nombre?: string;
}): string | undefined {
  const d = entry.description?.trim();
  const n = entry.nombre?.trim();
  if (d) return d;
  if (n) return n;
  return undefined;
}

export function syncEntryLabelsAfterPatch(
  merged: { description?: string; nombre?: string },
  patch: { description?: string; nombre?: string },
): void {
  if (patch.description !== undefined) {
    merged.description = patch.description;
    merged.nombre = patch.description;
  }
  if (patch.nombre !== undefined) {
    merged.nombre = patch.nombre;
    merged.description = patch.nombre;
  }
}
