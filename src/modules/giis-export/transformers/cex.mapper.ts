/**
 * CEX (GIIS-B015 Consulta externa) mapper — schema-driven.
 * Output keys and order come only from docs/nom-024/giis_schemas/CEX.schema.json.
 * Source: NotaMedica (consulta externa) + Trabajador (paciente) + optional Prestador (firmante).
 */

import { loadGiisSchema, GiisSchema } from '../schema-loader';
import { toDDMMAAAA } from '../formatters/date.formatter';
import {
  formatCURP,
  normalizeNameForGiis,
} from '../formatters/field.formatter';
import {
  calcularEdadEmbarazo,
  resolverCamposEmbarazoCex,
} from '../../expedientes/validators/nota-medica-embarazo.validator';
import { toGIISNumeric } from '../formatters/sexo.formatter';
import { normalizeCie10CatalogKey } from '../../../utils/cie10-diagnostico-sis.util';
import {
  aplicaConfirmacionDiagnostico1,
  aplicaConfirmacionDiagnostico23,
  calcularEdadAnios,
  DiagCatalogFlags,
  toCexConfirmacionDiagnosticaValue,
} from '../../../utils/confirmacion-diagnostica.util';

export interface CexMapperContext {
  clues: string;
  /** Resolve cat_pais CATALOG_KEY from nacionalidad clave (3-letter). If not provided (e.g. tests), 142 is used for paisNacPaciente. */
  getPaisCatalogKeyFromNacionalidad?: (clave: string) => number | null;
  /** Defaults from CexCatalogResolver when prestador is absent */
  cexDefaults?: {
    tipoPersonal: number;
    servicioAtencion: number;
  };
  /** Banderas DIA_CRONICOS / DIA_CAINFANTIL por diagnóstico (desde catálogo) */
  diagCatalogFlags?: {
    confirmacion1?: DiagCatalogFlags | null;
    confirmacion2?: DiagCatalogFlags | null;
    confirmacion3?: DiagCatalogFlags | null;
  };
}

/** NotaMedica-like: consulta externa document */
export interface ConsultaExternaLike {
  fechaNotaMedica?: Date;
  tensionArterialSistolica?: number;
  tensionArterialDiastolica?: number;
  frecuenciaCardiaca?: number;
  frecuenciaRespiratoria?: number;
  temperatura?: number;
  saturacionOxigeno?: number;
  codigoCIE10Principal?: string;
  codigosCIE10Complementarios?: string[];
  relacionTemporal?: number;
  primeraVezDiagnostico2?: number; // 0=No, 1=Si
  codigoCIEDiagnostico2?: string;
  confirmacionDiagnostica?: boolean;
  confirmacionDiagnostica2?: boolean;
  primeraVezDiagnostico3?: number; // 0=No, 1=Si
  codigoCIEDiagnostico3?: string;
  confirmacionDiagnostica3?: boolean;
  /** 1 = primera consulta del trabajador en el año, 0 = ya existía otra (solo NotaMedica). */
  primeraVezAnio?: number;
  genero?: number;
  derechohabiencia?: string;
  peso?: number;
  talla?: number;
  circunferenciaCintura?: number;
  glucemia?: number;
  tipoMedicion?: number;
  resultadoObtenidoaTravesde?: number;
  relacionTemporalEmbarazo?: number;
  trimestreGestacional?: number;
  [key: string]: unknown;
}

/** Trabajador-like: paciente data */
export interface TrabajadorLike {
  curp?: string;
  nombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  fechaNacimiento?: Date;
  sexo?: string;
  entidadNacimiento?: string;
  [key: string]: unknown;
}

/** Prestador-like: firmante (médico/enfermera) data for CEX prestador fields */
export interface PrestadorLike {
  curp?: string;
  nombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  tipoPersonal?: number;
  servicioAtencion?: number;
  /** CATALOG_KEY de cat_pais (ej. 142=México) */
  paisNacimiento?: number;
}

const CEX_SCHEMA = loadGiisSchema('CEX');

const DEFAULT_XX = 'XX';
/** CEX: valor para "Se desconoce" en signos vitales */
const CEX_UNKNOWN = 0;

/** Mapea valor de signo vital a CEX: undefined/null → 0 (desconocido) */
function toCexVital(value: number | undefined | null): number {
  if (value == null) return CEX_UNKNOWN;
  return value;
}
const DEFAULT_PAIS_MEXICO = 142;
/** cat_pais "NO ESPECIFICADO" when nacionalidad has no mapping */
const PAIS_NO_ESPECIFICADO = 248;
const CURP_GENERICA = 'XXXX999999XXXXXX99';
const DEFAULT_PROGRAMA_SMYMG = 0;
const DEFAULT_NA = 'NA';

/** CIE-10 codes for pulmonary tuberculosis (TB pulmonar). Normalized without dot for lookup. */
export const CIE10_TB_PULMONAR = new Set([
  'A150',
  'A151',
  'A152',
  'A153',
  'A160',
  'A161',
  'A162',
]);

/**
 * Normalize CIE-10 code for comparison: uppercase, trim, remove dot (e.g. A15.0 → A150).
 */
function normalizeCieCodeForTb(code: string): string {
  if (!code) return '';
  return code.trim().toUpperCase().replace(/\./g, '');
}

/**
 * Returns true if the given CIE-10 code (with or without dot) is a pulmonary TB code.
 * Used to derive sintomaticoRespiratorioTb in CEX.
 */
export function isCodigoTuberculosisPulmonar(
  code: string | null | undefined,
): boolean {
  const normalized = normalizeCieCodeForTb(code ?? '');
  return normalized.length > 0 && CIE10_TB_PULMONAR.has(normalized);
}

/**
 * Extract CIE-10 code from "CODE - DESCRIPTION" or return as-is if no dash.
 */
export function extractCieCode(value: string | null | undefined): string {
  if (!value) return '';
  const s = value.trim();
  const dash = s.indexOf(' - ');
  return dash >= 0 ? s.slice(0, dash).trim() : s;
}

/**
 * Calcula edad en años entre fechaNacimiento y fechaConsulta.
 */
function calcularEdad(
  fechaNacimiento?: Date | null,
  fechaConsulta?: Date | null,
): number | null {
  return calcularEdadAnios(fechaNacimiento, fechaConsulta);
}

function debeReportarConfirmacionDiagnostica1(
  consulta: ConsultaExternaLike,
  trabajador: TrabajadorLike | null | undefined,
  codigo1: string,
  tipoPersonal: number,
  flags: DiagCatalogFlags | null | undefined,
): boolean {
  return aplicaConfirmacionDiagnostico1({
    tipoPersonal,
    edad: calcularEdad(trabajador?.fechaNacimiento, consulta.fechaNotaMedica),
    flags,
    relacionTemporal: consulta.relacionTemporal,
  });
}

function debeReportarConfirmacionDiagnostica2(
  consulta: ConsultaExternaLike,
  trabajador: TrabajadorLike | null | undefined,
  codigo2: string,
  tipoPersonal: number,
  flags: DiagCatalogFlags | null | undefined,
): boolean {
  return aplicaConfirmacionDiagnostico23({
    tipoPersonal,
    edad: calcularEdad(trabajador?.fechaNacimiento, consulta.fechaNotaMedica),
    flags,
    primeraVezDiagnostico: consulta.primeraVezDiagnostico2,
  });
}

function debeReportarConfirmacionDiagnostica3(
  consulta: ConsultaExternaLike,
  trabajador: TrabajadorLike | null | undefined,
  codigo3: string,
  tipoPersonal: number,
  flags: DiagCatalogFlags | null | undefined,
): boolean {
  return aplicaConfirmacionDiagnostico23({
    tipoPersonal,
    edad: calcularEdad(trabajador?.fechaNacimiento, consulta.fechaNotaMedica),
    flags,
    primeraVezDiagnostico: consulta.primeraVezDiagnostico3,
  });
}

/**
 * Collect all CIE-10 codes from a consulta (principal, all complementarios, codigoCIEDiagnostico2, codigoCIEDiagnostico3).
 */
function getAllCieCodesFromConsulta(consulta: ConsultaExternaLike): string[] {
  const codes: string[] = [];
  const principal = extractCieCode(consulta.codigoCIE10Principal);
  if (principal) codes.push(principal);
  const comp = consulta.codigosCIE10Complementarios || [];
  for (const item of comp) {
    const c = extractCieCode(item);
    if (c) codes.push(c);
  }
  const diag2 = extractCieCode(consulta.codigoCIEDiagnostico2);
  if (diag2) codes.push(diag2);
  const diag3 = extractCieCode(consulta.codigoCIEDiagnostico3);
  if (diag3) codes.push(diag3);
  return codes;
}

/**
 * Map one Consulta externa (NotaMedica) + optional Trabajador + optional Prestador to a flat record with keys = CEX schema field names.
 * All 106 columns are present; required ones get value or default. No hardcoded field list — iterate schema.fields.
 * If prestador is provided, curpPrestador, nombrePrestador, primerApellidoPrestador, segundoApellidoPrestador and tipoPersonal come from it.
 */
export function mapNotaMedicaToCexRow(
  consulta: ConsultaExternaLike,
  context: CexMapperContext,
  trabajador?: TrabajadorLike | null,
  prestador?: PrestadorLike | null,
): Record<string, string | number> {
  const schema = CEX_SCHEMA;
  const row: Record<string, string | number> = {};

  const clues = (context.clues || '').trim() || '9998';
  const curpPaciente = trabajador?.curp
    ? formatCURP(trabajador.curp) || CURP_GENERICA
    : CURP_GENERICA;
  const sexoRaw = (trabajador?.sexo as string) || '';
  const sexoGiis = toGIISNumeric(sexoRaw);
  const sexoCURP =
    sexoGiis === '2' ? 2 : sexoGiis === '1' ? 1 : sexoGiis === '3' ? 3 : 1;
  const sexoBiologico = sexoCURP;
  const genero = sexoCURP;

  const codigo1Raw = extractCieCode(consulta.codigoCIE10Principal);
  const codigo1 = normalizeCie10CatalogKey(codigo1Raw) || codigo1Raw;
  const comp = consulta.codigosCIE10Complementarios || [];
  const diag2NoAplica =
    consulta.primeraVezDiagnostico2 !== 0 &&
    consulta.primeraVezDiagnostico2 !== 1;
  const codigo2Raw = diag2NoAplica
    ? ''
    : comp[0]
      ? extractCieCode(comp[0])
      : consulta.codigoCIEDiagnostico2
        ? extractCieCode(consulta.codigoCIEDiagnostico2 as string)
        : '';
  const codigo2 = diag2NoAplica ? '' : codigo2Raw || 'R69X';

  const curpPrestador = prestador?.curp
    ? formatCURP(prestador.curp) || CURP_GENERICA
    : CURP_GENERICA;
  const nombrePrestador =
    normalizeNameForGiis(prestador?.nombre?.trim()) || DEFAULT_NA;
  const primerApellidoPrestador =
    normalizeNameForGiis(prestador?.primerApellido?.trim()) || DEFAULT_NA;
  const segundoApellidoPrestador =
    normalizeNameForGiis(prestador?.segundoApellido?.trim()) || DEFAULT_XX;
  const tipoPersonal =
    prestador?.tipoPersonal ?? context.cexDefaults?.tipoPersonal ?? 0;
  const servicioAtencion =
    prestador?.servicioAtencion ?? context.cexDefaults?.servicioAtencion ?? 0;

  const allCieCodes = getAllCieCodesFromConsulta(consulta);
  const hasTuberculosisPulmonar = allCieCodes.some(
    isCodigoTuberculosisPulmonar,
  );
  const sintomaticoRespiratorioTb =
    tipoPersonal === 15 || tipoPersonal === 16
      ? -1
      : hasTuberculosisPulmonar
        ? 1
        : 0;

  const nacionalidadClave = (trabajador?.nacionalidad as string)?.trim?.();
  const getPais = context.getPaisCatalogKeyFromNacionalidad;
  const paisNacPaciente =
    nacionalidadClave && getPais
      ? (getPais(nacionalidadClave) ?? PAIS_NO_ESPECIFICADO)
      : getPais
        ? PAIS_NO_ESPECIFICADO
        : DEFAULT_PAIS_MEXICO;

  const paisNacimientoPrestador =
    prestador?.paisNacimiento != null &&
    Number.isFinite(prestador.paisNacimiento)
      ? prestador.paisNacimiento
      : DEFAULT_PAIS_MEXICO;

  const edadPaciente = calcularEdadEmbarazo(
    trabajador?.fechaNacimiento as Date | undefined,
    consulta.fechaNotaMedica,
  );
  const camposEmbarazoCex = resolverCamposEmbarazoCex(
    consulta,
    sexoBiologico,
    edadPaciente,
  );

  const valueByField: Record<string, string | number> = {
    clues,
    paisNacimiento: paisNacimientoPrestador,
    curpPrestador,
    nombrePrestador,
    primerApellidoPrestador,
    segundoApellidoPrestador,
    tipoPersonal,
    programaSMyMG: DEFAULT_PROGRAMA_SMYMG,
    curpPaciente,
    nombre: normalizeNameForGiis(trabajador?.nombre as string) || DEFAULT_XX,
    primerApellido:
      normalizeNameForGiis(trabajador?.primerApellido as string) || DEFAULT_XX,
    segundoApellido:
      normalizeNameForGiis(trabajador?.segundoApellido as string) || DEFAULT_XX,
    fechaNacimiento: toDDMMAAAA(trabajador?.fechaNacimiento) || '01/01/1900',
    paisNacPaciente,
    entidadNacimiento:
      paisNacPaciente !== DEFAULT_PAIS_MEXICO
        ? '88'
        : (trabajador?.entidadNacimiento as string) || '99',
    sexoCURP,
    sexoBiologico,
    seAutodenominaAfromexicano: -1,
    seConsideraIndigena: -1,
    migrante: -1,
    paisProcedencia: -1,
    genero: consulta.genero ?? genero ?? 0,
    derechohabiencia: consulta.derechohabiencia || '99',
    // CEX: fechaConsulta no posterior al día de registro; si es futura, normalizar a hoy
    fechaConsulta: (() => {
      const d = consulta.fechaNotaMedica
        ? new Date(consulta.fechaNotaMedica)
        : null;
      if (!d || isNaN(d.getTime())) return '';
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const dNorm = new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
      );
      const useDate = dNorm > today ? today : d;
      return toDDMMAAAA(useDate) || '';
    })(),
    servicioAtencion,
    peso: consulta.peso ?? 999,
    talla: consulta.talla ?? 999,
    circunferenciaCintura: consulta.circunferenciaCintura ?? 0,
    // CEX: "Se desconoce" → 999; si diastolica desconocida, sistolica también (y viceversa)
    sistolica: (() => {
      const s = consulta.tensionArterialSistolica;
      const d = consulta.tensionArterialDiastolica;
      const sUnknown = s == null || s === 0;
      const dUnknown = d == null || d === 0;
      if (sUnknown || dUnknown) return CEX_UNKNOWN;
      return s;
    })(),
    diastolica: (() => {
      const s = consulta.tensionArterialSistolica;
      const d = consulta.tensionArterialDiastolica;
      const sUnknown = s == null || s === 0;
      const dUnknown = d == null || d === 0;
      if (sUnknown || dUnknown) return CEX_UNKNOWN;
      return d;
    })(),
    frecuenciaCardiaca: toCexVital(consulta.frecuenciaCardiaca),
    frecuenciaRespiratoria: toCexVital(consulta.frecuenciaRespiratoria),
    temperatura: toCexVital(consulta.temperatura),
    saturacionOxigeno: toCexVital(consulta.saturacionOxigeno),
    glucemia: consulta.glucemia ?? 0,
    tipoMedicion:
      consulta.glucemia != null && consulta.glucemia !== 0
        ? (consulta.tipoMedicion ?? -1)
        : -1,
    resultadoObtenidoaTravesde:
      consulta.glucemia != null && consulta.glucemia !== 0
        ? (consulta.resultadoObtenidoaTravesde ?? -1)
        : -1,
    embarazadaSinDiabetes: 0,
    sintomaticoRespiratorioTb,
    primeraVezAnio: consulta.primeraVezAnio ?? 0,
    primeraVezUneme: -1,
    relacionTemporal: consulta.relacionTemporal ?? 0,
    codigoCIEDiagnostico1: codigo1 || 'R69X',
    confirmacionDiagnostica1: (() => {
      const aplica = debeReportarConfirmacionDiagnostica1(
        consulta,
        trabajador,
        codigo1 || '',
        tipoPersonal,
        context.diagCatalogFlags?.confirmacion1,
      );
      return toCexConfirmacionDiagnosticaValue(
        aplica,
        consulta.confirmacionDiagnostica,
      );
    })(),
    primeraVezDiagnostico2:
      consulta.primeraVezDiagnostico2 === 1
        ? 1
        : consulta.primeraVezDiagnostico2 === 0
          ? 0
          : -1,
    codigoCIEDiagnostico2: codigo2,
    confirmacionDiagnostica2: (() => {
      const aplica = debeReportarConfirmacionDiagnostica2(
        consulta,
        trabajador,
        codigo2 || '',
        tipoPersonal,
        context.diagCatalogFlags?.confirmacion2,
      );
      return toCexConfirmacionDiagnosticaValue(
        aplica,
        consulta.confirmacionDiagnostica2,
      );
    })(),
    primeraVezDiagnostico3:
      consulta.primeraVezDiagnostico3 === 1
        ? 1
        : consulta.primeraVezDiagnostico3 === 0
          ? 0
          : -1,
    codigoCIEDiagnostico3: (() => {
      const primeraVezDiag3 = consulta.primeraVezDiagnostico3;
      if (primeraVezDiag3 === -1) return '';
      const raw = consulta.codigoCIEDiagnostico3
        ? extractCieCode(consulta.codigoCIEDiagnostico3 as string)
        : '';
      return raw || '';
    })(),
    confirmacionDiagnostica3: (() => {
      const codigo3 = (() => {
        const primeraVezDiag3 = consulta.primeraVezDiagnostico3;
        if (primeraVezDiag3 === -1) return '';
        return consulta.codigoCIEDiagnostico3
          ? extractCieCode(consulta.codigoCIEDiagnostico3 as string)
          : '';
      })();
      const aplica = debeReportarConfirmacionDiagnostica3(
        consulta,
        trabajador,
        codigo3 || '',
        tipoPersonal,
        context.diagCatalogFlags?.confirmacion3,
      );
      return toCexConfirmacionDiagnosticaValue(
        aplica,
        consulta.confirmacionDiagnostica3,
      );
    })(),
    intervencionesSMyA: -1,
    atencionPregestacionalRT: -1,
    riesgo: '-1',
    relacionTemporalEmbarazo: camposEmbarazoCex.relacionTemporalEmbarazo,
    planSeguridad: -1,
    trimestreGestacional: camposEmbarazoCex.trimestreGestacional,
    primeraVezAltoRiesgo: -1,
    complicacionPorDiabetes: -1,
    complicacionPorInfeccionUrinaria: -1,
    complicacionPorPreeclampsiaEclampsia: -1,
    complicacionPorHemorragia: -1,
    sospechaCovid19: -1,
    covid19Confirmado: -1,
    hipertensionarterialprexistente: -1,
    otrasAccPrescAcidoFolico: -1,
    otrasAccApoyoTraslado: -1,
    otrasACCApoyoTrasladoAME: -1,
    puerpera: -1,
    infeccionPuerperal: -1,
    terapiaHormonal: -1,
    periPostMenopausia: -1,
    its: -1,
    patologiaMamariaBenigna: -1,
    cancerMamario: -1,
    colposcopia: -1,
    cancerCervicouterino: -1,
    ninoSanoRT: -1,
    pruebaEDI: -1,
    resultadoEDI: -1,
    resultadoBattelle: -1,
    edasRT: -1,
    edasPlanTratamiento: -1,
    recuperadoDeshidratacion: -1,
    numeroSobresVSOTratamiento: 0,
    irasRT: -1,
    irasPlanTratamiento: -1,
    neumoniaRT: -1,
    aplicacionCedulaCancer: -1,
    informaPrevencionAccidentes: -1,
    sintomaDepresiva: -1,
    alteracionMemoria: -1,
    'aivd-ABVD': -1,
    sindromeCaidas: -1,
    incontinenciaUrinaria: -1,
    motricidad: -1,
    asesoriaNutricional: -1,
    numeroSobresVSOPromocion: 0,
    lineaVida: 0,
    cartillaSalud: 0,
    esquemaVacunacion: 0,
    referidoPor: -1,
    contrarreferido: 0,
    telemedicina: 0,
    teleconsulta: 0,
    estudiosTeleconsulta: '-1',
    modalidadConsulDist: -1,
  };

  for (const field of schema.fields) {
    if (valueByField[field.name] !== undefined) {
      row[field.name] = valueByField[field.name];
    } else if (field.requiredColumn) {
      row[field.name] = field.type?.kind === 'numeric' ? -1 : DEFAULT_XX;
    } else {
      row[field.name] = '';
    }
  }
  return row;
}

export function getCexSchema(): GiisSchema {
  return CEX_SCHEMA;
}
