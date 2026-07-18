import type {
  Content,
  StyleDictionary,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';
import { FooterFirmantesData } from '../interfaces/firmante-data.interface';
import { generarFooterFirmantes } from '../helpers/footer-firmantes.helper';
import { formatearNombreTrabajador, formatearTituloYNombreFirmante, formatearTituloYNombreFirmanteConFallback } from '../../../utils/names';
import { EnfermeraFirmanteInforme, MedicoFirmanteInforme } from '../types/firmante-informe.types';
import { firmanteTieneLineaNombre, resolverFirmanteMedicoEnfermera } from '../helpers/firmante-informe.helpers';

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
  sectionContent: {
    fontSize: 12,
    lineHeight: 1.35,
  },
};

// ==================== CONTENIDO ====================
const headerText: Content = {
  text: '                                                                                                      RECETA MÉDICA\n',
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

function construirSignosVitales(notaMedica): Content {
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
    notaMedica.tensionArterialSistolica && notaMedica.tensionArterialDiastolica
      ? `${notaMedica.tensionArterialSistolica}/${notaMedica.tensionArterialDiastolica}`
      : null,
    ' mmHg',
  );
  agregarDato('FC', notaMedica.frecuenciaCardiaca, ' lpm');
  agregarDato('FR', notaMedica.frecuenciaRespiratoria, ' lpm');
  agregarDato('Temp', notaMedica.temperatura, ' °C');
  agregarDato('SatO2', notaMedica.saturacionOxigeno, '%');

  return {
    text: [{ text: 'Signos Vitales: ', bold: true }, ...signosVitales],
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
  telefono: string;
  estadoCivil: string;
  numeroEmpleado: string;
}

interface Receta {
  fechaReceta: Date;
  tratamiento: string[];
  recomendaciones: string[] | string;
  indicaciones: string;
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
export const recetaInforme = (
  nombreEmpresa: string,
  trabajador: Trabajador,
  receta: Receta,
  medicoFirmante: MedicoFirmanteInforme | null,
  enfermeraFirmante: EnfermeraFirmanteInforme | null,
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

  const firmaFilename = footerFirmantesData?.esDocumentoFinalizado
    ? footerFirmantesData?.finalizador?.firma?.data
    : firmanteActivo?.firma?.data;
  const firma: Content = firmaFilename
    ? {
        image: `assets/signatories/${firmaFilename}`,
        width: 80,
        alignment: 'center' as const,
        margin: [0, 10, 0, 0] as [number, number, number, number],
      }
    : { text: '' };

  const universidadFirmante =
    usarMedico && medicoFirmante?.universidad?.trim()
      ? medicoFirmante.universidad.trim()
      : undefined;

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
      // Fecha
      {
        style: 'table',
        table: {
          widths: ['100%'],
          body: [
            [
              {
                text: [
                  { text: 'Fecha: ', style: 'fecha', bold: false },
                  {
                    text: formatearFechaUTC(receta.fechaReceta),
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
                  { text: 'CEL: ', style: 'fecha', bold: false },
                  {
                    text: trabajador.telefono
                      ? `${trabajador.telefono}`
                      : 'No disponible',
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

      // Tratamiento
      receta.tratamiento && receta.tratamiento.length > 0
        ? {
            text: [
              { text: `Tratamiento:`, bold: true },
              ...receta.tratamiento.flatMap((item, index) => [
                { text: `\n     ${index + 1}. `, preserveLeadingSpaces: true }, // Espacios antes del número
                { text: item, bold: true },
              ]), // 🔹 Se usa `flatMap` para evitar la anidación de arrays
            ],
            margin: [0, 12, 0, 18] as [number, number, number, number],
            style: 'sectionContent',
          }
        : undefined, // 🔹 Se usa `undefined` en lugar de `null`

      // Recomendaciones
      Array.isArray(receta.recomendaciones) && receta.recomendaciones.length > 0
        ? {
            text: [
              { text: `Recomendaciones:`, bold: true }, // Solo la etiqueta en negrita
              ...receta.recomendaciones.flatMap((item, index) => [
                {
                  text: `\n     ${String.fromCharCode(97 + index)}. `,
                  preserveLeadingSpaces: true,
                }, // Letra en lugar de número
                { text: item }, // Texto normal, sin negrita
              ]), // 🔹 `flatMap` evita arrays anidados
            ],
            margin: [0, 0, 0, 18] as [number, number, number, number], // Mantiene formato correcto
            style: 'sectionContent',
          }
        : typeof receta.recomendaciones === 'string' &&
            receta.recomendaciones.trim().length > 0
          ? {
              text: [
                { text: `Recomendaciones:`, bold: true },
                { text: ` ${receta.recomendaciones}` },
              ],
              margin: [0, 0, 0, 18] as [number, number, number, number],
              style: 'sectionContent',
            }
          : undefined, // 🔹 Se usa `undefined` en lugar de `null`

      // Observaciones
      receta.indicaciones
        ? {
            text: [
              { text: `Indicaciones:`, bold: true },
              { text: ` ${receta.indicaciones} ` },
            ],
            margin: [0, 0, 0, 22] as [number, number, number, number],
            style: 'sectionContent',
          }
        : undefined,

      ...(firmanteActivo
        ? [
            {
              text: 'ATENTAMENTE',
              fontSize: 12,
              bold: false,
              alignment: 'center' as const,
              characterSpacing: 1,
              margin: [0, 24, 0, 6] as [number, number, number, number],
            },
            firma,
            {
              text:
                firmanteActivo ? formatearTituloYNombreFirmante(firmanteActivo) : '',
              fontSize: 12,
              bold: true,
              alignment: 'center' as const,
              margin: [0, 8, 0, 0] as [number, number, number, number],
            },
            ...(universidadFirmante
              ? [
                  {
                    text: `${universidadFirmante}`,
                    fontSize: 10,
                    alignment: 'center' as const,
                    margin: [0, 2, 0, 0] as [number, number, number, number],
                  },
                ]
              : []),
            ...(firmanteActivo?.numeroCedulaProfesional
              ? [
                  {
                    text:
                      proveedorSalud.pais === 'MX'
                        ? `Cédula profesional No. ${firmanteActivo.numeroCedulaProfesional}.`
                        : proveedorSalud.pais === 'GT'
                          ? `Colegiado Activo No. ${firmanteActivo.numeroCedulaProfesional}.`
                          : `Registro Profesional No. ${firmanteActivo.numeroCedulaProfesional}.`,
                    fontSize: 10,
                    alignment: 'center' as const,
                    margin: [0, 0, 0, 0] as [number, number, number, number],
                  },
                ]
              : []),
            ...(firmanteActivo?.nombreCredencialAdicional &&
            firmanteActivo?.numeroCredencialAdicional
              ? [
                  {
                    text: `${firmanteActivo.nombreCredencialAdicional} No. ${firmanteActivo.numeroCredencialAdicional}.`,
                    fontSize: 10,
                    alignment: 'center' as const,
                    margin: [0, 0, 0, 0] as [number, number, number, number],
                  },
                ]
              : []),
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
              y1: 0.5,
              x2: 575,
              y2: 0.5,
              lineWidth: 0.5,
              lineColor: '#FF0000',
            },
          ],
          margin: [0, 0, 0, 5] as [number, number, number, number],
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
                (proveedorSalud.telefono
                  ? `. Tel. ${formatearTelefono(proveedorSalud.telefono)}`
                  : ''),
              italics: true,
            },
            proveedorSalud.sitioWeb
              ? {
                  text: `\n${proveedorSalud.sitioWeb}`,
                  link: `https://${proveedorSalud.sitioWeb}`,
                  italics: true,
                  color: 'blue',
                }
              : null,
          ].filter((item) => item !== null),
          alignment: 'center' as const,
          fontSize: 8,
          margin: [0, 0, 0, 0] as [number, number, number, number],
        },
      ],
    },
    // Estilos
    styles: styles,
  };
};
