import type {
  Content,
  StyleDictionary,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';
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
  value: { bold: true, fontSize: 11 },
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
  text: '                                                            CUESTIONARIO PREVIO A ESPIROMETRÍA\n',
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
  text: text ? text.toUpperCase() : '',
  style: 'tableCell',
  alignment: 'center',
  margin: [3, 3, 3, 3],
  bold: text && (text.toUpperCase() === 'SI' || text.toUpperCase() === 'FUMAR ACTUALMENTE' || text.toUpperCase() === 'EXFUMADOR'),
  color: text && (text.toUpperCase() === 'SI' || text.toUpperCase() === 'FUMAR ACTUALMENTE') ? 'red' : 'black',
});

const createTabaquismoTableCell = (text: string): Content => ({
  text: text ? text.toUpperCase() : '',
  style: 'tableCell',
  alignment: 'center',
  margin: [3, 3, 3, 3],
  bold: text && (text.toUpperCase() === 'FUMA' || text.toUpperCase() === 'FUMAR ACTUALMENTE' || text.toUpperCase() === 'EXFUMADOR'),
  color: text && (text.toUpperCase() === 'FUMA' || text.toUpperCase() === 'FUMAR ACTUALMENTE') ? 'red' : 
         text && text.toUpperCase() === 'EXFUMADOR' ? '#CD853F' : 'black', // Fuma -> rojo, Exfumador -> ocre, No fuma -> negro
});

const createPaquetesAnoTableCell = (text: string): Content => ({
  text: text ? text.toUpperCase() : '',
  style: 'tableCell',
  alignment: 'center',
  margin: [3, 3, 3, 3],
  bold: text && text !== '0',
  color: text && (text === '>20' || text === '10–20') ? 'red' : 'black',
});

const createDisneaTableCell = (text: string): Content => ({
  text: text ? text.toUpperCase() : '',
  style: 'tableCell',
  alignment: 'center',
  margin: [3, 3, 3, 3],
  bold: text && text.toUpperCase() !== 'NINGUNA',
  color: text && text.toUpperCase() === 'EN REPOSO' ? 'red' : 
         text && text.toUpperCase() === 'AL ESFUERZO' ? '#CD853F' : 'black', // En reposo -> rojo, Al esfuerzo -> ocre, Ninguna -> negro
});

const createResultadoCuestionarioTableCell = (text: string, textoPersonalizado?: string): Content => {
  // Si el resultado es "OTRO" y hay texto personalizado, usar el texto personalizado
  const textoFinal = text && text.toUpperCase() === 'OTRO' && textoPersonalizado 
    ? textoPersonalizado.toUpperCase() 
    : text ? text.toUpperCase() : '';
    
  return {
    text: textoFinal,
    style: 'tableCell',
    alignment: 'center',
    margin: [3, 3, 3, 3],
    bold: true,
    color: text && text.toUpperCase() === 'PROCEDENTE' ? 'green' : 
           text && text.toUpperCase() === 'PROCEDENTE CON PRECAUCIÓN' ? '#CD853F' : // Color ocre
           text && text.toUpperCase() === 'NO PROCEDENTE' ? 'red' : 
           text && text.toUpperCase() === 'OTRO' ? '#404040' : 'black', // Color gris oscuro para OTRO
  };
};

const createExposicionPolvosTableCell = (text: string): Content => ({
  text: text ? text.toUpperCase() : '',
  style: 'tableCell',
  alignment: 'center',
  margin: [3, 3, 3, 3],
  bold: text && text.toUpperCase() !== 'NO',
  color: text && text.toUpperCase() === 'AMBOS' ? 'red' : 
         text && (text.toUpperCase() === 'ORGÁNICOS' || text.toUpperCase() === 'INORGÁNICOS') ? '#CD853F' : 'black',
});

const createOtrosSintomasTableCell = (text: string): Content => ({
  text: text ? text.toUpperCase() : '',
  style: 'tableCell',
  alignment: 'center',
  margin: [3, 3, 3, 3],
  bold: text && text.toUpperCase() !== 'NO',
  color: text && text.toUpperCase() !== 'NO' ? 'red' : 'black',
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
  edad: string;
  puesto: string;
  sexo: string;
  escolaridad: string;
  antiguedad: string;
}

interface PrevioEspirometria {
  fechaPrevioEspirometria: Date;
  tabaquismo: string;
  cigarrosSemana: string;
  exposicionHumosBiomasa: string;
  exposicionLaboralPolvos: string;
  exposicionVaporesGasesIrritantes: string;
  antecedentesTuberculosisInfeccionesRespiratorias: string;
  tosCronica: string;
  expectoracionFrecuente: string;
  disnea: string;
  sibilancias: string;
  hemoptisis: string;
  otrosSintomas: string;
  asma: string;
  epocBronquitisCronica: string;
  fibrosisPulmonar: string;
  apneaSueno: string;
  medicamentosActuales: string;
  medicamentosActualesEspecificar: string;
  cirugiaReciente: string;
  infeccionRespiratoriaActiva: string;
  embarazoComplicado: string;
  derramePleural: string;
  neumotorax: string;
  infartoAgudoAnginaInestable: string;
  aneurismaAorticoConocido: string;
  inestabilidadHemodinamicaGrave: string;
  hipertensionIntracraneal: string;
  desprendimientoAgudoRetina: string;
  resultadoCuestionario: string;
  resultadoCuestionarioPersonalizado: string;
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
}

// ==================== INFORME PRINCIPAL ====================
export const previoEspirometriaInforme = (
  nombreEmpresa: string,
  trabajador: Trabajador,
  previoEspirometria: PrevioEspirometria,
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
                    text: formatearFechaUTC(previoEspirometria.fechaPrevioEspirometria),
                    style: 'fecha',
                    bold: true,
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
          widths: ['15%', '45%', '15%', '25%'],
          body: [
            [
              { text: 'NOMBRE', style: 'label' },
              { text: formatearNombreTrabajador(trabajador), style: 'value' },
              { text: 'EDAD', style: 'label' },
              { text: trabajador.edad, style: 'value' },
            ],
            [
              { text: 'PUESTO', style: 'label' },
              { text: trabajador.puesto, style: 'value' },
              { text: 'SEXO', style: 'label' },
              { text: trabajador.sexo, style: 'value' },
            ],
          ],
        },
        layout: {
          hLineColor: '#e5e7eb',
          vLineColor: '#e5e7eb',
          hLineWidth: () => 1,
          vLineWidth: () => 1,
        },
        margin: [0, 0, 0, 6],
      },
      // Factores de riesgo respiratorio y Síntomas respiratorios lado a lado
      {
        columns: [
          // Columna izquierda: FACTORES DE RIESGO RESPIRATORIO
          {
            width: '48%',
            stack: [
              {
                text: 'FACTORES DE RIESGO RESPIRATORIO',
                style: 'sectionHeader',
                alignment: 'center',
                margin: [0, 4, 0, 3],
              },
              {
                style: 'table',
                table: {
                  widths: ['60%', '20%', '20%'],
                  body: [
                    [
                      { text: 'TABAQUISMO', style: 'tableCellBold', alignment: 'center' },
                      Object.assign({}, createTabaquismoTableCell(previoEspirometria.tabaquismo?.toString() || ''), { colSpan: 2 }),
                      {},
                    ],
                    [
                      { text: 'CIGARROS-SEMANA', style: 'tableCellBold', alignment: 'center', colSpan: 2 },
                      {},
                      createPaquetesAnoTableCell(previoEspirometria.cigarrosSemana?.toString() || ''),
                    ],
                    [
                      { text: 'EXPOSICIÓN A HUMOS Y BIOMASA', style: 'tableCellBold', alignment: 'center', colSpan: 2 },
                      {},
                      createConditionalTableCell(previoEspirometria.exposicionHumosBiomasa?.toString() || ''),
                    ],
                    [
                      { text: 'EXPOSICIÓN A POLVOS', style: 'tableCellBold', alignment: 'center', colSpan: 2 },
                      {},
                      createConditionalTableCell(previoEspirometria.exposicionLaboralPolvos?.toString() || ''),
                    ],
                    [
                      { text: 'EXP. VAPORES Y GASES IRRITANTES', style: 'tableCellBold', alignment: 'center', colSpan: 2 },
                      {},
                      createConditionalTableCell(previoEspirometria.exposicionVaporesGasesIrritantes?.toString() || ''),
                    ],
                    [
                      { text: 'TUBERC./INFEC. RESPIRATORIAS', style: 'tableCellBold', alignment: 'center', colSpan: 2 },
                      {},
                      createConditionalTableCell(previoEspirometria.antecedentesTuberculosisInfeccionesRespiratorias?.toString() || ''),
                    ]
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
              }
            ]
          },
          // Espacio vacío en el medio
          { width: '4%', text: '' },
          // Columna derecha: SÍNTOMAS RESPIRATORIOS
          {
            width: '48%',
            stack: [
              {
                text: 'SÍNTOMAS RESPIRATORIOS',
                style: 'sectionHeader',
                alignment: 'center',
                margin: [0, 4, 0, 3],
              },
              {
                style: 'table',
                table: {
                  widths: ['10%', '10%', '10%', '10%', '10%', '10%', '10%', '10%', '10%', '10%'],
                  body: [
                    [
                      { text: 'TOS CRÓNICA', style: 'tableCellBold', alignment: 'center', colSpan: 8 },
                      {},
                      {},
                      {},
                      {},
                      {},
                      {},
                      {},
                      Object.assign({}, createConditionalTableCell(previoEspirometria.tosCronica?.toString() || ''), { colSpan: 2 }),
                      {},
                    ],
                    [
                      { text: 'EXPECTORACIÓN FRECUENTE', style: 'tableCellBold', alignment: 'center', colSpan: 8 },
                      {},
                      {},
                      {},
                      {},
                      {},
                      {},
                      {},
                      Object.assign({}, createConditionalTableCell(previoEspirometria.expectoracionFrecuente?.toString() || ''), { colSpan: 2 }),
                      {},
                    ],
                    [
                      { text: 'DISNEA', style: 'tableCellBold', alignment: 'center', colSpan: 4 },
                      {},
                      {},
                      {},
                      Object.assign({}, createDisneaTableCell(previoEspirometria.disnea?.toString() || ''), { colSpan: 6 }),
                      {},
                      {},
                      {},
                      {},
                      {},
                    ],
                    [
                      { text: 'SIBILANCIAS', style: 'tableCellBold', alignment: 'center', colSpan: 8 },
                      {},
                      {},
                      {},
                      {},
                      {},
                      {},
                      {},
                      Object.assign({}, createConditionalTableCell(previoEspirometria.sibilancias?.toString() || ''), { colSpan: 2 }),
                      {},
                    ],
                    [
                      { text: 'HEMOPTISIS', style: 'tableCellBold', alignment: 'center', colSpan: 8 },
                      {},
                      {},
                      {},
                      {},
                      {},
                      {},
                      {},
                      Object.assign({}, createConditionalTableCell(previoEspirometria.hemoptisis?.toString() || ''), { colSpan: 2 }),
                      {},
                    ],
                    ...(previoEspirometria.otrosSintomas ? [[
                      { text: 'OTROS SÍNTOMAS', style: 'tableCellBold', alignment: 'center', colSpan: 5 },
                      {},
                      {},
                      {},
                      {},
                      Object.assign({}, createOtrosSintomasTableCell(previoEspirometria.otrosSintomas?.toString() || ''), { colSpan: 5 }),
                      {},
                      {},
                      {},
                      {},
                    ]] : [])
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
              }
            ]
          }
        ],
        margin: [0, 0, 0, 3],
      },

      // Antecedentes médicos relevantes
      {
        text: 'ANTECEDENTES MÉDICOS RELEVANTES',
        style: 'sectionHeader',
        alignment: 'center',
        margin: [0, 8, 0, 3],
      },
      {
        columns: [
          // Tabla izquierda (primeros 4 elementos)
          {
            width: '48%',
        style: 'table',
            table: {
              widths: ['80%', '20%'],
              body: [
                [
                  { text: 'ASMA', style: 'tableCellBold', alignment: 'center' },
                  createConditionalTableCell(previoEspirometria.asma?.toString() || ''),
                ],
                [
                  { text: 'EPOC O BRONQUITIS CRÓNICA', style: 'tableCellBold', alignment: 'center' },
                  createConditionalTableCell(previoEspirometria.epocBronquitisCronica?.toString() || ''),
                ],
                [
                  { text: 'FIBROSIS PULMONAR', style: 'tableCellBold', alignment: 'center' },
                  createConditionalTableCell(previoEspirometria.fibrosisPulmonar?.toString() || ''),
                ],
                [
                  { text: 'APNEA DEL SUEÑO', style: 'tableCellBold', alignment: 'center' },
                  createConditionalTableCell(previoEspirometria.apneaSueno?.toString() || ''),
                ]
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
          },
          // Espacio vacío en el medio
          { width: '4%', text: '' },
          // Tabla derecha (medicamentos)
          {
            width: '48%',
            style: 'table',
            table: {
              widths: ['20%', '20%', '20%', '20%', '20%'],
              body: [
                [
                  { text: 'MEDICAMENTOS ACTUALES', style: 'tableCellBold', alignment: 'center', colSpan: 4 },
                  {},
                  {},
                  {},
                  createConditionalTableCell(previoEspirometria.medicamentosActuales?.toString() || ''),
                ],
                ...(previoEspirometria.medicamentosActualesEspecificar ? [[
                  { text: 'ESPECIFICAR MEDICAMENTOS', style: 'tableCellBold', alignment: 'center', colSpan: 2 },
                  {},
                  { text: previoEspirometria.medicamentosActualesEspecificar?.toString().toUpperCase() || '', style: 'tableCell', colSpan: 3 },
                  {},
                  {},
                ]] : [])
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
          }
        ],
        margin: [0, 0, 0, 3],
      },

      // Sección CONTRAINDICACIONES RELATIVAS y ABSOLUTAS lado a lado
      {
        columns: [
          // Sección CONTRAINDICACIONES RELATIVAS (izquierda)
          {
            width: '48%',
            stack: [
              {
                text: 'CONTRAINDICACIONES RELATIVAS',
                style: 'sectionHeader',
                alignment: 'center',
                margin: [0, 8, 0, 3],
              },
              {
                style: 'table',
                table: {
                  widths: ['80%', '20%'],
                  body: [
                    [
                      { text: 'CIRUGÍA RECIENTE', style: 'tableCellBold', alignment: 'center' },
                      createConditionalTableCell(previoEspirometria.cirugiaReciente?.toString() || ''),
                    ],
                    [
                      { text: 'INFECCIÓN RESPIRATORIA ACTIVA', style: 'tableCellBold', alignment: 'center' },
                      createConditionalTableCell(previoEspirometria.infeccionRespiratoriaActiva?.toString() || ''),
                    ],
                    [
                      { text: 'EMBARAZO COMPLICADO', style: 'tableCellBold', alignment: 'center' },
                      createConditionalTableCell(previoEspirometria.embarazoComplicado?.toString() || ''),
                    ],
                    [
                      { text: 'DERRAME PLEURAL', style: 'tableCellBold', alignment: 'center' },
                      createConditionalTableCell(previoEspirometria.derramePleural?.toString() || ''),
                    ],
                    [
                      { text: 'NEUMOTÓRAX', style: 'tableCellBold', alignment: 'center' },
                      createConditionalTableCell(previoEspirometria.neumotorax?.toString() || ''),
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
                margin: [0, 0, 0, 3],
              }
            ]
          },
          // Espacio vacío en el medio
          { width: '4%', text: '' },
          // Sección CONTRAINDICACIONES ABSOLUTAS (derecha)
          {
            width: '48%',
            stack: [
              {
                text: 'CONTRAINDICACIONES ABSOLUTAS',
                style: 'sectionHeader',
                alignment: 'center',
                margin: [0, 8, 0, 3],
              },
      {
        style: 'table',
        table: {
          widths: ['80%', '20%'],
          body: [
                  [
                    { text: 'IAM/ANGINA INESTABLE', style: 'tableCellBold', alignment: 'center' },
                    createConditionalTableCell(previoEspirometria.infartoAgudoAnginaInestable?.toString() || ''),
                  ],
                  [
                    { text: 'ANEURISMA AÓRTICO', style: 'tableCellBold', alignment: 'center' },
                    createConditionalTableCell(previoEspirometria.aneurismaAorticoConocido?.toString() || ''),
                  ],
                  [
                    { text: 'INESTABILIDAD HEMODINÁMICA', style: 'tableCellBold', alignment: 'center' },
                    createConditionalTableCell(previoEspirometria.inestabilidadHemodinamicaGrave?.toString() || ''),
                  ],
                  [
                    { text: 'HIPERTENSIÓN INTRACRANEAL', style: 'tableCellBold', alignment: 'center' },
                    createConditionalTableCell(previoEspirometria.hipertensionIntracraneal?.toString() || ''),
                  ],
                  [
                    { text: 'DESPRENDIMIENTO DE RETINA', style: 'tableCellBold', alignment: 'center' },
                    createConditionalTableCell(previoEspirometria.desprendimientoAgudoRetina?.toString() || ''),
                  ]
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
                margin: [0, 0, 0, 3],
              }
            ]
          }
         ]
       },

       // Sección RESULTADO centrada
       {
         text: 'RESULTADO DEL CUESTIONARIO',
         style: 'sectionHeader',
         alignment: 'center',
         margin: [0, 8, 0, 3],
       },
       {
         style: 'table',
         table: {
           widths: ['50%', '50%'],
           body: [
               [
                 { text: 'ESPIROMETRÍA', style: 'tableCellBold', alignment: 'center' },
                 createResultadoCuestionarioTableCell(
                   previoEspirometria.resultadoCuestionario?.toString() || '',
                   previoEspirometria.resultadoCuestionarioPersonalizado?.toString()
                 ),
               ]
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
         margin: [0, 0, 0, 3],
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
