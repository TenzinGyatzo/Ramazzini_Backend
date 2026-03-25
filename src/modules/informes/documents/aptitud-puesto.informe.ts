import type {
  Content,
  StyleDictionary,
  TDocumentDefinitions,
  TableCell,
} from 'pdfmake/interfaces';
import { formatearNombreTrabajador } from '../../../utils/names';
import { Interface } from 'readline';
import { FooterFirmantesData } from '../interfaces/firmante-data.interface';
import { generarFooterFirmantes } from '../helpers/footer-firmantes.helper';

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
    fontSize: 11,
    alignment: 'right',
  },
  sectionHeaderResume: {
    fontSize: 11,
    lineHeight: 0.8,
    bold: true,
    alignment: 'center',
    margin: [0, 0, 0, 0],
  },
  sectionHeader: {
    fontSize: 10,
    lineHeight: 0.8,
    bold: true,
    alignment: 'center',
    margin: [0, 0, 0, 0],
  },
  result: {
    fontSize: 18,
    lineHeight: 1,
    bold: true,
    alignment: 'center',
    margin: [0, 0, 0, 0],
  },

  label: {
    fontSize: 10,
    lineHeight: 0.9,
    margin: [0, 0, 0, 0], // Reducir el margen superior e inferior
  },
  value: {
    bold: true,
    fontSize: 11,
    lineHeight: 0.9,
    margin: [0, 0, 0, 0], // Reducir el margen superior e inferior
  },
  preset: {
    fontSize: 10,
    lineHeight: 1,
    margin: [0, 0, 0, 0], // Reducir el margen superior e inferior
  },
  paragraph: {
    fontSize: 11,
    lineHeight: 0.7,
    margin: [0, 0, 0, 0], // Reducir el margen superior e inferior para menos padding
  },
  tableHeader: {
    // fillColor: '#262626', // Casi Negro
    // fillColor: '#2BB9D9' // Azul claro
    // fillColor: '#007BFF' // Azul profesional
    // fillColor: '#004085' // Azul Oscuro
    // fillColor: '#28A745' // Verde médico
    // fillColor: '#1E7E34' // Verde Oscuro
    // fillColor: '#6C757D' // Gris
    // fillColor: '#F8F9FA' // Gris Muy Claro
    // fillColor: '#DC3545' // Rojo Médico
    // fillColor: '#C82333' // Rojo Oscuro
    // fillColor: '#17A2B8' // Turquesa
    // fillColor: '#138496' // Turquesa Oscuro
    // fillColor: '#E0A800' // Oro (Se ve bien con texto blanco y texto negro)
    // fillColor: '' //
    fillColor: '#343A40', // Gris Oscuro
    color: 'white',
    /* color: '#FFFFFF', */
    bold: true,
    fontSize: 11,
    alignment: 'center',
    margin: [0, 0, 0, 0],
  },
  tableCell: {
    fontSize: 9,
    bold: false,
    alignment: 'center',
    margin: [0, 0, 0, 0],
  },
};

// ==================== FUNCIONES REUSABLES ====================
type Alignment = 'left' | 'center' | 'right' | 'justify';

const createTableCell = (
  text: string,
  style: string,
  alignment: Alignment,
  color?: string,
): Content => ({
  text,
  style,
  alignment,
  color,
});

const getColorForAptitud = (
  aptitudPuesto: string,
  semaforizacionActivada: boolean,
): string | undefined => {
  if (!semaforizacionActivada) return undefined;

  switch (aptitudPuesto) {
    case 'Apto Sin Restricciones':
      return 'limegreen'; // 'green'
    case 'Apto Con Precaución':
      return 'orange'; // 'orange'
    case 'Apto Con Restricciones':
      return 'orange'; // 'orange'
    case 'No Apto':
      return 'red'; // 'red'
    case 'Evaluación No Completada':
    default:
      return undefined; // No cambia el color
  }
};

const ajustarAptitudPorGenero = (
  aptitudPuesto: string,
  sexo: string,
): string => {
  if (sexo === 'Femenino') {
    return aptitudPuesto.replace('Apto', 'Apta');
  }
  return aptitudPuesto;
};

const getAptitudDescription = (aptitudPuesto: string): string => {
  switch (aptitudPuesto) {
    case 'Apto Sin Restricciones':
      return 'Apto sin restricciones. No tiene impedimentos para el puesto al que aspira o desempeña.';
    case 'Apto Con Precaución':
      return 'Apto con precaución. Requiere vigilancia médica más frecuente.';
    case 'Apto Con Restricciones':
      return 'Apto con restricciones. Requiere adaptaciones razonables para asegurar la seguridad y salud.';
    case 'No Apto':
      return 'No apto. No está permitido el desempeño del puesto al que aspira.';
    case 'Evaluación No Completada':
      return 'Evaluación no completada. Para concluir, requiere evaluaciones adicionales o tratamiento médico.';
    default:
      return '';
  }
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
      { code: 'PR', dialCode: '+1' },
    ];

    // Encontrar el país por código de marcación
    const country = countries.find((c) => telefono.startsWith(c.dialCode));
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

// Función auxiliar para convertir número a texto
const numeroEnLetras = (n: number) => {
  return (
    {
      5: 'cinco',
      6: 'seis',
      10: 'diez',
      12: 'doce',
    }[n] || n.toString()
  );
};

// Función para generar resumen de audiometría
const obtenerResumenAudiometria = (audiometria: Audiometria | null) => {
  if (!audiometria) return 'No se cuenta con audiometría';

  const diagnostico = audiometria.diagnosticoAudiometria || 'Sin diagnóstico';
  const hipoacusia =
    audiometria.hipoacusiaBilateralCombinada !== undefined
      ? audiometria.hipoacusiaBilateralCombinada + '%'
      : 'No especificado';

  return `${diagnostico} HBC ${hipoacusia}`;
};

// Función para generar resumen de antidoping
const obtenerResumenAntidoping = (a: any) => {
  if (!a) return 'No se cuenta con antidoping';

  const campos = [
    { key: 'marihuana', label: 'Marihuana' },
    { key: 'cocaina', label: 'Cocaína' },
    { key: 'anfetaminas', label: 'Anfetaminas' },
    { key: 'metanfetaminas', label: 'Metanfetaminas' },
    { key: 'opiaceos', label: 'Opiáceos' },
    { key: 'benzodiacepinas', label: 'Benzodiazepinas' },
    { key: 'fenciclidina', label: 'Fenciclidina' },
    { key: 'metadona', label: 'Metadona' },
    { key: 'barbituricos', label: 'Barbitúricos' },
    { key: 'antidepresivosTriciclicos', label: 'Antidepresivos Tricíclicos' },
    { key: 'metilendioximetanfetamina', label: 'Metilendioximetanfetamina' },
    { key: 'ketamina', label: 'Ketamina' },
  ];

  const evaluados = campos.filter((c) => {
    const valor = a[c.key];
    return valor !== undefined && valor !== null && valor !== '';
  });

  const todosNegativos = evaluados.every((c) => a[c.key] === 'Negativo');

  if (todosNegativos) {
    return `Negativo a ${numeroEnLetras(evaluados.length)} parámetros`;
  }

  const sustanciasPositivas = evaluados
    .filter((c) => a[c.key] !== 'Negativo')
    .map((c) => c.label)
    .join(', ');

  return `Positivo a: ${sustanciasPositivas}`;
};

const tipoSangreLabels: Record<string, string> = {
  A_POS: 'A RH Positivo',
  A_NEG: 'A RH Negativo',
  B_POS: 'B RH Positivo',
  B_NEG: 'B RH Negativo',
  AB_POS: 'AB RH Positivo',
  AB_NEG: 'AB RH Negativo',
  O_POS: 'O RH Positivo',
  O_NEG: 'O RH Negativo',
};

const tipoAlteracionEspirometriaLabels: Record<string, string> = {
  ANORMAL_OBSTRUCTIVO: 'Anormal obstructivo',
  ANORMAL_RESTRICTIVO_SOSPECHADO: 'Anormal restrictivo sospechado',
  ANORMAL_MIXTO: 'Anormal mixto',
};

const tipoAlteracionEKGLabels: Record<string, string> = {
  ANORMAL_ARRITMIA: 'Anormal arritmia',
  ANORMAL_TRASTORNO_CONDUCCION: 'Anormal trastorno de conducción',
  ANORMAL_ISQUEMIA_INFARTO: 'Anormal isquemia/infarto',
  ANORMAL_REPOLARIZACION: 'Anormal repolarización',
  ANORMAL_HIPERTROFIA_CRECIMIENTO_CAVIDADES: 'Anormal hipertrofia/crecimiento de cavidades',
  ANORMAL_QT_ALTERADO: 'Anormal QT alterado',
};

const obtenerResumenTipoSangre = (resultado: ResultadoClinicoTipoSangre | null) => {
  if (!resultado) return null;
  if (!resultado.tipoSangre) return null;
  return tipoSangreLabels[resultado.tipoSangre] || resultado.tipoSangre;
};

const obtenerResumenEKG = (resultado: ResultadoClinicoEKG | null) => {
  if (!resultado || resultado.resultadoGlobal === 'NO_CONCLUYENTE') return null;
  if (resultado.hallazgoEspecifico) return resultado.hallazgoEspecifico;
  if (resultado.resultadoGlobal === 'NORMAL') {
    return 'Normal, valores dentro del rango de referencia';
  }
  if (resultado.resultadoGlobal === 'ANORMAL') {
    return tipoAlteracionEKGLabels[resultado.tipoAlteracionPrincipal] || resultado.tipoAlteracionPrincipal || 'Anormal';
  }
  return null;
};

const obtenerResumenEspirometria = (resultado: ResultadoClinicoEspirometria | null) => {
  if (!resultado || resultado.resultadoGlobal === 'NO_CONCLUYENTE') return null;
  if (resultado.hallazgoEspecifico) return resultado.hallazgoEspecifico;
  if (resultado.resultadoGlobal === 'NORMAL') {
    return 'Normal, valores dentro del rango de referencia';
  }
  if (resultado.resultadoGlobal === 'ANORMAL') {
    return tipoAlteracionEspirometriaLabels[resultado.tipoAlteracion] || resultado.tipoAlteracion || 'Anormal';
  }
  return null;
};

// ==================== INTERFACES ====================
interface Trabajador {
  primerApellido: string;
  segundoApellido: string;
  nombre: string;
  nacimiento: string;
  escolaridad: string;
  edad: string;
  puesto: string;
  sexo: string;
  antiguedad: string;
  telefono: string;
  estadoCivil: string;
  numeroEmpleado: string;
  nss?: string;
  curp?: string;
}

interface Aptitud {
  fechaAptitudPuesto: Date;
  evaluacionAdicional1: string;
  fechaEvaluacionAdicional1: Date;
  resultadosEvaluacionAdicional1: string;
  evaluacionAdicional2: string;
  fechaEvaluacionAdicional2: Date;
  resultadosEvaluacionAdicional2: string;
  evaluacionAdicional3: string;
  fechaEvaluacionAdicional3: Date;
  resultadosEvaluacionAdicional3: string;
  evaluacionAdicional4: string;
  fechaEvaluacionAdicional4: Date;
  resultadosEvaluacionAdicional4: string;
  evaluacionAdicional5: string;
  fechaEvaluacionAdicional5: Date;
  resultadosEvaluacionAdicional5: string;
  aptitudPuesto: string;
  alteracionesSalud: string;
  resultados: string;
  medidasPreventivas: string;
}

interface HistoriaClinica {
  fechaHistoriaClinica: Date;
  resumenHistoriaClinica: string;
}

interface ExploracionFisica {
  fechaExploracionFisica: Date;
  tensionArterialSistolica: number;
  tensionArterialDiastolica: number;
  categoriaTensionArterial: string;
  indiceMasaCorporal: number;
  categoriaIMC: string;
  circunferenciaCintura: number;
  categoriaCircunferenciaCintura: string;
  resumenExploracionFisica: string;
}

interface ExamenVista {
  fechaExamenVista: Date;
  ojoIzquierdoCegueraTotal?: boolean;
  ojoDerechoCegueraTotal?: boolean;
  ojoIzquierdoLejanaCegueraTotal?: boolean;
  ojoDerechoLejanaCegueraTotal?: boolean;
  ojoIzquierdoCercanaCegueraTotal?: boolean;
  ojoDerechoCercanaCegueraTotal?: boolean;
  ojoIzquierdoLejanaSinCorreccion: number | null;
  ojoDerechoLejanaSinCorreccion: number | null;
  sinCorreccionLejanaInterpretacion: string;
  ojoIzquierdoLejanaConCorreccion?: number;
  ojoDerechoLejanaConCorreccion?: number;
  conCorreccionLejanaInterpretacion?: string;
  porcentajeIshihara: number;
  interpretacionIshihara: string;
}

function formatearAgudezaVisual(valor: number | null | undefined, cegueraTotal: boolean | undefined): string {
  if (cegueraTotal) return 'Ceguera Total';
  if (valor == null) return 'NA';
  return `20/${valor}`;
}

function getCiegaOI(ev: ExamenVista | null): boolean {
  if (!ev) return false;
  return (ev as any).ojoIzquierdoCegueraTotal ?? (ev as any).ojoIzquierdoLejanaCegueraTotal ?? (ev as any).ojoIzquierdoCercanaCegueraTotal ?? false;
}
function getCiegaOD(ev: ExamenVista | null): boolean {
  if (!ev) return false;
  return (ev as any).ojoDerechoCegueraTotal ?? (ev as any).ojoDerechoLejanaCegueraTotal ?? (ev as any).ojoDerechoCercanaCegueraTotal ?? false;
}

interface Audiometria {
  fechaAudiometria: Date;
  diagnosticoAudiometria: string;
  hipoacusiaBilateralCombinada: number;
}

interface Antidoping {
  fechaAntidoping: Date;
  marihuana: string;
  cocaina: string;
  anfetaminas: string;
  metanfetaminas: string;
  opiaceos: string;
  benzodiacepinas: string;
  fenciclidina: string;
  metadona: string;
  barbituricos: string;
  antidepresivosTriciclicos: string;
}

interface ResultadoClinicoTipoSangre {
  fechaEstudio: Date;
  tipoSangre?: string;
}

interface ResultadoClinicoEKG {
  fechaEstudio: Date;
  resultadoGlobal?: string;
  hallazgoEspecifico?: string;
  tipoAlteracionPrincipal?: string;
}

interface ResultadoClinicoEspirometria {
  fechaEstudio: Date;
  resultadoGlobal?: string;
  hallazgoEspecifico?: string;
  tipoAlteracion?: string;
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
  };
}

interface ProveedorSalud {
  nombre: string;
  pais: string;
  perfilProveedorSalud: string;
  logotipoEmpresa: {
    data: string;
    contentType: string;
  };
  estado: string;
  municipio: string;
  codigoPostal: string;
  direccion: string;
  telefono: string;
  correoElectronico: string;
  sitioWeb: string;
  colorInforme: string;
  semaforizacionActivada: boolean;
}

// ==================== INFORME PRINCIPAL ====================
export const aptitudPuestoInforme = (
  nombreEmpresa: string,
  trabajador: Trabajador,
  aptitud: Aptitud,
  historiaClinica: HistoriaClinica | null,
  exploracionFisica: ExploracionFisica | null,
  examenVista: ExamenVista | null,
  audiometria: Audiometria | null,
  antidoping: Antidoping | null,
  resultadoTipoSangre: ResultadoClinicoTipoSangre | null,
  resultadoEKG: ResultadoClinicoEKG | null,
  resultadoEspirometria: ResultadoClinicoEspirometria | null,
  medicoFirmante: MedicoFirmante,
  proveedorSalud: ProveedorSalud,
  footerFirmantesData?: FooterFirmantesData,
): TDocumentDefinitions => {
  // Clonamos los estilos y cambiamos fillColor antes de pasarlos a pdfMake
  const updatedStyles: StyleDictionary = { ...styles };

  updatedStyles.tableHeader = {
    ...updatedStyles.tableHeader,
    fillColor: proveedorSalud.colorInforme || '#343A40',
  };

  const aptitudPuestoModificado = ajustarAptitudPorGenero(
    aptitud.aptitudPuesto,
    trabajador.sexo,
  );

  const firma: Content = (
    footerFirmantesData?.esDocumentoFinalizado
      ? footerFirmantesData?.finalizador?.firma?.data
      : medicoFirmante.firma?.data
  )
    ? {
        image: `assets/signatories/${
          footerFirmantesData?.esDocumentoFinalizado
            ? footerFirmantesData?.finalizador?.firma?.data
            : medicoFirmante.firma?.data
        }`,
        width: 65,
      }
    : { text: '' };

  const logo: Content = proveedorSalud.logotipoEmpresa?.data
    ? {
        image: `assets/providers-logos/${proveedorSalud.logotipoEmpresa.data}`,
        width: 55,
        margin: [40, 20, 0, 0],
      }
    : {
        image: 'assets/RamazziniBrand600x600.png',
        width: 55,
        margin: [40, 20, 0, 0],
      };

  const tituloInforme =
    proveedorSalud.pais === 'GT'
      ? '                                                                        INFORME MÉDICO OCUPACIONAL\n'
      : '                                            EVALUACIÓN DE SALUD Y APTITUD AL PUESTO\n';

  const headerText: Content = {
    text: tituloInforme,
    style: 'header',
    alignment: 'right',
    margin: [0, 35, 40, 0],
  };

  const header: Content = {
    columns: [logo, headerText],
  };

  const examenVistaResumen = examenVista
    ? (examenVista.ojoIzquierdoLejanaConCorreccion === 0 ||
        examenVista.ojoIzquierdoLejanaConCorreccion == null) &&
      (examenVista.ojoDerechoLejanaConCorreccion === 0 ||
        examenVista.ojoDerechoLejanaConCorreccion == null)
      ? `OI: ${formatearAgudezaVisual(examenVista.ojoIzquierdoLejanaSinCorreccion, getCiegaOI(examenVista))}, OD: ${formatearAgudezaVisual(examenVista.ojoDerechoLejanaSinCorreccion, getCiegaOD(examenVista))} - ${examenVista.sinCorreccionLejanaInterpretacion}, Ishihara: ${examenVista.porcentajeIshihara}% - ${examenVista.interpretacionIshihara}`
      : `OI: ${formatearAgudezaVisual(examenVista.ojoIzquierdoLejanaConCorreccion, getCiegaOI(examenVista))}, OD: ${formatearAgudezaVisual(examenVista.ojoDerechoLejanaConCorreccion, getCiegaOD(examenVista))} - ${examenVista.conCorreccionLejanaInterpretacion} Corregida, Ishihara: ${examenVista.porcentajeIshihara}% - ${examenVista.interpretacionIshihara}`
    : 'No se cuenta con examen visual';

  const tipoSangreResumen = obtenerResumenTipoSangre(resultadoTipoSangre);
  const ekgResumen = obtenerResumenEKG(resultadoEKG);
  const espirometriaResumen = obtenerResumenEspirometria(resultadoEspirometria);

  const identificadorLabel =
    proveedorSalud.pais === 'MX'
      ? 'CURP'
      : proveedorSalud.pais === 'PA'
        ? 'CÉDULA IDENTIDAD'
        : proveedorSalud.pais === 'GT'
          ? 'DPI'
          : 'IDENTIFICACIÓN';

  const datosTrabajadorBody: TableCell[][] = [
    [
      { text: 'NOMBRE', style: 'label' },
      { text: formatearNombreTrabajador(trabajador), style: 'value' },
      { text: 'NACIMIENTO', style: 'label' },
      { text: trabajador.nacimiento, style: 'value' },
    ],
    [
      { text: 'ESCOLARIDAD', style: 'label' },
      { text: trabajador.escolaridad, style: 'value' },
      { text: 'EDAD', style: 'label' },
      { text: trabajador.edad, style: 'value' },
    ],
    [
      { text: 'PUESTO', style: 'label' },
      { text: trabajador.puesto, style: 'value' },
      { text: 'SEXO', style: 'label' },
      { text: trabajador.sexo, style: 'value' },
    ],
    [
      { text: 'ANTIGÜEDAD', style: 'label' },
      { text: trabajador.antiguedad, style: 'value' },
      { text: 'TELEFONO', style: 'label' },
      { text: trabajador.telefono, style: 'value' },
    ],
    [
      { text: 'ESTADO CIVIL', style: 'label' },
      { text: trabajador.estadoCivil, style: 'value' },
      { text: 'NUM. DE EMPLEADO', style: 'label' },
      { text: trabajador.numeroEmpleado || '-', style: 'value' },
    ],
  ];

  if (trabajador.nss || trabajador.curp) {
    datosTrabajadorBody.push([
      { text: 'NSS', style: 'label' },
      { text: trabajador.nss || '-', style: 'value' },
      { text: identificadorLabel, style: 'label' },
      { text: trabajador.curp || '-', style: 'value' },
    ]);
  }

  const resumenYAlteraciones = [
    [
      createTableCell('INFORMACIÓN Y ESTUDIOS', 'tableHeader', 'center'),
      createTableCell('FECHAS', 'tableHeader', 'center'),
      createTableCell(
        'RESUMEN Y/O ALTERACIONES ENCONTRADAS',
        'tableHeader',
        'center',
      ),
    ],
    [
      createTableCell('HISTORIA CLÍNICA LABORAL', 'sectionHeader', 'center'),
      createTableCell(
        historiaClinica
          ? formatearFechaUTC(historiaClinica.fechaHistoriaClinica)
          : '-',
        'tableCell',
        'center',
      ),
      createTableCell(
        historiaClinica
          ? historiaClinica.resumenHistoriaClinica
          : 'No se cuenta con historia clínica laboral',
        'tableCell',
        'center',
      ),
    ],
    [
      createTableCell('EXPLORACIÓN FÍSICA', 'sectionHeader', 'center'),
      createTableCell(
        exploracionFisica
          ? formatearFechaUTC(exploracionFisica.fechaExploracionFisica)
          : '-',
        'tableCell',
        'center',
      ),
      createTableCell(
        exploracionFisica
          ? `TA: ${exploracionFisica.tensionArterialSistolica}/${exploracionFisica.tensionArterialDiastolica} mmHg - ${exploracionFisica.categoriaTensionArterial}. ${exploracionFisica.resumenExploracionFisica}.`
          : 'No se cuenta con exploración física',
        'tableCell',
        'center',
      ),
    ],
    [
      createTableCell('ADIPOSIDAD CORPORAL', 'sectionHeader', 'center'),
      createTableCell(
        exploracionFisica
          ? formatearFechaUTC(exploracionFisica.fechaExploracionFisica)
          : '-',
        'tableCell',
        'center',
      ),
      createTableCell(
        exploracionFisica
          ? `IMC: ${exploracionFisica.indiceMasaCorporal} - ${exploracionFisica.categoriaIMC}. Cintura: ${exploracionFisica.circunferenciaCintura} cm - ${exploracionFisica.categoriaCircunferenciaCintura}.`
          : 'No se cuenta con exploración física',
        'tableCell',
        'center',
      ),
    ],
    [
      createTableCell('EXAMEN VISUAL', 'sectionHeader', 'center'),
      createTableCell(
        examenVista ? formatearFechaUTC(examenVista.fechaExamenVista) : '-',
        'tableCell',
        'center',
      ),
      createTableCell(examenVistaResumen, 'tableCell', 'center'),
    ],
    // AUDIOMETRÍA solo se incluye si existen datos
    ...(audiometria
      ? [
          [
            createTableCell('AUDIOMETRÍA', 'sectionHeader', 'center'),
            createTableCell(
              formatearFechaUTC(audiometria.fechaAudiometria),
              'tableCell',
              'center',
            ),
            createTableCell(
              obtenerResumenAudiometria(audiometria),
              'tableCell',
              'center',
            ),
          ],
        ]
      : []),
    // ANTIDOPING solo se incluye si existen datos
    ...(antidoping
      ? [
          [
            createTableCell('ANTIDOPING', 'sectionHeader', 'center'),
            createTableCell(
              formatearFechaUTC(antidoping.fechaAntidoping),
              'tableCell',
              'center',
            ),
            createTableCell(
              obtenerResumenAntidoping(antidoping),
              'tableCell',
              'center',
            ),
          ],
        ]
      : []),
    ...(resultadoTipoSangre && tipoSangreResumen
      ? [
          [
            createTableCell('TIPO DE SANGRE', 'sectionHeader', 'center'),
            createTableCell(
              formatearFechaUTC(resultadoTipoSangre.fechaEstudio),
              'tableCell',
              'center',
            ),
            createTableCell(tipoSangreResumen, 'tableCell', 'center'),
          ],
        ]
      : []),
    ...(resultadoEKG && ekgResumen
      ? [
          [
            createTableCell('ELECTROCARDIOGRAMA', 'sectionHeader', 'center'),
            createTableCell(
              formatearFechaUTC(resultadoEKG.fechaEstudio),
              'tableCell',
              'center',
            ),
            createTableCell(ekgResumen, 'tableCell', 'center'),
          ],
        ]
      : []),
    ...(resultadoEspirometria && espirometriaResumen
      ? [
          [
            createTableCell('ESPIROMETRIA', 'sectionHeader', 'center'),
            createTableCell(
              formatearFechaUTC(resultadoEspirometria.fechaEstudio),
              'tableCell',
              'center',
            ),
            createTableCell(espirometriaResumen, 'tableCell', 'center'),
          ],
        ]
      : []),
  ];

  // Agregar filas para cada evaluación adicional si existen los datos
  for (let i = 1; i <= 6; i++) {
    const evaluacion = aptitud[`evaluacionAdicional${i}`];
    const fecha = aptitud[`fechaEvaluacionAdicional${i}`];
    const resultados = aptitud[`resultadosEvaluacionAdicional${i}`];

    if (evaluacion && fecha && resultados) {
      resumenYAlteraciones.push([
        createTableCell(evaluacion.toUpperCase(), 'sectionHeader', 'center'),
        createTableCell(formatearFechaUTC(fecha), 'tableCell', 'center'),
        createTableCell(resultados, 'tableCell', 'center'),
      ]);
    }
  }

  const aptitudPuesto = aptitud.aptitudPuesto;
  const aptitudColor = getColorForAptitud(
    aptitudPuesto,
    proveedorSalud.semaforizacionActivada,
  );

  return {
    pageSize: 'LETTER',
    pageMargins: [40, 60, 40, 80],
    header: header,
    content: [
      // Nombre de la empresa y fecha
      {
        style: 'table',
        table: {
          widths: ['70%', '30%'],
          body: [
            [
              {
                text: nombreEmpresa,
                style: 'nombreEmpresa',
                alignment: 'center',
                margin: [0, 0, 0, 0],
              },
              {
                text: [
                  { text: 'Fecha: ', style: 'fecha', bold: false },
                  {
                    text: formatearFechaUTC(aptitud.fechaAptitudPuesto),
                    style: 'fecha',
                    bold: true,
                    // decoration: 'underline',
                  },
                ],
                margin: [0, 3, 0, 0],
              },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 0],
      },
      // Datos del trabajador
      {
        style: 'table',
        table: {
          widths: ['15%', '40%', '20%', '25%'],
          body: datosTrabajadorBody,
        },
        layout: {
          hLineColor: '#e5e7eb',
          vLineColor: '#e5e7eb',
          paddingTop: (i: number, node: any) => 0, // Reducir el espacio superior
          paddingBottom: (i: number, node: any) => 0, // Reducir el espacio inferior
          paddingLeft: (i: number, node: any) => 2, // Reducir el espacio izquierdo
          paddingRight: (i: number, node: any) => 2, // Reducir el espacio derecho
          hLineWidth: () => 1,
          vLineWidth: () => 1,
        },
        margin: [0, 0, 0, 6],
      },
      {
        text: 'La evaluación médica para la aptitud ante el puesto está basada en la siguiente información:',
      },
      // Resumen y/o alteraciones encontradas
      {
        style: 'table',
        table: {
          widths: ['29%', '11%', '*'],
          body: resumenYAlteraciones,
        },
        layout: {
          hLineColor: '#e5e7eb',
          vLineColor: '#e5e7eb',
          paddingTop: (i: number, node: any) => 0, // Reducir el espacio superior
          paddingBottom: (i: number, node: any) => 0, // Reducir el espacio inferior
          paddingLeft: (i: number, node: any) => 0, // Reducir el espacio izquierdo
          paddingRight: (i: number, node: any) => 0, // Reducir el espacio derecho
          hLineWidth: () => 1,
          vLineWidth: () => 1,
        },
        margin: [0, 0, 0, 6],
      },

      // Aptitud al puesto
      {
        style: 'table',
        table: {
          widths: ['*'], // Una sola columna que ocupa todo el ancho
          body: [
            [
              {
                text: 'BASADO EN LA INFORMACIÓN ANTERIOR SE HA DETERMINADO:',
                style: 'tableHeader',
                alignment: 'center',
              },
            ],
            [
              {
                text: aptitudPuestoModificado.toUpperCase(), // Mostrar la aptitud en mayúsculas
                style: 'result',
                alignment: 'center',
                color: aptitudColor, // Aplicar el color correspondiente
              },
            ],
          ],
        },
        layout: {
          hLineColor: '#e5e7eb',
          vLineColor: '#e5e7eb',
          paddingTop: (i: number, node: any) => 0, // Reducir el espacio superior
          paddingBottom: (i: number, node: any) => 0, // Reducir el espacio inferior
          paddingLeft: (i: number, node: any) => 2, // Reducir el espacio izquierdo
          paddingRight: (i: number, node: any) => 2, // Reducir el espacio derecho
          hLineWidth: () => 1,
          vLineWidth: () => 1,
        },
        margin: [0, 0, 0, 6],
      },
      // Conclusión y recomendaciones
      {
        style: 'table',
        table: {
          widths: ['15%', '*'],
          body: [
            [
              {
                text: 'CONCLUSIÓN Y RECOMENDACIONES',
                style: 'tableHeader',
                alignment: 'center',
                colSpan: 2, // Aquí se indica que la celda debe abarcar dos columnas.
              },
              {}, // Esta celda debe permanecer vacía para que la combinación funcione.
            ],
            [
              createTableCell(
                'Alteraciones a la Salud',
                'sectionHeaderResume',
                'center',
              ),
              createTableCell(
                aptitud.alteracionesSalud,
                'paragraph',
                'justify',
              ),
            ],
            [
              createTableCell('Resultados', 'sectionHeaderResume', 'center'),
              createTableCell(aptitud.resultados, 'paragraph', 'justify'),
            ],
            [
              createTableCell(
                'Medidas Preventivas Específicas',
                'sectionHeaderResume',
                'center',
              ),
              createTableCell(
                aptitud.medidasPreventivas,
                'paragraph',
                'justify',
              ),
            ],
          ],
        },
        layout: {
          hLineColor: '#e5e7eb',
          vLineColor: '#e5e7eb',
          paddingTop: (i: number, node: any) => 0, // Reducir el espacio superior
          paddingBottom: (i: number, node: any) => {
            // Si es la primera fila (que suele ser el encabezado), no aplicar padding inferior
            if (i === 0) {
              return 0; // Sin padding inferior en la primera fila (tableHeader)
            }
            return 4; // Para el resto de las filas, aplicar padding inferior
          },
          paddingLeft: (i: number, node: any) => 2, // Reducir el espacio izquierdo
          paddingRight: (i: number, node: any) => 2, // Reducir el espacio derecho
          hLineWidth: () => 1,
          vLineWidth: () => 1,
        },
        margin: [0, 0, 0, 5],
      },
    ],
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
                    medicoFirmante.tituloProfesional && medicoFirmante.nombre
                      ? {
                          text: `${medicoFirmante.tituloProfesional} ${medicoFirmante.nombre}\n`,
                          bold: true,
                        }
                      : null,

                    // Cédula profesional
                    medicoFirmante.numeroCedulaProfesional
                      ? {
                          text:
                            proveedorSalud.pais === 'MX'
                              ? `Cédula Profesional Médico Cirujano No. ${medicoFirmante.numeroCedulaProfesional}\n`
                              : proveedorSalud.pais === 'GT'
                                ? `Colegiado Activo No. ${medicoFirmante.numeroCedulaProfesional}\n`
                                : `Registro Profesional No. ${medicoFirmante.numeroCedulaProfesional}\n`,
                          bold: false,
                        }
                      : null,

                    // Cédula de especialista
                    medicoFirmante.numeroCedulaEspecialista
                      ? {
                          text:
                            proveedorSalud.pais === 'MX'
                              ? `Cédula Especialidad Med. del Trab. No. ${medicoFirmante.numeroCedulaEspecialista}\n`
                              : `Registro de Especialidad No. ${medicoFirmante.numeroCedulaEspecialista}\n`,
                          bold: false,
                        }
                      : null,

                    // Credencial adicional
                    medicoFirmante.nombreCredencialAdicional &&
                    medicoFirmante.numeroCredencialAdicional
                      ? {
                          text: `${(medicoFirmante.nombreCredencialAdicional + ' No. ' + medicoFirmante.numeroCredencialAdicional).substring(0, 60)}${(medicoFirmante.nombreCredencialAdicional + ' No. ' + medicoFirmante.numeroCredencialAdicional).length > 60 ? '...' : ''}\n`,
                          bold: false,
                        }
                      : null,
                  ].filter((item) => item !== null), // Filtrar los nulos para que no aparezcan en el informe
              fontSize: 8,
              margin: [40, 0, 0, 0],
            },
            // Solo incluir la columna de firma si hay firma
            ...((
              footerFirmantesData?.esDocumentoFinalizado
                ? footerFirmantesData?.finalizador?.firma?.data
                : medicoFirmante.firma?.data
            )
              ? [
                  {
                    ...firma,
                    margin: [0, -3, 0, 0] as [number, number, number, number], // Mueve el elemento más arriba
                  },
                ]
              : []),
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

                proveedorSalud.municipio &&
                proveedorSalud.estado &&
                proveedorSalud.telefono
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
              ].filter((item) => item !== null), // Elimina los elementos nulos
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
