import type {
  Content,
  StyleDictionary,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';
import { FooterFirmantesData } from '../interfaces/firmante-data.interface';
import { generarFooterFirmantes } from '../helpers/footer-firmantes.helper';
import { formatearNombreTrabajador, formatearTituloYNombreFirmante, formatearTituloYNombreFirmanteConFallback } from '../../../utils/names';
import { EnfermeraFirmanteInforme, MedicoFirmanteInforme, TecnicoFirmanteInforme } from '../types/firmante-informe.types';
import { firmanteTieneLineaNombre, resolverFirmanteActivo } from '../helpers/firmante-informe.helpers';
import { buildEnfermeraPiePaginaPdfBlock, buildTecnicoPiePaginaPdfBlock } from '../../../utils/firmante-pie-pagina.util';

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
  sectionHeader: {
    fontSize: 12,
    bold: true,
    alignment: 'center',
    margin: [3, 3, 3, 3],
  },
  label: { fontSize: 11 },
  signoVital: { fontSize: 9 },
  value: { bold: true, fontSize: 11 },
  paragraph: { fontSize: 11, alignment: 'justify' },
  tableHeader: {
    fillColor: '#343A40',
    color: '#FFFFFF',
    bold: true,
    fontSize: 12,
    alignment: 'center',
    margin: [3, 3, 3, 3],
  },
  tableCell: {
    fontSize: 12,
    // bold: true,
    alignment: 'center',
    margin: [3, 3, 3, 3],
  },
  tableCellBold: {
    fontSize: 12,
    bold: true,
    alignment: 'left',
    margin: [3, 3, 3, 3],
  },
  tableCellBoldCenter: {
    fontSize: 12,
    bold: true,
    alignment: 'center',
    margin: [3, 3, 3, 3],
  },
};

// ==================== CONTENIDO ====================
const headerText: Content = {
  text: '                                                                                                          AUDIOMETRIA\n',
  style: 'header',
  alignment: 'right',
  margin: [0, 35, 40, 0],
};

// ==================== FUNCIONES REUSABLES ====================
const createTableCell = (text: string, style: string): Content => ({
  text,
  style,
  alignment: 'center',
  margin: [4, 4, 4, 4],
});

const createConditionalTableCell = (text: string): Content => ({
  text: text.toUpperCase(),
  style: 'tableCell',
  alignment: 'center',
  margin: [4, 4, 4, 4],
  color: text.toUpperCase() === 'POSITIVO' ? 'red' : 'black', // Aplica rojo si es "POSITIVO"
});

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
// ==================== INTERFACES ====================
interface Trabajador {
  primerApellido: string;
  segundoApellido: string;
  nombre: string;
  nacimiento: string;
  edad: string;
  puesto: string;
  sexo: string;
  escolaridad: string;
  antiguedad: string;
  telefono: string;
  estadoCivil: string;
  numeroEmpleado: string;
}

interface Audiometria {
  fechaAudiometria: Date;
  metodoAudiometria: string; // AMA o LFT
  oidoDerecho125: number;
  oidoDerecho250: number;
  oidoDerecho500: number;
  oidoDerecho1000: number;
  oidoDerecho2000: number;
  oidoDerecho3000: number;
  oidoDerecho4000: number;
  oidoDerecho6000: number;
  oidoDerecho8000: number;
  porcentajePerdidaOD: number;
  // Campos específicos para AMA
  perdidaAuditivaBilateralAMA?: number;
  perdidaMonauralOD_AMA?: number;
  perdidaMonauralOI_AMA?: number;
  oidoIzquierdo125: number;
  oidoIzquierdo250: number;
  oidoIzquierdo500: number;
  oidoIzquierdo1000: number;
  oidoIzquierdo2000: number;
  oidoIzquierdo3000: number;
  oidoIzquierdo4000: number;
  oidoIzquierdo6000: number;
  oidoIzquierdo8000: number;
  porcentajePerdidaOI: number;
  hipoacusiaBilateralCombinada: number;
  observacionesAudiometria: string;
  interpretacionAudiometrica: string;
  diagnosticoAudiometria: string;
  recomendacionesAudiometria: string[];
  graficaAudiometria?: string; // Base64 de la gráfica audiométrica
}

interface ProveedorSalud {
  nombre: string;
  pais: string;
  regimenRegulatorio?: string;
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
}

// ==================== FUNCIONES DE CÁLCULO DINÁMICO ====================

// Función para calcular PTA AMA (500, 1000, 2000, 3000 Hz)
const calcularPTA_AMA = (
  audiometria: Audiometria,
  oido: 'Derecho' | 'Izquierdo',
): number => {
  const frecuencias = [500, 1000, 2000, 3000];
  const valores = frecuencias.map((freq) => {
    const campo = `oido${oido}${freq}` as keyof Audiometria;
    return (audiometria[campo] as number) || 0;
  });

  const suma = valores.reduce((acc, val) => acc + val, 0);
  return suma / frecuencias.length;
};

// Función para calcular PTA LFT Rango A (250, 500, 1000, 2000 Hz)
const calcularPTA_LFT_RangoA = (
  audiometria: Audiometria,
  oido: 'Derecho' | 'Izquierdo',
): number => {
  const frecuencias = [250, 500, 1000, 2000];
  const valores = frecuencias.map((freq) => {
    const campo = `oido${oido}${freq}` as keyof Audiometria;
    return (audiometria[campo] as number) || 0;
  });

  const suma = valores.reduce((acc, val) => acc + val, 0);
  return suma / frecuencias.length;
};

// Función para calcular PTA LFT Rango B (2000, 3000, 4000, 6000 Hz)
const calcularPTA_LFT_RangoB = (
  audiometria: Audiometria,
  oido: 'Derecho' | 'Izquierdo',
): number => {
  const frecuencias = [2000, 3000, 4000, 6000];
  const valores = frecuencias.map((freq) => {
    const campo = `oido${oido}${freq}` as keyof Audiometria;
    return (audiometria[campo] as number) || 0;
  });

  const suma = valores.reduce((acc, val) => acc + val, 0);
  return suma / frecuencias.length;
};

// Función para calcular porcentaje por oído según método
const calcularPorcentajePorOido = (
  audiometria: Audiometria,
  oido: 'Derecho' | 'Izquierdo',
): {
  porcentaje: number;
  frecuencias: number[];
  metodo: string;
  rango?: string;
} => {
  const metodo = audiometria.metodoAudiometria || 'AMA';

  if (metodo === 'AMA') {
    const pta = calcularPTA_AMA(audiometria, oido);
    const porcentaje = Math.max(0, pta - 25) * 1.5;

    return {
      porcentaje: Math.round(porcentaje * 100) / 100,
      frecuencias: [500, 1000, 2000, 3000],
      metodo: 'AMA',
    };
  } else if (metodo === 'LFT') {
    // LFT: Elegir entre Rango A y Rango B, el que produzca mayor porcentaje
    const ptaA = calcularPTA_LFT_RangoA(audiometria, oido);
    const ptaB = calcularPTA_LFT_RangoB(audiometria, oido);

    const porcentajeA = ptaA * 0.8;
    const porcentajeB = ptaB * 0.8;

    if (porcentajeA >= porcentajeB) {
      return {
        porcentaje: Math.round(porcentajeA * 100) / 100,
        frecuencias: [250, 500, 1000, 2000],
        metodo: 'LFT',
        rango: 'A',
      };
    } else {
      return {
        porcentaje: Math.round(porcentajeB * 100) / 100,
        frecuencias: [2000, 3000, 4000, 6000],
        metodo: 'LFT',
        rango: 'B',
      };
    }
  }

  // Fallback al método anterior si no se reconoce el método
  const frecuencias = [500, 1000, 2000, 4000];
  const valores = frecuencias.map((freq) => {
    const campo = `oido${oido}${freq}` as keyof Audiometria;
    return (audiometria[campo] as number) || 0;
  });

  const promedio =
    valores.reduce((acc, val) => acc + val, 0) / frecuencias.length;
  const porcentaje = promedio * 0.8;

  return {
    porcentaje: Math.round(porcentaje * 100) / 100,
    frecuencias: frecuencias,
    metodo: 'LEGACY',
  };
};

// Función para calcular resultado binaural según método
const calcularResultadoBinaural = (
  audiometria: Audiometria,
): { porcentaje: number; metodo: string; etiqueta: string } => {
  const metodo = audiometria.metodoAudiometria || 'AMA';

  if (metodo === 'AMA') {
    const resultadoOD = calcularPorcentajePorOido(audiometria, 'Derecho');
    const resultadoOI = calcularPorcentajePorOido(audiometria, 'Izquierdo');

    const menor = Math.min(resultadoOD.porcentaje, resultadoOI.porcentaje);
    const mayor = Math.max(resultadoOD.porcentaje, resultadoOI.porcentaje);

    const bilateral = (5 * menor + mayor) / 6;
    const porcentaje = Math.round(bilateral * 100) / 100;
    return {
      porcentaje,
      metodo: 'AMA',
      etiqueta: 'Pérdida auditiva bilateral',
    };
  } else if (metodo === 'LFT') {
    // Para LFT: calcular dinámicamente (usar valores legacy)
    const resultadoOD = calcularPorcentajePorOido(audiometria, 'Derecho');
    const resultadoOI = calcularPorcentajePorOido(audiometria, 'Izquierdo');

    const menor = Math.min(resultadoOD.porcentaje, resultadoOI.porcentaje);
    const mayor = Math.max(resultadoOD.porcentaje, resultadoOI.porcentaje);

    // LFT (HBC %): (7*menor + 1*mayor) / 8 y luego aplicar redondeo LFT
    let hbc = (7 * menor + mayor) / 8;

    // Aplicar redondeo LFT: décimas 0.0–0.5 hacia abajo, 0.6–0.9 hacia arriba
    const decimal = hbc % 1;
    if (decimal >= 0.6) {
      hbc = Math.ceil(hbc);
    } else {
      hbc = Math.floor(hbc);
    }

    return {
      porcentaje: hbc,
      metodo: 'LFT',
      etiqueta: 'Hipoacusia bilateral combinada (HBC)',
    };
  }

  // Fallback
  return {
    porcentaje: audiometria.hipoacusiaBilateralCombinada || 0,
    metodo: 'LEGACY',
    etiqueta: 'Hipoacusia bilateral combinada',
  };
};

// Función para obtener el texto del diagnóstico según el método
const obtenerTextoDiagnosticoBilateral = (metodo: string): string => {
  if (metodo === 'AMA') {
    return 'PÉRDIDA AUDITIVA BILATERAL';
  } else if (metodo === 'LFT') {
    return 'HIPOACUSIA BILATERAL COMBINADA';
  }
  return 'HIPOACUSIA BILATERAL COMBINADA'; // Valor por defecto
};

// ==================== INFORME PRINCIPAL ====================
export const audiometriaInforme = (
  nombreEmpresa: string,
  trabajador: Trabajador,
  audiometria: Audiometria,
  medicoFirmante: MedicoFirmanteInforme | null,
  enfermeraFirmante: EnfermeraFirmanteInforme | null,
  tecnicoFirmante: TecnicoFirmanteInforme | null,
  proveedorSalud: ProveedorSalud,
  footerFirmantesData?: FooterFirmantesData,
): TDocumentDefinitions => {
  // Determinar cuál firmante usar (médico tiene prioridad)
  const usarMedico = medicoFirmante?.nombre ? true : false;
  const usarEnfermera = !usarMedico && enfermeraFirmante?.nombre ? true : false;
  const usarTecnico =
    !usarMedico && !usarEnfermera && tecnicoFirmante?.nombre ? true : false;

  // Calcular resultados dinámicos
  const resultadoOD = calcularPorcentajePorOido(audiometria, 'Derecho');
  const resultadoOI = calcularPorcentajePorOido(audiometria, 'Izquierdo');
  const resultadoBinaural = calcularResultadoBinaural(audiometria);
  const textoDiagnosticoBilateral = obtenerTextoDiagnosticoBilateral(
    audiometria.metodoAudiometria || 'AMA',
  );

  // Seleccionar el firmante a usar
  const firmanteActivo = usarMedico
    ? medicoFirmante
    : usarEnfermera
      ? enfermeraFirmante
      : usarTecnico
        ? tecnicoFirmante
        : null;

  const firma: Content = firmanteActivo?.firma?.data
    ? { image: `assets/signatories/${firmanteActivo.firma.data}`, width: 65 }
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

  // Datos del Trabajador
  const trabajadorSeccion: Content = {
    style: 'table',
    table: {
      widths: ['15%', '45%', '20%', '20%'],
      body: [
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
    margin: [0, 0, 0, 8],
  };

  return {
    pageSize: 'LETTER',
    pageMargins: [40, 70, 40, 80],
    header: {
      columns: [logo, headerText],
    },
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
                    text: formatearFechaUTC(audiometria.fechaAudiometria),
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

      // Datos del Trabajador
      trabajadorSeccion,

      // Tabla de Audiometría
      {
        style: 'table',
        table: {
          widths: [
            '20%',
            '8%',
            '8%',
            '8%',
            '8%',
            '8%',
            '8%',
            '8%',
            '8%',
            '8%',
            '8%',
          ],
          body: [
            [
              { text: '', style: 'tableCellBoldCenter' },
              { text: '125', style: 'tableCellBoldCenter' },
              { text: '250', style: 'tableCellBoldCenter' },
              { text: '500', style: 'tableCellBoldCenter' },
              { text: '1000', style: 'tableCellBoldCenter' },
              { text: '2000', style: 'tableCellBoldCenter' },
              { text: '3000', style: 'tableCellBoldCenter' },
              { text: '4000', style: 'tableCellBoldCenter' },
              { text: '6000', style: 'tableCellBoldCenter' },
              { text: '8000', style: 'tableCellBoldCenter' },
              { text: 'P%', style: 'tableCellBoldCenter' },
            ],
            // Oído Derecho
            [
              {
                text: 'OIDO DERECHO',
                style: 'tableCellBold',
                alignment: 'left',
              },
              {
                text: audiometria.oidoDerecho125?.toString() || '',
                style: 'tableCell',
              },
              {
                text: audiometria.oidoDerecho250?.toString() || '',
                style: 'tableCell',
              },
              {
                text: audiometria.oidoDerecho500?.toString() || '',
                style: 'tableCell',
              },
              {
                text: audiometria.oidoDerecho1000?.toString() || '',
                style: 'tableCell',
              },
              {
                text: audiometria.oidoDerecho2000?.toString() || '',
                style: 'tableCell',
              },
              {
                text: audiometria.oidoDerecho3000?.toString() || '',
                style: 'tableCell',
              },
              {
                text: audiometria.oidoDerecho4000?.toString() || '',
                style: 'tableCell',
              },
              {
                text: audiometria.oidoDerecho6000?.toString() || '',
                style: 'tableCell',
              },
              {
                text: audiometria.oidoDerecho8000?.toString() || '',
                style: 'tableCell',
              },
              {
                text: resultadoOD.porcentaje?.toString() || '',
                style: 'tableCell',
              },
            ],
            // Oído Izquierdo
            [
              {
                text: 'OIDO IZQUIERDO',
                style: 'tableCellBold',
                alignment: 'left',
              },
              {
                text: audiometria.oidoIzquierdo125?.toString() || '',
                style: 'tableCell',
              },
              {
                text: audiometria.oidoIzquierdo250?.toString() || '',
                style: 'tableCell',
              },
              {
                text: audiometria.oidoIzquierdo500?.toString() || '',
                style: 'tableCell',
              },
              {
                text: audiometria.oidoIzquierdo1000?.toString() || '',
                style: 'tableCell',
              },
              {
                text: audiometria.oidoIzquierdo2000?.toString() || '',
                style: 'tableCell',
              },
              {
                text: audiometria.oidoIzquierdo3000?.toString() || '',
                style: 'tableCell',
              },
              {
                text: audiometria.oidoIzquierdo4000?.toString() || '',
                style: 'tableCell',
              },
              {
                text: audiometria.oidoIzquierdo6000?.toString() || '',
                style: 'tableCell',
              },
              {
                text: audiometria.oidoIzquierdo8000?.toString() || '',
                style: 'tableCell',
              },
              {
                text: resultadoOI.porcentaje?.toString() || '',
                style: 'tableCell',
              },
            ],
            // Pérdida Bilateral Combinada - Texto dinámico según método
            [
              {
                text: textoDiagnosticoBilateral,
                style: 'tableCellBold',
                alignment: 'left',
                colSpan: 10,
              },
              {},
              {},
              {},
              {},
              {},
              {},
              {},
              {},
              {},
              {
                text: resultadoBinaural.porcentaje?.toString() || '',
                style: 'tableCellBoldCenter',
              },
            ],
          ],
        },
        layout: {
          hLineColor: '#a8a29e',
          vLineColor: '#a8a29e',
          paddingTop: (i: number, node: any) => 1,
          paddingBottom: (i: number, node: any) => 1,
          paddingLeft: (i: number, node: any) => 1,
          paddingRight: (i: number, node: any) => 1,
          hLineWidth: () => 0.3,
          vLineWidth: () => 0.3,
        },
        margin: [0, 0, 0, 8],
      },

      // Leyenda discreta con método y frecuencias
      {
        text: `Método: ${audiometria.metodoAudiometria || 'AMA'}${
          audiometria.metodoAudiometria === 'AMA'
            ? ' - Frecuencias fijas: 500, 1000, 2000, 3000 Hz'
            : ` - OD: [${resultadoOD.frecuencias.join(', ')}] Hz${resultadoOD.rango ? ` (Rango ${resultadoOD.rango})` : ''} | OI: [${resultadoOI.frecuencias.join(', ')}] Hz${resultadoOI.rango ? ` (Rango ${resultadoOI.rango})` : ''}`
        }`,
        fontSize: 8,
        alignment: 'center',
        color: '#666666',
        italics: true,
        margin: [0, 0, 0, 8] as [number, number, number, number],
      },

      // Gráfica audiométrica - solo mostrar si existe
      ...(audiometria.graficaAudiometria
        ? [
            {
              image: audiometria.graficaAudiometria,
              width: 500, // Intentar con 450 y 400
              alignment: 'center' as const,
              margin: [0, 0, 0, 10] as [number, number, number, number],
            },
          ]
        : []),

      // Observaciones - solo mostrar si tiene contenido
      ...(audiometria.observacionesAudiometria &&
      audiometria.observacionesAudiometria.trim() !== ''
        ? [
            {
              text: [
                { text: `OBSERVACIONES:`, bold: true },
                { text: ` ${audiometria.observacionesAudiometria} ` },
              ],
              margin: [0, 0, 0, 10] as [number, number, number, number],
              style: 'paragraph',
            },
          ]
        : []),

      // Interpretación Audiométrica - solo mostrar si tiene contenido
      ...(audiometria.interpretacionAudiometrica &&
      audiometria.interpretacionAudiometrica.trim() !== ''
        ? [
            {
              text: [
                { text: `INTERPRETACIÓN AUDIOMÉTRICA:`, bold: true },
                { text: ` ${audiometria.interpretacionAudiometrica} ` },
              ],
              margin: [0, 0, 0, 10] as [number, number, number, number],
              style: 'paragraph',
            },
          ]
        : []),

      // Diagnóstico - Dinámico según método
      {
        text: [
          { text: `DIAGNÓSTICO:`, bold: true },
          {
            text: audiometria.diagnosticoAudiometria
              ? ` ${audiometria.diagnosticoAudiometria.toUpperCase()} ${audiometria.metodoAudiometria === 'AMA' ? 'PA' : 'HBC'} DE ${resultadoBinaural.porcentaje}% `
              : '',
            bold: true,
            fontSize: 12,
          },
        ] as any,
        margin: [0, 0, 0, 10] as [number, number, number, number],
        style: 'paragraph',
      },

      // Recomendaciones - solo mostrar si tiene contenido
      ...(audiometria.recomendacionesAudiometria &&
      audiometria.recomendacionesAudiometria.length > 0
        ? [
            {
              text: [
                { text: `RECOMENDACIONES:`, bold: true },
                ...audiometria.recomendacionesAudiometria.flatMap(
                  (item, index) => [
                    { text: `   ${index + 1}. `, preserveLeadingSpaces: true },
                    { text: item, bold: false },
                  ],
                ),
              ],
              margin: [0, 0, 0, 10] as [number, number, number, number],
              style: 'paragraph',
            },
          ]
        : []),
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
                    firmanteTieneLineaNombre(firmanteActivo)
                      ? {
                          text: `${formatearTituloYNombreFirmante(firmanteActivo, proveedorSalud.regimenRegulatorio)}\n`,
                          bold: true,
                        }
                      : null,

                    // Cédula profesional (para médicos y enfermeras)
                    firmanteActivo?.numeroCedulaProfesional
                      ? {
                          text:
                            proveedorSalud.pais === 'MX'
                              ? `Cédula Profesional ${usarMedico ? 'Médico Cirujano' : ''} No. ${firmanteActivo.numeroCedulaProfesional}\n`
                              : proveedorSalud.pais === 'GT'
                                ? `Colegiado Activo No. ${firmanteActivo.numeroCedulaProfesional}\n`
                                : `Registro Profesional No. ${firmanteActivo.numeroCedulaProfesional}\n`,
                          bold: false,
                        }
                      : null,

                    // Cédula de especialista (solo para médicos)
                    usarMedico && medicoFirmante?.numeroCedulaEspecialista
                      ? {
                          text:
                            proveedorSalud.pais === 'MX'
                              ? `Cédula Especialidad Med. del Trab. No. ${medicoFirmante.numeroCedulaEspecialista}\n`
                              : `Registro de Especialidad No. ${medicoFirmante.numeroCedulaEspecialista}\n`,
                          bold: false,
                        }
                      : null,

                    // Credencial adicional
                    firmanteActivo?.nombreCredencialAdicional &&
                    firmanteActivo?.numeroCredencialAdicional
                      ? {
                          text: `${(firmanteActivo.nombreCredencialAdicional + ' No. ' + firmanteActivo.numeroCredencialAdicional).substring(0, 60)}${(firmanteActivo.nombreCredencialAdicional + ' No. ' + firmanteActivo.numeroCredencialAdicional).length > 60 ? '...' : ''}\n`,
                          bold: false,
                        }
                      : null,

                    // Texto específico para enfermeras
                usarEnfermera
                  ? buildEnfermeraPiePaginaPdfBlock(enfermeraFirmante, 'del estudio')
                  : null,

                    // Texto específico para técnicos
                usarTecnico
                  ? buildTecnicoPiePaginaPdfBlock(tecnicoFirmante)
                  : null,
                  ].filter((item) => item !== null), // Filtrar los nulos para que no aparezcan en el informe
              fontSize: 8,
              margin: [40, 0, 0, 0],
            },
            // Solo incluir la columna de firma si hay firma
            ...((
              footerFirmantesData?.esDocumentoFinalizado
                ? footerFirmantesData?.finalizador?.firma?.data
                : firmanteActivo?.firma?.data
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
    styles: styles,
  };
};
