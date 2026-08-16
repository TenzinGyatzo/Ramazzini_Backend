import type {
  Content,
  StyleDictionary,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';
import { FooterFirmantesData } from '../interfaces/firmante-data.interface';
import { generarFooterFirmantes } from '../helpers/footer-firmantes.helper';
import { formatearNombreTrabajadorCertificado, formatearTituloYNombreFirmante, formatearTituloYNombreFirmanteConFallback } from '../../../utils/names';
import { MedicoFirmanteInforme } from '../types/firmante-informe.types';

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
  paragraph: { fontSize: 11, alignment: 'justify' },
};

// ==================== CONTENIDO ====================
const headerText: Content = {
  text: '                                                                                              CERTIFICADO MÉDICO\n',
  style: 'header',
  alignment: 'right',
  margin: [0, 35, 40, 0],
};

const campoFirma: Content = {
  stack: [
    // Línea horizontal para la firma
    {
      canvas: [
        {
          type: 'line',
          x1: 120,
          y1: 0,
          x2: 380,
          y2: 0,
          lineWidth: 1,
          lineColor: '#000000',
        },
      ],
      margin: [0, 10, 0, 0],
    },
    // Nombre y credenciales del médico
    {
      text: [
        {
          text: 'DR. JESÚS MANUEL CORONEL VALENZUELA\n',
          bold: true,
          fontSize: 12,
        },
        { text: 'CED PROF MEDICINA CIRUJANO No. 1379978\n', fontSize: 9 },
        {
          text: 'CED ESPECIALIDAD MEDICINA DEL TRABAJO No. 3181172\n',
          fontSize: 9,
        },
        {
          text: 'CERTIFICADO CONSEJO MEXICANO DE MED TRAB No. 891',
          fontSize: 9,
        },
      ],
      alignment: 'center',
      margin: [0, 0, 0, 0],
    },
  ],
  absolutePosition: { x: 65, y: 610 },
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

function construirSignosVitales(certificado): Content {
  const signosVitales = [];

  const agregarDato = (etiqueta, valor, unidad) => {
    if (valor !== undefined && valor !== null && valor !== '') {
      if (signosVitales.length > 0) {
        signosVitales.push({ text: '  |  ' }); // Agrega el separador solo si ya hay datos previos
      }
      signosVitales.push({ text: ` ${etiqueta}: `, bold: true });
      signosVitales.push({ text: `${valor}${unidad}` });
    }
  };

  agregarDato(
    'TA',
    certificado.tensionArterialSistolica &&
      certificado.tensionArterialDiastolica
      ? `${certificado.tensionArterialSistolica}/${certificado.tensionArterialDiastolica}`
      : null,
    ' mmHg',
  );
  agregarDato('FC', certificado.frecuenciaCardiaca, ' lpm');
  agregarDato('FR', certificado.frecuenciaRespiratoria, ' lpm');
  agregarDato('Temp', certificado.temperaturaCorporal, ' °C');
  agregarDato('Peso', certificado.peso, ' kg');
  agregarDato('Altura', certificado.altura, ' cm');
  agregarDato('IMC', certificado.indiceMasaCorporal, '');

  return {
    text: [{ text: 'SV: ', bold: true }, ...signosVitales],
    margin: [0, 0, 0, 10],
    style: 'paragraph',
  };
}

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

interface CertificadoExpedito {
  fechaCertificadoExpedito: Date;
  cuerpoCertificado: string;
  impedimentosFisicos: string;
  peso: number;
  altura: number;
  indiceMasaCorporal: number;
  tensionArterialSistolica: number;
  tensionArterialDiastolica: number;
  frecuenciaCardiaca: number;
  frecuenciaRespiratoria: number;
  temperaturaCorporal: number;
  gradoSalud: string;
  aptitudPuesto: string;
  descripcionSobreAptitud: string;
  observaciones: string;
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
}

// ==================== INFORME PRINCIPAL ====================
export const certificadoExpeditoInforme = (
  nombreEmpresa: string,
  trabajador: Trabajador,
  certificado: CertificadoExpedito,
  medicoFirmante: MedicoFirmanteInforme,
  proveedorSalud: ProveedorSalud,
  footerFirmantesData?: FooterFirmantesData,
): TDocumentDefinitions => {
  // Determinar qué firmante usar (finalizador si es documento finalizado, sino el original)
  const firmanteActivo =
    footerFirmantesData?.esDocumentoFinalizado &&
    footerFirmantesData.finalizador
      ? {
          tituloProfesional: footerFirmantesData.finalizador.tituloProfesional,
          nombre: footerFirmantesData.finalizador.nombre,
          primerApellido: footerFirmantesData.finalizador.primerApellido,
          segundoApellido: footerFirmantesData.finalizador.segundoApellido,
          numeroCedulaProfesional:
            footerFirmantesData.finalizador.numeroCedulaProfesional || '',
          especialistaSaludTrabajo:
            footerFirmantesData.finalizador.especialistaSaludTrabajo || '',
          numeroCedulaEspecialista:
            footerFirmantesData.finalizador.numeroCedulaEspecialista || '',
          nombreCredencialAdicional:
            footerFirmantesData.finalizador.nombreCredencialAdicional || '',
          numeroCredencialAdicional:
            footerFirmantesData.finalizador.numeroCredencialAdicional || '',
          firma: footerFirmantesData.finalizador.firma,
        }
      : medicoFirmante;

  const firma: Content = firmanteActivo.firma?.data
    ? {
        image: `assets/signatories/${firmanteActivo.firma.data}`,
        width: 100,
        absolutePosition: {
          x: 260,
          y: (() => {
            const observacionesExiste =
              certificado.observaciones !== undefined &&
              certificado.observaciones !== null &&
              certificado.observaciones !== '';

            if (firmanteActivo.especialistaSaludTrabajo === 'Si') {
              return observacionesExiste ? 605 : 595; // Escenario 1 o 2
            } else {
              return observacionesExiste ? 595 : 585; // Escenario 3 o 4
            }
          })(),
        },
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
    pageMargins: [40, 70, 40, 60],
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
                      certificado.fechaCertificadoExpedito,
                    ),
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
      // Información del médico
      {
        text:
          footerFirmantesData?.esDocumentoFinalizado &&
          footerFirmantesData.elaborador &&
          footerFirmantesData.finalizador
            ? generarFooterFirmantes(footerFirmantesData, proveedorSalud)
            : [
                {
                  text:
                    proveedorSalud.pais === 'MX'
                      ? firmanteActivo.tituloProfesional === 'Dra.'
                        ? 'La suscrita Médica Cirujano, con cédula profesional número '
                        : 'El suscrito Médico Cirujano, con cédula profesional número '
                      : proveedorSalud.pais === 'GT'
                        ? firmanteActivo.tituloProfesional === 'Dra.'
                          ? 'La suscrita Médica Cirujano, con colegiado activo número '
                          : 'El suscrito Médico Cirujano, con colegiado activo número '
                        : firmanteActivo.tituloProfesional === 'Dra.'
                          ? 'La suscrita Médica Cirujano, con registro profesional número '
                          : 'El suscrito Médico Cirujano, con registro profesional número ',
                },
                {
                  text: `${firmanteActivo.numeroCedulaProfesional}. `,
                  bold: true,
                },
                firmanteActivo.especialistaSaludTrabajo === 'Si'
                  ? { text: 'Especialista en Medicina del Trabajo, ' }
                  : {
                      text: 'Con formación en Medicina y dedicado a la práctica en el ámbito de la salud laboral, ',
                    },

                {
                  text: `${formatearTituloYNombreFirmante(firmanteActivo, proveedorSalud.regimenRegulatorio)}${firmanteActivo.especialistaSaludTrabajo === 'Si' ? '' : '.'}`,
                  bold: true,
                },

                firmanteActivo.especialistaSaludTrabajo === 'Si'
                  ? {
                      text:
                        proveedorSalud.pais === 'MX'
                          ? `, legalmente ${firmanteActivo.tituloProfesional === 'Dr.' ? 'autorizado' : 'autorizada'} por la Dirección General de Profesiones para ejercer la Especialidad en Medicina del Trabajo con cédula profesional número `
                          : `, legalmente ${firmanteActivo.tituloProfesional === 'Dr.' ? 'autorizado' : 'autorizada'} para ejercer la Especialidad en Medicina del Trabajo con registro de especialidad número `,
                    }
                  : null,

                firmanteActivo.especialistaSaludTrabajo === 'Si'
                  ? {
                      text: `${firmanteActivo.numeroCedulaEspecialista}. `,
                      bold: true,
                    }
                  : null,

                firmanteActivo.nombreCredencialAdicional
                  ? {
                      text: ` ${firmanteActivo.nombreCredencialAdicional} con número `,
                    }
                  : null,

                firmanteActivo.nombreCredencialAdicional
                  ? {
                      text: `${firmanteActivo.numeroCredencialAdicional}. `,
                      bold: true,
                    }
                  : null,
              ].filter((item) => item !== null), // Filtra elementos nulos
        style: 'paragraph',
        margin: [0, 20, 0, 0],
      },
      // Certificación
      {
        text: 'CERTIFICA',
        fontSize: 32,
        bold: false,
        alignment: 'center',
        characterSpacing: 5,
        margin: [0, 20, 0, 0],
      },
      {
        text: [
          {
            text:
              proveedorSalud.pais === 'GT'
                ? `Que, habiendo practicado reconocimiento médico en esta fecha, ${trabajador.sexo === 'Femenino' ? 'a la' : 'a'} `
                : `Que, habiendo practicado reconocimiento médico en esta fecha, ${trabajador.sexo === 'Femenino' ? 'a la' : 'al'} C. `,
          },
          {
            text: formatearNombreTrabajadorCertificado(
              trabajador,
            ).toUpperCase(),
            bold: true,
          },
          { text: ' de ' },
          { text: String(trabajador.edad), bold: true },
          { text: ' años de edad. Concluyo que:' },
        ],
        style: 'paragraph',
        margin: [0, 20, 0, 10],
      },

      {
        text: [
          { text: `${certificado.cuerpoCertificado}.`, bold: true },
          { text: ' \n', bold: true },
        ],
        style: 'paragraph',
        margin: [0, 0, 0, 10],
      },

      // Signos Vitales
      construirSignosVitales(certificado),

      {
        text: [
          {
            text:
              proveedorSalud.pais === 'GT'
                ? trabajador.sexo === 'Femenino'
                  ? 'Por lo anterior se establece que la '
                  : 'Por lo anterior se establece que el '
                : trabajador.sexo === 'Femenino'
                  ? 'Por lo anterior se establece que la C. '
                  : 'Por lo anterior se establece que el C. ',
          },
          {
            text: formatearNombreTrabajadorCertificado(
              trabajador,
            ).toUpperCase(),
            bold: true,
          },
          { text: ' ' },
          {
            text: certificado.impedimentosFisicos,
          },
          {
            text: ` y se encuentra actualmente en ${
              certificado.gradoSalud === 'Bueno'
                ? 'BUEN'
                : certificado.gradoSalud === 'Malo'
                  ? 'MAL'
                  : String(certificado.gradoSalud).toUpperCase()
            } estado de salud. \n`,
          },
        ],
        style: 'paragraph',
        margin: [0, 0, 0, 10],
      },

      // Aptitud Puesto
      {
        text: [
          {
            text:
              certificado.descripcionSobreAptitud !== undefined &&
              certificado.descripcionSobreAptitud !== null &&
              certificado.descripcionSobreAptitud !== ''
                ? `${certificado.aptitudPuesto.toUpperCase()}. ${certificado.descripcionSobreAptitud} \n`
                : `${certificado.aptitudPuesto.toUpperCase()}.\n`,
          },
        ],
        bold: true,
        style: 'paragraph',
        margin: [0, 0, 0, 10],
      },

      // Observaciones
      {
        text: [
          ...(certificado.observaciones !== undefined &&
          certificado.observaciones !== null &&
          certificado.observaciones !== ''
            ? [
                {
                  text: `${certificado.observaciones.toUpperCase()}. \n`,
                  bold: true,
                },
              ]
            : []),
        ],
        style: 'paragraph',
        bold: true,
        margin:
          certificado.observaciones !== undefined &&
          certificado.observaciones !== null &&
          certificado.observaciones !== ''
            ? [0, 0, 0, 10]
            : 0,
      },

      {
        text: [
          {
            text:
              proveedorSalud.pais === 'GT'
                ? `Expido el presente certificado médico a petición de ${trabajador.sexo === 'Femenino' ? 'la' : 'el'} `
                : trabajador.sexo === 'Femenino'
                  ? 'Expido el presente certificado médico a petición de la C. '
                  : 'Expido el presente certificado médico a petición de el C. ',
          },
          {
            text: formatearNombreTrabajadorCertificado(
              trabajador,
            ).toUpperCase(),
            bold: true,
          },
          {
            text:
              proveedorSalud.pais === 'GT'
                ? ` para fines de prevención y detección oportuna de padecimientos que pudieran afectar la salud del trabajador y su rendimiento laboral, en el municipio de ${proveedorSalud.municipio}, ${proveedorSalud.estado}, el ${formatearFechaUTC(certificado.fechaCertificadoExpedito)}.`
                : ` para fines de prevención y detección oportuna de padecimientos que pudieran afectar la salud del trabajador y su rendimiento laboral, en el municipio de ${proveedorSalud.municipio}, ${proveedorSalud.estado}, en la fecha mencionada al inicio de este certificado.`,
          },
        ],
        style: 'paragraph',
        margin: [0, 0, 0, 10],
      },
      // Firma del médico
      {
        text: 'ATENTAMENTE',
        fontSize: 12,
        bold: false,
        alignment: 'center',
        characterSpacing: 1,
        margin: [0, 10, 0, 0],
      },
      {
        text: `${formatearTituloYNombreFirmante(firmanteActivo, proveedorSalud.regimenRegulatorio)}`,
        fontSize: 12,
        bold: false,
        alignment: 'center',
        margin: [0, 0, 0, 0],
      },
      firma,
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
          text: [
            {
              text:
                [
                  proveedorSalud.direccion,
                  proveedorSalud.municipio,
                  proveedorSalud.estado,
                ]
                  .filter((item) => item) // Elimina valores faltantes
                  .join(', ') +
                '.' +
                (proveedorSalud.telefono
                  ? ` Tel. ${formatearTelefono(proveedorSalud.telefono)}`
                  : ''), // Aplica el formato al teléfono
              bold: false,
              italics: true,
            },
            proveedorSalud.sitioWeb
              ? {
                  text: `\n${proveedorSalud.sitioWeb}`,
                  bold: false,
                  link: `https://${proveedorSalud.sitioWeb}`,
                  italics: true,
                  color: 'blue',
                }
              : null,
          ].filter((item) => item !== null), // Filtra elementos nulos
          alignment: 'center',
          fontSize: 8,
          margin: [0, 0, 0, 0],
        },
      ],
    },
    // Estilos
    styles: styles,
  };
};
