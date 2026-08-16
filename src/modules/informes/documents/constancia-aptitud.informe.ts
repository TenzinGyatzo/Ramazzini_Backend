import type {
  Content,
  StyleDictionary,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';
import { FooterFirmantesData } from '../interfaces/firmante-data.interface';
import { generarFooterFirmantes } from '../helpers/footer-firmantes.helper';
import { formatearNombreTrabajador, formatearTituloYNombreFirmante, formatearTituloYNombreFirmanteConFallback } from '../../../utils/names';
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
  tituloCertificado: {
    fontSize: 28,
    bold: true,
    alignment: 'center',
    margin: [0, 10, 0, 0],
    lineHeight: 1,
  },
  subtituloCertificado: {
    fontSize: 40,
    bold: true,
    alignment: 'center',
    margin: [0, 0, 0, 10],
    lineHeight: 1,
  },
  divisor: {
    fontSize: 1,
    margin: [0, 10, 0, 15],
  },
  nombreEmpleado: {
    fontSize: 22,
    bold: true,
    alignment: 'center',
    margin: [0, 0, 0, 15],
    lineHeight: 1,
  },
  textoDescriptivo: {
    fontSize: 16,
    alignment: 'center',
    margin: [40, 0, 40, 25],
    lineHeight: 1.15,
  },
  fechaEmision: {
    fontSize: 13,
    margin: [0, 0, 0, 0],
    alignment: 'center',
  },
  firmaLabel: {
    fontSize: 10,
    margin: [0, 0, 0, 0],
    alignment: 'center',
  },
  nombreEmisor: {
    fontSize: 12,
    bold: true,
    margin: [0, 0, 0, 0],
    alignment: 'center',
  },
  cargoEmisor: {
    fontSize: 10,
    margin: [0, 0, 0, 0],
    alignment: 'center',
  },
  credencialMedico: {
    fontSize: 9,
    margin: [0, 0, 0, 0],
    alignment: 'center',
  },
};

// ==================== FUNCIONES REUSABLES ====================
function formatearFechaUTC(fecha: Date): string {
  if (!fecha || isNaN(fecha.getTime())) return '';

  const dia = String(fecha.getUTCDate()).padStart(2, '0');
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  const año = fecha.getUTCFullYear();

  return `${dia}-${mes}-${año}`;
}

function formatearFechaInstitucional(fecha: Date): string {
  if (!fecha || isNaN(fecha.getTime())) return '';

  const meses = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];

  const dia = fecha.getUTCDate();
  const mes = meses[fecha.getUTCMonth()];
  const año = fecha.getUTCFullYear();

  return `${dia} de ${mes} de ${año}`;
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
  nss?: string;
  curp?: string;
}

interface ConstanciaAptitud {
  fechaConstanciaAptitud: Date;
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
  semaforizacionActivada: boolean;
}

// ==================== INFORME PRINCIPAL ====================
export const constanciaAptitudInforme = (
  nombreEmpresa: string,
  trabajador: Trabajador,
  constanciaAptitud: ConstanciaAptitud,
  medicoFirmante: MedicoFirmanteInforme,
  proveedorSalud: ProveedorSalud,
  footerFirmantesData?: FooterFirmantesData,
): TDocumentDefinitions => {
  const updatedStyles: StyleDictionary = { ...styles };

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
    ? { image: `assets/signatories/${firmanteActivo.firma.data}`, width: 95 }
    : { text: '' };

  const logoImage = proveedorSalud.logotipoEmpresa?.data
    ? `assets/providers-logos/${proveedorSalud.logotipoEmpresa.data}`
    : 'assets/RamazziniBrand600x600.png';

  // Determinar el cargo del emisor
  const cargoEmisor =
    firmanteActivo.especialistaSaludTrabajo === 'Si'
      ? 'Médico del Trabajo'
      : 'Médico Responsable de Evaluación';

  return {
    pageSize: 'LETTER',
    pageMargins: [40, 70, 40, 80],
    content: [
      // Título de la constancia
      {
        text: 'CONSTANCIA DE',
        style: 'tituloCertificado',
      },
      {
        text: 'APTITUD LABORAL',
        style: 'subtituloCertificado',
      },
      // Línea divisoria debajo del título
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: 400,
            y2: 0,
            lineWidth: 0.5,
            lineColor: '#000000',
          },
        ],
        alignment: 'center',
        margin: [0, 0, 0, 15],
      },
      // Nombre del empleado
      {
        text: formatearNombreTrabajador(trabajador),
        style: 'nombreEmpleado',
      },
      // Párrafo descriptivo (texto mejorado)
      {
        text: 'Ha demostrado contar con las habilidades y competencias necesarias para desempeñar adecuadamente las funciones y responsabilidades inherentes al puesto de trabajo.',
        style: 'textoDescriptivo',
      },
      // Fecha de emisión (formato institucional)
      {
        text: `Fecha de emisión: ${formatearFechaInstitucional(constanciaAptitud.fechaConstanciaAptitud)}`,
        style: 'fechaEmision',
        margin: [0, 15, 0, 0],
      },
      // Línea divisoria antes de la firma
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: 400,
            y2: 0,
            lineWidth: 0.5,
            lineColor: '#000000',
          },
        ],
        alignment: 'center',
        margin: [0, 30, 0, 0],
      },
      // Firma a la izquierda y logo a la derecha (centrados verticalmente)
      {
        table: {
          widths: [80, '*', 40, 'auto', 80],
          body: [
            [
              { text: '', border: [false, false, false, false] }, // Espaciador izquierdo
              {
                stack: [
                  ...(firmanteActivo.firma?.data
                    ? [
                        {
                          ...firma,
                          alignment: 'center' as const,
                        },
                      ]
                    : []),
                  {
                    text: formatearTituloYNombreFirmanteConFallback(firmanteActivo, 'Nombre del Emisor', proveedorSalud.regimenRegulatorio),
                    style: 'nombreEmisor',
                    alignment: 'center' as const,
                    margin: [0, 5, 0, 0] as [number, number, number, number],
                  },
                  {
                    text: cargoEmisor,
                    style: 'cargoEmisor',
                    alignment: 'center' as const,
                    margin: [0, 0, 0, 0] as [number, number, number, number],
                  },
                  ...(firmanteActivo.numeroCedulaProfesional
                    ? [
                        {
                          text:
                            proveedorSalud.pais === 'MX'
                              ? `Cédula profesional No. ${firmanteActivo.numeroCedulaProfesional}.`
                              : proveedorSalud.pais === 'GT'
                                ? `Colegiado Activo No. ${firmanteActivo.numeroCedulaProfesional}.`
                                : `Registro Profesional No. ${firmanteActivo.numeroCedulaProfesional}.`,
                          style: 'credencialMedico',
                          alignment: 'center' as const,
                          margin: [0, 0, 0, 0] as [
                            number,
                            number,
                            number,
                            number,
                          ],
                        },
                      ]
                    : []),
                  ...(firmanteActivo.nombreCredencialAdicional &&
                  firmanteActivo.numeroCredencialAdicional
                    ? [
                        {
                          text:
                            proveedorSalud.pais === 'GT'
                              ? `Registro ${firmanteActivo.nombreCredencialAdicional} No. ${firmanteActivo.numeroCredencialAdicional}.`
                              : `${firmanteActivo.nombreCredencialAdicional} No. ${firmanteActivo.numeroCredencialAdicional}.`,
                          style: 'credencialMedico',
                          alignment: 'center' as const,
                          margin: [0, 0, 0, 0] as [
                            number,
                            number,
                            number,
                            number,
                          ],
                        },
                      ]
                    : []),
                ],
                border: [false, false, false, false],
                valign: 'top',
              },
              { text: '', border: [false, false, false, false] }, // Espaciador central
              {
                image: logoImage,
                width: 120,
                alignment: 'center' as const,
                border: [false, false, false, false],
                valign: 'middle',
              },
              { text: '', border: [false, false, false, false] }, // Espaciador derecho
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 20, 0, 0] as [number, number, number, number],
      },
    ],
    // Pie de pagina (más limpio)
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
              lineColor: '#777777',
            },
          ],
          margin: [0, 0, 0, 8],
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
                  .filter((item) => item)
                  .join(', ') +
                '.' +
                (proveedorSalud.telefono
                  ? ` Tel. ${formatearTelefono(proveedorSalud.telefono)}`
                  : ''),
              bold: false,
              color: '#777777',
            },
            proveedorSalud.sitioWeb
              ? {
                  text: `\n${proveedorSalud.sitioWeb}`,
                  bold: false,
                  link: `https://${proveedorSalud.sitioWeb}`,
                  color: '#777777',
                }
              : null,
          ].filter((item) => item !== null),
          alignment: 'center',
          fontSize: 7,
          margin: [0, 0, 0, 0],
        },
      ],
    },
    // Estilos
    styles: updatedStyles,
  };
};
