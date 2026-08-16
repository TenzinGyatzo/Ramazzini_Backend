import type {
  Content,
  StyleDictionary,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';
import { FooterFirmantesData } from '../interfaces/firmante-data.interface';
import { generarFooterFirmantes } from '../helpers/footer-firmantes.helper';
import { formatearNombreTrabajador, formatearTituloYNombreFirmante, formatearTituloYNombreFirmanteConFallback } from '../../../utils/names';
import { convertirFechaISOaDDMMYYYY } from '../../../utils/dates';
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
    fontSize: 10,
    alignment: 'right',
  },
  sectionHeader: {
    fontSize: 10,
    lineHeight: 0.8,
    bold: true,
    alignment: 'center',
    margin: [0, 0, 0, 0],
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
    fontSize: 9,
    alignment: 'center',
    margin: [0, 0, 0, 0],
  },
  tableCellBold: {
    fontSize: 8,
    bold: true,
    alignment: 'left',
    margin: [0, 0, 0, 0],
  },
  tableCell: {
    fontSize: 8,
    bold: false,
    alignment: 'center',
    margin: [0, 0, 0, 0],
  },
  tableCellMonth: {
    fontSize: 7,
    bold: false,
    alignment: 'center',
    margin: [0, 0, 0, 0],
  },
  tableCellMonthSmall: {
    fontSize: 6,
    bold: false,
    alignment: 'center',
    margin: [0, 1, 0, 0],
  },
  tableCellMonthHeader: {
    fontSize: 7,
    bold: true,
    alignment: 'center',
    margin: [0, 0, 0, 0],
  },
};

// ==================== CONTENIDO ====================
const headerText: Content = {
  text: '                                                                                                CONTROL PRENATAL\n',
  style: 'header',
  alignment: 'right',
  margin: [0, 35, 40, 0],
};

// ==================== FUNCIONES REUSABLES ====================
type Alignment = 'left' | 'center' | 'right' | 'justify';

const createTableCell = (
  text: string,
  style: string,
  alignment: Alignment,
): Content => ({
  text,
  style,
  alignment,
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
  escolaridad: string;
  edad: string;
  puesto: string;
  sexo: string;
  antiguedad: string;
  telefono: string;
  estadoCivil: string;
  numeroEmpleado: string;
}

interface ControlPrenatal {
  fechaInicioControlPrenatal: Date;
  altura?: number;
  menarca?: number;
  ciclos?: string;
  ivsa?: number;
  gestas?: number;
  partos?: number;
  cesareas?: number;
  abortos?: number;
  fum?: Date;
  fpp?: Date;
  metodoPlanificacionFamiliar?: string;
  eneroFecha?: Date;
  eneroFcf?: number;
  eneroSdg?: number;
  eneroFondoUterino?: number;
  eneroTia?: string;
  eneroImc?: number;
  eneroPeso?: number;
  febreroFecha?: Date;
  febreroFcf?: number;
  febreroImc?: number;
  febreroPeso?: number;
  febreroSdg?: number;
  febreroFondoUterino?: number;
  febreroTia?: string;
  marzoFecha?: Date;
  marzoFcf?: number;
  marzoSdg?: number;
  marzoFondoUterino?: number;
  marzoTia?: string;
  marzoImc?: number;
  marzoPeso?: number;
  abrilFecha?: Date;
  abrilFcf?: number;
  abrilSdg?: number;
  abrilFondoUterino?: number;
  abrilTia?: string;
  abrilImc?: number;
  abrilPeso?: number;
  mayoFecha?: Date;
  mayoFcf?: number;
  mayoSdg?: number;
  mayoFondoUterino?: number;
  mayoTia?: string;
  mayoImc?: number;
  mayoPeso?: number;
  junioFecha?: Date;
  junioFcf?: number;
  junioSdg?: number;
  junioFondoUterino?: number;
  junioTia?: string;
  junioImc?: number;
  junioPeso?: number;
  julioFecha?: Date;
  julioFcf?: number;
  julioSdg?: number;
  julioFondoUterino?: number;
  julioTia?: string;
  julioImc?: number;
  julioPeso?: number;
  agostoFecha?: Date;
  agostoFcf?: number;
  agostoSdg?: number;
  agostoFondoUterino?: number;
  agostoTia?: string;
  agostoImc?: number;
  agostoPeso?: number;
  septiembreFecha?: Date;
  septiembreFcf?: number;
  septiembreSdg?: number;
  septiembreFondoUterino?: number;
  septiembreTia?: string;
  septiembreImc?: number;
  septiembrePeso?: number;
  octubreFecha?: Date;
  octubreFcf?: number;
  octubreSdg?: number;
  octubreFondoUterino?: number;
  octubreTia?: string;
  octubreImc?: number;
  octubrePeso?: number;
  noviembreFecha?: Date;
  noviembreFcf?: number;
  noviembreSdg?: number;
  noviembreFondoUterino?: number;
  noviembreTia?: string;
  noviembreImc?: number;
  noviembrePeso?: number;
  diciembreFecha?: Date;
  diciembreFcf?: number;
  diciembreSdg?: number;
  diciembreFondoUterino?: number;
  diciembreTia?: string;
  diciembreImc?: number;
  diciembrePeso?: number;
  observacionesPeso?: string;
  observacionesImc?: string;
  observacionesTia?: string;
  observacionesFcf?: string;
  observacionesSdg?: string;
  observacionesFondoUterino?: string;
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

// ==================== INFORME PRINCIPAL ====================
export const controlPrenatalInforme = (
  nombreEmpresa: string,
  trabajador: Trabajador,
  controlPrenatal: ControlPrenatal,
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

  // Seleccionar el firmante a usar
  const firmanteActivo = usarMedico
    ? medicoFirmante
    : usarEnfermera
      ? enfermeraFirmante
      : usarTecnico
        ? tecnicoFirmante
        : null;

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

  // Nombre de Empresa y Fecha
  const nombreEmpresaSeccion: Content = {
    style: 'table',
    table: {
      widths: ['65%', '35%'],
      body: [
        [
          {
            text: '      ' + nombreEmpresa,
            style: 'nombreEmpresa',
            alignment: 'center',
            margin: [0, 0, 0, 0],
            preserveLeadingSpaces: true,
          },
          {
            text: [
              {
                text: 'Inicio de Control Prenatal: ',
                style: 'fecha',
                bold: false,
              },
              {
                text: formatearFechaUTC(
                  controlPrenatal.fechaInicioControlPrenatal,
                ),
                style: 'fecha',
                alignment: 'right',
                bold: true,
                decoration: 'underline',
              },
            ],
            margin: [0, 4, 0, 0],
          },
        ],
      ],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 0],
  };

  // DATOS GENERALES DE LA TRABAJADORA
  const trabajadorSeccion: Content = {
    style: 'table',
    table: {
      widths: ['15%', '45%', '15%', '25%'],
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

  // ANTECEDENTES GINECO-OBSTETRICOS
  const antecedentesGinecoObstetricos: Content = {
    style: 'table',
    table: {
      widths: ['25%', '25%', '25%', '25%'],
      body: [
        // Encabezado
        [
          {
            text: 'ANTECEDENTES GINECO-OBSTÉTRICOS',
            style: 'tableHeader',
            colSpan: 4,
            alignment: 'center',
          },
          {},
          {},
          {},
        ],
        // Filas de datos
        ...[
          [
            'MENARCA',
            controlPrenatal.menarca !== undefined &&
            controlPrenatal.menarca !== null
              ? controlPrenatal.menarca.toString() + ' años'
              : '-',
            'CICLOS',
            controlPrenatal.ciclos || '-',
          ],
          [
            'GESTAS',
            controlPrenatal.gestas?.toString() || '-',
            'FECHA DE ÚLTIMA MENSTRUACIÓN',
            controlPrenatal.fum ? formatearFechaUTC(controlPrenatal.fum) : '-',
          ],
          [
            'PARTOS',
            controlPrenatal.partos?.toString() || '-',
            'INICIO DE VIDA SEXUAL ACTIVA',
            controlPrenatal.ivsa !== undefined && controlPrenatal.ivsa !== null
              ? controlPrenatal.ivsa.toString() + ' años'
              : '-',
          ],
          [
            'CESAREAS',
            controlPrenatal.cesareas?.toString() || '-',
            'PLANIFICACION FAMILIAR',
            controlPrenatal.metodoPlanificacionFamiliar || '-',
          ],
          [
            'ABORTOS',
            controlPrenatal.abortos?.toString() || '-',
            'FECHA PROBABLE DE PARTO',
            controlPrenatal.fpp ? formatearFechaUTC(controlPrenatal.fpp) : '-',
          ],
        ].map((row) =>
          row.map((text, i) => ({
            text,
            style: i === 0 || i === 2 ? 'tableCellBold' : 'tableCell', // Aplica estilo específico si es la primera o la tercer columna
            alignment: i === 0 || i === 2 ? 'left' : 'center', // Alinea a la izquierda para la primera columna y tercer
          })),
        ),
      ],
    },
    layout: {
      hLineWidth: (i: number, node: any) => 0.3,
      vLineWidth: (i: number, node: any) => 0.3,
      hLineColor: () => '#a8a29e',
      vLineColor: () => '#a8a29e',
      paddingTop: (i: number, node: any) => 0,
      paddingBottom: (i: number, node: any) => 0,
      paddingLeft: (i: number, node: any) => 2,
      paddingRight: (i: number, node: any) => 2,
    },
    margin: [0, 0, 0, 8],
  };

  // Tabla de seguimiento mensual
  const tablaSeguimientoMensual: Content = {
    style: 'table',
    table: {
      widths: [
        '16%',
        '7%',
        '7%',
        '7%',
        '7%',
        '7%',
        '7%',
        '7%',
        '7%',
        '7%',
        '7%',
        '7%',
        '7%',
      ],
      body: [
        // Encabezado de meses
        [
          {
            text: 'MES',
            style: 'tableHeader',
            colSpan: 13,
            alignment: 'center',
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
          {},
          {},
          {},
        ],
        [
          { text: '', style: 'tableCellMonthHeader' },
          { text: 'ENE', style: 'tableCellMonthHeader' },
          { text: 'FEB', style: 'tableCellMonthHeader' },
          { text: 'MAR', style: 'tableCellMonthHeader' },
          { text: 'ABR', style: 'tableCellMonthHeader' },
          { text: 'MAY', style: 'tableCellMonthHeader' },
          { text: 'JUN', style: 'tableCellMonthHeader' },
          { text: 'JUL', style: 'tableCellMonthHeader' },
          { text: 'AGO', style: 'tableCellMonthHeader' },
          { text: 'SEP', style: 'tableCellMonthHeader' },
          { text: 'OCT', style: 'tableCellMonthHeader' },
          { text: 'NOV', style: 'tableCellMonthHeader' },
          { text: 'DIC', style: 'tableCellMonthHeader' },
        ],
        // Fila de Fecha
        [
          { text: 'FECHA', style: 'tableCellBold', alignment: 'center' },
          {
            text: controlPrenatal.eneroFecha
              ? convertirFechaISOaDDMMYYYY(
                  controlPrenatal.eneroFecha.toISOString(),
                )
              : '',
            style: 'tableCellMonthSmall',
          },
          {
            text: controlPrenatal.febreroFecha
              ? convertirFechaISOaDDMMYYYY(
                  controlPrenatal.febreroFecha.toISOString(),
                )
              : '',
            style: 'tableCellMonthSmall',
          },
          {
            text: controlPrenatal.marzoFecha
              ? convertirFechaISOaDDMMYYYY(
                  controlPrenatal.marzoFecha.toISOString(),
                )
              : '',
            style: 'tableCellMonthSmall',
          },
          {
            text: controlPrenatal.abrilFecha
              ? convertirFechaISOaDDMMYYYY(
                  controlPrenatal.abrilFecha.toISOString(),
                )
              : '',
            style: 'tableCellMonthSmall',
          },
          {
            text: controlPrenatal.mayoFecha
              ? convertirFechaISOaDDMMYYYY(
                  controlPrenatal.mayoFecha.toISOString(),
                )
              : '',
            style: 'tableCellMonthSmall',
          },
          {
            text: controlPrenatal.junioFecha
              ? convertirFechaISOaDDMMYYYY(
                  controlPrenatal.junioFecha.toISOString(),
                )
              : '',
            style: 'tableCellMonthSmall',
          },
          {
            text: controlPrenatal.julioFecha
              ? convertirFechaISOaDDMMYYYY(
                  controlPrenatal.julioFecha.toISOString(),
                )
              : '',
            style: 'tableCellMonthSmall',
          },
          {
            text: controlPrenatal.agostoFecha
              ? convertirFechaISOaDDMMYYYY(
                  controlPrenatal.agostoFecha.toISOString(),
                )
              : '',
            style: 'tableCellMonthSmall',
          },
          {
            text: controlPrenatal.septiembreFecha
              ? convertirFechaISOaDDMMYYYY(
                  controlPrenatal.septiembreFecha.toISOString(),
                )
              : '',
            style: 'tableCellMonthSmall',
          },
          {
            text: controlPrenatal.octubreFecha
              ? convertirFechaISOaDDMMYYYY(
                  controlPrenatal.octubreFecha.toISOString(),
                )
              : '',
            style: 'tableCellMonthSmall',
          },
          {
            text: controlPrenatal.noviembreFecha
              ? convertirFechaISOaDDMMYYYY(
                  controlPrenatal.noviembreFecha.toISOString(),
                )
              : '',
            style: 'tableCellMonthSmall',
          },
          {
            text: controlPrenatal.diciembreFecha
              ? convertirFechaISOaDDMMYYYY(
                  controlPrenatal.diciembreFecha.toISOString(),
                )
              : '',
            style: 'tableCellMonthSmall',
          },
        ],
        // Fila de PESO
        [
          { text: 'PESO (kg)', style: 'tableCellBold', alignment: 'center' },
          {
            text: controlPrenatal.eneroPeso?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.febreroPeso?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.marzoPeso?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.abrilPeso?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.mayoPeso?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.junioPeso?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.julioPeso?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.agostoPeso?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.septiembrePeso?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.octubrePeso?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.noviembrePeso?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.diciembrePeso?.toString() || '',
            style: 'tableCellMonth',
          },
        ],
        // Fila de IMC - Índice de Masa Corporal
        [
          { text: 'IMC', style: 'tableCellBold', alignment: 'center' },
          {
            text: controlPrenatal.eneroImc?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.febreroImc?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.marzoImc?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.abrilImc?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.mayoImc?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.junioImc?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.julioImc?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.agostoImc?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.septiembreImc?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.octubreImc?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.noviembreImc?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.diciembreImc?.toString() || '',
            style: 'tableCellMonth',
          },
        ],
        // Fila de T/A - Tensión Arterial
        [
          { text: 'T/A (mmHg)', style: 'tableCellBold', alignment: 'center' },
          { text: controlPrenatal.eneroTia || '', style: 'tableCellMonth' },
          { text: controlPrenatal.febreroTia || '', style: 'tableCellMonth' },
          { text: controlPrenatal.marzoTia || '', style: 'tableCellMonth' },
          { text: controlPrenatal.abrilTia || '', style: 'tableCellMonth' },
          { text: controlPrenatal.mayoTia || '', style: 'tableCellMonth' },
          { text: controlPrenatal.junioTia || '', style: 'tableCellMonth' },
          { text: controlPrenatal.julioTia || '', style: 'tableCellMonth' },
          { text: controlPrenatal.agostoTia || '', style: 'tableCellMonth' },
          {
            text: controlPrenatal.septiembreTia || '',
            style: 'tableCellMonth',
          },
          { text: controlPrenatal.octubreTia || '', style: 'tableCellMonth' },
          { text: controlPrenatal.noviembreTia || '', style: 'tableCellMonth' },
          { text: controlPrenatal.diciembreTia || '', style: 'tableCellMonth' },
        ],
        // Fila de FCF - Frecuencia Cardíaca Fetal
        [
          {
            text: 'FCF (lat/min)',
            style: 'tableCellBold',
            alignment: 'center',
          },
          {
            text: controlPrenatal.eneroFcf?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.febreroFcf?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.marzoFcf?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.abrilFcf?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.mayoFcf?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.junioFcf?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.julioFcf?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.agostoFcf?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.septiembreFcf?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.octubreFcf?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.noviembreFcf?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.diciembreFcf?.toString() || '',
            style: 'tableCellMonth',
          },
        ],
        // Fila de SDG - Semanas de Gestación
        [
          {
            text: 'SDG (semanas)',
            style: 'tableCellBold',
            alignment: 'center',
          },
          {
            text: controlPrenatal.eneroSdg?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.febreroSdg?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.marzoSdg?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.abrilSdg?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.mayoSdg?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.junioSdg?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.julioSdg?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.agostoSdg?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.septiembreSdg?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.octubreSdg?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.noviembreSdg?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.diciembreSdg?.toString() || '',
            style: 'tableCellMonth',
          },
        ],
        // Fila de F. UT. - Fondo Uterino
        [
          {
            text: 'F. UTERINO (cm)',
            style: 'tableCellBold',
            alignment: 'center',
          },
          {
            text: controlPrenatal.eneroFondoUterino?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.febreroFondoUterino?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.marzoFondoUterino?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.abrilFondoUterino?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.mayoFondoUterino?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.junioFondoUterino?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.julioFondoUterino?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.agostoFondoUterino?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.septiembreFondoUterino?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.octubreFondoUterino?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.noviembreFondoUterino?.toString() || '',
            style: 'tableCellMonth',
          },
          {
            text: controlPrenatal.diciembreFondoUterino?.toString() || '',
            style: 'tableCellMonth',
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
  };

  // Sección de Observaciones
  const observacionesSeccion: Content = {
    style: 'table',
    table: {
      widths: ['100%'],
      body: [
        [{ text: 'OBSERVACIONES', style: 'tableHeader', alignment: 'center' }],
        [
          {
            text:
              [
                controlPrenatal.observacionesPeso
                  ? [
                      { text: 'PESO: ', bold: true },
                      `${controlPrenatal.observacionesPeso}\n`,
                    ]
                  : '',
                controlPrenatal.observacionesImc
                  ? [
                      { text: 'IMC: ', bold: true },
                      `${controlPrenatal.observacionesImc}\n`,
                    ]
                  : '',
                controlPrenatal.observacionesTia
                  ? [
                      { text: 'T/A: ', bold: true },
                      `${controlPrenatal.observacionesTia}\n`,
                    ]
                  : '',
                controlPrenatal.observacionesFcf
                  ? [
                      { text: 'FCF: ', bold: true },
                      `${controlPrenatal.observacionesFcf}\n`,
                    ]
                  : '',
                controlPrenatal.observacionesSdg
                  ? [
                      { text: 'SDG: ', bold: true },
                      `${controlPrenatal.observacionesSdg}\n`,
                    ]
                  : '',
                controlPrenatal.observacionesFondoUterino
                  ? [
                      { text: 'FONDO UTERINO: ', bold: true },
                      `${controlPrenatal.observacionesFondoUterino}`,
                    ]
                  : '',
              ]
                .filter((text) => text !== '')
                .flat() || 'Sin observaciones',
            style: 'tableCell',
            alignment: 'left',
            margin: [5, 5, 5, 5],
          },
        ],
      ],
    },
    layout: {
      hLineColor: '#a8a29e',
      vLineColor: '#a8a29e',
      paddingTop: (i: number, node: any) => 2,
      paddingBottom: (i: number, node: any) => 2,
      paddingLeft: (i: number, node: any) => 2,
      paddingRight: (i: number, node: any) => 2,
      hLineWidth: () => 0.3,
      vLineWidth: () => 0.3,
    },
    margin: [0, 0, 0, 8],
  };

  // Crear el array de contenido
  const content: Content[] = [
    nombreEmpresaSeccion,
    trabajadorSeccion,
    antecedentesGinecoObstetricos,
    tablaSeguimientoMensual,
    observacionesSeccion,
  ];

  return {
    pageSize: 'LETTER',
    pageMargins: [40, 60, 40, 80],
    header: {
      columns: [logo, headerText],
    },
    content: content,
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
              y1: 0.5,
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
                  ? buildEnfermeraPiePaginaPdfBlock(enfermeraFirmante, 'de la evaluación')
                  : null,

                    // Texto específico para técnicos
                usarTecnico
                  ? buildTecnicoPiePaginaPdfBlock(tecnicoFirmante)
                  : null,
                  ].filter((item) => item !== null),
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
              ].filter((item) => item !== null),
              alignment: 'right',
              fontSize: 8,
              margin: [0, 0, 40, 0],
            },
          ],
        },
      ],
    },
    styles: updatedStyles,
  };
};
