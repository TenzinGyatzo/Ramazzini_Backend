import type {
  Content,
  StyleDictionary,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';
import { formatearNombreTrabajador } from '../../../utils/names';
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
    fontSize: 10,
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
  label: {
    fontSize: 8,
    lineHeight: 1,
    margin: [0, 0, 0, 0], // Reducir el margen superior e inferior
  },
  value: {
    bold: true,
    fontSize: 9,
    lineHeight: 1,
    margin: [0, 0, 0, 0], // Reducir el margen superior e inferior
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
  tableCellBoldResumen: {
    fontSize: 10,
    bold: true,
    margin: [0, 0, 0, 0],
  },
  tableCellResumen: {
    fontSize: 9,
    bold: false,
    margin: [0, 0, 0, 0],
  },
};

// ==================== CONTENIDO ====================
const headerText: Content = {
  text: '                                                                                                     HISTORIA CLÍNICA\n',
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

const createRow = (
  // Función para crear una de si, no y especifique
  condition: string | undefined,
  especificar: string | undefined,
  label: string,
) => {
  return [
    label,
    condition === 'Si' ? 'XX' : '',
    condition === 'No' ? 'XX' : '',
    especificar || '',
  ];
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
  contactoEmergenciaNombre?: string;
  contactoEmergenciaTelefono?: string;
}

interface HistoriaClinica {
  motivoExamen: string;
  fechaHistoriaClinica: Date;
  nefropatias?: string;
  nefropatiasEspecificar?: string;
  diabeticos?: string;
  diabeticosEspecificar?: string;
  hipertensivos?: string;
  hipertensivosEspecificar?: string;
  cardiopaticos?: string;
  cardiopaticosEspecificar?: string;
  neoplasicos?: string;
  neoplasicosEspecificar?: string;
  psiquiatricos?: string;
  psiquiatricosEspecificar?: string;
  epilepticos?: string;
  epilepticosEspecificar?: string;
  autoinmunes?: string;
  autoinmunesEspecificar?: string;
  tuberculosis?: string;
  tuberculosisEspecificar?: string;
  hepatopatias?: string;
  hepatopatiasEspecificar?: string;
  lumbalgias?: string;
  lumbalgiasEspecificar?: string;
  diabeticosPP?: string;
  diabeticosPPEspecificar?: string;
  cardiopaticosPP?: string;
  cardiopaticosPPEspecificar?: string;
  alergicos?: string;
  alergicosEspecificar?: string;
  hipertensivosPP?: string;
  hipertensivosPPEspecificar?: string;
  respiratorios?: string;
  respiratoriosEspecificar?: string;
  epilepticosPP?: string;
  epilepticosPPEspecificar?: string;
  accidentes?: string;
  accidentesEspecificar?: string;
  quirurgicos?: string;
  quirurgicosEspecificar?: string;
  otros?: string;
  otrosEspecificar?: string;
  alcoholismo?: string;
  alcoholismoEspecificar?: string;
  tabaquismo?: string;
  tabaquismoEspecificar?: string;
  toxicomanias?: string;
  toxicomaniasEspecificar?: string;
  alimentacionDeficiente?: string;
  alimentacionDeficienteEspecificar?: string;
  actividadFisicaDeficiente?: string;
  actividadFisicaDeficienteEspecificar?: string;
  higienePersonalDeficiente?: string;
  higienePersonalDeficienteEspecificar?: string;
  menarca?: string;
  duracionPromedio?: string;
  frecuencia?: string;
  gestas?: string;
  partos?: string;
  cesareas?: string;
  abortos?: string;
  fechaUltimaRegla?: string;
  dolorMenstrual?: string;
  embarazoActual?: string;
  planificacionFamiliar?: string;
  vidaSexualActiva?: string;
  fechaUltimoPapanicolaou?: string;
  fechaUltimaMastografia?: string;
  empresaAnterior1?: string;
  puestoAnterior1?: string;
  antiguedadAnterior1?: string;
  agentesAnterior1?: string;
  empresaAnterior2?: string;
  puestoAnterior2?: string;
  antiguedadAnterior2?: string;
  agentesAnterior2?: string;
  empresaAnterior3?: string;
  puestoAnterior3?: string;
  antiguedadAnterior3?: string;
  agentesAnterior3?: string;
  accidenteLaboral?: string;
  accidenteLaboralEspecificar?: string;
  descripcionDelDano?: string;
  secuelas?: string;
  resumenHistoriaClinica?: string;
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
  };
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
}

// ==================== INFORME PRINCIPAL ====================
export const historiaClinicaInforme = (
  nombreEmpresa: string,
  trabajador: Trabajador,
  historiaClinica: HistoriaClinica,
  medicoFirmante: MedicoFirmante | null,
  enfermeraFirmante: EnfermeraFirmante | null,
  tecnicoFirmante: TecnicoFirmante | null,
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

  const motivoExamen = historiaClinica.motivoExamen;
  const motivoTexto = [
    { text: 'Ingreso (', style: 'fecha' },
    {
      text: motivoExamen === 'Ingreso' ? 'X' : ' ',
      style: 'fecha',
      bold: motivoExamen === 'Ingreso',
    },
    { text: ')    Inicial (', style: 'fecha' },
    {
      text: motivoExamen === 'Inicial' ? 'X' : ' ',
      style: 'fecha',
      bold: motivoExamen === 'Inicial',
    },
    { text: ')    Periódico (', style: 'fecha' },
    {
      text: motivoExamen === 'Periódico' ? 'X' : ' ',
      style: 'fecha',
      bold: motivoExamen === 'Periódico',
    },
    { text: ')', style: 'fecha' },
  ];

  const rowsAntecedentesHeredofamiliares = [
    createRow(
      historiaClinica.nefropatias,
      historiaClinica.nefropatiasEspecificar,
      'NEFROPATIA',
    ),
    createRow(
      historiaClinica.diabeticos,
      historiaClinica.diabeticosEspecificar,
      'DIABETES',
    ),
    createRow(
      historiaClinica.hipertensivos,
      historiaClinica.hipertensivosEspecificar,
      'HIPERTENSIVOS',
    ),
    createRow(
      historiaClinica.cardiopaticos,
      historiaClinica.cardiopaticosEspecificar,
      'CARDIOPÁTICOS',
    ),
    createRow(
      historiaClinica.neoplasicos,
      historiaClinica.neoplasicosEspecificar,
      'NEOPLÁSICOS',
    ),
    createRow(
      historiaClinica.psiquiatricos,
      historiaClinica.psiquiatricosEspecificar,
      'PSIQUIÁTRICOS',
    ),
    createRow(
      historiaClinica.epilepticos,
      historiaClinica.epilepticosEspecificar,
      'EPILÉPTICOS',
    ),
    createRow(
      historiaClinica.autoinmunes,
      historiaClinica.autoinmunesEspecificar,
      'AUTOIMMUNES',
    ),
    createRow(
      historiaClinica.tuberculosis,
      historiaClinica.tuberculosisEspecificar,
      'TUBERCULOSIS',
    ),
    createRow(
      historiaClinica.hepatopatias,
      historiaClinica.hepatopatiasEspecificar,
      'HEPATOPATÍAS',
    ),
  ];

  const rowsAntecedentesPersonalesPatologicos = [
    createRow(
      historiaClinica.lumbalgias,
      historiaClinica.lumbalgiasEspecificar,
      'LUMBALGIAS',
    ),
    createRow(
      historiaClinica.diabeticosPP,
      historiaClinica.diabeticosPPEspecificar,
      'DIABÉTICOS',
    ),
    createRow(
      historiaClinica.cardiopaticosPP,
      historiaClinica.cardiopaticosPPEspecificar,
      'CARDIOPÁTICOS',
    ),
    createRow(
      historiaClinica.alergicos,
      historiaClinica.alergicosEspecificar,
      'ALÉRGICOS',
    ),
    createRow(
      historiaClinica.hipertensivosPP,
      historiaClinica.hipertensivosPPEspecificar,
      'HIPERTENSIVOS',
    ),
    createRow(
      historiaClinica.respiratorios,
      historiaClinica.respiratoriosEspecificar,
      'RESPIRATORIOS',
    ),
    createRow(
      historiaClinica.epilepticosPP,
      historiaClinica.epilepticosPPEspecificar,
      'EPILÉPTICOS',
    ),
    createRow(
      historiaClinica.accidentes,
      historiaClinica.accidentesEspecificar,
      'ACCIDENTES',
    ),
    createRow(
      historiaClinica.quirurgicos,
      historiaClinica.quirurgicosEspecificar,
      'QUIRÚRGICOS',
    ),
    createRow(historiaClinica.otros, historiaClinica.otrosEspecificar, 'OTROS'),
  ];

  const rowsAntecedentesPersonalesNoPatologicos = [
    createRow(
      historiaClinica.alcoholismo,
      historiaClinica.alcoholismoEspecificar,
      'ALCOHOLISMO',
    ),
    createRow(
      historiaClinica.tabaquismo,
      historiaClinica.tabaquismoEspecificar,
      'TABAQUISMO',
    ),
    createRow(
      historiaClinica.toxicomanias,
      historiaClinica.toxicomaniasEspecificar,
      'TOXICOMANIAS',
    ),
  ];

  const rowsAntecedentesPersonalesNoPatologicos2 = [
    createRow(
      historiaClinica.alimentacionDeficiente,
      historiaClinica.alimentacionDeficienteEspecificar,
      'ALIMENTACIÓN',
    ),
    createRow(
      historiaClinica.actividadFisicaDeficiente,
      historiaClinica.actividadFisicaDeficienteEspecificar,
      'ACTIVIDAD FÍSICA',
    ),
    createRow(
      historiaClinica.higienePersonalDeficiente,
      historiaClinica.higienePersonalDeficienteEspecificar,
      'HIGIENE PERSONAL',
    ),
  ];

  // Nombre de Empresa y Fecha
  const nombreEmpresaSeccion: Content = {
    style: 'table',
    table: {
      widths: ['50%', '32%', '18%'],
      body: [
        [
          {
            text: '      ' + nombreEmpresa, // Usa 6 espacios literales
            style: 'nombreEmpresa',
            alignment: 'center',
            margin: [0, 0, 0, 0],
            preserveLeadingSpaces: true, // IMPORTANTE: Forza a pdfMake a respetar los espacios
          },
          {
            text: motivoTexto,
            style: 'fecha',
            alignment: 'right',
            margin: [0, 4, 0, 0],
          },
          {
            text: [
              { text: 'Fecha: ', style: 'fecha', bold: false },
              {
                text: formatearFechaUTC(historiaClinica.fechaHistoriaClinica),
                style: 'fecha',
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

  // Datos del Trabajador
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
        [
          { text: 'C. EMERGENCIA', style: 'label' },
          { text: trabajador.contactoEmergenciaNombre || '-', style: 'value' },
          { text: 'TEL. C. EMERGENCIA', style: 'label' },
          { text: trabajador.contactoEmergenciaTelefono || '-', style: 'value' },
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

  // Antecedentes Heredofamiliares y Personales Patológicos
  const antecedentesSeccion: Content = {
    columns: [
      // Antecedentes Heredofamiliares
      {
        style: 'table',
        table: {
          widths: ['30%', '12%', '12%', '*'],
          body: [
            // Encabezado
            [
              {
                text: 'ANTECEDENTES HEREDOFAMILIARES',
                style: 'tableHeader',
                colSpan: 4,
                alignment: 'center',
              },
              {},
              {},
              {},
            ],
            [
              { text: '-', style: 'tableHeader', alignment: 'center' },
              { text: 'Sí', style: 'tableHeader', alignment: 'center' },
              { text: 'No', style: 'tableHeader', alignment: 'center' },
              {
                text: 'Especifique',
                style: 'tableHeader',
                alignment: 'center',
              },
            ],
            // Filas de datos
            ...rowsAntecedentesHeredofamiliares.map((row) =>
              row.map((text, i) => ({
                text,
                style: i === 0 ? 'tableCellBold' : 'tableCell', // Aplica estilo específico si es la primera columna
                alignment: i === 0 ? 'left' : 'center', // Alinea a la izquierda para la primera columna
              })),
            ),
          ],
        },
        layout: {
          hLineWidth: (i: number, node: any) => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#e5e7eb',
          paddingTop: (i: number, node: any) => 1,
          paddingBottom: (i: number, node: any) => 1,
          paddingLeft: (i: number, node: any) => 2,
          paddingRight: (i: number, node: any) => 2,
        },

        margin: [0, 0, 6, 0],
      },
      // Antecedentes Personales Patológicos
      {
        style: 'table',
        table: {
          widths: ['30%', '12%', '12%', '*'],
          body: [
            // Encabezado
            [
              {
                text: 'ANTECEDENTES PERSONALES PATOLÓGICOS',
                style: 'tableHeader',
                colSpan: 4,
                alignment: 'center',
              },
              {},
              {},
              {},
            ],
            [
              { text: '-', style: 'tableHeader', alignment: 'center' },
              { text: 'Sí', style: 'tableHeader', alignment: 'center' },
              { text: 'No', style: 'tableHeader', alignment: 'center' },
              {
                text: 'Especifique',
                style: 'tableHeader',
                alignment: 'center',
              },
            ],
            // Filas de datos
            ...rowsAntecedentesPersonalesPatologicos.map((row) =>
              row.map((text, i) => ({
                text,
                style: i === 0 ? 'tableCellBold' : 'tableCell', // Aplica estilo específico si es la primera columna
                alignment: i === 0 ? 'left' : 'center', // Alinea a la izquierda para la primera columna
              })),
            ),
          ],
        },
        layout: {
          hLineWidth: (i: number, node: any) => 0.5, // Todas las líneas horizontales tienen el mismo grosor
          vLineWidth: () => 0, // Las líneas verticales no se dibujan
          hLineColor: () => '#e5e7eb', // Color de las líneas horizontales
          paddingTop: (i: number, node: any) => 1,
          paddingBottom: (i: number, node: any) => 1,
          paddingLeft: (i: number, node: any) => 2,
          paddingRight: (i: number, node: any) => 2,
        },
      },
    ],
    margin: [0, 0, 0, 8],
  };

  // Antecedentes Personales No Patológicos
  const antecedentesPersonalesNoPatologicos: Content = {
    columns: [
      // Antecedentes Personales No Patológicos
      {
        style: 'table',
        table: {
          widths: ['30%', '12%', '12%', '*'],
          body: [
            // Encabezado
            [
              {
                text: 'ANTECEDENTES PERSONALES NO PATOLÓGICOS',
                style: 'tableHeader',
                colSpan: 4,
                alignment: 'center',
              },
              {},
              {},
              {},
            ],
            [
              { text: '-', style: 'tableHeader', alignment: 'center' },
              { text: 'Sí', style: 'tableHeader', alignment: 'center' },
              { text: 'No', style: 'tableHeader', alignment: 'center' },
              {
                text: 'Especifique',
                style: 'tableHeader',
                alignment: 'center',
              },
            ],
            // Filas de datos
            ...rowsAntecedentesPersonalesNoPatologicos.map((row) =>
              row.map((text, i) => ({
                text,
                style: i === 0 ? 'tableCellBold' : 'tableCell', // Aplica estilo específico si es la primera columna
                alignment: i === 0 ? 'left' : 'center', // Alinea a la izquierda para la primera columna
              })),
            ),
          ],
        },
        layout: {
          hLineWidth: (i: number, node: any) => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#e5e7eb',
          paddingTop: (i: number, node: any) => 1,
          paddingBottom: (i: number, node: any) => 1,
          paddingLeft: (i: number, node: any) => 2,
          paddingRight: (i: number, node: any) => 2,
        },

        margin: [0, 0, 6, 0],
      },
      // Antecedentes Personales No Patológicos
      {
        style: 'table',
        table: {
          widths: ['30%', '12%', '12%', '*'],
          body: [
            // Encabezado
            [
              {
                text: 'ANTECEDENTES PERSONALES NO PATOLÓGICOS',
                style: 'tableHeader',
                colSpan: 4,
                alignment: 'center',
              },
              {},
              {},
              {},
            ],
            [
              { text: '-', style: 'tableHeader', alignment: 'center' },
              { text: 'Sí', style: 'tableHeader', alignment: 'center' },
              { text: 'No', style: 'tableHeader', alignment: 'center' },
              {
                text: 'Especifique',
                style: 'tableHeader',
                alignment: 'center',
              },
            ],
            // Filas de datos
            ...rowsAntecedentesPersonalesNoPatologicos2.map((row) =>
              row.map((text, i) => ({
                text,
                style: i === 0 ? 'tableCellBold' : 'tableCell', // Aplica estilo específico si es la primera columna
                alignment: i === 0 ? 'left' : 'center', // Alinea a la izquierda para la primera columna
              })),
            ),
          ],
        },
        layout: {
          hLineWidth: (i: number, node: any) => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#e5e7eb',
          paddingTop: (i: number, node: any) => 1,
          paddingBottom: (i: number, node: any) => 1,
          paddingLeft: (i: number, node: any) => 2,
          paddingRight: (i: number, node: any) => 2,
        },
      },
    ],
    margin: [0, 0, 0, 8],
  };

  // Antecedentes Gineco Obstetricos
  const antecedentesGinecoObstetricos: Content | null =
    trabajador.sexo === 'Femenino'
      ? {
          style: 'table',
          table: {
            widths: ['20%', '30%', '20%', '30%'],
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
                  historiaClinica.menarca,
                  'FECHA ÚLTIMA REGLA',
                  historiaClinica.fechaUltimaRegla,
                ],
                [
                  'DURACIÓN PROMEDIO',
                  historiaClinica.duracionPromedio,
                  'DOLOR MENSTRUAL',
                  historiaClinica.dolorMenstrual,
                ],
                [
                  'FRECUENCIA',
                  historiaClinica.frecuencia,
                  'EMBARAZO ACTUAL',
                  historiaClinica.embarazoActual,
                ],
                [
                  'GESTAS',
                  historiaClinica.gestas,
                  'VIDA SEXUAL ACTIVA',
                  historiaClinica.vidaSexualActiva,
                ],
                [
                  'PARTOS',
                  historiaClinica.partos,
                  'PLANIFICACIÓN FAMILIAR',
                  historiaClinica.planificacionFamiliar,
                ],
                [
                  'CESÁREAS',
                  historiaClinica.cesareas,
                  'ÚLTIMO PAPANICOLAOU',
                  historiaClinica.fechaUltimoPapanicolaou,
                ],
                [
                  'ABORTOS',
                  historiaClinica.abortos,
                  'ÚLTIMA MASTROGRAFÍA',
                  historiaClinica.fechaUltimaMastografia,
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
            hLineWidth: (i: number, node: any) => 0.5,
            vLineWidth: (i: number, node: any) => 0.5,
            hLineColor: () => '#e5e7eb',
            vLineColor: () => '#e5e7eb',
            paddingTop: (i: number, node: any) => 0,
            paddingBottom: (i: number, node: any) => 0,
            paddingLeft: (i: number, node: any) => 2,
            paddingRight: (i: number, node: any) => 2,
          },
          margin: [0, 0, 0, 8],
        }
      : null;

  // Antecedentes Laborales
  const antecedentesLaborales: Content = {
    style: 'table',
    table: {
      widths: ['3%', '22%', '25%', '17%', '*'],
      body: [
        // Encabezado
        [
          {
            text: 'ANTECEDENTES LABORALES',
            style: 'tableHeader',
            colSpan: 5,
            alignment: 'center',
          },
          {},
          {},
          {},
          {},
        ],
        [
          { text: '#', style: 'tableHeader', alignment: 'center' },
          { text: 'Empresa', style: 'tableHeader', alignment: 'center' },
          { text: 'Puesto', style: 'tableHeader', alignment: 'center' },
          { text: 'Antigüedad', style: 'tableHeader', alignment: 'center' },
          { text: 'Agentes', style: 'tableHeader', alignment: 'center' },
        ],
        // Filas de datos
        ...[
          [
            '1',
            historiaClinica.empresaAnterior1,
            historiaClinica.puestoAnterior1,
            historiaClinica.antiguedadAnterior1,
            historiaClinica.agentesAnterior1,
          ],
          [
            '2',
            historiaClinica.empresaAnterior2,
            historiaClinica.puestoAnterior2,
            historiaClinica.antiguedadAnterior2,
            historiaClinica.agentesAnterior2,
          ],
          [
            '3',
            historiaClinica.empresaAnterior3,
            historiaClinica.puestoAnterior3,
            historiaClinica.antiguedadAnterior3,
            historiaClinica.agentesAnterior3,
          ],
        ].map((row) =>
          row.map((text, i) => ({
            text,
            style: i === 0 ? 'tableCell' : 'tableCell',
            alignment: 'center',
          })),
        ),
      ],
    },
    layout: {
      hLineWidth: (i: number, node: any) => 0.5,
      vLineWidth: () => 0,
      hLineColor: () => '#e5e7eb',
      paddingTop: (i: number, node: any) => 0,
      paddingBottom: (i: number, node: any) => 0,
      paddingLeft: (i: number, node: any) => 2,
      paddingRight: (i: number, node: any) => 2,
    },
    margin: [0, 0, 0, 8],
  };

  // Antecedentes Laborales 2da parte
  const antecedentesLaborales2daParte: Content = {
    style: 'table',
    table: {
      widths: ['20%', '10%', '5%', '5%', '5%', '5%', '*'], // 7 columnas
      body: [
        // Fila principal con encabezado
        [
          {
            text: 'SUFRIÓ ALGÚN RIESGO DE TRABAJO',
            style: 'tableCellBold',
            alignment: 'left',
            colSpan: 2,
          },
          {}, // Segunda columna para el colSpan
          { text: 'NO', style: 'tableCellBold', alignment: 'center' },
          {
            text: historiaClinica.accidenteLaboral === 'No' ? 'XX' : '',
            style: 'tableCell',
            alignment: 'center',
          },
          { text: 'SI', style: 'tableCellBold', alignment: 'center' },
          {
            text: historiaClinica.accidenteLaboral === 'Si' ? 'XX' : '',
            style: 'tableCell',
            alignment: 'center',
          },
          {
            text: historiaClinica.accidenteLaboralEspecificar || '',
            style: 'tableCell',
            alignment: 'center',
          },
        ],
        // Fila para "Describa el daño"
        [
          {
            text: 'DESCRIBA EL DAÑO',
            style: 'tableCellBold',
            alignment: 'left',
          },
          {
            text: historiaClinica.descripcionDelDano,
            colSpan: 6,
            style: 'tableCell',
            alignment: 'center',
          },
          {},
          {},
          {},
          {},
          {},
        ],
        // Fila para "Secuelas"
        [
          { text: 'SECUELAS', style: 'tableCellBold', alignment: 'left' },
          {
            text: historiaClinica.secuelas,
            colSpan: 6,
            style: 'tableCell',
            alignment: 'center',
          },
          {},
          {},
          {},
          {},
          {},
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

  // Resumen Historia Clínica
  const resumenHistoriaClinica: Content = {
    style: 'table',
    table: {
      widths: ['30%', '70%'],
      body: [
        // Encabezado
        [
          {
            text: 'RESUMEN DE HISTORIA CLÍNICA',
            style: 'tableHeader',
            colSpan: 2,
            alignment: 'center',
          },
          {},
        ],
        [
          {
            text: 'RESUMEN',
            style: 'tableCellBoldResumen',
            alignment: 'center',
          },
          {
            text: historiaClinica.resumenHistoriaClinica,
            style: 'tableCellResumen',
            alignment: 'center',
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
    margin: [0, 0, 0, 8],
  };

  // Crear el array de contenido de manera condicional
  const content: Content[] = [
    nombreEmpresaSeccion, // Nombre de Empresa y Fecha
    trabajadorSeccion, // Datos del Trabajador
    antecedentesSeccion, // Antecedentes Heredofamiliares y Personales Patológicos
    antecedentesPersonalesNoPatologicos, // Antecedentes Personales No Patológicos
    // Incluir "Antecedentes Gineco Obstetricos" solo si el trabajador es femenino
    ...(trabajador.sexo === 'Femenino' ? [antecedentesGinecoObstetricos] : []),
    antecedentesLaborales, // Antecedentes Laborales
    antecedentesLaborales2daParte, // Antecedentes Laborales 2da Parte
    resumenHistoriaClinica, // Resumen Historia Clínica
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
                firmanteActivo?.tituloProfesional && firmanteActivo?.nombre
                  ? {
                      text: `${firmanteActivo.tituloProfesional} ${firmanteActivo.nombre}\n`,
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
                usarEnfermera && enfermeraFirmante?.sexo
                  ? {
                      text:
                        enfermeraFirmante.sexo === 'Femenino'
                          ? 'Enfermera responsable de la evaluación\n'
                          : 'Enfermero responsable de la evaluación\n',
                      bold: false,
                    }
                  : null,

                // Texto específico para técnicos
                usarTecnico && tecnicoFirmante?.sexo
                  ? {
                      text:
                        tecnicoFirmante.sexo === 'Femenino'
                          ? 'Responsable de la evaluación\n'
                          : 'Responsable de la evaluación\n',
                      bold: false,
                    }
                  : null,
              ].filter((item) => item !== null), // Filtrar los nulos para que no aparezcan en el informe
              fontSize: 8,
              margin: [40, 0, 0, 0],
            },
            // Solo incluir la columna de firma si hay firma
            ...(firmanteActivo?.firma?.data
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
