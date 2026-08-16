import type {
  Content,
  StyleDictionary,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';
import { formatearNombreTrabajador, formatearTituloYNombreFirmante, formatearTituloYNombreFirmanteConFallback } from '../../../utils/names';
import { FooterFirmantesData } from '../interfaces/firmante-data.interface';
import { generarFooterFirmantes } from '../helpers/footer-firmantes.helper';
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
    bold: true,
    alignment: 'center',
    margin: [3, 3, 3, 3],
  },
};

// ==================== CONTENIDO ====================
const headerText: Content = {
  text: '                                                                                                              ANTIDOPING\n',
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
  text: text ? text.toUpperCase() : 'N/A',
  style: 'tableCell',
  alignment: 'center',
  margin: [4, 4, 4, 4],
  color: text && text.toUpperCase() === 'POSITIVO' ? 'red' : 'black', // Aplica rojo si es "POSITIVO"
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
  edad: string;
  puesto: string;
  sexo: string;
  escolaridad: string;
  antiguedad: string;
}

interface Antidoping {
  fechaAntidoping: Date;
  marihuana: string;
  cocaina: string;
  anfetaminas?: string;
  metanfetaminas?: string;
  opiaceos?: string;
  benzodiacepinas?: string;
  fenciclidina?: string;
  metadona?: string;
  barbituricos?: string;
  antidepresivosTriciclicos?: string;
  metilendioximetanfetamina?: string;
  ketamina?: string;
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
export const antidopingInforme = (
  nombreEmpresa: string,
  trabajador: Trabajador,
  antidoping: Antidoping,
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
                    text: formatearFechaUTC(antidoping.fechaAntidoping),
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
      // Tabla de resultados
      {
        style: 'table',
        table: {
          widths: ['45%', '27.5%', '27.5%'],
          body: [
            [
              createTableCell('DROGAS DE ABUSO', 'tableHeader'),
              createTableCell('RESULTADOS', 'tableHeader'),
              createTableCell('VALOR DE REFERENCIA', 'tableHeader'),
            ],
            [
              createTableCell('MARIHUANA (THC)', 'sectionHeader'),
              createConditionalTableCell(antidoping.marihuana),
              createTableCell('NEGATIVO', 'tableCell'),
            ],
            [
              createTableCell('COCAINA (COC)', 'sectionHeader'),
              createConditionalTableCell(antidoping.cocaina),
              createTableCell('NEGATIVO', 'tableCell'),
            ],
            ...(antidoping.anfetaminas
              ? [
                  [
                    createTableCell('ANFETAMINAS (AMP)', 'sectionHeader'),
                    createConditionalTableCell(antidoping.anfetaminas),
                    createTableCell('NEGATIVO', 'tableCell'),
                  ],
                ]
              : []),
            ...(antidoping.metanfetaminas
              ? [
                  [
                    createTableCell('METANFETAMINAS (MET)', 'sectionHeader'),
                    createConditionalTableCell(antidoping.metanfetaminas),
                    createTableCell('NEGATIVO', 'tableCell'),
                  ],
                ]
              : []),
            ...(antidoping.opiaceos
              ? [
                  [
                    createTableCell('OPIACEOS (OPI)', 'sectionHeader'),
                    createConditionalTableCell(antidoping.opiaceos),
                    createTableCell('NEGATIVO', 'tableCell'),
                  ],
                ]
              : []),
            ...(antidoping.benzodiacepinas
              ? [
                  [
                    createTableCell('BENZODIACEPINAS (BZO)', 'sectionHeader'),
                    createConditionalTableCell(antidoping.benzodiacepinas),
                    createTableCell('NEGATIVO', 'tableCell'),
                  ],
                ]
              : []),
            ...(antidoping.fenciclidina
              ? [
                  [
                    createTableCell('FENCICLIDINA (PCP)', 'sectionHeader'),
                    createConditionalTableCell(antidoping.fenciclidina),
                    createTableCell('NEGATIVO', 'tableCell'),
                  ],
                ]
              : []),
            ...(antidoping.metadona
              ? [
                  [
                    createTableCell('METADONA (MTD)', 'sectionHeader'),
                    createConditionalTableCell(antidoping.metadona),
                    createTableCell('NEGATIVO', 'tableCell'),
                  ],
                ]
              : []),
            ...(antidoping.barbituricos
              ? [
                  [
                    createTableCell('BARBITURICOS (BAR)', 'sectionHeader'),
                    createConditionalTableCell(antidoping.barbituricos),
                    createTableCell('NEGATIVO', 'tableCell'),
                  ],
                ]
              : []),
            ...(antidoping.antidepresivosTriciclicos
              ? [
                  [
                    createTableCell('ANTIDEPRESIVOS T. (TCA)', 'sectionHeader'),
                    createConditionalTableCell(
                      antidoping.antidepresivosTriciclicos,
                    ),
                    createTableCell('NEGATIVO', 'tableCell'),
                  ],
                ]
              : []),
            ...(antidoping.metilendioximetanfetamina
              ? [
                  [
                    createTableCell(
                      'METILENDIOXIMETANFETAMINA (MDMA)',
                      'sectionHeader',
                    ),
                    createConditionalTableCell(
                      antidoping.metilendioximetanfetamina,
                    ),
                    createTableCell('NEGATIVO', 'tableCell'),
                  ],
                ]
              : []),
            ...(antidoping.ketamina
              ? [
                  [
                    createTableCell('KETAMINA (KET)', 'sectionHeader'),
                    createConditionalTableCell(antidoping.ketamina),
                    createTableCell('NEGATIVO', 'tableCell'),
                  ],
                ]
              : []),
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
                  ? buildEnfermeraPiePaginaPdfBlock(enfermeraFirmante, 'de la prueba')
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
    styles: updatedStyles,
  };
};
