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
  text: '                                                                                          HISTORIA OTOLÓGICA\n',
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
  bold: text && text.toUpperCase() === 'SI',
  color: text && text.toUpperCase() === 'SI' ? 'red' : 'black',
});

const createProteccionAuditivaTableCell = (text: string): Content => ({
  text: text ? text.toUpperCase() : '',
  style: 'tableCell',
  alignment: 'center',
  margin: [3, 3, 3, 3],
  bold:
    text &&
    (text.toUpperCase() === 'NUNCA' || text.toUpperCase() === 'A VECES'),
  color:
    text && text.toUpperCase() === 'NUNCA'
      ? 'red'
      : text && text.toUpperCase() === 'A VECES'
        ? '#CD853F'
        : 'black', // Color ocre
  fontSize: text && text.toUpperCase() === 'NUNCA' ? 12 : 10,
});

const createTiempoExposicionTableCell = (text: string): Content => ({
  text: text ? text.toUpperCase() : '',
  style: 'tableCell',
  alignment: 'center',
  margin: [3, 3, 3, 3],
  fontSize:
    text &&
    (text.toUpperCase() === 'NINGUNO' ||
      text.toUpperCase() === 'MENOS DE 1 AÑO' ||
      text.toUpperCase() === 'MÁS DE 20 AÑOS')
      ? 10
      : 12,
});

const createOtoscopiaTableCell = (text: string): Content => ({
  text: text ? text.toUpperCase() : '',
  style: 'tableCell',
  alignment: 'center',
  margin: [3, 3, 3, 3],
  bold: text && text.toUpperCase() === 'NO PERMEABLE',
  color: text && text.toUpperCase() === 'NO PERMEABLE' ? 'red' : 'black',
});

const createResultadoCuestionarioTableCell = (
  text: string,
  textoPersonalizado?: string,
): Content => {
  // Si el resultado es "OTRO" y hay texto personalizado, usar el texto personalizado
  const textoFinal =
    text && text.toUpperCase() === 'OTRO' && textoPersonalizado
      ? textoPersonalizado.toUpperCase()
      : text
        ? text.toUpperCase()
        : '';

  return {
    text: textoFinal,
    style: 'tableCell',
    alignment: 'center',
    margin: [3, 3, 3, 3],
    bold: true,
    color:
      text && text.toUpperCase() === 'PROCEDENTE'
        ? 'green'
        : text && text.toUpperCase() === 'PROCEDENTE CON PRECAUCIÓN'
          ? '#CD853F' // Color ocre
          : text && text.toUpperCase() === 'NO PROCEDENTE'
            ? 'red'
            : text && text.toUpperCase() === 'OTRO'
              ? '#404040'
              : 'black', // Color gris oscuro para OTRO
  };
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
  edad: string;
  puesto: string;
  sexo: string;
  escolaridad: string;
  antiguedad: string;
}

interface HistoriaOtologica {
  fechaHistoriaOtologica: Date;
  dolorOido: string;
  supuracionOido: string;
  mareoVertigo: string;
  zumbidoTinnitus: string;
  perdidaAudicion: string;
  oidoTapadoPlenitud: string;
  otitisFrecuentesInfancia: string;
  cirugiasOido: string;
  traumatismoCranealBarotrauma: string;
  usoAudifonos: string;
  historiaFamiliarHipoacusia: string;
  meningitisInfeccionGraveInfancia: string;
  diabetes: string;
  enfermedadRenal: string;
  medicamentosOtotoxicos: string;
  trabajoAmbientesRuidosos: string;
  tiempoExposicionLaboral: string;
  usoProteccionAuditiva: string;
  musicaFuerteAudifonos: string;
  armasFuegoPasatiemposRuidosos: string;
  servicioMilitar: string;
  alergias: string;
  resfriadoDiaPrueba: string;
  otoscopiaOidoDerecho: string;
  otoscopiaOidoIzquierdo: string;
  resultadoCuestionario: string;
  resultadoCuestionarioPersonalizado: string;
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
export const historiaOtologicaInforme = (
  nombreEmpresa: string,
  trabajador: Trabajador,
  historiaOtologica: HistoriaOtologica,
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
                    text: formatearFechaUTC(
                      historiaOtologica.fechaHistoriaOtologica,
                    ),
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
            [
              { text: 'ESCOLARIDAD', style: 'label' },
              { text: trabajador.escolaridad, style: 'value' },
              { text: 'ANTIGÜEDAD', style: 'label' },
              { text: trabajador.antiguedad, style: 'value' },
            ],
          ],
        },
        layout: {
          hLineColor: '#e5e7eb',
          vLineColor: '#e5e7eb',
          hLineWidth: () => 1,
          vLineWidth: () => 1,
        },
        margin: [0, 0, 0, 10],
      },
      // Síntomas recientes (últimos 2 meses)
      {
        text: 'EN LOS ÚLTIMOS DOS MESES',
        style: 'sectionHeader',
        alignment: 'center',
        margin: [0, 0, 0, 5],
      },
      {
        columns: [
          // Tabla izquierda (primeros 3 elementos)
          {
            width: '48%',
            style: 'table',
            table: {
              widths: ['80%', '20%'],
              body: [
                [
                  {
                    text: 'DOLOR OIDO',
                    style: 'tableCellBold',
                    alignment: 'center',
                  },
                  createConditionalTableCell(
                    historiaOtologica.dolorOido?.toString() || '',
                  ),
                ],
                [
                  {
                    text: 'SUPURACIÓN OÍDO',
                    style: 'tableCellBold',
                    alignment: 'center',
                  },
                  createConditionalTableCell(
                    historiaOtologica.supuracionOido?.toString() || '',
                  ),
                ],
                [
                  {
                    text: 'MAREO O VÉRTIGO',
                    style: 'tableCellBold',
                    alignment: 'center',
                  },
                  createConditionalTableCell(
                    historiaOtologica.mareoVertigo?.toString() || '',
                  ),
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
          },
          // Espacio vacío en el medio
          { width: '4%', text: '' },
          // Tabla derecha (últimos 3 elementos)
          {
            width: '48%',
            style: 'table',
            table: {
              widths: ['80%', '20%'],
              body: [
                [
                  {
                    text: 'ZUMBIDO (TINNITUS)',
                    style: 'tableCellBold',
                    alignment: 'center',
                  },
                  createConditionalTableCell(
                    historiaOtologica.zumbidoTinnitus?.toString() || '',
                  ),
                ],
                [
                  {
                    text: 'PÉRDIDA DE AUDICIÓN',
                    style: 'tableCellBold',
                    alignment: 'center',
                  },
                  createConditionalTableCell(
                    historiaOtologica.perdidaAudicion?.toString() || '',
                  ),
                ],
                [
                  {
                    text: 'OÍDO TAPADO / PLENITUD',
                    style: 'tableCellBold',
                    alignment: 'center',
                  },
                  createConditionalTableCell(
                    historiaOtologica.oidoTapadoPlenitud?.toString() || '',
                  ),
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
          },
        ],
        margin: [0, 0, 0, 5],
      },

      // Antecedentes personales
      {
        text: 'ANTEDENTES PERSONALES',
        style: 'sectionHeader',
        alignment: 'center',
        margin: [0, 8, 0, 5],
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
                  {
                    text: 'OTITIS FRECUENTES EN INFANCIA',
                    style: 'tableCellBold',
                    alignment: 'center',
                  },
                  createConditionalTableCell(
                    historiaOtologica.otitisFrecuentesInfancia?.toString() ||
                      '',
                  ),
                ],
                [
                  {
                    text: 'CIRUGÍAS DE OÍDO',
                    style: 'tableCellBold',
                    alignment: 'center',
                  },
                  createConditionalTableCell(
                    historiaOtologica.cirugiasOido?.toString() || '',
                  ),
                ],
                [
                  {
                    text: 'TRAUMATISMO CRANEAL',
                    style: 'tableCellBold',
                    alignment: 'center',
                  },
                  createConditionalTableCell(
                    historiaOtologica.traumatismoCranealBarotrauma?.toString() ||
                      '',
                  ),
                ],
                [
                  {
                    text: 'USO DE AUDÍFONOS',
                    style: 'tableCellBold',
                    alignment: 'center',
                  },
                  createConditionalTableCell(
                    historiaOtologica.usoAudifonos?.toString() || '',
                  ),
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
          },
          // Espacio vacío en el medio
          { width: '4%', text: '' },
          // Tabla derecha (últimos 5 elementos)
          {
            width: '48%',
            style: 'table',
            table: {
              widths: ['80%', '20%'],
              body: [
                [
                  {
                    text: 'MENINGITIS U INFECCIÓN GRAVE',
                    style: 'tableCellBold',
                    alignment: 'center',
                  },
                  createConditionalTableCell(
                    historiaOtologica.meningitisInfeccionGraveInfancia?.toString() ||
                      '',
                  ),
                ],
                [
                  {
                    text: 'DIABETES',
                    style: 'tableCellBold',
                    alignment: 'center',
                  },
                  createConditionalTableCell(
                    historiaOtologica.diabetes?.toString() || '',
                  ),
                ],
                [
                  {
                    text: 'ENFERMEDAD RENAL',
                    style: 'tableCellBold',
                    alignment: 'center',
                  },
                  createConditionalTableCell(
                    historiaOtologica.enfermedadRenal?.toString() || '',
                  ),
                ],
                [
                  {
                    text: 'MEDICAMENTOS OTOXICOS',
                    style: 'tableCellBold',
                    alignment: 'center',
                  },
                  createConditionalTableCell(
                    historiaOtologica.medicamentosOtotoxicos?.toString() || '',
                  ),
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
          },
        ],
        margin: [0, 0, 0, 5],
      },

      // Exposición a ruido
      {
        text: 'EXPOSICIÓN A RUIDO',
        style: 'sectionHeader',
        alignment: 'center',
        margin: [0, 8, 0, 5],
      },
      {
        columns: [
          // Tabla izquierda (primeros 3 elementos)
          {
            width: '48%',
            style: 'table',
            table: {
              widths: ['80%', '20%'],
              body: [
                [
                  {
                    text: 'TRABAJO EN AMBIENTES RUIDOSOS',
                    style: 'tableCellBold',
                    alignment: 'center',
                  },
                  createConditionalTableCell(
                    historiaOtologica.trabajoAmbientesRuidosos?.toString() ||
                      '',
                  ),
                ],
                [
                  {
                    text: 'TIEMPO DE EXPOSICIÓN A RUIDO LABORAL',
                    style: 'tableCellBold',
                    alignment: 'center',
                  },
                  createTiempoExposicionTableCell(
                    historiaOtologica.tiempoExposicionLaboral?.toString() || '',
                  ),
                ],
                [
                  {
                    text: 'USO DE PROTECCIÓN AUDITIVA',
                    style: 'tableCellBold',
                    alignment: 'center',
                  },
                  createProteccionAuditivaTableCell(
                    historiaOtologica.usoProteccionAuditiva?.toString() || '',
                  ),
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
          },
          // Espacio vacío en el medio
          { width: '4%', text: '' },
          // Tabla derecha (últimos 3 elementos)
          {
            width: '48%',
            style: 'table',
            table: {
              widths: ['80%', '20%'],
              body: [
                [
                  {
                    text: 'MÚSICA FUERTE CON AUDÍFONOS',
                    style: 'tableCellBold',
                    alignment: 'center',
                  },
                  createConditionalTableCell(
                    historiaOtologica.musicaFuerteAudifonos?.toString() || '',
                  ),
                ],
                [
                  {
                    text: 'ARMAS DE FUEGO O PASATIEMPOS RUIDOSOS',
                    style: 'tableCellBold',
                    alignment: 'center',
                  },
                  createConditionalTableCell(
                    historiaOtologica.armasFuegoPasatiemposRuidosos?.toString() ||
                      '',
                  ),
                ],
                [
                  {
                    text: 'SERVICIO MILITAR',
                    style: 'tableCellBold',
                    alignment: 'center',
                  },
                  createConditionalTableCell(
                    historiaOtologica.servicioMilitar?.toString() || '',
                  ),
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
          },
        ],
        margin: [0, 0, 0, 5],
      },

      // Sección OTROS y OTOSCOPIA lado a lado
      {
        columns: [
          // Sección OTROS (izquierda)
          {
            width: '48%',
            stack: [
              {
                text: 'OTROS',
                style: 'sectionHeader',
                alignment: 'center',
                margin: [0, 8, 0, 5],
              },
              {
                style: 'table',
                table: {
                  widths: ['80%', '20%'],
                  body: [
                    [
                      {
                        text: 'ALERGIAS',
                        style: 'tableCellBold',
                        alignment: 'center',
                      },
                      createConditionalTableCell(
                        historiaOtologica.alergias?.toString() || '',
                      ),
                    ],
                    [
                      {
                        text: 'RESFRIADO DÍA DE PRUEBA',
                        style: 'tableCellBold',
                        alignment: 'center',
                      },
                      createConditionalTableCell(
                        historiaOtologica.resfriadoDiaPrueba?.toString() || '',
                      ),
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
                margin: [0, 0, 0, 5],
              },
            ],
          },
          // Espacio vacío en el medio
          { width: '4%', text: '' },
          // Sección OTOSCOPIA (derecha)
          {
            width: '48%',
            stack: [
              {
                text: 'OTOSCOPIA',
                style: 'sectionHeader',
                alignment: 'center',
                margin: [0, 8, 0, 5],
              },
              {
                style: 'table',
                table: {
                  widths: ['50%', '50%'],
                  body: [
                    [
                      {
                        text: 'OÍDO DERECHO',
                        style: 'tableCellBold',
                        alignment: 'center',
                      },
                      createOtoscopiaTableCell(
                        historiaOtologica.otoscopiaOidoDerecho?.toString() ||
                          '',
                      ),
                    ],
                    [
                      {
                        text: 'OÍDO IZQUIERDO',
                        style: 'tableCellBold',
                        alignment: 'center',
                      },
                      createOtoscopiaTableCell(
                        historiaOtologica.otoscopiaOidoIzquierdo?.toString() ||
                          '',
                      ),
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
                margin: [0, 0, 0, 5],
              },
            ],
          },
        ],
      },

      // Sección AUDIOMETRÍA centrada
      {
        text: 'RESULTADO',
        style: 'sectionHeader',
        alignment: 'center',
        margin: [0, 8, 0, 5],
      },
      {
        style: 'table',
        table: {
          widths: ['50%', '50%'],
          body: [
            [
              {
                text: 'AUDIOMETRÍA',
                style: 'tableCellBold',
                alignment: 'center',
              },
              createResultadoCuestionarioTableCell(
                historiaOtologica.resultadoCuestionario?.toString() || '',
                historiaOtologica.resultadoCuestionarioPersonalizado?.toString(),
              ),
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
              text: [
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
                  ? buildEnfermeraPiePaginaPdfBlock(enfermeraFirmante, 'del cuestionaro')
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
