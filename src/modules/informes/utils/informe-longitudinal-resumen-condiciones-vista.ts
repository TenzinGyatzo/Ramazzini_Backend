/**
 * Presentación clínica de `resumenCondiciones` para PDF ILC.
 * Mantener en sync con frontend `informeLongitudinalResumenCondicionesVista.ts`.
 */
import {
  EstadoControlCondicion,
  GradoObesidad,
} from '../../expedientes/enums/cardiometabolico.enums';
import type {
  CondicionControlResumenLongitudinal,
  CondicionObesidadResumenLongitudinal,
  ResumenCondicionesCardiometabolicas,
  ResumenIndicadorLongitudinal,
  ResumenIndicadoresLongitudinal,
} from '../../expedientes/schemas/informe-longitudinal-cardiometabolico.schema';

export const TEXTO_CONDICION_NO_DOCUMENTADA = 'No documentada';
export const TEXTO_CONDICION_NO_VALORABLE = 'No valorable';
export const TEXTO_DIAGNOSTICO_NO_ACTIVO = 'No activo';

export const ETIQUETA_ESTADO = 'Estado';
export const ETIQUETA_DIAGNOSTICO = 'Diagnóstico';
export const ETIQUETA_HALLAZGO = 'Hallazgo actual';
export const ETIQUETA_ESTADO_ACTUAL = 'Estado actual';
export const ETIQUETA_EVOLUCION = 'Evolución reciente';
export const ETIQUETA_CAMBIO_IMC = 'Cambio IMC';
export const ETIQUETA_CAMBIO_PESO = 'Cambio peso';

export interface LineaResumenCondicionVista {
  soloValor?: boolean;
  etiqueta?: string;
  valor: string;
}

export interface BloqueResumenCondicionVista {
  titulo: string;
  lineas: LineaResumenCondicionVista[];
}

export interface CondicionLongitudinalVista {
  existeDiagnostico: boolean;
  estadoActual?: string;
  evolucionReciente?: string;
  hallazgoActual?: string;
  detalleCambio?: string;
  etiquetaCambio?: string;
}

export interface OpcionesResumenCondicionesVista {
  resumenIndicadores?: ResumenIndicadoresLongitudinal;
}

const CONDICIONES_ILC_VISTA = [
  { key: 'hipertension' as const, titulo: 'Hipertensión' },
  { key: 'diabetes' as const, titulo: 'DM2' },
  { key: 'dislipidemia' as const, titulo: 'Dislipidemia' },
  { key: 'obesidad' as const, titulo: 'Obesidad' },
];

function fmtIndicadorNum(val: number | undefined | null): string | null {
  if (val == null) return null;
  const n = Number(val);
  if (!Number.isFinite(n)) return String(val);
  return String(Number.parseFloat(n.toFixed(2)));
}

function labelEstadoControl(code?: string): string {
  if (!code?.trim()) return TEXTO_CONDICION_NO_VALORABLE;
  if (code === EstadoControlCondicion.NO_VALORABLE || code === 'NO_VALORABLE') {
    return TEXTO_CONDICION_NO_VALORABLE;
  }
  if (code === EstadoControlCondicion.CONTROLADA || code === 'CONTROLADA') {
    return 'Controlada';
  }
  if (code === EstadoControlCondicion.NO_CONTROLADA || code === 'NO_CONTROLADA') {
    return 'No controlada';
  }
  return code
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function labelHallazgoActual(codigoEstadoVigencia?: string): string {
  switch (codigoEstadoVigencia?.trim()) {
    case 'SIN_DIAGNOSTICO_ACTIVO':
      return 'Sin evidencia relevante';
    case 'HALLAZGO_COMPATIBLE':
      return 'Hallazgo compatible';
    case 'ALTERACION_DOCUMENTADA':
      return 'Alteración documentada';
    case 'NO_VALORABLE':
      return TEXTO_CONDICION_NO_VALORABLE;
    default:
      return TEXTO_CONDICION_NO_VALORABLE;
  }
}

function labelGradoObesidad(code?: string): string {
  if (!code?.trim()) return TEXTO_CONDICION_NO_VALORABLE;
  const m: Record<string, string> = {
    [GradoObesidad.SOBREPESO]: 'Sobrepeso',
    [GradoObesidad.OBESIDAD_I]: 'Obesidad clase I',
    [GradoObesidad.OBESIDAD_II]: 'Obesidad clase II',
    [GradoObesidad.OBESIDAD_III]: 'Obesidad clase III',
  };
  return m[code] ?? code.replace(/_/g, ' ');
}

function tramoIndicador(o?: ResumenIndicadorLongitudinal): string | undefined {
  if (!o || typeof o !== 'object') return undefined;
  const vi = o.valorInicial;
  const vf = o.valorFinal;
  if (vi == null && vf == null) return undefined;
  const sVi = fmtIndicadorNum(vi);
  const sVf = fmtIndicadorNum(vf);
  if (sVi != null && sVf != null) return `${sVi} → ${sVf}`;
  if (sVi != null) return sVi;
  if (sVf != null) return sVf;
  return undefined;
}

function anexarNotasCondicion(
  lineas: LineaResumenCondicionVista[],
  bloque: { interpretacionAutomatica?: string; observaciones?: string },
): void {
  if (bloque.interpretacionAutomatica?.trim()) {
    lineas.push({ soloValor: true, valor: bloque.interpretacionAutomatica.trim() });
  }
  if (bloque.observaciones?.trim()) {
    lineas.push({ etiqueta: 'Observaciones', valor: bloque.observaciones.trim() });
  }
}

function estaDocumentadaControl(b?: CondicionControlResumenLongitudinal): boolean {
  if (!b || typeof b !== 'object') return false;
  if (b.presente === true) return true;
  return Boolean(b.codigoEstadoVigencia?.trim());
}

function estaDocumentadaObesidad(b?: CondicionObesidadResumenLongitudinal): boolean {
  if (!b || typeof b !== 'object') return false;
  if (b.presente === false) return false;
  if (b.presente === true) return true;
  return Boolean(b.gradoActual);
}

function mapearCondicionControlVista(
  bloque: CondicionControlResumenLongitudinal | undefined,
): CondicionLongitudinalVista | null {
  if (!estaDocumentadaControl(bloque)) return null;

  const existeDiagnostico = bloque!.presente === true;

  if (existeDiagnostico) {
    const estadoActual = bloque!.estadoActual
      ? labelEstadoControl(String(bloque!.estadoActual))
      : TEXTO_CONDICION_NO_VALORABLE;
    const evolucionReciente = bloque!.tendencia?.trim() || undefined;
    return { existeDiagnostico: true, estadoActual, evolucionReciente };
  }

  return {
    existeDiagnostico: false,
    hallazgoActual: labelHallazgoActual(bloque!.codigoEstadoVigencia),
  };
}

function mapearObesidadVista(
  bloque: CondicionObesidadResumenLongitudinal | undefined,
  indicadores?: ResumenIndicadoresLongitudinal,
): CondicionLongitudinalVista | null {
  if (!estaDocumentadaObesidad(bloque)) return null;

  const grado = bloque!.gradoActual;
  const estadoActual = grado
    ? labelGradoObesidad(String(grado))
    : TEXTO_CONDICION_NO_VALORABLE;

  const tramoImc = tramoIndicador(indicadores?.indiceMasaCorporal);
  if (tramoImc) {
    return {
      existeDiagnostico: bloque!.presente === true,
      estadoActual,
      detalleCambio: tramoImc,
      etiquetaCambio: ETIQUETA_CAMBIO_IMC,
    };
  }

  const tramoPeso = tramoIndicador(indicadores?.peso);
  if (tramoPeso) {
    return {
      existeDiagnostico: bloque!.presente === true,
      estadoActual,
      detalleCambio: `${tramoPeso} kg`,
      etiquetaCambio: ETIQUETA_CAMBIO_PESO,
    };
  }

  return {
    existeDiagnostico: bloque!.presente === true,
    estadoActual,
  };
}

function lineasDesdeCondicionLongitudinalVista(
  m: CondicionLongitudinalVista,
): LineaResumenCondicionVista[] {
  const lineas: LineaResumenCondicionVista[] = [];

  if (!m.existeDiagnostico) {
    lineas.push({ etiqueta: ETIQUETA_DIAGNOSTICO, valor: TEXTO_DIAGNOSTICO_NO_ACTIVO });
    if (m.hallazgoActual) {
      lineas.push({ etiqueta: ETIQUETA_HALLAZGO, valor: m.hallazgoActual });
    }
    return lineas;
  }

  if (m.estadoActual) {
    lineas.push({ etiqueta: ETIQUETA_ESTADO_ACTUAL, valor: m.estadoActual });
  }
  if (m.evolucionReciente) {
    lineas.push({ etiqueta: ETIQUETA_EVOLUCION, valor: m.evolucionReciente });
  }
  if (m.detalleCambio && m.etiquetaCambio) {
    lineas.push({ etiqueta: m.etiquetaCambio, valor: m.detalleCambio });
  }

  return lineas;
}

function lineasDesdeCondicionControl(
  bloque: CondicionControlResumenLongitudinal | undefined,
): LineaResumenCondicionVista[] {
  const mapeado = mapearCondicionControlVista(bloque);
  if (!mapeado) {
    return [{ etiqueta: ETIQUETA_ESTADO, valor: TEXTO_CONDICION_NO_DOCUMENTADA }];
  }
  const lineas = lineasDesdeCondicionLongitudinalVista(mapeado);
  anexarNotasCondicion(lineas, bloque ?? {});
  return lineas;
}

function lineasDesdeObesidad(
  bloque: CondicionObesidadResumenLongitudinal | undefined,
  indicadores?: ResumenIndicadoresLongitudinal,
): LineaResumenCondicionVista[] {
  const mapeado = mapearObesidadVista(bloque, indicadores);
  if (!mapeado) {
    return [{ etiqueta: ETIQUETA_ESTADO, valor: TEXTO_CONDICION_NO_DOCUMENTADA }];
  }
  const lineas = lineasDesdeCondicionLongitudinalVista(mapeado);
  anexarNotasCondicion(lineas, bloque ?? {});
  return lineas;
}

/** Siempre las 4 condiciones vigiladas del ILC. */
export function bloquesResumenCondicionesParaVista(
  rc: ResumenCondicionesCardiometabolicas | undefined,
  opts?: OpcionesResumenCondicionesVista,
): BloqueResumenCondicionVista[] {
  const indicadores = opts?.resumenIndicadores;
  return CONDICIONES_ILC_VISTA.map(({ key, titulo }) => {
    if (key === 'obesidad') {
      return { titulo, lineas: lineasDesdeObesidad(rc?.obesidad, indicadores) };
    }
    const bloque = rc?.[key] as CondicionControlResumenLongitudinal | undefined;
    return { titulo, lineas: lineasDesdeCondicionControl(bloque) };
  });
}
