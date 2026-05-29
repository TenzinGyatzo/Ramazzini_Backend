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
    alignment: 'left',
    margin: [0, 0, 0, 0],
  },
  label: { fontSize: 11 },
  signoVital: { fontSize: 9 },
  // value: { bold: true, fontSize: 11 },
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
    bold: true,
    alignment: 'center',
    margin: [3, 3, 3, 3],
  },
};

// ==================== CONTENIDO ====================
const headerText: Content = {
  text: '                                                                                         NOTA ACLARATORIA\n',
  style: 'header',
  alignment: 'right',
  margin: [0, 35, 40, 0],
};

// ==================== FUNCIONES REUSABLES ====================
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
  telefono: string;
  estadoCivil: string;
  numeroEmpleado: string;
}

interface NotaAclaratoria {
  documentoOrigenId: any;
  documentoOrigenTipo: string;
  fechaNotaAclaratoria: Date;
  motivoAclaracion: string;
  descripcionAclaracion: string;
  alcanceAclaracion: string;
  impactoClinico: string;
}

interface DocumentoOrigen {
  tipoDocumento: string;
  nombreDocumento: string;
  fechaPrincipal: Date | null;
  fechaCreacion: Date | null;
  estado: string;
  fechaFinalizacion: Date | null;
  finalizadoPor: string;
  fechaAnulacion: Date | null;
  anuladoPor: string;
  razonAnulacion: string;
  campoDistintivo: string;
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
export const notaAclaratoriaInforme = (
  nombreEmpresa: string,
  trabajador: Trabajador,
  notaAclaratoria: NotaAclaratoria,
  documentoOrigen: DocumentoOrigen,
  medicoFirmante: MedicoFirmante | null,
  enfermeraFirmante: EnfermeraFirmante | null,
  proveedorSalud: ProveedorSalud,
  footerFirmantesData?: FooterFirmantesData,
): TDocumentDefinitions => {
  // Determinar cuál firmante usar (médico tiene prioridad)
  const usarMedico = medicoFirmante?.nombre ? true : false;
  const usarEnfermera = !usarMedico && enfermeraFirmante?.nombre ? true : false;

  // Seleccionar el firmante a usar
  const firmanteActivo = usarMedico
    ? medicoFirmante
    : usarEnfermera
      ? enfermeraFirmante
      : null;

  const firma: Content = (
    footerFirmantesData?.esDocumentoFinalizado
      ? footerFirmantesData?.finalizador?.firma?.data
      : firmanteActivo?.firma?.data
  )
    ? {
        image: `assets/signatories/${
          footerFirmantesData?.esDocumentoFinalizado
            ? footerFirmantesData?.finalizador?.firma?.data
            : firmanteActivo?.firma?.data
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

  return {
    pageSize: 'LETTER',
    pageMargins: [40, 70, 40, 80],
    header: {
      columns: [logo, headerText],
    },
    content: [
      // Fecha de la nota aclaratoria
      {
        style: 'table',
        table: {
          widths: ['100%'],
          body: [
            [
              {
                text: [
                  {
                    text: 'Fecha: ',
                    style: 'fecha',
                    bold: false,
                  },
                  {
                    text: formatearFechaUTC(
                      notaAclaratoria.fechaNotaAclaratoria,
                    ),
                    style: 'fecha',
                    bold: true,
                  },
                ],
                alignment: 'right',
                margin: [0, 3, 0, 0],
              },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 10],
      },

      // Sección: Documento que se aclara
      {
        style: 'table',
        table: {
          widths: ['100%'],
          body: [
            [
              {
                stack: [
                  {
                    text: 'DOCUMENTO QUE SE ACLARA',
                    style: 'sectionHeader',
                    fillColor: '#E9ECEF',
                    margin: [10, 8, 10, 8] as [number, number, number, number],
                  },
                  // Nombre del documento (prominente, como título)
                  {
                    text: [
                      {
                        text: documentoOrigen.nombreDocumento || 'Documento',
                        fontSize: 18,
                        bold: true,
                        margin: [0, 0, 0, 2],
                      },
                      ...(documentoOrigen.fechaCreacion
                        ? [
                            {
                              text: ` (${
                                documentoOrigen.tipoDocumento ===
                                'documentosExternos'
                                  ? 'Subido el'
                                  : 'Creado el'
                              } ${formatearFechaUTC(
                                documentoOrigen.fechaCreacion,
                              )})`,
                              fontSize: 11,
                              bold: false,
                              color: '#666666',
                            },
                          ]
                        : []),
                    ],
                    margin: [10, 0, 10, 5] as [number, number, number, number],
                  },
                  // Información detallada del documento
                  ...(documentoOrigen.fechaFinalizacion ||
                  documentoOrigen.fechaAnulacion ||
                  documentoOrigen.razonAnulacion
                    ? [
                        {
                          style: 'table',
                          table: {
                            widths: ['100%'],
                            body: [
                              ...(documentoOrigen.fechaFinalizacion
                                ? [
                                    [
                                      {
                                        text: [
                                          { text: 'Finalizado: ', bold: true },
                                          {
                                            text: formatearFechaUTC(
                                              documentoOrigen.fechaFinalizacion,
                                            ),
                                          },
                                          documentoOrigen.finalizadoPor
                                            ? {
                                                text: ` (por ${documentoOrigen.finalizadoPor})`,
                                                fontSize: 9,
                                                color: '#666666',
                                              }
                                            : null,
                                        ].filter((item) => item !== null),
                                        style: 'paragraph',
                                        margin: [5, 3, 5, 3] as [
                                          number,
                                          number,
                                          number,
                                          number,
                                        ],
                                      },
                                    ],
                                  ]
                                : []),
                              ...(documentoOrigen.fechaAnulacion
                                ? [
                                    [
                                      {
                                        text: [
                                          {
                                            text: 'Anulado: ',
                                            bold: true,
                                            color: '#DC3545',
                                          },
                                          {
                                            text: formatearFechaUTC(
                                              documentoOrigen.fechaAnulacion,
                                            ),
                                            color: '#DC3545',
                                            bold: true,
                                          },
                                          documentoOrigen.anuladoPor
                                            ? {
                                                text: ` (por ${documentoOrigen.anuladoPor})`,
                                                fontSize: 9,
                                                color: '#666666',
                                              }
                                            : null,
                                        ].filter((item) => item !== null),
                                        style: 'paragraph',
                                        margin: [5, 3, 5, 3] as [
                                          number,
                                          number,
                                          number,
                                          number,
                                        ],
                                      },
                                    ],
                                  ]
                                : []),
                              ...(documentoOrigen.razonAnulacion
                                ? [
                                    [
                                      {
                                        text: [
                                          {
                                            text: 'Razón: ',
                                            bold: true,
                                            color: '#DC3545',
                                          },
                                          {
                                            text: documentoOrigen.razonAnulacion,
                                            color: '#DC3545',
                                          },
                                        ],
                                        style: 'paragraph',
                                        margin: [5, 3, 5, 3] as [
                                          number,
                                          number,
                                          number,
                                          number,
                                        ],
                                        border: [false, true, false, false] as [
                                          boolean,
                                          boolean,
                                          boolean,
                                          boolean,
                                        ],
                                        borderColor: '#E5E7EB',
                                        borderWidth: 0.2,
                                      },
                                    ],
                                  ]
                                : []),
                            ],
                          },
                          layout: {
                            hLineWidth: () => 0,
                            vLineWidth: () => 0,
                            paddingTop: () => 0,
                            paddingBottom: () => 0,
                          },
                          margin: [10, 0, 10, 8] as [
                            number,
                            number,
                            number,
                            number,
                          ],
                        },
                      ]
                    : []),
                ],
                fillColor: '#FFFFFF',
                margin: [0, 0, 0, 0] as [number, number, number, number],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: (i, node) => {
            // Solo bordes superior e inferior de la tabla completa
            if (i === 0 || i === node.table.body.length) return 0.15;
            return 0; // Sin bordes internos horizontales
          },
          vLineWidth: () => 0.15, // Bordes laterales
          hLineColor: () => '#E5E7EB', // Gris muy claro
          vLineColor: () => '#E5E7EB',
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 10, 0, 10] as [number, number, number, number],
      },

      // Sección: Trabajador
      {
        style: 'table',
        table: {
          widths: ['100%'],
          body: [
            [
              {
                stack: [
                  {
                    text:
                      trabajador.sexo === 'Masculino'
                        ? 'TRABAJADOR'
                        : 'TRABAJADORA',
                    style: 'sectionHeader',
                    fillColor: '#E9ECEF',
                    margin: [10, 8, 10, 8] as [number, number, number, number],
                  },
                  // Datos del trabajador
                  {
                    style: 'table',
                    table: {
                      widths: ['70%', '30%'],
                      body: [
                        [
                          {
                            text: formatearNombreTrabajador(trabajador),
                            style: 'nombreEmpresa',
                            alignment: 'left',
                            margin: [0, 0, 0, 0],
                          },
                          {
                            text: [
                              {
                                text: 'Teléfono: ',
                                style: 'fecha',
                                bold: false,
                              },
                              {
                                text: trabajador.telefono
                                  ? `${trabajador.telefono}`
                                  : 'No Disponible',
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
                    margin: [10, 0, 10, 5] as [number, number, number, number],
                  },
                  // Datos del trabajador - descripción
                  {
                    text: [
                      { text: `Se trata de ` },
                      {
                        text:
                          trabajador.sexo === 'Masculino'
                            ? 'un trabajador'
                            : 'una trabajadora',
                        bold: true,
                      },
                      { text: ` de ` },
                      { text: ` ${trabajador.edad} `, bold: true },
                      { text: ` de edad, que labora en la empresa ` },
                      { text: `${nombreEmpresa}`, bold: true },
                      { text: `, ocupando el puesto de ` },
                      { text: `${trabajador.puesto}`, bold: true },
                      { text: `, con escolaridad ` },
                      { text: `${trabajador.escolaridad}`, bold: true },
                      ...(trabajador.antiguedad && trabajador.antiguedad !== '-'
                        ? [
                            { text: ` y una antigüedad de ` },
                            { text: `${trabajador.antiguedad}`, bold: true },
                          ]
                        : []),
                      { text: `. Estado civil: ` },
                      { text: `${trabajador.estadoCivil}`, bold: true },
                      ...(trabajador.numeroEmpleado &&
                      trabajador.numeroEmpleado.trim() !== ''
                        ? [
                            { text: `, número de empleado: ` },
                            {
                              text: `${trabajador.numeroEmpleado}`,
                              bold: true,
                            },
                          ]
                        : []),
                    ],
                    margin: [10, 0, 10, 8] as [number, number, number, number],
                    style: 'paragraph',
                  },
                ],
                fillColor: '#FFFFFF',
                margin: [0, 0, 0, 0] as [number, number, number, number],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: (i, node) => {
            // Solo bordes superior e inferior de la tabla completa
            if (i === 0 || i === node.table.body.length) return 0.15;
            return 0; // Sin bordes internos horizontales
          },
          vLineWidth: () => 0.15, // Bordes laterales
          hLineColor: () => '#E5E7EB', // Gris muy claro
          vLineColor: () => '#E5E7EB',
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 10, 0, 10] as [number, number, number, number],
      },

      // Sección: Información de la aclaración
      {
        style: 'table',
        table: {
          widths: ['100%'],
          body: [
            [
              {
                stack: [
                  {
                    text: 'INFORMACIÓN DE LA ACLARACIÓN',
                    style: 'sectionHeader',
                    fillColor: '#E9ECEF',
                    margin: [10, 8, 10, 8] as [number, number, number, number],
                  },
                  // Alcance e Impacto destacados (alineados a la izquierda)
                  {
                    columns: [
                      // Alcance de aclaración
                      notaAclaratoria.alcanceAclaracion
                        ? {
                            stack: [
                              {
                                text: [
                                  {
                                    text: 'Alcance: ',
                                    bold: true,
                                    fontSize: 11,
                                  },
                                  {
                                    text: notaAclaratoria.alcanceAclaracion.toUpperCase(),
                                    bold: true,
                                    fontSize: 11,
                                    color: '#0056B3',
                                  },
                                ],
                                fillColor: '#E3F2FD',
                                border: [true, true, true, true] as [
                                  boolean,
                                  boolean,
                                  boolean,
                                  boolean,
                                ],
                                borderColor: '#2196F3',
                                alignment: 'left' as const,
                                margin: [5, 5, 5, 5] as [
                                  number,
                                  number,
                                  number,
                                  number,
                                ],
                              },
                            ],
                            width: 'auto' as const,
                          }
                        : null,
                      { text: '', width: 10 },
                      // Impacto clínico
                      notaAclaratoria.impactoClinico
                        ? {
                            stack: [
                              {
                                text: [
                                  {
                                    text: 'Impacto: ',
                                    bold: true,
                                    fontSize: 11,
                                  },
                                  {
                                    text: notaAclaratoria.impactoClinico.toUpperCase(),
                                    bold: true,
                                    fontSize: 11,
                                    color:
                                      notaAclaratoria.impactoClinico ===
                                        'ALTO' ||
                                      notaAclaratoria.impactoClinico ===
                                        'SEVERO'
                                        ? '#DC3545'
                                        : notaAclaratoria.impactoClinico ===
                                            'MODERADO'
                                          ? '#FFC107'
                                          : notaAclaratoria.impactoClinico ===
                                                'BAJO' ||
                                              notaAclaratoria.impactoClinico ===
                                                'LEVE'
                                            ? '#28A745'
                                            : '#6C757D',
                                  },
                                ],
                                fillColor:
                                  notaAclaratoria.impactoClinico === 'ALTO' ||
                                  notaAclaratoria.impactoClinico === 'SEVERO'
                                    ? '#FFEBEE'
                                    : notaAclaratoria.impactoClinico ===
                                        'MODERADO'
                                      ? '#FFF8E1'
                                      : notaAclaratoria.impactoClinico ===
                                            'BAJO' ||
                                          notaAclaratoria.impactoClinico ===
                                            'LEVE'
                                        ? '#E8F5E9'
                                        : '#F5F5F5',
                                border: [true, true, true, true] as [
                                  boolean,
                                  boolean,
                                  boolean,
                                  boolean,
                                ],
                                borderColor:
                                  notaAclaratoria.impactoClinico === 'ALTO' ||
                                  notaAclaratoria.impactoClinico === 'SEVERO'
                                    ? '#DC3545'
                                    : notaAclaratoria.impactoClinico ===
                                        'MODERADO'
                                      ? '#FFC107'
                                      : notaAclaratoria.impactoClinico ===
                                            'BAJO' ||
                                          notaAclaratoria.impactoClinico ===
                                            'LEVE'
                                        ? '#28A745'
                                        : '#9E9E9E',
                                alignment: 'left' as const,
                                margin: [5, 5, 5, 5] as [
                                  number,
                                  number,
                                  number,
                                  number,
                                ],
                              },
                            ],
                            width: 'auto' as const,
                          }
                        : null,
                    ].filter((item) => item !== null) as Content[],
                    margin: [10, 0, 10, 10] as [number, number, number, number],
                  },
                  // Motivo de aclaración
                  ...(notaAclaratoria.motivoAclaracion
                    ? [
                        {
                          stack: [
                            {
                              text: 'Motivo de aclaración:',
                              bold: true,
                              fontSize: 11,
                              margin: [0, 0, 0, 3] as [
                                number,
                                number,
                                number,
                                number,
                              ],
                            },
                            {
                              text: notaAclaratoria.motivoAclaracion,
                              fontSize: 11,
                              alignment: 'justify' as const,
                            },
                          ],
                          margin: [10, 0, 10, 10] as [
                            number,
                            number,
                            number,
                            number,
                          ],
                        },
                      ]
                    : []),
                  // Descripción de aclaración
                  ...(notaAclaratoria.descripcionAclaracion
                    ? [
                        {
                          stack: [
                            {
                              text: 'Descripción de la aclaración:',
                              bold: true,
                              fontSize: 11,
                              margin: [0, 0, 0, 3] as [
                                number,
                                number,
                                number,
                                number,
                              ],
                            },
                            {
                              text: notaAclaratoria.descripcionAclaracion,
                              fontSize: 11,
                              alignment: 'justify' as const,
                            },
                          ],
                          margin: [10, 0, 10, 8] as [
                            number,
                            number,
                            number,
                            number,
                          ],
                        },
                      ]
                    : []),
                ],
                fillColor: '#FFFFFF',
                margin: [0, 0, 0, 0] as [number, number, number, number],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: (i, node) => {
            // Solo bordes superior e inferior de la tabla completa
            if (i === 0 || i === node.table.body.length) return 0.15;
            return 0; // Sin bordes internos horizontales
          },
          vLineWidth: () => 0.15, // Bordes laterales
          hLineColor: () => '#E5E7EB', // Gris muy claro
          vLineColor: () => '#E5E7EB',
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 10, 0, 10] as [number, number, number, number],
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
                          text: `${formatearTituloYNombreFirmante(firmanteActivo)}\n`,
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
                              ? 'Enfermera responsable de la nota\n'
                              : 'Enfermero responsable de la nota\n',
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
