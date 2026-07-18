import type {
  Content,
  StyleDictionary,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';
import { FooterFirmantesData } from '../interfaces/firmante-data.interface';
import { generarFooterFirmantes } from '../helpers/footer-firmantes.helper';
import { Types } from 'mongoose';
import {
  DiagnosticoCardiometabolico,
  EstadoControlCondicion,
  GradoObesidad,
} from '../../expedientes/enums/cardiometabolico.enums';
import {
  ConsistenciaSeguimientoLongitudinal,
  NivelRiesgoLongitudinal,
  TrayectoriaLongitudinalInforme,
} from '../../expedientes/enums/informe-longitudinal-cardiometabolico.enums';
import type {
  EstadoCondicionesCardiometabolicas,
  LaboratorioCardiometabolico,
  SignosVitalesCardiometabolico,
  SomatometriaCardiometabolico,
  TratamientoActualCardiometabolico,
} from '../../expedientes/schemas/evento-seguimiento-cardiometabolico.schema';
import type {
  EventoConcentradoCardiometabolico,
  ResumenCondicionesCardiometabolicas,
  ResumenIndicadorLongitudinal,
  ResumenIndicadoresLongitudinal,
  SeguimientoProgramadoConcentradoCardiometabolico,
} from '../../expedientes/schemas/informe-longitudinal-cardiometabolico.schema';
import {
  bloquesResumenCondicionesParaVista,
  type BloqueResumenCondicionVista,
  type LineaResumenCondicionVista,
} from '../utils/informe-longitudinal-resumen-condiciones-vista';
import { buildTimelineSeguimientoPdfBlock } from '../utils/timeline-seguimiento-informe-longitudinal';
import { formatearNombreTrabajador, formatearTituloYNombreFirmante, formatearTituloYNombreFirmanteConFallback } from '../../../utils/names';
import { EnfermeraFirmanteInforme, MedicoFirmanteInforme, TecnicoFirmanteInforme } from '../types/firmante-informe.types';
import { firmanteTieneLineaNombre, resolverFirmanteActivo } from '../helpers/firmante-informe.helpers';

// ==================== ESTILOS ====================
const styles: StyleDictionary = {
  header: {
    fontSize: 15,
    bold: false,
    color: 'blue',
    decoration: 'underline',
    decorationColor: 'red',
  },
  nombreEmpresa: {
    fontSize: 15,
    bold: true,
    alignment: 'center',
    lineHeight: 1,
  },
  fecha: {
    fontSize: 10,
    alignment: 'right',
  },
  motivo: {
    fontSize: 9,
    alignment: 'right',
  },
  /** Títulos de sección fuera de tabla: no usar tableHeader (texto blanco sin celda con fondo). */
  sectionHeader: {
    fontSize: 8,
    lineHeight: 0.8,
    bold: true,
    alignment: 'left',
    color: '#404040',
    margin: [0, 0, 0, 4],
  },
  label: {
    fontSize: 8,
    lineHeight: 1,
    margin: [0, 0, 0, 0],
  },
  value: {
    bold: true,
    fontSize: 9,
    lineHeight: 1,
    margin: [0, 0, 0, 0],
  },
  tableHeader: {
    fillColor: '#343A40',
    color: '#FFFFFF',
    bold: true,
    fontSize: 8,
    alignment: 'center',
    margin: [0, 0, 0, 0],
  },
  tableCellBold: {
    fontSize: 8,
    bold: true,
    alignment: 'center',
    margin: [0, 0, 0, 0],
  },
  tableCell: {
    fontSize: 8,
    bold: false,
    alignment: 'center',
    margin: [0, 0, 0, 0],
  },
  tableCellLeftBold: {
    fontSize: 8,
    bold: true,
    alignment: 'left',
    margin: [0, 0, 0, 0],
  },
  tableCellLeft: {
    fontSize: 8,
    bold: false,
    alignment: 'left',
    margin: [0, 0, 0, 0],
  },
  tableCellMuted: {
    fontSize: 8,
    bold: false,
    color: '#9CA3AF',
    fillColor: '#E5E7EB',
    alignment: 'center',
    margin: [0, 0, 0, 0],
  },
};

// ==================== CONTENIDO ====================
const headerText: Content = {
  text: '                                            INFORME LONGITUDINAL CARDIOMETABOLICO\n',
  style: 'header',
  alignment: 'right',
  margin: [0, 35, 40, 0],
};

/** Alineado con standardLayout en exploracion-fisica.informe.ts: padding vertical 0, líneas 0.8 */
const layoutTablaCompacta = {
  hLineColor: '#d1d5db',
  vLineColor: '#d1d5db',
  hLineWidth: () => 0.8,
  vLineWidth: () => 0.8,
  paddingLeft: () => 2,
  paddingRight: () => 2,
  paddingTop: () => 0,
  paddingBottom: () => 0,
};

/** Layout con un poco más de aire vertical para tablas con texto largo (laboratorio, adherencia, riesgos). */
const layoutTablaTexto = {
  hLineColor: '#d1d5db',
  vLineColor: '#d1d5db',
  hLineWidth: () => 0.8,
  vLineWidth: () => 0.8,
  paddingLeft: () => 4,
  paddingRight: () => 4,
  paddingTop: () => 2,
  paddingBottom: () => 2,
};

function formatearFechaUTC(fecha: Date): string {
  if (!fecha || isNaN(fecha.getTime())) return '';

  const dia = String(fecha.getUTCDate()).padStart(2, '0');
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  const año = fecha.getUTCFullYear();

  return `${dia}-${mes}-${año}`;
}

function formatearTelefono(telefono: string): string {
  if (!telefono) {
    return '';
  }

  // Si el teléfono ya tiene formato internacional (+52XXXXXXXXXX)
  if (telefono.startsWith('+')) {
    // Buscar el país correspondiente para obtener el código
    const countries = [
      { code: 'MX', dialCode: '+52' },
      { code: 'AR', dialCode: '+54' },
      { code: 'BR', dialCode: '+55' },
      { code: 'CL', dialCode: '+56' },
      { code: 'CO', dialCode: '+57' },
      { code: 'PE', dialCode: '+51' },
      { code: 'VE', dialCode: '+58' },
      { code: 'UY', dialCode: '+598' },
      { code: 'PY', dialCode: '+595' },
      { code: 'BO', dialCode: '+591' },
      { code: 'EC', dialCode: '+593' },
      { code: 'GT', dialCode: '+502' },
      { code: 'CR', dialCode: '+506' },
      { code: 'PA', dialCode: '+507' },
      { code: 'HN', dialCode: '+504' },
      { code: 'NI', dialCode: '+505' },
      { code: 'SV', dialCode: '+503' },
      { code: 'CU', dialCode: '+53' },
      { code: 'DO', dialCode: '+1' },
      { code: 'PR', dialCode: '+1' }
    ];

    // Encontrar el país por código de marcación
    const country = countries.find(c => telefono.startsWith(c.dialCode));
    if (country) {
      const numeroLocal = telefono.replace(country.dialCode, '');
      return `(${country.dialCode}) ${numeroLocal}`;
    }
  }

  // Si es un número local de 10 dígitos (México)
  if (telefono.length === 10 && /^\d{10}$/.test(telefono)) {
    return `(+52) ${telefono}`;
  }

  // Si es un número local de otros países (8-11 dígitos)
  if (telefono.length >= 8 && telefono.length <= 11 && /^\d+$/.test(telefono)) {
    return `(+XX) ${telefono}`;
  }

  // Si no coincide con ningún formato conocido, devolver tal como está
  return telefono;
}

// ==================== INTERFACES ====================
interface Trabajador {
  primerApellido: string;
  segundoApellido: string;
  nombre: string;
  nacimiento?: string;
  edad: string;
  puesto: string;
  sexo: string;
  escolaridad: string;
  antiguedad: string;
  telefono?: string;
  estadoCivil?: string;
  numeroEmpleado?: string;
}

/** Payload alineado con EventoSeguimientoCardiometabolico (schema expedientes). */
interface DatosInformeLongitudinalCardiometabolicoInforme {
  fechaInformeLongitudinalCardiometabolico: Date | string;
  periodoInicio: Date;
  periodoFin: Date;
  numeroEventosIncluidos: number;
  numeroEventosValidos?: number;
  numeroSeguimientosProgramados?: number;
  numeroSeguimientosRealizados?: number;
  numeroInasistencias?: number;
  numeroCancelaciones?: number;
  numeroReprogramaciones?: number;
  porcentajeAsistencia?: number;
  consistenciaSeguimiento?: ConsistenciaSeguimientoLongitudinal;
  datosFaltantesRelevantes?: string[];
  eventosIncluidos?: Types.ObjectId[];
  seguimientosProgramadosIncluidos?: Types.ObjectId[];
  resumenCondiciones?: ResumenCondicionesCardiometabolicas;
  eventosConcentrados?: EventoConcentradoCardiometabolico[];
  seguimientosProgramadosConcentrados?: SeguimientoProgramadoConcentradoCardiometabolico[];
  resumenIndicadores?: ResumenIndicadoresLongitudinal;
  nivelRiesgoLongitudinal?: NivelRiesgoLongitudinal;
  tendenciaLongitudinal?: TrayectoriaLongitudinalInforme;
  interpretacionRiesgoLongitudinal?: string;
  contextoTerapeutico?: string[];
  /** data URL PNG (evolución glucémica en PDF). */
  graficaEvolucionGlucemica?: string;
  graficaEvolucionPresionArterial?: string;
  graficaEvolucionPesoImc?: string;
  graficaEvolucionPerfilLipidico?: string;
}

interface ProveedorSalud {
  nombre: string;
  pais: string;
  perfilProveedorSalud: string;
  logotipoEmpresa: {
    data: string;
    contentType: string;
  } | null;
  estado: string;
  municipio: string;
  codigoPostal: string;
  direccion: string;
  telefono: string;
  correoElectronico: string;
  sitioWeb: string;
  colorInforme: string;
}

// ==================== HELPERS DE LABEL/CLASIFICACIÓN ====================
const PLACEHOLDER = '—';

function fmt(v: unknown): string {
  if (v === undefined || v === null || v === '') return PLACEHOLDER;
  return String(v);
}

function fmtOpcional(v: unknown): string {
  if (v === undefined || v === null || v === '') return '';
  return String(v);
}

/** Salida PDF: hasta 2 decimales sin artefactos float (solo presentación). */
function fmtNumInformePdf(n: unknown): string {
  if (n === undefined || n === null || n === '') return PLACEHOLDER;
  const x = Number(n);
  if (!Number.isFinite(x)) return String(n);
  return String(Number.parseFloat(x.toFixed(2)));
}

/** Cambio inicial→final: (+ 2), (- 0.2) o (0); sin símbolo Δ. */
function formatearCambioIndicadorConSignoPdf(cambio: unknown): string {
  if (cambio === undefined || cambio === null || cambio === '') return '';
  const n = Number(cambio);
  if (!Number.isFinite(n)) return '';
  if (n === 0) return ' (0)';
  const mag = fmtNumInformePdf(Math.abs(n));
  return n > 0 ? ` (+${mag})` : ` (-${mag})`;
}

/** Etiquetas de fila en PDF: mayúsculas tipográficas (es) para dar más peso visual. */
function etiquetaFilaMayusc(s: string): string {
  return s.toLocaleUpperCase('es');
}

function etiquetaDiagnosticoEsc(d: DiagnosticoCardiometabolico): string {
  const m: Record<DiagnosticoCardiometabolico, string> = {
    [DiagnosticoCardiometabolico.HIPERTENSION_ARTERIAL]: 'Hipertensión arterial',
    [DiagnosticoCardiometabolico.DIABETES_MELLITUS_TIPO_2]: 'Diabetes mellitus tipo 2',
    [DiagnosticoCardiometabolico.DISLIPIDEMIA]: 'Dislipidemia',
    [DiagnosticoCardiometabolico.OBESIDAD]: 'Obesidad',
  };
  return m[d] ?? String(d);
}

function etiquetaControlCondicion(c: EstadoControlCondicion | undefined): string {
  if (c == null) return PLACEHOLDER;
  switch (c) {
    case EstadoControlCondicion.CONTROLADA:
      return 'Controlada';
    case EstadoControlCondicion.NO_CONTROLADA:
      return 'No controlada';
    case EstadoControlCondicion.NO_VALORABLE:
      return 'No valorada en esta visita';
    default:
      return String(c);
  }
}

function etiquetaGradoObesidadEsc(g: GradoObesidad | undefined): string {
  if (g == null) return PLACEHOLDER;
  const m: Record<GradoObesidad, string> = {
    [GradoObesidad.SOBREPESO]: 'Sobrepeso',
    [GradoObesidad.OBESIDAD_I]: 'Obesidad clase I',
    [GradoObesidad.OBESIDAD_II]: 'Obesidad clase II',
    [GradoObesidad.OBESIDAD_III]: 'Obesidad clase III',
  };
  return m[g] ?? String(g);
}

function fechaOpcionalInformeEsc(d: Date | string | undefined): string {
  if (d == null || d === '') return PLACEHOLDER;
  const dt = d instanceof Date ? d : new Date(d as string);
  if (isNaN(dt.getTime())) return PLACEHOLDER;
  return formatearFechaUTC(dt);
}

// Reglas de clasificación orientativas (paralelas a frontend/src/helpers/cardiometabolico/laboratorioCategorias.ts).
function clasificarGlucosa(x: number): string {
  if (x < 70) return 'Alterada';
  if (x <= 99) return 'Normal';
  if (x <= 125) return 'Alterada';
  return 'Elevada';
}
function clasificarHbA1c(x: number): string {
  if (x < 5.7) return 'Normal';
  if (x < 6.5) return 'Prediabetes';
  return 'Compatible con diabetes';
}
function clasificarColesterolTotal(x: number): string {
  if (x < 200) return 'Deseable';
  if (x <= 239) return 'Límite alto';
  return 'Alto';
}
function clasificarLDL(x: number): string {
  if (x < 100) return 'Óptimo';
  if (x <= 129) return 'Cerca de óptimo';
  if (x <= 159) return 'Límite alto';
  if (x <= 189) return 'Alto';
  return 'Muy alto';
}
function clasificarHDL(x: number): string {
  if (x < 40) return 'Bajo';
  if (x <= 59) return 'Adecuado';
  return 'Alto';
}
function clasificarTrigliceridos(x: number): string {
  if (x < 150) return 'Normal';
  if (x <= 199) return 'Límite alto';
  if (x <= 499) return 'Alto';
  return 'Muy alto';
}

interface FilaLaboratorio {
  etiqueta: string;
  detalle: string;
}

function lineaLaboratorio(opts: {
  etiqueta: string;
  valor: number | undefined | null;
  unidad: string;
  categoria: string | undefined;
  clasificar: (n: number) => string;
}): FilaLaboratorio | null {
  const { etiqueta, valor, unidad, categoria, clasificar } = opts;
  if (valor === undefined || valor === null) return null;
  const n = typeof valor === 'number' ? valor : Number(valor);
  if (Number.isNaN(n)) return null;
  const cat = (categoria && String(categoria).trim()) || clasificar(n) || '';
  return {
    etiqueta,
    detalle: `${n} ${unidad}${cat ? ` — ${cat}` : ''}`,
  };
}

function filasLaboratorio(L: LaboratorioCardiometabolico | undefined): FilaLaboratorio[] {
  if (!L) return [];
  const filas: (FilaLaboratorio | null)[] = [
    lineaLaboratorio({
      etiqueta: 'Glucosa',
      valor: L.glucosaMgDl,
      unidad: 'mg/dL',
      categoria: L.categoriaGlucosa,
      clasificar: clasificarGlucosa,
    }),
    lineaLaboratorio({
      etiqueta: 'HbA1c',
      valor: L.hba1cPorcentaje,
      unidad: '%',
      categoria: L.categoriaHbA1c,
      clasificar: clasificarHbA1c,
    }),
    lineaLaboratorio({
      etiqueta: 'Colesterol total',
      valor: L.colesterolTotalMgDl,
      unidad: 'mg/dL',
      categoria: L.categoriaColesterolTotal,
      clasificar: clasificarColesterolTotal,
    }),
    lineaLaboratorio({
      etiqueta: 'LDL',
      valor: L.ldlMgDl,
      unidad: 'mg/dL',
      categoria: L.categoriaLDL,
      clasificar: clasificarLDL,
    }),
    lineaLaboratorio({
      etiqueta: 'HDL',
      valor: L.hdlMgDl,
      unidad: 'mg/dL',
      categoria: L.categoriaHDL,
      clasificar: clasificarHDL,
    }),
    lineaLaboratorio({
      etiqueta: 'Triglicéridos',
      valor: L.trigliceridosMgDl,
      unidad: 'mg/dL',
      categoria: L.categoriaTrigliceridos,
      clasificar: clasificarTrigliceridos,
    }),
  ];
  return filas.filter((f): f is FilaLaboratorio => f !== null);
}

// ==================== CONSTRUCTORES DE SECCIONES ====================
const DIAGNOSTICOS_ORDEN: DiagnosticoCardiometabolico[] = [
  DiagnosticoCardiometabolico.HIPERTENSION_ARTERIAL,
  DiagnosticoCardiometabolico.DIABETES_MELLITUS_TIPO_2,
  DiagnosticoCardiometabolico.DISLIPIDEMIA,
  DiagnosticoCardiometabolico.OBESIDAD,
];

interface FilaCondicion {
  key: 'hipertensionArterial' | 'diabetesMellitusTipo2' | 'dislipidemia' | 'obesidad';
  label: string;
}

const FILAS_ESTADO_CONDICION: FilaCondicion[] = [
  { key: 'hipertensionArterial', label: 'Hipertensión arterial' },
  { key: 'diabetesMellitusTipo2', label: 'Diabetes mellitus tipo 2' },
  { key: 'dislipidemia', label: 'Dislipidemia' },
  { key: 'obesidad', label: 'Obesidad' },
];

function tablaDiagnosticosActivos(
  filas: DiagnosticoCardiometabolico[],
  activos: Set<string>,
): Content {
  const body = filas.map((opt) => {
    const activo = activos.has(opt);
    return [
      {
        text: etiquetaFilaMayusc(etiquetaDiagnosticoEsc(opt)),
        style: 'tableCellLeftBold',
        alignment: 'left',
      },
      {
        text: activo ? 'Activo' : PLACEHOLDER,
        style: activo ? 'tableCellBold' : 'tableCell',
        alignment: 'center',
        ...(activo ? { color: '#C2410C' } : {}),
      },
    ];
  });

  return {
    style: 'table',
    table: {
      widths: ['60%', '40%'],
      body,
    },
    layout: layoutTablaCompacta,
  };
}

function tablaEstadoCondiciones(
  filas: FilaCondicion[],
  ec: EstadoCondicionesCardiometabolicas | undefined,
): Content {
  const body = filas.map((fila) => {
    let texto: string;
    let color: string | undefined;

    if (fila.key === 'obesidad') {
      const g = ec?.obesidad?.grado;
      texto = g ? etiquetaGradoObesidadEsc(g) : PLACEHOLDER;
      if (g === GradoObesidad.OBESIDAD_I) color = '#DC2626';
      else if (g === GradoObesidad.OBESIDAD_II) color = '#B91C1C';
      else if (g === GradoObesidad.OBESIDAD_III) color = '#7F1D1D';
    } else {
      const c = ec?.[fila.key]?.control;
      texto = c ? etiquetaControlCondicion(c) : PLACEHOLDER;
      if (c === EstadoControlCondicion.CONTROLADA) color = '#047857';
      else if (c === EstadoControlCondicion.NO_CONTROLADA) color = '#B91C1C';
    }

    return [
      {
        text: etiquetaFilaMayusc(fila.label),
        style: 'tableCellLeftBold',
        alignment: 'left',
      },
      {
        text: texto,
        style: 'tableCellBold',
        alignment: 'center',
        ...(color ? { color } : {}),
      },
    ];
  });

  return {
    style: 'table',
    table: {
      widths: ['40%', '*'],
      body,
    },
    layout: layoutTablaCompacta,
  };
}

function formatoIndicadorResumenPdf(o: ResumenIndicadorLongitudinal | undefined): string {
  if (!o || typeof o !== 'object') return '';
  const vi = o.valorInicial;
  const vf = o.valorFinal;
  if (vi == null && vf == null) return '';
  const tramo =
    vi != null && vf != null
      ? `${fmtNumInformePdf(vi)} → ${fmtNumInformePdf(vf)}`
      : vi != null
        ? fmtNumInformePdf(vi)
        : fmtNumInformePdf(vf);
  const delta =
    vi != null && vf != null
      ? formatearCambioIndicadorConSignoPdf(
          o.cambioAbsoluto ?? Number(vf) - Number(vi),
        )
      : '';
  const tend = o.tendencia ? ` · ${o.tendencia}` : ' · —';
  return `${tramo}${delta}${tend}`;
}

function tramoIndicadorResumenPdf(o: ResumenIndicadorLongitudinal | undefined): string {
  if (!o || typeof o !== 'object') return '';
  const vi = o.valorInicial;
  const vf = o.valorFinal;
  if (vi == null && vf == null) return '';
  if (vi != null && vf != null) {
    return `${fmtNumInformePdf(vi)} → ${fmtNumInformePdf(vf)}`;
  }
  return vi != null ? fmtNumInformePdf(vi) : fmtNumInformePdf(vf);
}

function diferenciaIndicadorResumenPdf(o: ResumenIndicadorLongitudinal | undefined): string {
  if (!o || typeof o !== 'object') return '';
  const vi = o.valorInicial;
  const vf = o.valorFinal;
  if (vi == null || vf == null) return '';
  return (
    formatearCambioIndicadorConSignoPdf(
      o.cambioAbsoluto ?? Number(vf) - Number(vi),
    ) || ''
  );
}

function lineasEvolucionPrincipalPdf(
  r: ResumenIndicadoresLongitudinal | undefined,
): { label: string; tendencia: string; tramo: string; diferencia: string }[] {
  if (!r) return [];
  const lines: { label: string; tendencia: string; tramo: string; diferencia: string }[] = [];
  const push = (label: string, o: ResumenIndicadorLongitudinal | undefined) => {
    if (!formatoIndicadorResumenPdf(o)) return;
    lines.push({
      label,
      tendencia: o?.tendencia ? String(o.tendencia) : '—',
      tramo: tramoIndicadorResumenPdf(o) || '—',
      diferencia: diferenciaIndicadorResumenPdf(o) || '—',
    });
  };
  push('TA sistólica (mmHg)', r.tensionArterialSistolica);
  push('TA diastólica (mmHg)', r.tensionArterialDiastolica);
  push('Peso (kg)', r.peso);
  push('IMC', r.indiceMasaCorporal);
  push('Glucosa (mg/dL)', r.glucosaMgDl);
  push('HbA1c (%)', r.hba1cPorcentaje);
  return lines;
}

function tablaEvolucionPrincipalInformeLongitudinalPdf(
  r: ResumenIndicadoresLongitudinal | undefined,
): Content | null {
  const evoLines = lineasEvolucionPrincipalPdf(r);
  if (!evoLines.length) return null;
  const headerRow: Content[] = [
    { text: 'INDICADOR', style: 'tableHeader' },
    { text: 'TENDENCIA', style: 'tableHeader' },
    { text: 'VALOR INICIAL → FINAL', style: 'tableHeader' },
    { text: 'DIF. ABSOLUTA', style: 'tableHeader' },
  ];
  const body: Content[][] = [
    headerRow,
    ...evoLines.map(
      (l): Content[] =>
        [
          { text: l.label, style: 'tableCellLeftBold', alignment: 'left', fontSize: 8 },
          { text: l.tendencia, style: 'tableCell', fontSize: 8 },
          { text: l.tramo, style: 'tableCell', fontSize: 7.5, color: '#6B7280' },
          { text: l.diferencia, style: 'tableCell', fontSize: 7.5, color: '#6B7280' },
        ] as Content[],
    ),
  ];
  return {
    style: 'table',
    table: {
      widths: ['25%', '25%', '25%', '25%'],
      body,
    },
    layout: layoutTablaCompacta,
    margin: [0, 1, 0, 6],
  };
}

/** Separación entre renglones lógicos distintos (Diagnóstico, Hallazgo, etc.), no entre líneas del mismo wrap. */
const layoutTablaLineasCondicionPdf = {
  hLineWidth: () => 0,
  vLineWidth: () => 0,
  paddingLeft: () => 0,
  paddingRight: () => 0,
  paddingTop: () => 0,
  paddingBottom: () => 1.5,
};

/** Solo interlineado al cortar un mismo texto en varias líneas (pdfmake lineHeight). */
const LINE_HEIGHT_WRAP_CONDICION_PDF = 0.8;

function celdaLineaCondicionPdf(ln: LineaResumenCondicionVista): Content {
  const lineHeight = LINE_HEIGHT_WRAP_CONDICION_PDF;
  const fontSize = 7.5;
  if (ln.soloValor) {
    return {
      text: ln.valor,
      fontSize,
      color: '#334155',
      lineHeight,
    };
  }
  return {
    text: [
      { text: `${ln.etiqueta}: `, color: '#475569', fontSize },
      { text: ln.valor, color: '#0F172A', fontSize, bold: true },
    ],
    lineHeight,
  };
}

function tarjetaCondicionResumenPdf(b: BloqueResumenCondicionVista): Content {
  const filasLineas: Content[][] =
    b.lineas.length > 0
      ? b.lineas.map((ln) => [celdaLineaCondicionPdf(ln)])
      : [[{ text: '', fontSize: 7.5, lineHeight: LINE_HEIGHT_WRAP_CONDICION_PDF }]];

  return {
    table: {
      widths: ['*'],
      body: [
        [
          {
            stack: [
              {
                text: b.titulo,
                fontSize: 8.5,
                bold: true,
                color: '#0F172A',
                margin: [0, 0, 0, 2] as [number, number, number, number],
                lineHeight: 1,
              },
              {
                table: {
                  widths: ['*'],
                  body: filasLineas,
                },
                layout: layoutTablaLineasCondicionPdf,
              },
            ],
            margin: [2, 2, 2, 2] as [number, number, number, number],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => '#E2E8F0',
      vLineColor: () => '#E2E8F0',
      paddingLeft: () => 2,
      paddingRight: () => 2,
      paddingTop: () => 2,
      paddingBottom: () => 2,
    },
  };
}

/** Paridad con visualizador: 4 tarjetas compactas en una fila. */
function buildEstadoClinicoPorCondicionPdfSection(
  rc: ResumenCondicionesCardiometabolicas | undefined,
  resumenIndicadores?: ResumenIndicadoresLongitudinal,
): Content {
  const bloques = bloquesResumenCondicionesParaVista(rc, { resumenIndicadores });
  return {
    stack: [
      { text: 'ESTADO CLÍNICO DURANTE EL PERIODO', style: 'sectionHeader', margin: [0, 2, 0, 3] },
      {
        columns: bloques.map((b) => ({
          width: '*',
          stack: [tarjetaCondicionResumenPdf(b)],
        })),
        columnGap: 6,
      },
    ],
    margin: [0, 8, 0, 2] as [number, number, number, number],
  };
}

function fechaEventoPdf(d: Date | string | undefined): string {
  if (d == null) return PLACEHOLDER;
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return PLACEHOLDER;
  return formatearFechaUTC(dt);
}

function tablaEventosConcentradosPdf(
  eventos: EventoConcentradoCardiometabolico[] | undefined,
): Content | null {
  const ev = eventos?.filter(Boolean) ?? [];
  if (!ev.length) return null;
  const headerRow = [
    { text: 'FECHA', style: 'tableHeader' },
    { text: 'TA (mmHg)', style: 'tableHeader' },
    { text: 'IMC', style: 'tableHeader' },
    { text: 'C. CINTURA (cm)', style: 'tableHeader' },
    { text: 'GLUCOSA (mg/dL)', style: 'tableHeader' },
    { text: 'HbA1c (%)', style: 'tableHeader' },
  ];
  const body: Content[][] = [headerRow];
  for (const row of ev) {
    const sv = row.signosVitales;
    const ta =
      sv?.tensionArterialSistolica != null && sv?.tensionArterialDiastolica != null
        ? `${fmtNumInformePdf(sv.tensionArterialSistolica)}/${fmtNumInformePdf(sv.tensionArterialDiastolica)}`
        : PLACEHOLDER;
    const imc =
      row.somatometria?.indiceMasaCorporal != null
        ? fmtNumInformePdf(row.somatometria.indiceMasaCorporal)
        : PLACEHOLDER;
    const cintura =
      row.somatometria?.circunferenciaCintura != null
        ? fmtNumInformePdf(row.somatometria.circunferenciaCintura)
        : PLACEHOLDER;
    const glu =
      row.laboratorio?.glucosaMgDl != null ? fmtNumInformePdf(row.laboratorio.glucosaMgDl) : PLACEHOLDER;
    const hba =
      row.laboratorio?.hba1cPorcentaje != null
        ? fmtNumInformePdf(row.laboratorio.hba1cPorcentaje)
        : PLACEHOLDER;
    body.push([
      { text: fechaEventoPdf(row.fechaControl), style: 'tableCell' },
      { text: ta, style: 'tableCell' },
      { text: imc, style: 'tableCell' },
      { text: cintura, style: 'tableCell' },
      { text: glu, style: 'tableCell' },
      { text: hba, style: 'tableCell' },
    ]);
  }
  return {
    style: 'table',
    table: {
      widths: ['16%', '16%', '14%', '14%', '18%', '*'],
      body,
    },
    layout: layoutTablaCompacta,
    margin: [0, 4, 0, 2],
  };
}

const MAX_FILAS_TRATAMIENTO_ILC_PDF = 12;
const DIAS_POR_FILA_TRATAMIENTO_ILC_PDF = 2;
const TEXTO_SEGMENTO_SIN_TRATAMIENTO_ILC_PDF =
  'Sin tratamiento farmacológico registrado en este periodo.';

interface CeldaTratamientoDiaPdf {
  fechaLabel: string;
  medicamentos: string[];
  medicamentosOmitidos: number;
  truncadoLista: boolean;
}

interface SegmentoTratamientoInternoPdf {
  fechaInicio: string;
  fechaFin: string;
  fingerprint: string;
  medicamentos: string[];
  medicamentosOmitidos: number;
  truncadoLista: boolean;
}

function filaTratamientoConcentradoTieneDatos(row: TratamientoActualCardiometabolico): boolean {
  return (
    String(row.medicamento ?? '').trim() !== '' ||
    String(row.dosis ?? '').trim() !== '' ||
    String(row.frecuencia ?? '').trim() !== '' ||
    String(row.motivoUso ?? '').trim() !== ''
  );
}

function formatearLineaMedicamentoConcentradoPdf(fila: TratamientoActualCardiometabolico): string {
  const med = String(fila.medicamento ?? '').trim();
  const dosis = String(fila.dosis ?? '').trim();
  const freq = String(fila.frecuencia ?? '').trim();
  const motivo = String(fila.motivoUso ?? '').trim();
  const partes = [med, dosis, freq].filter(Boolean);
  const cuerpo = partes.join(' ');
  if (!cuerpo && !motivo) return '';
  return motivo ? `${cuerpo} — ${motivo}` : cuerpo;
}

function eventosConcentradosOrdenadosPdf(
  eventos: EventoConcentradoCardiometabolico[] | undefined,
): EventoConcentradoCardiometabolico[] {
  const ev = (eventos ?? []).filter(Boolean);
  return [...ev].sort((a, b) => {
    const ta = a.fechaControl ? new Date(a.fechaControl).getTime() : 0;
    const tb = b.fechaControl ? new Date(b.fechaControl).getTime() : 0;
    return ta - tb;
  });
}

function eventoConcentradoTieneTratamientoPdf(ev: EventoConcentradoCardiometabolico): boolean {
  return (ev.tratamientoActual ?? []).some(filaTratamientoConcentradoTieneDatos);
}

function hayEvidenciaTratamientoPeriodoPdf(
  eventos: EventoConcentradoCardiometabolico[] | undefined,
): boolean {
  return eventosConcentradosOrdenadosPdf(eventos).some((ev) => {
    const raw = ev.fechaControl;
    if (raw instanceof Date) return !Number.isNaN(raw.getTime());
    return Boolean(String(raw ?? '').trim());
  });
}

function hayEvidenciaClinicaSoporteVisiblePdf(
  ilc: DatosInformeLongitudinalCardiometabolicoInforme,
): boolean {
  const eventos = ilc.eventosConcentrados;
  if ((ilc.contextoTerapeutico ?? []).some((s) => String(s).trim())) return true;
  if (hayEvidenciaTratamientoPeriodoPdf(eventos)) return true;
  return eventosConcentradosOrdenadosPdf(eventos).length > 0;
}

function buildContextoTerapeuticoBulletsPdf(contexto: string[] | undefined): Content[] {
  const lineas = (contexto ?? []).map((s) => String(s).trim()).filter(Boolean).slice(0, 3);
  return lineas.map((t) => ({
    text: `• ${t}`,
    fontSize: 8,
    color: '#4B5563',
    margin: [0, 0, 0, 2],
  }));
}

function normalizarFilaTratamientoPdf(row: TratamientoActualCardiometabolico): TratamientoActualCardiometabolico {
  const out: TratamientoActualCardiometabolico = {};
  for (const k of ['medicamento', 'dosis', 'frecuencia', 'motivoUso'] as const) {
    const v = String(row[k] ?? '').trim();
    if (v) out[k] = v;
  }
  return out;
}

function fingerprintRegimenTratamientoPdf(ev: EventoConcentradoCardiometabolico): string {
  const filas = (ev.tratamientoActual ?? [])
    .map(normalizarFilaTratamientoPdf)
    .filter(filaTratamientoConcentradoTieneDatos);
  const lineas = filas
    .map(formatearLineaMedicamentoConcentradoPdf)
    .filter((l) => l.trim())
    .sort();
  return lineas.join('|');
}

function labelPeriodoTratamientoPdf(fechaInicio: string, fechaFin: string): string {
  const a = fechaEventoPdf(fechaInicio);
  const b = fechaEventoPdf(fechaFin);
  return a === b ? a : `${a} – ${b}`;
}

function medicamentosVisiblesDesdeEventoPdf(ev: EventoConcentradoCardiometabolico): {
  medicamentos: string[];
  medicamentosOmitidos: number;
  truncadoLista: boolean;
} {
  const filas = (ev.tratamientoActual ?? []).filter(filaTratamientoConcentradoTieneDatos);
  const lineas = filas.map(formatearLineaMedicamentoConcentradoPdf).filter((l) => l.trim());
  const truncadoLista = lineas.length > MAX_FILAS_TRATAMIENTO_ILC_PDF;
  const visibles = truncadoLista ? lineas.slice(0, MAX_FILAS_TRATAMIENTO_ILC_PDF) : lineas;
  return {
    medicamentos: visibles,
    medicamentosOmitidos: Math.max(0, lineas.length - visibles.length),
    truncadoLista,
  };
}

function contenidoMedicamentosSegmentoPdf(ev: EventoConcentradoCardiometabolico): {
  medicamentos: string[];
  medicamentosOmitidos: number;
  truncadoLista: boolean;
} {
  if (!eventoConcentradoTieneTratamientoPdf(ev)) {
    return {
      medicamentos: [TEXTO_SEGMENTO_SIN_TRATAMIENTO_ILC_PDF],
      medicamentosOmitidos: 0,
      truncadoLista: false,
    };
  }
  return medicamentosVisiblesDesdeEventoPdf(ev);
}

/** Sincronizado con buildSegmentosTratamientoPeriodo en informeLongitudinalTratamiento.ts */
function buildCeldasTratamientoPeriodoPdf(
  eventos: EventoConcentradoCardiometabolico[] | undefined,
): CeldaTratamientoDiaPdf[] {
  const cron = eventosConcentradosOrdenadosPdf(eventos);
  const segmentos: SegmentoTratamientoInternoPdf[] = [];

  for (const ev of cron) {
    const rawFecha = ev.fechaControl;
    const fecha =
      rawFecha instanceof Date
        ? rawFecha.toISOString().slice(0, 10)
        : String(rawFecha ?? '').trim();
    if (!fecha) continue;

    const fp = fingerprintRegimenTratamientoPdf(ev);
    const meds = contenidoMedicamentosSegmentoPdf(ev);
    const ultimo = segmentos[segmentos.length - 1];

    if (ultimo && ultimo.fingerprint === fp) {
      ultimo.fechaFin = fecha;
      continue;
    }

    segmentos.push({
      fechaInicio: fecha,
      fechaFin: fecha,
      fingerprint: fp,
      medicamentos: meds.medicamentos,
      medicamentosOmitidos: meds.medicamentosOmitidos,
      truncadoLista: meds.truncadoLista,
    });
  }

  return segmentos.map((seg) => ({
    fechaLabel: labelPeriodoTratamientoPdf(seg.fechaInicio, seg.fechaFin),
    medicamentos: seg.medicamentos,
    medicamentosOmitidos: seg.medicamentosOmitidos,
    truncadoLista: seg.truncadoLista,
  }));
}

function buildCeldaTratamientoStackPdf(celda: CeldaTratamientoDiaPdf): Content[] {
  const stack: Content[] = [
    {
      text: celda.fechaLabel,
      fontSize: 7.5,
      bold: true,
      color: '#374151',
      margin: [0, 0, 0, 1],
    },
  ];
  for (const med of celda.medicamentos) {
    const sinTrat = med === TEXTO_SEGMENTO_SIN_TRATAMIENTO_ILC_PDF;
    stack.push({
      text: sinTrat ? med : `· ${med}`,
      fontSize: 7.5,
      color: sinTrat ? '#6B7280' : '#4B5563',
      italics: sinTrat,
      margin: [0, 0, 0, 0.5],
    });
  }
  if (celda.medicamentosOmitidos > 0) {
    stack.push({
      text: `+${celda.medicamentosOmitidos} más (lista larga en origen)`,
      fontSize: 7,
      color: '#6B7280',
      italics: true,
      margin: [0, 0, 0, 0.5],
    });
  }
  return stack;
}

function buildTratamientoPeriodoPdf(
  eventos: EventoConcentradoCardiometabolico[] | undefined,
): Content[] {
  const celdas = buildCeldasTratamientoPeriodoPdf(eventos);
  if (!celdas.length) return [];

  const blocks: Content[] = [
    {
      text: 'TRATAMIENTO REGISTRADO DURANTE EL PERIODO',
      fontSize: 7.5,
      bold: true,
      color: '#6B7280',
      margin: [0, 4, 0, 2],
    },
  ];

  if (celdas.length === 1) {
    blocks.push({
      stack: buildCeldaTratamientoStackPdf(celdas[0]),
      margin: [0, 0, 0, 3],
    });
    return blocks;
  }

  const porFila = DIAS_POR_FILA_TRATAMIENTO_ILC_PDF;
  for (let i = 0; i < celdas.length; i += porFila) {
    const fila = celdas.slice(i, i + porFila);
    const columnas = fila.map((celda) => ({
      width: '*' as const,
      stack: buildCeldaTratamientoStackPdf(celda),
    }));
    while (columnas.length < porFila) {
      columnas.push({ width: '*' as const, stack: [] });
    }
    blocks.push({
      columns: columnas,
      columnGap: 8,
      margin: [0, 0, 0, 3],
    });
  }
  return blocks;
}

function buildEvidenciaClinicaSoportePdf(
  ilc: DatosInformeLongitudinalCardiometabolicoInforme,
): Content[] {
  if (!hayEvidenciaClinicaSoporteVisiblePdf(ilc)) return [];

  const eventos = ilc.eventosConcentrados;
  const tablaEv = tablaEventosConcentradosPdf(eventos);
  const tablaLip = tablaPerfilLipidicoConcentradoPdf(eventos);
  const ctxBullets = buildContextoTerapeuticoBulletsPdf(ilc.contextoTerapeutico);
  const trat = buildTratamientoPeriodoPdf(eventos);
  const hayTablasConcentrado = !!(tablaEv || tablaLip);

  const out: Content[] = [
    { text: 'CONTEXTO TERAPÉUTICO', style: 'sectionHeader', margin: [0, 10, 0, 2] },
    ...ctxBullets,
    ...trat,
  ];

  if (hayTablasConcentrado) {
    const marginTopEvidencia =
      ctxBullets.length || trat.length ? 8 : 10;
    out.push({
      text: 'EVIDENCIA CLÍNICA DE SOPORTE',
      style: 'sectionHeader',
      margin: [0, marginTopEvidencia, 0, 4],
    });
    if (tablaEv) out.push(tablaEv);
    if (tablaLip) {
      out.push({
        text: 'PERFIL LIPÍDICO',
        fontSize: 7.5,
        bold: true,
        color: '#6B7280',
        margin: [0, tablaEv ? 4 : 2, 0, 2],
      });
      out.push(tablaLip);
    }
  }

  return out;
}

function tablaPerfilLipidicoConcentradoPdf(
  eventos: EventoConcentradoCardiometabolico[] | undefined,
): Content | null {
  const ev = eventos?.filter(Boolean) ?? [];
  if (!ev.length) return null;
  const headerRow = [
    { text: 'FECHA', style: 'tableHeader' },
    { text: 'CT (mg/dL)', style: 'tableHeader' },
    { text: 'LDL (mg/dL)', style: 'tableHeader' },
    { text: 'HDL (mg/dL)', style: 'tableHeader' },
    { text: 'TG (mg/dL)', style: 'tableHeader' },
  ];
  const body: Content[][] = [headerRow];
  for (const row of ev) {
    const lab = row.laboratorio;
    const ct =
      lab?.colesterolTotalMgDl != null ? fmtNumInformePdf(lab.colesterolTotalMgDl) : PLACEHOLDER;
    const ldl = lab?.ldlMgDl != null ? fmtNumInformePdf(lab.ldlMgDl) : PLACEHOLDER;
    const hdl = lab?.hdlMgDl != null ? fmtNumInformePdf(lab.hdlMgDl) : PLACEHOLDER;
    const tg =
      lab?.trigliceridosMgDl != null ? fmtNumInformePdf(lab.trigliceridosMgDl) : PLACEHOLDER;
    body.push([
      { text: fechaEventoPdf(row.fechaControl), style: 'tableCell' },
      { text: ct, style: 'tableCell' },
      { text: ldl, style: 'tableCell' },
      { text: hdl, style: 'tableCell' },
      { text: tg, style: 'tableCell' },
    ]);
  }
  return {
    style: 'table',
    table: {
      widths: ['20%', '20%', '20%', '20%', '*'],
      body,
    },
    layout: layoutTablaCompacta,
    margin: [0, 4, 0, 6],
  };
}

/** Color de texto semáforo (solo valores; etiquetas siguen en gris). Alineado con Step2 del frontend. */
const PDF_TEXT_SEMAFORO = {
  ok: '#047857',
  warn: '#b45309',
  bad: '#b91c1c',
  neutral: '#4b5563',
} as const;

function pdfTextColorRiesgoLongitudinal(nivel: unknown): string {
  const s = nivel == null ? '' : String(nivel).trim();
  if (!s) return PDF_TEXT_SEMAFORO.neutral;
  if (s === 'Muy Bajo' || s === 'Bajo') return PDF_TEXT_SEMAFORO.ok;
  if (s === 'Moderado') return PDF_TEXT_SEMAFORO.warn;
  if (s === 'Alto' || s === 'Crítico') return PDF_TEXT_SEMAFORO.bad;
  return PDF_TEXT_SEMAFORO.neutral;
}

function pdfTextColorTrayectoriaLongitudinal(t: unknown): string {
  const s = t == null ? '' : String(t).trim();
  if (!s) return PDF_TEXT_SEMAFORO.neutral;
  if (s === 'Favorable' || s === 'Estable') return PDF_TEXT_SEMAFORO.ok;
  if (s === 'Mixta') return PDF_TEXT_SEMAFORO.warn;
  if (s === 'Desfavorable') return PDF_TEXT_SEMAFORO.bad;
  return PDF_TEXT_SEMAFORO.neutral;
}

function pdfTextColorPorcentajeAsistencia(p: unknown): string {
  if (p == null || p === '') return PDF_TEXT_SEMAFORO.neutral;
  const n = Number(p);
  if (!Number.isFinite(n)) return PDF_TEXT_SEMAFORO.neutral;
  if (n >= 70) return PDF_TEXT_SEMAFORO.ok;
  if (n >= 50) return PDF_TEXT_SEMAFORO.warn;
  return PDF_TEXT_SEMAFORO.bad;
}

function pdfTextColorConsistenciaSeguimiento(c: unknown): string {
  const s = c == null ? '' : String(c).trim();
  if (!s) return PDF_TEXT_SEMAFORO.neutral;
  if (s === 'Adecuado') return PDF_TEXT_SEMAFORO.ok;
  if (s === 'Irregular') return PDF_TEXT_SEMAFORO.warn;
  if (s === 'Insuficiente') return PDF_TEXT_SEMAFORO.bad;
  return PDF_TEXT_SEMAFORO.neutral;
}

/**
 * Seguimiento operativo (asistencia, consistencia, conteos): mismo patrón que
 * RIESGO LONGITUDINAL / TRAYECTORIA DEL PERIODO (columnas, etiquetas #6B7280, valores grandes semáforo).
 */
function buildSeguimientoOperativoInformePdf(
  ilc: DatosInformeLongitudinalCardiometabolicoInforme,
  hayTimelineSeguimiento: boolean,
): Content[] {
  const blocks: Content[] = [];

  const hasPct = ilc.porcentajeAsistencia != null && Number.isFinite(Number(ilc.porcentajeAsistencia));
  const hasCons =
    ilc.consistenciaSeguimiento != null && String(ilc.consistenciaSeguimiento).trim() !== '';
  const hasConteos = ilc.numeroSeguimientosRealizados != null;

  const marginTopPrimero = hayTimelineSeguimiento ? 10 : 0;

  if (!hayTimelineSeguimiento) {
    blocks.push({
      text: 'CONTINUIDAD DEL SEGUIMIENTO',
      fontSize: 7.5,
      bold: true,
      color: '#9CA3AF',
      margin: [0, 12, 0, 3],
    });
  }

  if (hasPct || hasCons) {
    blocks.push({
      columns: [
        {
          width: '*',
          stack: [
            { text: '% DE ASISTENCIA', fontSize: 8, bold: true, color: '#6B7280' },
            {
              text: hasPct ? `${fmtNumInformePdf(ilc.porcentajeAsistencia!)}%` : '—',
              fontSize: 18,
              bold: true,
              color: hasPct
                ? pdfTextColorPorcentajeAsistencia(ilc.porcentajeAsistencia)
                : PDF_TEXT_SEMAFORO.neutral,
              margin: [0, 2, 0, 0],
            },
          ],
        },
        {
          width: '*',
          stack: [
            { text: 'CONSISTENCIA DEL SEGUIMIENTO', fontSize: 8, bold: true, color: '#6B7280' },
            {
              text: hasCons ? String(ilc.consistenciaSeguimiento) : '—',
              fontSize: 16,
              bold: true,
              color: hasCons
                ? pdfTextColorConsistenciaSeguimiento(ilc.consistenciaSeguimiento)
                : PDF_TEXT_SEMAFORO.neutral,
              margin: [0, 2, 0, 0],
            },
          ],
        },
      ],
      columnGap: 10,
      margin: [0, marginTopPrimero, 0, hasConteos ? 4 : 6],
    });
  }

  if (hasConteos) {
    blocks.push({
      text: `Eventos / inasistencias / cancelaciones: ${fmt(ilc.numeroSeguimientosRealizados)} / ${fmt(ilc.numeroInasistencias)} / ${fmt(ilc.numeroCancelaciones)}`,
      fontSize: 9,
      color: '#6B7280',
      margin: [0, hasPct || hasCons ? 0 : marginTopPrimero, 0, 8],
    });
  }

  if (!hasPct && !hasCons && !hasConteos) {
    blocks.push({
      text: 'Sin métricas operativas registradas.',
      italics: true,
      fontSize: 8,
      color: '#9CA3AF',
      margin: [0, hayTimelineSeguimiento ? 10 : 0, 0, 8],
    });
  }

  return blocks;
}

/** Cuerpo clínico y evidencia: jerarquía alineada con el visualizador. */
function buildCuerpoInformeLongitudinalPdf(ilc: DatosInformeLongitudinalCardiometabolicoInforme): Content[] {
  const out: Content[] = [];

  const pushSub = (titulo: string, marginTop = 4) => {
    out.push({
      text: titulo,
      fontSize: 8,
      bold: true,
      color: '#4B5563',
      margin: [0, marginTop, 0, 2],
    });
  };

  const pushSubDiscrete = (titulo: string, marginTop = 6) => {
    out.push({
      text: titulo,
      fontSize: 7.5,
      bold: true,
      color: '#6B7280',
      margin: [0, marginTop, 0, 2],
    });
  };

  const pushParrafo = (text: string | undefined, opts?: { fontSize?: number; marginBottom?: number }) => {
    const t = text?.trim();
    if (!t) return;
    out.push({
      text: t,
      fontSize: opts?.fontSize ?? 9,
      margin: [0, 0, 0, opts?.marginBottom ?? 6],
    });
  };

  out.push({
    columns: [
      {
        width: '*',
        stack: [
          { text: 'RIESGO LONGITUDINAL', fontSize: 8, bold: true, color: '#6B7280' },
          {
            text: fmt(ilc.nivelRiesgoLongitudinal),
            fontSize: 18,
            bold: true,
            color: pdfTextColorRiesgoLongitudinal(ilc.nivelRiesgoLongitudinal),
            margin: [0, 2, 0, 0],
          },
        ],
      },
      {
        width: '*',
        stack: [
          { text: 'TRAYECTORIA DEL PERIODO', fontSize: 8, bold: true, color: '#6B7280' },
          {
            text: fmt(ilc.tendenciaLongitudinal),
            fontSize: 16,
            bold: true,
            color: pdfTextColorTrayectoriaLongitudinal(ilc.tendenciaLongitudinal),
            margin: [0, 2, 0, 0],
          },
        ],
      },
    ],
    columnGap: 10,
    margin: [0, 0, 0, 6],
  });

  if (ilc.interpretacionRiesgoLongitudinal?.trim()) {
    pushSub('INTERPRETACIÓN DEL RIESGO', 0);
    pushParrafo(ilc.interpretacionRiesgoLongitudinal, { marginBottom: 6 });
  }

  const tablaEvo = tablaEvolucionPrincipalInformeLongitudinalPdf(ilc.resumenIndicadores);
  if (tablaEvo) {
    out.push({
      text: 'EVOLUCIÓN PRINCIPAL / TENDENCIA EN INDICADORES',
      style: 'sectionHeader',
      margin: [0, 4, 0, 3],
    });
    out.push(tablaEvo);
  }

  out.push(buildEstadoClinicoPorCondicionPdfSection(ilc.resumenCondiciones, ilc.resumenIndicadores));

  // PNG de evolución (Chart.js en el visualizador): contraste grid vs referencias, ver VisualizadorInformeLongitudinalCardiometabolico.vue (ILC_CHART_*).
  const imgGlucemia = ilc.graficaEvolucionGlucemica?.trim();
  if (imgGlucemia) {
    out.push({ text: 'EVOLUCIÓN GLUCÉMICA', style: 'sectionHeader', margin: [0, 10, 0, 2] });
    out.push({
      text: 'Glucosa y HbA1c durante el periodo evaluado',
      fontSize: 8,
      color: '#6B7280',
      margin: [0, 0, 0, 4],
    });
    out.push({
      image: imgGlucemia,
      width: 460,
      alignment: 'center',
      margin: [0, 0, 0, 8],
    });
  }

  const imgPresionArterial = ilc.graficaEvolucionPresionArterial?.trim();
  if (imgPresionArterial) {
    out.push({
      text: 'EVOLUCIÓN DE PRESIÓN ARTERIAL',
      style: 'sectionHeader',
      margin: [0, 12, 0, 2],
      pageBreak: 'before',
    });
    out.push({
      text: 'Presión sistólica y diastólica durante el periodo evaluado',
      fontSize: 8,
      color: '#6B7280',
      margin: [0, 0, 0, 4],
    });
    out.push({
      image: imgPresionArterial,
      width: 460,
      alignment: 'center',
      margin: [0, 0, 0, 8],
    });
  }

  const imgPesoImc = ilc.graficaEvolucionPesoImc?.trim();
  if (imgPesoImc) {
    out.push({ text: 'EVOLUCIÓN DE PESO E IMC', style: 'sectionHeader', margin: [0, 6, 0, 2] });
    out.push({
      text: 'Cambios de peso corporal e índice de masa corporal durante el periodo evaluado',
      fontSize: 8,
      color: '#6B7280',
      margin: [0, 0, 0, 4],
    });
    out.push({
      image: imgPesoImc,
      width: 460,
      alignment: 'center',
      margin: [0, 0, 0, 8],
    });
  }

  const imgPerfilLipidico = ilc.graficaEvolucionPerfilLipidico?.trim();
  if (imgPerfilLipidico) {
    out.push({ text: 'EVOLUCIÓN DEL PERFIL LIPÍDICO', style: 'sectionHeader', margin: [0, 6, 0, 2] });
    out.push({
      text: 'Colesterol total, LDL, HDL y triglicéridos durante el periodo evaluado',
      fontSize: 8,
      color: '#6B7280',
      margin: [0, 0, 0, 4],
    });
    out.push({
      image: imgPerfilLipidico,
      width: 460,
      alignment: 'center',
      margin: [0, 0, 0, 8],
    });
  }

  const timelinePdf = buildTimelineSeguimientoPdfBlock(
    ilc.eventosConcentrados,
    ilc.seguimientosProgramadosConcentrados,
  );
  if (timelinePdf) {
    out.push(timelinePdf);
  }
  const hayTimelineSeguimiento = !!timelinePdf;

  for (const bloque of buildSeguimientoOperativoInformePdf(ilc, hayTimelineSeguimiento)) {
    out.push(bloque);
  }

  for (const bloque of buildEvidenciaClinicaSoportePdf(ilc)) {
    out.push(bloque);
  }

  return out;
}

// ==================== INFORME PRINCIPAL ====================
export const informeLongitudinalCardiometabolicoInforme = (
  nombreEmpresa: string,
  trabajador: Trabajador,
  informeLongitudinalCardiometabolico: DatosInformeLongitudinalCardiometabolicoInforme,
  medicoFirmante: MedicoFirmanteInforme | null,
  enfermeraFirmante: EnfermeraFirmanteInforme | null,
  tecnicoFirmante: TecnicoFirmanteInforme | null,
  proveedorSalud: ProveedorSalud,
  footerFirmantesData?: FooterFirmantesData,
): TDocumentDefinitions => {

  // Determinar cuál firmante usar (médico tiene prioridad)
  const usarMedico = medicoFirmante?.nombre ? true : false;
  const usarEnfermera = !usarMedico && enfermeraFirmante?.nombre ? true : false;
  const usarTecnico = !usarMedico && !usarEnfermera && tecnicoFirmante?.nombre ? true : false;

  // Seleccionar el firmante a usar
  const firmanteActivo = usarMedico ? medicoFirmante : (usarEnfermera ? enfermeraFirmante : (usarTecnico ? tecnicoFirmante : null));

  // Clonamos los estilos y cambiamos fillColor antes de pasarlos a pdfMake
  const updatedStyles: StyleDictionary = { ...styles };

  updatedStyles.tableHeader = {
    ...updatedStyles.tableHeader,
    fillColor: proveedorSalud.colorInforme || '#343A40',
  };

  const firmaFilename = footerFirmantesData?.esDocumentoFinalizado
      ? footerFirmantesData?.finalizador?.firma?.data
      : firmanteActivo?.firma?.data;
  const firma: Content = firmaFilename
    ? { image: `assets/signatories/${firmaFilename}`, width: 65 }
    : { text: '' };

  const logo: Content = proveedorSalud.logotipoEmpresa?.data
    ? { image: `assets/providers-logos/${proveedorSalud.logotipoEmpresa.data}`, width: 55, margin: [40, 20, 0, 0] }
    : { image: 'assets/RamazziniBrand600x600.png', width: 55, margin: [40, 20, 0, 0] };

  const ilc = informeLongitudinalCardiometabolico;
  const fechaInformeLongitudinal =
    ilc.fechaInformeLongitudinalCardiometabolico instanceof Date
      ? ilc.fechaInformeLongitudinalCardiometabolico
      : new Date(ilc.fechaInformeLongitudinalCardiometabolico as string);

  // Empresa, subtítulo, fecha y periodo (alineado con visualizador)
  const nombreEmpresaSeccion: Content = {
    style: 'table',
    table: {
      widths: ['60%', '40%'],
      body: [
        [
          {
            stack: [
              { text: nombreEmpresa, style: 'nombreEmpresa', alignment: 'center' },
              {
                text: '',
                fontSize: 9,
                alignment: 'center',
                color: '#4B5563',
                margin: [0, 3, 0, 0],
              },
            ],
            alignment: 'center',
            margin: [0, 0, 0, 0],
            rowSpan: 2,
          },
          {
            text: [
              { text: 'Fecha del informe: ', style: 'fecha', bold: false },
              {
                text: formatearFechaUTC(fechaInformeLongitudinal),
                style: 'fecha',
                bold: true,
                decoration: 'underline',
              },
            ],
            margin: [0, 4, 0, 0],
          },
        ],
        [
          {} as Content,
          {
            text: [
              { text: 'Periodo evaluado: ', style: 'motivo', bold: false },
              {
                text: `${fechaOpcionalInformeEsc(ilc.periodoInicio)} – ${fechaOpcionalInformeEsc(ilc.periodoFin)}`,
                style: 'motivo',
                bold: true,
              },
            ],
            margin: [0, 0, 0, 0],
          },
        ],
      ],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 4],
  };

  // Tabla del trabajador (replica visualizador: 5 filas, 4 columnas)
  const trabajadorSeccion: Content = {
    style: 'table',
    table: {
      widths: ['18%', '32%', '18%', '32%'],
      body: [
        [
          { text: 'NOMBRE', style: 'label' },
          { text: formatearNombreTrabajador(trabajador), style: 'value' },
          { text: 'NACIMIENTO', style: 'label' },
          { text: fmtOpcional(trabajador.nacimiento), style: 'value' },
        ],
        [
          { text: 'ESCOLARIDAD', style: 'label' },
          { text: fmtOpcional(trabajador.escolaridad), style: 'value' },
          { text: 'EDAD', style: 'label' },
          { text: fmtOpcional(trabajador.edad), style: 'value' },
        ],
        [
          { text: 'PUESTO', style: 'label' },
          { text: fmtOpcional(trabajador.puesto), style: 'value' },
          { text: 'SEXO', style: 'label' },
          { text: fmtOpcional(trabajador.sexo), style: 'value' },
        ],
        [
          { text: 'ANTIGÜEDAD', style: 'label' },
          { text: fmtOpcional(trabajador.antiguedad), style: 'value' },
          { text: 'TELÉFONO', style: 'label' },
          { text: fmtOpcional(trabajador.telefono), style: 'value' },
        ],
        [
          { text: 'ESTADO CIVIL', style: 'label' },
          { text: fmtOpcional(trabajador.estadoCivil), style: 'value' },
          { text: 'NUM. EMPLEADO', style: 'label' },
          {
            text: trabajador.numeroEmpleado || 'No asignado',
            style: 'value',
          },
        ],
      ],
    },
    layout: {
      hLineColor: '#e5e7eb',
      vLineColor: '#e5e7eb',
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      paddingLeft: () => 2,
      paddingRight: () => 2,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    margin: [0, 0, 0, 8],
  };

  const cuerpoInforme = buildCuerpoInformeLongitudinalPdf(ilc);

  const content: Content[] = [nombreEmpresaSeccion, trabajadorSeccion, ...cuerpoInforme];

  return {
    pageSize: 'LETTER',
    pageMargins: [40, 70, 40, 80],
    header: {
      columns: [logo, headerText],
    },
    content,
    // Pie de pagina
    footer: {
      stack: [
        {
          canvas: [
            {
              type: 'line',
              x1: 40,
              y1: 0,
              x2: 575,
              y2: 0,
              lineWidth: 0.5,
              lineColor: '#FF0000',
            },
            {
              type: 'line',
              x1: 40,
              y1: 0.5, // Una ligera variación para darle mayor visibilidad
              x2: 575,
              y2: 0.5,
              lineWidth: 0.5,
              lineColor: '#FF0000',
            },
          ],
          margin: [0, 0, 0, 5],
        },
        {
          columns: [
            {
              text: footerFirmantesData?.esDocumentoFinalizado
                ? generarFooterFirmantes(footerFirmantesData, proveedorSalud)
                : [
                // Nombre y título profesional
                firmanteTieneLineaNombre(firmanteActivo)
                  ? {
                      text: `${formatearTituloYNombreFirmante(firmanteActivo)}\n`,
                      bold: true,
                    }
                  : null,

                // Cédula profesional (para médicos y enfermeras)
                firmanteActivo?.numeroCedulaProfesional
                  ? {
                      text: proveedorSalud.pais === 'MX'
                        ? `Cédula Profesional ${usarMedico ? 'Médico Cirujano' : ''} No. ${firmanteActivo.numeroCedulaProfesional}\n`
                        : proveedorSalud.pais === 'GT'
                        ? `Colegiado Activo No. ${firmanteActivo.numeroCedulaProfesional}\n`
                        : `Registro Profesional No. ${firmanteActivo.numeroCedulaProfesional}\n`,
                      bold: false,
                    }
                  : null,

                // Cédula de especialista (solo para médicos)
                (usarMedico && medicoFirmante?.numeroCedulaEspecialista)
                  ? {
                      text: proveedorSalud.pais === 'MX'
                        ? `Cédula Especialidad Med. del Trab. No. ${medicoFirmante.numeroCedulaEspecialista}\n`
                        : `Registro de Especialidad No. ${medicoFirmante.numeroCedulaEspecialista}\n`,
                      bold: false,
                    }
                  : null,

                // Credencial adicional
                (firmanteActivo?.nombreCredencialAdicional && firmanteActivo?.numeroCredencialAdicional)
                ? {
                    text: `${(firmanteActivo.nombreCredencialAdicional + ' No. ' + firmanteActivo.numeroCredencialAdicional).substring(0, 60)}${(firmanteActivo.nombreCredencialAdicional + ' No. ' + firmanteActivo.numeroCredencialAdicional).length > 60 ? '...' : ''}\n`,
                    bold: false,
                  }
                : null,

                // Texto específico para enfermeras
                (usarEnfermera && enfermeraFirmante?.sexo)
                  ? {
                      text: enfermeraFirmante.sexo === 'Femenino'
                        ? 'Enfermera responsable del cuestionario\n'
                        : 'Enfermero responsable del cuestionario\n',
                      bold: false,
                    }
                  : null,

                // Texto específico para técnicos
                (usarTecnico && tecnicoFirmante?.sexo)
                  ? {
                      text: tecnicoFirmante.sexo === 'Femenino'
                        ? 'Responsable de la evaluación\n'
                        : 'Responsable de la evaluación\n',
                      bold: false,
                    }
                  : null,

              ].filter(item => item !== null),
              fontSize: 8,
              margin: [40, 0, 0, 0],
            },
            // Solo incluir la columna de firma si hay firma
            ...((footerFirmantesData?.esDocumentoFinalizado
              ? footerFirmantesData?.finalizador?.firma?.data
              : firmanteActivo?.firma?.data)
              ? [{
              ...firma,
              margin: [0, -3, 0, 0] as [number, number, number, number],
            }] : []),
            {
              text: [
                proveedorSalud.nombre
                  ? {
                      text: `${proveedorSalud.nombre}\n`,
                      bold: true,
                      italics: true,
                    }
                  : null,

                proveedorSalud.direccion
                  ? {
                      text: `${proveedorSalud.direccion}\n`,
                      bold: false,
                      italics: true,
                    }
                  : null,

                (proveedorSalud.municipio && proveedorSalud.estado && proveedorSalud.telefono)
                  ? {
                      text: `${proveedorSalud.municipio}, ${proveedorSalud.estado}, Tel. ${formatearTelefono(proveedorSalud.telefono)}\n`,
                      bold: false,
                      italics: true,
                    }
                  : null,

                proveedorSalud.sitioWeb
                  ? {
                      text: `${proveedorSalud.sitioWeb}`,
                      bold: false,
                      link: `https://${proveedorSalud.sitioWeb}`,
                      italics: true,
                      color: 'blue',
                    }
                  : null,
              ].filter(item => item !== null),  // Elimina los elementos nulos
              alignment: 'right',
              fontSize: 8,
              margin: [0, 0, 40, 0],
            },
          ],
        },
      ],
    },
    // Estilos
    styles: updatedStyles,
  };
};
