import type {
  Content,
  StyleDictionary,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';
import { Types } from 'mongoose';
import {
  DiagnosticoCardiometabolico,
  EstadoControlCondicion,
  GradoObesidad,
} from '../../expedientes/enums/cardiometabolico.enums';
import {
  ConsistenciaSeguimientoLongitudinal,
  GraficaLongitudinalCardiometabolica,
  NivelRiesgoLongitudinal,
} from '../../expedientes/enums/informe-longitudinal-cardiometabolico.enums';
import type {
  EstadoCondicionesCardiometabolicas,
  LaboratorioCardiometabolico,
  SignosVitalesCardiometabolico,
  SomatometriaCardiometabolico,
} from '../../expedientes/schemas/evento-seguimiento-cardiometabolico.schema';
import type {
  CondicionControlResumenLongitudinal,
  CondicionObesidadResumenLongitudinal,
  EventoConcentradoCardiometabolico,
  ResumenCondicionesCardiometabolicas,
  ResumenIndicadorLongitudinal,
  ResumenIndicadoresLongitudinal,
  SeguimientoProgramadoConcentradoCardiometabolico,
} from '../../expedientes/schemas/informe-longitudinal-cardiometabolico.schema';
import { formatearNombreTrabajador } from '../../../utils/names';

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
    fontSize: 10,
    lineHeight: 0.8,
    bold: true,
    alignment: 'center',
    color: '#111827',
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
  fechaUltimoEventoConsiderado?: Date;
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
  graficasIncluidas?: GraficaLongitudinalCardiometabolica[];
  nivelRiesgoLongitudinal?: NivelRiesgoLongitudinal;
  interpretacionRiesgoLongitudinal?: string;
  factoresPersistentes?: string[];
  alertasRelevantes?: string[];
  resumenLongitudinalSugerido?: string;
  conclusionClinicaSugerida?: string;
  recomendacionesSugeridas?: string;
  limitacionesSugeridas?: string;
  resumenLongitudinal?: string;
  conclusionClinica?: string;
  recomendaciones?: string;
  limitaciones?: string;
}

interface MedicoFirmante {
  nombre: string;
  tituloProfesional: string;
  numeroCedulaProfesional: string;
  especialistaSaludTrabajo: string;
  numeroCedulaEspecialista: string;
  nombreCredencialAdicional: string;
  numeroCredencialAdicional: string;
  firma: {
    data: string;
    contentType: string;
  } | null;
}

interface EnfermeraFirmante {
  nombre: string;
  sexo: string;
  tituloProfesional: string;
  numeroCedulaProfesional: string;
  nombreCredencialAdicional: string;
  numeroCredencialAdicional: string;
  firma: {
    data: string;
    contentType: string;
  } | null;
}

interface TecnicoFirmante {
  nombre: string;
  sexo: string;
  tituloProfesional: string;
  numeroCedulaProfesional: string;
  nombreCredencialAdicional: string;
  numeroCredencialAdicional: string;
  firma: {
    data: string;
    contentType: string;
  } | null;
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

type BloqueCondicionResumenLongitudinal =
  | CondicionControlResumenLongitudinal
  | CondicionObesidadResumenLongitudinal;

function formatoIndicadorResumenPdf(o: ResumenIndicadorLongitudinal | undefined): string {
  if (!o || typeof o !== 'object') return '';
  const vi = o.valorInicial;
  const vf = o.valorFinal;
  if (vi == null && vf == null) return '';
  const tramo =
    vi != null && vf != null ? `${vi} → ${vf}` : vi != null ? String(vi) : String(vf);
  const delta =
    o.cambioAbsoluto != null && vi != null && vf != null ? ` (Δ ${o.cambioAbsoluto})` : '';
  const tend = o.tendencia ? ` · ${o.tendencia}` : ' · —';
  return `${tramo}${delta}${tend}`;
}

function lineasEvolucionPrincipalPdf(
  r: ResumenIndicadoresLongitudinal | undefined,
): { label: string; texto: string }[] {
  if (!r) return [];
  const lines: { label: string; texto: string }[] = [];
  const push = (label: string, o: ResumenIndicadorLongitudinal | undefined) => {
    const t = formatoIndicadorResumenPdf(o);
    if (!t) return;
    lines.push({ label, texto: t });
  };
  push('TA sistólica (mmHg)', r.tensionArterialSistolica);
  push('TA diastólica (mmHg)', r.tensionArterialDiastolica);
  push('Peso (kg)', r.peso);
  push('IMC', r.indiceMasaCorporal);
  push('Glucosa (mg/dL)', r.glucosaMgDl);
  push('HbA1c (%)', r.hba1cPorcentaje);
  return lines;
}

function textoCondicionResumenPdf(bloque: BloqueCondicionResumenLongitudinal | undefined): string | null {
  if (!bloque || typeof bloque !== 'object') return null;
  const parts: string[] = [];
  if (bloque.presente != null) parts.push(`Presente: ${bloque.presente ? 'Sí' : 'No'}`);
  if ('estadoActual' in bloque && bloque.estadoActual) {
    parts.push(`Estado: ${String(bloque.estadoActual)}`);
  }
  if ('gradoActual' in bloque && bloque.gradoActual) {
    parts.push(`Grado: ${String(bloque.gradoActual)}`);
  }
  if (bloque.tendencia) parts.push(`Tendencia: ${String(bloque.tendencia)}`);
  if (bloque.interpretacionAutomatica) parts.push(String(bloque.interpretacionAutomatica));
  if (bloque.observaciones) parts.push(String(bloque.observaciones));
  return parts.length ? parts.join(' · ') : null;
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
    { text: 'TA SIS/DIA', style: 'tableHeader' },
    { text: 'IMC', style: 'tableHeader' },
    { text: 'GLUCOSA', style: 'tableHeader' },
    { text: 'HbA1c', style: 'tableHeader' },
    { text: 'RIESGO', style: 'tableHeader' },
  ];
  const body: Content[][] = [headerRow];
  for (const row of ev) {
    const sv = row.signosVitales;
    const ta =
      sv?.tensionArterialSistolica != null && sv?.tensionArterialDiastolica != null
        ? `${sv.tensionArterialSistolica}/${sv.tensionArterialDiastolica}`
        : PLACEHOLDER;
    const imc =
      row.somatometria?.indiceMasaCorporal != null
        ? String(row.somatometria.indiceMasaCorporal)
        : PLACEHOLDER;
    const glu =
      row.laboratorio?.glucosaMgDl != null ? String(row.laboratorio.glucosaMgDl) : PLACEHOLDER;
    const hba =
      row.laboratorio?.hba1cPorcentaje != null
        ? String(row.laboratorio.hba1cPorcentaje)
        : PLACEHOLDER;
    body.push([
      { text: fechaEventoPdf(row.fechaControl), style: 'tableCell' },
      { text: ta, style: 'tableCell' },
      { text: imc, style: 'tableCell' },
      { text: glu, style: 'tableCell' },
      { text: hba, style: 'tableCell' },
      { text: fmt(row.riesgoActual), style: 'tableCell' },
    ]);
  }
  return {
    style: 'table',
    table: {
      widths: ['14%', '14%', '11%', '13%', '12%', '*'],
      body,
    },
    layout: layoutTablaCompacta,
    margin: [0, 4, 0, 6],
  };
}

function tablaSeguimientosProgramadosPdf(
  rows: SeguimientoProgramadoConcentradoCardiometabolico[] | undefined,
): Content | null {
  const list = rows?.filter(Boolean) ?? [];
  if (!list.length) return null;
  const headerRow = [
    { text: 'PROGRAMADA', style: 'tableHeader' },
    { text: 'MOTIVO', style: 'tableHeader' },
    { text: 'ESTADO', style: 'tableHeader' },
  ];
  const body: Content[][] = [headerRow];
  for (const row of list) {
    body.push([
      { text: fechaEventoPdf(row.fechaProgramada), style: 'tableCell' },
      { text: fmt(row.motivo), style: 'tableCellLeft', alignment: 'left' },
      { text: fmt(row.estado), style: 'tableCell' },
    ]);
  }
  return {
    style: 'table',
    table: {
      widths: ['22%', '*', '22%'],
      body,
    },
    layout: layoutTablaTexto,
    margin: [0, 4, 0, 6],
  };
}

/** Cuerpo clínico y evidencia: mismo orden de lectura que el visualizador (sin gráficas en esta fase). */
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

  const pushParrafo = (text: string | undefined) => {
    const t = text?.trim();
    if (!t) return;
    out.push({ text: t, fontSize: 9, margin: [0, 0, 0, 6] });
  };

  out.push({ text: 'INTERPRETACIÓN CLÍNICA', style: 'sectionHeader', margin: [0, 8, 0, 4] });

  out.push({
    stack: [
      { text: 'RIESGO LONGITUDINAL', fontSize: 8, bold: true, color: '#9f1239' },
      { text: fmt(ilc.nivelRiesgoLongitudinal), fontSize: 14, bold: true, color: '#881337', margin: [0, 2, 0, 8] },
    ],
  });

  if (ilc.conclusionClinica?.trim()) {
    pushSub('Conclusión clínica', 0);
    pushParrafo(ilc.conclusionClinica);
  }

  if (ilc.resumenLongitudinal?.trim()) {
    pushSub('Resumen longitudinal', 0);
    pushParrafo(ilc.resumenLongitudinal);
  }

  if (ilc.interpretacionRiesgoLongitudinal?.trim()) {
    pushSub('Interpretación del riesgo longitudinal', 0);
    pushParrafo(ilc.interpretacionRiesgoLongitudinal);
  }

  const factores = ilc.factoresPersistentes?.filter((x) => String(x).trim()) ?? [];
  if (factores.length) {
    pushSub('Factores persistentes', 0);
    out.push({
      ul: factores.map((x) => String(x)),
      fontSize: 9,
      margin: [0, 0, 0, 6],
    });
  }

  const alertas = ilc.alertasRelevantes?.filter((x) => String(x).trim()) ?? [];
  if (alertas.length) {
    pushSub('Alertas relevantes', 0);
    out.push({
      ul: alertas.map((x) => String(x)),
      fontSize: 9,
      margin: [0, 0, 0, 6],
    });
  }

  if (ilc.consistenciaSeguimiento) {
    pushSub('Consistencia del seguimiento', 0);
    pushParrafo(String(ilc.consistenciaSeguimiento));
  }

  const evoLines = lineasEvolucionPrincipalPdf(ilc.resumenIndicadores);
  if (evoLines.length) {
    out.push({ text: 'EVOLUCIÓN PRINCIPAL', style: 'sectionHeader', margin: [0, 10, 0, 4] });
    out.push({
      stack: evoLines.map((l) => ({
        text: [{ text: `${l.label}: `, bold: true }, { text: l.texto }],
        fontSize: 9,
        margin: [0, 0, 0, 2],
      })),
      margin: [0, 0, 0, 6],
    });
  }

  const rc = ilc.resumenCondiciones;
  const bloquesCond: { titulo: string; texto: string }[] = [];
  if (rc) {
    const pH = textoCondicionResumenPdf(rc.hipertension);
    if (pH) bloquesCond.push({ titulo: 'Hipertensión', texto: pH });
    const pD = textoCondicionResumenPdf(rc.diabetes);
    if (pD) bloquesCond.push({ titulo: 'Diabetes', texto: pD });
    const pDi = textoCondicionResumenPdf(rc.dislipidemia);
    if (pDi) bloquesCond.push({ titulo: 'Dislipidemia', texto: pDi });
    const pO = textoCondicionResumenPdf(rc.obesidad);
    if (pO) bloquesCond.push({ titulo: 'Obesidad', texto: pO });
  }
  if (bloquesCond.length) {
    out.push({ text: 'ESTADO POR CONDICIÓN', style: 'sectionHeader', margin: [0, 10, 0, 4] });
    out.push({
      stack: bloquesCond.map((b) => ({
        text: [{ text: `${b.titulo}: `, bold: true }, { text: b.texto }],
        fontSize: 9,
        margin: [0, 0, 0, 4],
      })),
      margin: [0, 0, 0, 4],
    });
  }

  out.push({ text: 'PERIODO Y EVIDENCIA', style: 'sectionHeader', margin: [0, 10, 0, 4] });
  const pIni = fechaOpcionalInformeEsc(ilc.periodoInicio);
  const pFin = fechaOpcionalInformeEsc(ilc.periodoFin);
  out.push({
    text: `Periodo: ${pIni} – ${pFin}`,
    fontSize: 9,
    margin: [0, 0, 0, 2],
  });
  out.push({
    text: `Último evento considerado: ${fechaOpcionalInformeEsc(ilc.fechaUltimoEventoConsiderado)}`,
    fontSize: 9,
    margin: [0, 0, 0, 2],
  });
  const nProg =
    ilc.numeroSeguimientosProgramados ?? ilc.seguimientosProgramadosIncluidos?.length ?? 0;
  out.push({
    text: `Eventos incluidos: ${fmt(ilc.numeroEventosIncluidos)} · Seguimientos programados: ${fmt(nProg)}`,
    fontSize: 9,
    margin: [0, 0, 0, 6],
  });

  const tablaEv = tablaEventosConcentradosPdf(ilc.eventosConcentrados);
  if (tablaEv) {
    pushSub('Eventos concentrados', 0);
    out.push(tablaEv);
  }

  const tablaSeg = tablaSeguimientosProgramadosPdf(ilc.seguimientosProgramadosConcentrados);
  if (tablaSeg) {
    pushSub('Seguimientos programados', 0);
    out.push(tablaSeg);
  }

  out.push({
    text: 'CONTINUIDAD DEL SEGUIMIENTO',
    fontSize: 9,
    bold: true,
    color: '#6B7280',
    margin: [0, 10, 0, 4],
  });
  const opBits: string[] = [];
  if (ilc.porcentajeAsistencia != null) {
    opBits.push(`% asistencia (citas cerradas): ${fmt(ilc.porcentajeAsistencia)}%`);
  }
  if (ilc.numeroSeguimientosRealizados != null) {
    opBits.push(
      `Realizadas / inasistencias / cancelaciones / reprogramaciones: ${fmt(ilc.numeroSeguimientosRealizados)} / ${fmt(ilc.numeroInasistencias)} / ${fmt(ilc.numeroCancelaciones)} / ${fmt(ilc.numeroReprogramaciones)}`,
    );
  }
  if (opBits.length) {
    out.push({ text: opBits.join('\n'), fontSize: 8, color: '#374151', margin: [0, 0, 0, 8] });
  } else {
    out.push({
      text: 'Sin métricas operativas registradas.',
      italics: true,
      fontSize: 8,
      color: '#6B7280',
      margin: [0, 0, 0, 8],
    });
  }

  out.push({ text: 'CIERRE CLÍNICO', style: 'sectionHeader', margin: [0, 10, 0, 4] });
  if (ilc.recomendaciones?.trim()) {
    pushSub('Recomendaciones', 0);
    pushParrafo(ilc.recomendaciones);
  }
  if (ilc.limitaciones?.trim()) {
    pushSub('Limitaciones del informe', 0);
    pushParrafo(ilc.limitaciones);
  }
  if (!ilc.recomendaciones?.trim() && !ilc.limitaciones?.trim()) {
    out.push({
      text: 'Sin recomendaciones ni limitaciones finales capturadas.',
      italics: true,
      fontSize: 8,
      color: '#6B7280',
      margin: [0, 0, 0, 6],
    });
  }

  const datosFalt = ilc.datosFaltantesRelevantes?.filter((x) => String(x).trim()) ?? [];
  if (datosFalt.length) {
    out.push({
      text: 'LIMITACIONES DE INTERPRETACIÓN',
      style: 'sectionHeader',
      margin: [0, 10, 0, 4],
    });
    out.push({
      ul: datosFalt.map((x) => String(x)),
      fontSize: 9,
      margin: [0, 0, 0, 8],
    });
  }

  const hayBorrador =
    !!(ilc.resumenLongitudinalSugerido?.trim() ||
      ilc.conclusionClinicaSugerida?.trim() ||
      ilc.recomendacionesSugeridas?.trim() ||
      ilc.limitacionesSugeridas?.trim());
  if (hayBorrador) {
    out.push({
      text: 'BORRADOR AUTOMÁTICO (NO VALIDADO)',
      fontSize: 8,
      bold: true,
      color: '#92400E',
      margin: [0, 8, 0, 4],
    });
    if (ilc.resumenLongitudinalSugerido?.trim()) {
      pushSub('Resumen sugerido', 0);
      pushParrafo(ilc.resumenLongitudinalSugerido);
    }
    if (ilc.conclusionClinicaSugerida?.trim()) {
      pushSub('Conclusión sugerida', 0);
      pushParrafo(ilc.conclusionClinicaSugerida);
    }
    if (ilc.recomendacionesSugeridas?.trim()) {
      pushSub('Recomendaciones sugeridas', 0);
      pushParrafo(ilc.recomendacionesSugeridas);
    }
    if (ilc.limitacionesSugeridas?.trim()) {
      pushSub('Limitaciones sugeridas', 0);
      pushParrafo(ilc.limitacionesSugeridas);
    }
  }

  if (ilc.graficasIncluidas?.length) {
    out.push({
      text: `Gráficas previstas en fase posterior (sin figuras en este PDF): ${ilc.graficasIncluidas.join(', ')}.`,
      fontSize: 7,
      color: '#6B7280',
      italics: true,
      margin: [0, 6, 0, 0],
    });
  }

  return out;
}

// ==================== INFORME PRINCIPAL ====================
export const informeLongitudinalCardiometabolicoInforme = (
  nombreEmpresa: string,
  trabajador: Trabajador,
  informeLongitudinalCardiometabolico: DatosInformeLongitudinalCardiometabolicoInforme,
  medicoFirmante: MedicoFirmante | null,
  enfermeraFirmante: EnfermeraFirmante | null,
  tecnicoFirmante: TecnicoFirmante | null,
  proveedorSalud: ProveedorSalud,
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

  const firma: Content = firmanteActivo?.firma?.data
    ? { image: `assets/signatories/${firmanteActivo.firma.data}`, width: 65 }
    : { text: '' };

  const logo: Content = proveedorSalud.logotipoEmpresa?.data
    ? { image: `assets/providers-logos/${proveedorSalud.logotipoEmpresa.data}`, width: 55, margin: [40, 20, 0, 0] }
    : { image: 'assets/RamazziniBrand600x600.png', width: 55, margin: [40, 20, 0, 0] };

  const ilc = informeLongitudinalCardiometabolico;
  const fechaInformeLongitudinal =
    ilc.fechaInformeLongitudinalCardiometabolico instanceof Date
      ? ilc.fechaInformeLongitudinalCardiometabolico
      : new Date(ilc.fechaInformeLongitudinalCardiometabolico as string);

  // Empresa, fecha y motivo (replica visualizador)
  const nombreEmpresaSeccion: Content = {
    style: 'table',
    table: {
      widths: ['60%', '40%'],
      body: [
        [
          {
            text: nombreEmpresa,
            style: 'nombreEmpresa',
            alignment: 'center',
            margin: [0, 0, 0, 0],
            rowSpan: 2,
          },
          {
            text: [
              { text: 'Fecha: ', style: 'fecha', bold: false },
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
              { text: 'Motivo de seguimiento: ', style: 'motivo', bold: false },
              {
                text: 'Seguimiento longitudinal cardiometabólico',
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
              text: [
                // Nombre y título profesional
                (firmanteActivo?.tituloProfesional && firmanteActivo?.nombre)
                  ? {
                      text: `${firmanteActivo.tituloProfesional} ${firmanteActivo.nombre}\n`,
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

              ].filter(item => item !== null),  // Filtrar los nulos para que no aparezcan en el informe
              fontSize: 8,
              margin: [40, 0, 0, 0],
            },
            // Solo incluir la columna de firma si hay firma
            ...(firmanteActivo?.firma?.data ? [{
              ...firma,
              margin: [0, -3, 0, 0] as [number, number, number, number],  // Mueve el elemento más arriba
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
