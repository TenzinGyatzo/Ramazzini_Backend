import {
  CatalogEntry,
  CatalogType,
  CIE10Entry,
  CLUESEntry,
  CPEntry,
  INEGIEntry,
} from '../interfaces/catalog-entry.interface';
import { parseTipoPersonalCeList } from '../../../utils/cie10-diagnostico-sis.util';
import {
  extractCodeFromRow,
  extractDescriptionFromRow,
  resolveEntryLabel,
  writeCodeToRow,
  writeDescriptionToRow,
} from './catalog-csv-columns.util';

export type CsvRow = Record<string, string | number | undefined>;

export interface ApplyEntryToCsvRowOptions {
  /** Si se define, solo se actualizan estas propiedades del entry (claves del PATCH). */
  onlyFields?: string[];
}

function shouldUpdate(
  only: Set<string> | null,
  ...fields: string[]
): boolean {
  if (!only) return true;
  return fields.some((f) => only.has(f));
}

/** SEPOMEX: clave compuesta d_codigo + id_asenta_cpcons (sin CATALOG_KEY). */
function mapCodigosPostalesRecord(record: CsvRow): CPEntry | null {
  const dCodigo = record.d_codigo;
  const idAsenta = record.id_asenta_cpcons;
  if (
    dCodigo === undefined ||
    dCodigo === null ||
    String(dCodigo).trim() === '' ||
    idAsenta === undefined ||
    idAsenta === null ||
    String(idAsenta).trim() === ''
  ) {
    return null;
  }
  const cEstado = record.c_estado
    ? String(record.c_estado).padStart(2, '0')
    : undefined;
  const cMunicipio = record.c_mnpio
    ? String(record.c_mnpio).padStart(3, '0')
    : undefined;
  return {
    code: `${dCodigo}-${idAsenta}`,
    description: `${record.d_codigo} - ${record.d_asenta}, ${record.D_mnpio}, ${record.d_estado}`,
    cp: String(record.d_codigo || ''),
    asentamiento: String(record.d_asenta || ''),
    municipio: String(record.D_mnpio || '').toUpperCase(),
    estado: String(record.d_estado || '').toUpperCase(),
    ciudad: (record.d_ciudad as string) || undefined,
    tipoAsentamiento: (record.d_tipo_asenta as string) || undefined,
    cEstado,
    cMunicipio,
    source: 'SEPOMEX',
    version: record.version as string | undefined,
    _csvRow: { ...record },
  };
}

/**
 * Maps a CSV row to a catalog entry (same rules as CatalogsService).
 */
export function mapRecordToEntry(
  catalogType: CatalogType,
  record: CsvRow,
): CatalogEntry | null {
  try {
    if (catalogType === CatalogType.CODIGOS_POSTALES) {
      return mapCodigosPostalesRecord(record);
    }

    const code = extractCodeFromRow(record);
    const description = extractDescriptionFromRow(record);
    if (!code) return null;

    switch (catalogType) {
      case CatalogType.ENTIDADES_FEDERATIVAS:
        return {
          code,
          description: description || code,
          source: 'INEGI',
          version: record.version as string | undefined,
          abreviatura: (record.ABREVIATURA || record.abreviatura) as
            | string
            | undefined,
          _csvRow: { ...record },
        };

      case CatalogType.CIE10: {
        const linfRaw = record.LINF
          ? String(record.LINF).trim().toUpperCase()
          : undefined;
        const lsupRaw = record.LSUP
          ? String(record.LSUP).trim().toUpperCase()
          : undefined;
        let linf: number | undefined;
        let lsup: number | undefined;
        if (linfRaw && linfRaw !== 'NO') {
          const linfNum = parseInt(linfRaw, 10);
          if (!isNaN(linfNum) && linfRaw.match(/^\d+$/)) linf = linfNum;
        }
        if (lsupRaw && lsupRaw !== 'NO') {
          const lsupNum = parseInt(lsupRaw, 10);
          if (!isNaN(lsupNum) && lsupRaw.match(/^\d+$/)) lsup = lsupNum;
        }
        const letraRaw =
          record.LETRA ?? record.Letra ?? record.letra ?? undefined;
        const letra =
          letraRaw !== undefined &&
          letraRaw !== null &&
          String(letraRaw).trim() !== ''
            ? String(letraRaw).trim().toUpperCase()
            : undefined;
        const label = description || String(record.NOMBRE || '');
        return {
          code,
          description: label,
          source: 'CIE-10',
          version: record.version as string | undefined,
          catalogKey: record.CATALOG_KEY as string | undefined,
          nombre: label,
          lsex: record.LSEX as string | undefined,
          linf,
          lsup,
          linfRaw,
          lsupRaw,
          letra,
          tipoPersonal1VezCe: parseTipoPersonalCeList(
            record.TIPO_PERSONAL_1VEZ_CE as string,
          ),
          tipoPersonalSubsecCe: parseTipoPersonalCeList(
            record.TIPO_PERSONAL_SUBSEC_CE as string,
          ),
          diaCronicos:
            String(record.DIA_CRONICOS ?? '')
              .trim()
              .toUpperCase() === 'SI',
          diaCaInfantil:
            String(record.DIA_CAINFANTIL ?? '')
              .trim()
              .toUpperCase() === 'SI',
          _csvRow: { ...record },
        } as CIE10Entry;
      }

      case CatalogType.CLUES: {
        const rawClues =
          record.clues || record.CLUES || record.codigo || record.code;
        const cluesCode = rawClues ? String(rawClues).trim().toUpperCase() : code;
        let estatus: string | undefined;
        if (
          record.en_operacion !== undefined &&
          record.en_operacion !== null
        ) {
          estatus =
            record.en_operacion == 1 || record.en_operacion === '1'
              ? 'EN OPERACION'
              : 'NO EN OPERACION';
        } else {
          estatus = record['ESTATUS DE OPERACION'] as string | undefined;
        }
        return {
          code: cluesCode,
          description,
          source: 'CLUES',
          version: record.version as string | undefined,
          clues: cluesCode,
          nombreInstitucion: (record.nombre_unidad ||
            record['NOMBRE DE LA INSTITUCION']) as string | undefined,
          entidad: (record.id_entidad_federativa ||
            record.ENTIDAD ||
            record['CLAVE DE LA ENTIDAD']) as string | undefined,
          municipio: record.MUNICIPIO as string | undefined,
          localidad: record.LOCALIDAD as string | undefined,
          estatus,
          _csvRow: { ...record },
        } as CLUESEntry;
      }

      case CatalogType.MUNICIPIOS: {
        const efeKey =
          record.EFE_KEY ||
          record['CLAVE DE LA ENTIDAD'] ||
          record.estadoCode;
        const catKey = record.CATALOG_KEY || record.codigo || record.code;
        return {
          code: efeKey && catKey ? `${efeKey}-${catKey}` : String(catKey || code),
          description: description || String(record.MUNICIPIO || ''),
          source: 'INEGI',
          version: record.version as string | undefined,
          estadoCode: efeKey ? String(efeKey) : undefined,
          municipioCode: catKey ? String(catKey) : undefined,
          _csvRow: { ...record },
        } as INEGIEntry;
      }

      case CatalogType.LOCALIDADES: {
        const locEfeKey =
          record.EFE_KEY ||
          record['CLAVE DE LA ENTIDAD'] ||
          record.estadoCode;
        const locMunKey =
          record.MUN_KEY ||
          record['CLAVE DEL MUNICIPIO'] ||
          record.municipioCode;
        const locCatKey = record.CATALOG_KEY || record.codigo || record.code;
        return {
          code:
            locEfeKey && locMunKey && locCatKey
              ? `${locEfeKey}-${locMunKey}-${locCatKey}`
              : String(locCatKey || code),
          description: description || String(record.LOCALIDAD || ''),
          source: 'INEGI',
          version: record.version as string | undefined,
          estadoCode: locEfeKey ? String(locEfeKey) : undefined,
          municipioCode: locMunKey ? String(locMunKey) : undefined,
          localidadCode: locCatKey ? String(locCatKey) : undefined,
          _csvRow: { ...record },
        } as INEGIEntry;
      }

      case CatalogType.AFILIACION: {
        const vigenteRaw = record.VIGENTE ?? record.vigente;
        const vigente =
          vigenteRaw === undefined || vigenteRaw === null || vigenteRaw === ''
            ? true
            : String(vigenteRaw).trim() === '1';
        return {
          code,
          description: description || code,
          source: catalogType,
          version: record.version as string | undefined,
          vigente,
          _csvRow: { ...record },
        };
      }

      case CatalogType.TIPO_PERSONAL:
      case CatalogType.SERVICIOS_ATENCION_CE:
      case CatalogType.PAIS:
        return {
          code,
          description: description || code,
          source: catalogType,
          version: record.version as string | undefined,
          _csvRow: { ...record },
        };

      default:
        if (!description) return null;
        return {
          code,
          description,
          source: record.source as string | undefined,
          version: record.version as string | undefined,
          _csvRow: { ...record },
        };
    }
  } catch {
    return null;
  }
}

export function getEntryCode(
  catalogType: CatalogType,
  record: CsvRow,
): string | null {
  const entry = mapRecordToEntry(catalogType, record);
  return entry?.code ?? null;
}

function formatTipoPersonalList(values?: number[]): string {
  if (!values?.length) return 'NO';
  return values.join(',');
}

/**
 * Apply entry fields onto a CSV row (mutates row).
 */
export function applyEntryToCsvRow(
  catalogType: CatalogType,
  entry: CatalogEntry,
  row: CsvRow,
  options?: ApplyEntryToCsvRowOptions,
): CsvRow {
  const only = options?.onlyFields ? new Set(options.onlyFields) : null;
  const label = resolveEntryLabel(entry);

  switch (catalogType) {
    case CatalogType.ENTIDADES_FEDERATIVAS:
      if (shouldUpdate(only, 'code')) writeCodeToRow(row, entry.code);
      if (shouldUpdate(only, 'description', 'nombre') && label) {
        writeDescriptionToRow(row, label, catalogType);
      }
      if (shouldUpdate(only, 'abreviatura') && entry.abreviatura) {
        row.ABREVIATURA = entry.abreviatura;
      }
      break;

    case CatalogType.CIE10: {
      const e = entry as CIE10Entry;
      if (shouldUpdate(only, 'code', 'catalogKey') && (e.code || e.catalogKey)) {
        row.CATALOG_KEY = e.catalogKey || e.code;
      }
      if (shouldUpdate(only, 'description', 'nombre') && label) {
        writeDescriptionToRow(row, label, catalogType);
      }
      if (shouldUpdate(only, 'lsex') && e.lsex) row.LSEX = e.lsex;
      if (shouldUpdate(only, 'linfRaw') && e.linfRaw) row.LINF = e.linfRaw;
      else if (shouldUpdate(only, 'linf') && e.linf !== undefined) {
        row.LINF = String(e.linf);
      }
      if (shouldUpdate(only, 'lsupRaw') && e.lsupRaw) row.LSUP = e.lsupRaw;
      else if (shouldUpdate(only, 'lsup') && e.lsup !== undefined) {
        row.LSUP = String(e.lsup);
      }
      if (shouldUpdate(only, 'letra') && e.letra) row.LETRA = e.letra;
      if (shouldUpdate(only, 'tipoPersonal1VezCe') && e.tipoPersonal1VezCe) {
        row.TIPO_PERSONAL_1VEZ_CE = formatTipoPersonalList(
          e.tipoPersonal1VezCe,
        );
      }
      if (shouldUpdate(only, 'tipoPersonalSubsecCe') && e.tipoPersonalSubsecCe) {
        row.TIPO_PERSONAL_SUBSEC_CE = formatTipoPersonalList(
          e.tipoPersonalSubsecCe,
        );
      }
      if (shouldUpdate(only, 'diaCronicos') && e.diaCronicos !== undefined) {
        row.DIA_CRONICOS = e.diaCronicos ? 'SI' : 'NO';
      }
      if (shouldUpdate(only, 'diaCaInfantil') && e.diaCaInfantil !== undefined) {
        row.DIA_CAINFANTIL = e.diaCaInfantil ? 'SI' : 'NO';
      }
      break;
    }

    case CatalogType.CLUES: {
      const e = entry as CLUESEntry;
      if (shouldUpdate(only, 'code', 'clues')) {
        const cluesCode = (e.clues || e.code || '').toUpperCase();
        writeCodeToRow(row, cluesCode);
      }
      if (shouldUpdate(only, 'description', 'nombre', 'nombreInstitucion') && label) {
        const inst = e.nombreInstitucion || label;
        writeDescriptionToRow(row, inst, catalogType);
        if (Object.prototype.hasOwnProperty.call(row, 'nombre_unidad')) {
          row.nombre_unidad = inst;
        }
      }
      if (shouldUpdate(only, 'entidad') && e.entidad) {
        row.id_entidad_federativa = e.entidad;
      }
      if (shouldUpdate(only, 'municipio') && e.municipio) row.MUNICIPIO = e.municipio;
      if (shouldUpdate(only, 'localidad') && e.localidad) row.LOCALIDAD = e.localidad;
      if (shouldUpdate(only, 'estatus') && e.estatus) {
        row.en_operacion = e.estatus === 'EN OPERACION' ? '1' : '0';
      }
      break;
    }

    case CatalogType.MUNICIPIOS: {
      const e = entry as INEGIEntry;
      if (shouldUpdate(only, 'estadoCode') && e.estadoCode) row.EFE_KEY = e.estadoCode;
      if (shouldUpdate(only, 'municipioCode', 'code') && e.municipioCode) {
        row.CATALOG_KEY = e.municipioCode;
      }
      if (shouldUpdate(only, 'description', 'nombre') && label) {
        writeDescriptionToRow(row, label, catalogType);
      }
      break;
    }

    case CatalogType.LOCALIDADES: {
      const e = entry as INEGIEntry;
      if (shouldUpdate(only, 'estadoCode') && e.estadoCode) row.EFE_KEY = e.estadoCode;
      if (shouldUpdate(only, 'municipioCode') && e.municipioCode) {
        row.MUN_KEY = e.municipioCode;
      }
      if (shouldUpdate(only, 'localidadCode', 'code') && e.localidadCode) {
        row.CATALOG_KEY = e.localidadCode;
      }
      if (shouldUpdate(only, 'description', 'nombre') && label) {
        writeDescriptionToRow(row, label, catalogType);
      }
      break;
    }

    case CatalogType.CODIGOS_POSTALES: {
      const e = entry as CPEntry;
      if (shouldUpdate(only, 'description') && e.description) {
        row.d_asenta = e.asentamiento ?? e.description;
      }
      break;
    }

    case CatalogType.TIPO_PERSONAL:
    case CatalogType.SERVICIOS_ATENCION_CE:
    case CatalogType.AFILIACION:
    case CatalogType.PAIS:
    default:
      if (shouldUpdate(only, 'code')) writeCodeToRow(row, entry.code);
      if (shouldUpdate(only, 'description', 'nombre') && label) {
        writeDescriptionToRow(row, label, catalogType);
      }
      break;
  }
  return row;
}

/** Build a new CSV row from an entry when creating records. */
export function entryToNewCsvRow(
  catalogType: CatalogType,
  entry: CatalogEntry,
  headers: string[],
): CsvRow {
  const row: CsvRow = {};
  for (const h of headers) row[h] = '';
  return applyEntryToCsvRow(catalogType, entry, row);
}
