import type {
  Content,
  StyleDictionary,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';
import {
  DiagnosticoCardiometabolico,
  EstadoControlCondicion,
  GradoObesidad,
} from '../../expedientes/enums/cardiometabolico.enums';
import type {
  EstadoCondicionesCardiometabolicas,
  LaboratorioCardiometabolico,
  SignosVitalesCardiometabolico,
  SomatometriaCardiometabolico,
  TratamientoActualCardiometabolico,
} from '../../expedientes/schemas/evento-seguimiento-cardiometabolico.schema';
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
  text: '                                                  EVENTO SEGUIMIENTO CARDIOMETABOLICO\n',
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
interface DatosEventoSeguimientoCardiometabolicoInforme {
  fechaEventoSeguimientoCardiometabolico: Date | string;
  motivoSeguimiento: string;
  diagnosticosActivos?: DiagnosticoCardiometabolico[];
  estadoCondiciones?: EstadoCondicionesCardiometabolicas;
  signosVitales?: SignosVitalesCardiometabolico;
  somatometria?: SomatometriaCardiometabolico;
  laboratorio?: LaboratorioCardiometabolico;
  tratamientoActual?: TratamientoActualCardiometabolico[];
  adherenciaTerapeutica?: string;
  sintomasRelevantes?: string;
  riesgosActuales?: string;
  proximaRevisionSugerida?: Date | string;
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

function seccionDiagnosticosActivos(
  diagnosticosActivos: DiagnosticoCardiometabolico[] | undefined,
): Content {
  const activos = new Set<string>(
    Array.isArray(diagnosticosActivos)
      ? diagnosticosActivos.map((d) => String(d))
      : [],
  );

  const izq = DIAGNOSTICOS_ORDEN.slice(0, 2);
  const der = DIAGNOSTICOS_ORDEN.slice(2, 4);

  return {
    stack: [
      {
        text: 'DIAGNÓSTICOS ACTIVOS',
        style: 'sectionHeader',
      },
      {
        columns: [
          tablaDiagnosticosActivos(izq, activos),
          tablaDiagnosticosActivos(der, activos),
        ],
        columnGap: 4,
      },
    ],
    margin: [0, 0, 0, 8],
  };
}

function seccionSomatometriaSignosVitales(
  s: SomatometriaCardiometabolico | undefined,
  sv: SignosVitalesCardiometabolico | undefined,
): Content {
  /** Cada fila debe ser una estructura nueva: si se reusa la misma referencia, pdfmake no pinta bien la 2.ª fila. */
  const nuevaFilaGuionesSignosVitales = () => [
    { text: '-', style: 'tableCellMuted' },
    { text: '-', style: 'tableCellMuted' },
    { text: '-', style: 'tableCellMuted' },
  ];

  const somatometriaBody = [
    [
      {
        text: 'SOMATOMETRÍA',
        style: 'tableHeader',
        colSpan: 3,
        alignment: 'center',
      },
      {},
      {},
    ],
    [
      { text: 'Parámetro', style: 'tableHeader', alignment: 'center' },
      { text: 'Especifique', style: 'tableHeader', alignment: 'center' },
      { text: 'Categoría', style: 'tableHeader', alignment: 'center' },
    ],
    [
      { text: 'PESO', style: 'tableCellBold' },
      {
        text:
          s?.peso != null
            ? `${s.peso} kg`
            : '',
        style: 'tableCell',
      },
      { text: '-', style: 'tableCellMuted' },
    ],
    [
      { text: 'ALTURA', style: 'tableCellBold' },
      {
        text:
          s?.altura != null
            ? `${s.altura} m`
            : '',
        style: 'tableCell',
      },
      { text: '-', style: 'tableCellMuted' },
    ],
    [
      { text: 'ÍNDICE DE MASA CORPORAL', style: 'tableCellBold' },
      { text: fmtOpcional(s?.indiceMasaCorporal), style: 'tableCell' },
      { text: fmtOpcional(s?.categoriaIMC), style: 'tableCell' },
    ],
    [
      { text: 'CIRCUNFERENCIA CINTURA', style: 'tableCellBold' },
      {
        text:
          s?.circunferenciaCintura != null
            ? `${s.circunferenciaCintura} cm`
            : '',
        style: 'tableCell',
      },
      {
        text: fmtOpcional(s?.categoriaCircunferenciaCintura),
        style: 'tableCell',
      },
    ],
  ];

  const tensionTexto =
    sv && (sv.tensionArterialSistolica != null || sv.tensionArterialDiastolica != null)
      ? `${fmtOpcional(sv.tensionArterialSistolica)}/${fmtOpcional(sv.tensionArterialDiastolica)} mmHg`
      : '';

  const signosVitalesBody = [
    [
      {
        text: 'SIGNOS VITALES',
        style: 'tableHeader',
        colSpan: 3,
        alignment: 'center',
      },
      {},
      {},
    ],
    [
      { text: 'Parámetro', style: 'tableHeader', alignment: 'center' },
      { text: 'Especifique', style: 'tableHeader', alignment: 'center' },
      { text: 'Categoría', style: 'tableHeader', alignment: 'center' },
    ],
    [
      { text: 'TENSIÓN ARTERIAL', style: 'tableCellBold' },
      { text: tensionTexto, style: 'tableCell' },
      { text: fmtOpcional(sv?.categoriaTensionArterial), style: 'tableCell' },
    ],
    [
      { text: 'FRECUENCIA CARDIACA', style: 'tableCellBold' },
      {
        text:
          sv?.frecuenciaCardiaca != null
            ? `${sv.frecuenciaCardiaca} lpm`
            : '',
        style: 'tableCell',
      },
      {
        text: fmtOpcional(sv?.categoriaFrecuenciaCardiaca),
        style: 'tableCell',
      },
    ],
    nuevaFilaGuionesSignosVitales(),
    nuevaFilaGuionesSignosVitales(),
  ];

  return {
    columns: [
      {
        style: 'table',
        table: {
          widths: ['45%', '25%', '30%'],
          body: somatometriaBody,
        },
        layout: layoutTablaCompacta,
        margin: [0, 0, 2, 0],
      },
      {
        style: 'table',
        table: {
          widths: ['45%', '25%', '30%'],
          body: signosVitalesBody,
        },
        layout: layoutTablaCompacta,
      },
    ],
    margin: [0, 0, 0, 8],
  };
}

function seccionLaboratorio(L: LaboratorioCardiometabolico | undefined): Content {
  const filas = filasLaboratorio(L);

  if (filas.length === 0) {
    return {
      stack: [
        {
          text: 'LABORATORIOS',
          style: 'sectionHeader',
        },
        {
          text: 'Sin datos de laboratorio.',
          fontSize: 8,
          italics: true,
          color: '#374151',
          margin: [0, 4, 0, 4],
          alignment: 'center',
        },
      ],
      margin: [0, 0, 0, 8],
    };
  }

  const dosColumnas = filas.length > 1;
  const mitad = Math.ceil(filas.length / 2);
  const izq = dosColumnas ? filas.slice(0, mitad) : filas;
  const der = dosColumnas ? filas.slice(mitad) : [];

  const construirTabla = (rows: FilaLaboratorio[]): Content => ({
    style: 'table',
    table: {
      widths: ['28%', '*'],
      body: [
        [
          { text: 'Componente', style: 'tableHeader', alignment: 'left' },
          { text: 'Resultado', style: 'tableHeader', alignment: 'left' },
        ],
        ...rows.map((fila) => [
          { text: fila.etiqueta, style: 'tableCellLeftBold', alignment: 'left' },
          { text: fila.detalle, style: 'tableCellLeft', alignment: 'left' },
        ]),
      ],
    },
    layout: layoutTablaTexto,
  });

  return {
    stack: [
      {
        text: 'LABORATORIOS',
        style: 'sectionHeader',
      },
      dosColumnas
        ? {
            columns: [construirTabla(izq), construirTabla(der)],
            columnGap: 4,
          }
        : construirTabla(izq),
    ],
    margin: [0, 0, 0, 8],
  };
}

const MAX_FILAS_TRATAMIENTO_PDF = 12;

function filaTratamientoTieneDatos(row: TratamientoActualCardiometabolico): boolean {
  return (
    String(row.medicamento ?? '').trim() !== '' ||
    String(row.dosis ?? '').trim() !== '' ||
    String(row.frecuencia ?? '').trim() !== '' ||
    String(row.motivoUso ?? '').trim() !== ''
  );
}

function seccionTratamientoActual(
  tratamientoActual: TratamientoActualCardiometabolico[] | undefined,
): Content {
  const filas = (tratamientoActual ?? []).filter(filaTratamientoTieneDatos);

  if (!filas.length) {
    return {
      stack: [
        { text: 'TRATAMIENTO ACTUAL', style: 'sectionHeader' },
        {
          text: 'Sin medicamentos registrados en esta visita.',
          fontSize: 8,
          italics: true,
          color: '#374151',
          margin: [0, 4, 0, 4],
          alignment: 'center',
        },
      ],
      margin: [0, 0, 0, 8],
    };
  }

  const truncado = filas.length > MAX_FILAS_TRATAMIENTO_PDF;
  const visibles = truncado
    ? filas.slice(0, MAX_FILAS_TRATAMIENTO_PDF)
    : filas;

  const headerRow = [
    { text: 'Medicamento', style: 'tableHeader', alignment: 'left' as const },
    { text: 'Dosis', style: 'tableHeader', alignment: 'left' as const },
    { text: 'Frecuencia', style: 'tableHeader', alignment: 'left' as const },
    { text: 'Motivo de uso', style: 'tableHeader', alignment: 'left' as const },
  ];
  const dataRows = visibles.map((fila) => [
    { text: fmt(fila.medicamento), style: 'tableCellLeft', alignment: 'left' as const },
    { text: fmt(fila.dosis), style: 'tableCellLeft', alignment: 'left' as const },
    { text: fmt(fila.frecuencia), style: 'tableCellLeft', alignment: 'left' as const },
    { text: fmt(fila.motivoUso), style: 'tableCellLeft', alignment: 'left' as const },
  ]);
  const body = [headerRow, ...dataRows];

  const stack: Content[] = [
    { text: 'TRATAMIENTO ACTUAL', style: 'sectionHeader' },
    {
      style: 'table',
      table: {
        widths: ['*', '18%', '22%', '24%'],
        body,
      },
      layout: layoutTablaTexto,
    },
  ];

  if (truncado) {
    stack.push({
      text: `Se muestran ${MAX_FILAS_TRATAMIENTO_PDF} de ${filas.length} medicamentos registrados.`,
      fontSize: 7,
      color: '#6B7280',
      margin: [0, 2, 0, 0],
    });
  }

  return { stack, margin: [0, 0, 0, 8] };
}

function seccionAdherenciaSintomas(
  sintomasRelevantes: string | undefined,
  adherenciaTerapeutica: string | undefined,
): Content {
  return {
    stack: [
      {
        text: 'ADHERENCIA Y SÍNTOMAS',
        style: 'sectionHeader',
      },
      {
        style: 'table',
        table: {
          widths: ['28%', '*'],
          body: [
            [
              { text: 'Campo', style: 'tableHeader', alignment: 'left' },
              { text: 'Registro', style: 'tableHeader', alignment: 'left' },
            ],
            [
              {
                text: etiquetaFilaMayusc('Adherencia terapéutica'),
                style: 'tableCellLeftBold',
                alignment: 'left',
              },
              {
                text: fmt(adherenciaTerapeutica),
                style: 'tableCellLeft',
                alignment: 'left',
              },
            ],
            [
              {
                text: etiquetaFilaMayusc('Síntomas relevantes'),
                style: 'tableCellLeftBold',
                alignment: 'left',
              },
              {
                text: fmt(sintomasRelevantes),
                style: 'tableCellLeft',
                alignment: 'left',
              },
            ],
          ],
        },
        layout: layoutTablaTexto,
      },
    ],
    margin: [0, 0, 0, 8],
  };
}

function seccionEstadoCondiciones(
  ec: EstadoCondicionesCardiometabolicas | undefined,
): Content {
  const izq = FILAS_ESTADO_CONDICION.slice(0, 2);
  const der = FILAS_ESTADO_CONDICION.slice(2, 4);

  return {
    stack: [
      {
        text: 'ESTADO POR CONDICIÓN EN ESTA VISITA',
        style: 'sectionHeader',
      },
      {
        columns: [
          tablaEstadoCondiciones(izq, ec),
          tablaEstadoCondiciones(der, ec),
        ],
        columnGap: 4,
      },
    ],
    margin: [0, 0, 0, 8],
  };
}

function seccionRiesgosProximaCita(
  riesgosActuales: string | undefined,
  proximaRevisionSugerida: Date | string | undefined,
): Content {
  return {
    stack: [
      {
        text: 'RIESGOS Y PRÓXIMA CITA',
        style: 'sectionHeader',
      },
      {
        style: 'table',
        table: {
          widths: ['83%', '17%'],
          body: [
            [
              {
                text: 'Riesgos actuales',
                style: 'tableHeader',
                alignment: 'left',
              },
              {
                text: 'Próxima cita',
                style: 'tableHeader',
                alignment: 'center',
              },
            ],
            [
              {
                text: fmt(riesgosActuales),
                style: 'tableCellLeftBold',
                alignment: 'left',
              },
              {
                text: fechaOpcionalInformeEsc(proximaRevisionSugerida),
                style: 'tableCellBold',
                alignment: 'center',
              },
            ],
          ],
        },
        layout: layoutTablaTexto,
      },
    ],
    margin: [0, 0, 0, 8],
  };
}

// ==================== INFORME PRINCIPAL ====================
export const eventoSeguimientoCardiometabolicoInforme = (
  nombreEmpresa: string,
  trabajador: Trabajador,
  eventoSeguimientoCardiometabolico: DatosEventoSeguimientoCardiometabolicoInforme,
  medicoFirmante: MedicoFirmanteInforme | null,
  enfermeraFirmante: EnfermeraFirmanteInforme | null,
  tecnicoFirmante: TecnicoFirmanteInforme | null,
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

  const escc = eventoSeguimientoCardiometabolico;
  const fechaEventoSeguimientoCardiometabolico =
    escc.fechaEventoSeguimientoCardiometabolico instanceof Date
      ? escc.fechaEventoSeguimientoCardiometabolico
      : new Date(escc.fechaEventoSeguimientoCardiometabolico as string);

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
                text: formatearFechaUTC(fechaEventoSeguimientoCardiometabolico),
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
                text: fmt(escc.motivoSeguimiento),
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

  // Crear el array de contenido del cuerpo
  const content: Content[] = [
    nombreEmpresaSeccion,
    trabajadorSeccion,
    seccionDiagnosticosActivos(escc.diagnosticosActivos),
    seccionSomatometriaSignosVitales(escc.somatometria, escc.signosVitales),
    seccionLaboratorio(escc.laboratorio),
    seccionTratamientoActual(escc.tratamientoActual),
    seccionAdherenciaSintomas(escc.sintomasRelevantes, escc.adherenciaTerapeutica),
    seccionEstadoCondiciones(escc.estadoCondiciones),
    seccionRiesgosProximaCita(escc.riesgosActuales, escc.proximaRevisionSugerida),
  ];

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
