import type {
  Content,
  StyleDictionary,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';
import { formatearNombreTrabajadorCertificado } from '../../../utils/names';
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
    fontSize: 11,
    alignment: 'right',
  },
  paragraph: { fontSize: 11, alignment: 'justify' },
};

function generarTextoExploracionFisica(
  exploracionFisica: ExploracionFisica,
): string {
  const campos = [
    'abdomen',
    'boca',
    'cadera',
    'cicatrices',
    'codos',
    'coordinacion',
    'craneoCara',
    'cuello',
    'equilibrio',
    'hombros',
    'inspeccionColumna',
    'lesionesPiel',
    'manos',
    'marcha',
    'movimientosColumna',
    'nariz',
    'reflejosOsteoTendinososInferiores',
    'reflejosOsteoTendinososSuperiores',
    'nevos',
    'oidos',
    'ojos',
    'rodillas',
    'sensibilidad',
    'tobillosPies',
    'torax',
  ];

  const formatearCampo = (campo: string) =>
    campo
      .replace(/([A-Z])/g, ' $1')
      .split(' ')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ')
      .trim();

  const hallazgos = campos
    .filter((campo) => {
      const valor = (exploracionFisica as any)[campo];
      return valor && valor.trim() !== 'Sin hallazgos';
    })
    .map((campo) => {
      const valor = (exploracionFisica as any)[campo];
      return `${formatearCampo(campo)}: ${valor}`;
    });

  if (hallazgos.length === 0) {
    return 'Exploración física sin alteraciones significativas. Se observó integridad funcional del aparato locomotor y del sistema nervioso, con marcha, coordinación, fuerza y reflejos dentro de parámetros normales.';
  } else {
    return `Hallazgos relevantes en la exploración física: ${hallazgos.join('; ')}.`;
  }
}

// ==================== FUNCIONES REUSABLES ====================
function formatearAgudezaVisual(
  valor: number | null | undefined,
  cegueraTotal: boolean | undefined,
): string {
  if (cegueraTotal) return 'Ceguera Total';
  if (valor == null) return 'NA';
  return `20/${valor}`;
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
  curp?: string;
}

interface Certificado {
  fechaCertificado: Date;
  impedimentosFisicos: string;
}

interface ExploracionFisica {
  fechaExploracionFisica: Date;
  peso?: number;
  altura?: number;
  indiceMasaCorporal?: number;
  categoriaIMC?: string;
  circunferenciaCintura?: number;
  categoriaCircunferenciaCintura?: string;
  tensionArterialSistolica?: number;
  tensionArterialDiastolica?: number;
  categoriaTensionArterial?: string;
  frecuenciaCardiaca?: number;
  categoriaFrecuenciaCardiaca?: string;
  frecuenciaRespiratoria?: number;
  categoriaFrecuenciaRespiratoria?: string;
  saturacionOxigeno?: number;
  categoriaSaturacionOxigeno?: string;
  craneoCara?: string;
  ojos?: string;
  oidos?: string;
  nariz?: string;
  boca?: string;
  cuello?: string;
  hombros?: string;
  codos?: string;
  manos?: string;
  reflejosOsteoTendinososSuperiores?: string;
  vascularESuperiores?: string;
  torax?: string;
  abdomen?: string;
  cadera?: string;
  rodillas?: string;
  tobillosPies?: string;
  reflejosOsteoTendinososInferiores?: string;
  vascularEInferiores?: string;
  inspeccionColumna?: string;
  movimientosColumna?: string;
  lesionesPiel?: string;
  cicatrices?: string;
  nevos?: string;
  coordinacion?: string;
  sensibilidad?: string;
  equilibrio?: string;
  marcha?: string;
  resumenExploracionFisica?: string;
}

function getCiegaOI(ev: ExamenVista | null): boolean {
  if (!ev) return false;
  return (
    (ev as any).ojoIzquierdoCegueraTotal ??
    (ev as any).ojoIzquierdoLejanaCegueraTotal ??
    (ev as any).ojoIzquierdoCercanaCegueraTotal ??
    false
  );
}
function getCiegaOD(ev: ExamenVista | null): boolean {
  if (!ev) return false;
  return (
    (ev as any).ojoDerechoCegueraTotal ??
    (ev as any).ojoDerechoLejanaCegueraTotal ??
    (ev as any).ojoDerechoCercanaCegueraTotal ??
    false
  );
}

interface ExamenVista {
  fechaExamenVista: Date;
  ojoIzquierdoCegueraTotal?: boolean;
  ojoDerechoCegueraTotal?: boolean;
  ojoIzquierdoLejanaCegueraTotal?: boolean;
  ojoDerechoLejanaCegueraTotal?: boolean;
  ojoIzquierdoLejanaSinCorreccion: number | null;
  ojoDerechoLejanaSinCorreccion: number | null;
  sinCorreccionLejanaInterpretacion: string;
  requiereLentesUsoGeneral: string;
  ojoIzquierdoCercanaSinCorreccion: number;
  ojoDerechoCercanaSinCorreccion: number;
  sinCorreccionCercanaInterpretacion: string;
  requiereLentesParaLectura: string;
  ojoIzquierdoLejanaConCorreccion?: number;
  ojoDerechoLejanaConCorreccion?: number;
  conCorreccionLejanaInterpretacion?: string;
  ojoIzquierdoCercanaConCorreccion?: number;
  ojoDerechoCercanaConCorreccion?: number;
  conCorreccionCercanaInterpretacion?: string;
  placasCorrectas: number;
  porcentajeIshihara: number;
  interpretacionIshihara: string;
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
}

// ==================== INFORME PRINCIPAL ====================
export const certificadoInforme = (
  nombreEmpresa: string,
  trabajador: Trabajador,
  certificado: Certificado,
  exploracionFisica: ExploracionFisica | null,
  examenVista: ExamenVista | null,
  medicoFirmante: MedicoFirmante,
  proveedorSalud: ProveedorSalud,
  footerFirmantesData?: FooterFirmantesData,
): TDocumentDefinitions => {
  const identificadorLabel =
    proveedorSalud.pais === 'MX'
      ? 'CURP'
      : proveedorSalud.pais === 'PA'
        ? 'Cédula de Identidad Personal'
        : proveedorSalud.pais === 'GT'
          ? 'Documento Personal de Identificación'
          : 'Número de Identificación Personal';

  // Determinar qué firmante usar (finalizador si es documento finalizado, sino el original)
  const firmanteActivo =
    footerFirmantesData?.esDocumentoFinalizado &&
    footerFirmantesData.finalizador
      ? {
          tituloProfesional: footerFirmantesData.finalizador.tituloProfesional,
          nombre: footerFirmantesData.finalizador.nombre,
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
          y: firmanteActivo.especialistaSaludTrabajo === 'Si' ? 570 : 560,
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

  const tituloInforme =
    proveedorSalud.pais === 'GT'
      ? '                                                                                            CERTIFICADO MÉDICO\n'
      : '          CERTIFICADO MÉDICO DE NO IMPEDIMENTO FÍSICO (SALUD FÍSICA)\n';

  const headerText: Content = {
    text: tituloInforme,
    style: 'header',
    alignment: 'right',
    margin: [0, 35, 40, 0],
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
                    text: formatearFechaUTC(certificado.fechaCertificado),
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
                  text: `${firmanteActivo.tituloProfesional} ${firmanteActivo.nombre}${firmanteActivo.especialistaSaludTrabajo === 'Si' ? '' : '.'}`, // Sin espacio antes del punto
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
                      text:
                        proveedorSalud.pais === 'GT'
                          ? ` Registro ${firmanteActivo.nombreCredencialAdicional} No. `
                          : ` ${firmanteActivo.nombreCredencialAdicional} con número `,
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
                ? 'Que, habiendo practicado reconocimiento médico en esta fecha, a '
                : trabajador.sexo === 'Femenino'
                  ? 'Que, habiendo practicado reconocimiento médico en esta fecha, a la C. '
                  : 'Que, habiendo practicado reconocimiento médico en esta fecha, al C. ',
          },
          {
            text: formatearNombreTrabajadorCertificado(trabajador),
            bold: true,
          },
          ...(trabajador.curp
            ? [
                { text: ` (${identificadorLabel}: ` },
                { text: trabajador.curp, bold: true },
                { text: ')' },
              ]
            : []),
          { text: ' de ' },
          { text: String(trabajador.edad), bold: true },
          { text: ' años de edad. ' },

          ...(proveedorSalud.pais === 'PA'
            ? [
                {
                  text: 'Se hace constar la práctica del examen médico conforme a los procedimientos establecidos.',
                },
              ]
            : [
                {
                  text: `Presenta IMC: ${exploracionFisica.indiceMasaCorporal} (${exploracionFisica.categoriaIMC}). `,
                },
                {
                  text: `Frecuencia cardiaca de ${exploracionFisica.frecuenciaCardiaca} lpm (${exploracionFisica.categoriaFrecuenciaCardiaca}). `,
                },
                {
                  text: `Saturación de oxígeno del ${exploracionFisica.saturacionOxigeno}% (${exploracionFisica.categoriaSaturacionOxigeno}). `,
                },
                {
                  text: `Tensión arterial ${exploracionFisica.tensionArterialSistolica}/${exploracionFisica.tensionArterialDiastolica} mmHg (${exploracionFisica.categoriaTensionArterial || 'no especificada'}). `,
                },

                ...(examenVista
                  ? [
                      {
                        text: `Examen visual con agudeza lejana sin corrección: OI ${formatearAgudezaVisual(examenVista.ojoIzquierdoLejanaSinCorreccion, getCiegaOI(examenVista))} y OD ${formatearAgudezaVisual(examenVista.ojoDerechoLejanaSinCorreccion, getCiegaOD(examenVista))} `,
                      },
                      {
                        text: `(${examenVista.sinCorreccionLejanaInterpretacion || 'categoría no disponible'}). `,
                      },
                      ...(examenVista.interpretacionIshihara === 'Daltonismo'
                        ? [
                            {
                              text: 'Se detecta alteración en la percepción cromática (Daltonismo). ',
                            },
                          ]
                        : examenVista.interpretacionIshihara === 'Normal'
                          ? [
                              {
                                text: 'No se detectan alteraciones en la percepción cromática. ',
                              },
                            ]
                          : [
                              {
                                text: 'No se cuenta con resultado de prueba de percepción cromática. ',
                              },
                            ]),
                    ]
                  : [{ text: ' ' }]),

                { text: generarTextoExploracionFisica(exploracionFisica) },

                ...(exploracionFisica.resumenExploracionFisica ===
                  'Se encuentra clínicamente sano' ||
                exploracionFisica.resumenExploracionFisica ===
                  'Se encuentra clínicamente sana'
                  ? [
                      {
                        text: ` ${exploracionFisica.resumenExploracionFisica}.`,
                      },
                    ]
                  : []),
              ]),
        ],
        style: 'paragraph',
        margin: [0, 20, 0, 0],
      },
      {
        text: [
          {
            text:
              proveedorSalud.pais === 'GT'
                ? 'Por lo anterior se establece que '
                : trabajador.sexo === 'Femenino'
                  ? 'Por lo anterior se establece que la C. '
                  : 'Por lo anterior se establece que el C. ',
          },
          {
            text: formatearNombreTrabajadorCertificado(trabajador),
            bold: true,
          },
          ...(proveedorSalud.pais === 'GT' && trabajador.sexo === 'Femenino'
            ? [{ text: ' ' }]
            : []),
          {
            text: certificado.impedimentosFisicos,
          },
          {
            text: '. Este certificado de salud no implica ninguna garantía de que el trabajador no se lesionará o enfermará en el futuro.',
          },
        ],
        style: 'paragraph',
        margin: [0, 20, 0, 0],
      },

      {
        text: [
          {
            text:
              proveedorSalud.pais === 'GT'
                ? 'Expido el presente certificado médico a petición de '
                : trabajador.sexo === 'Femenino'
                  ? 'Expido el presente certificado médico a petición de la C. '
                  : 'Expido el presente certificado médico a petición de el C. ',
          },
          {
            text: formatearNombreTrabajadorCertificado(trabajador),
            bold: true,
          },
          {
            text:
              proveedorSalud.pais === 'GT'
                ? ` para los usos legales a que haya lugar, en el municipio de ${proveedorSalud.municipio}, ${proveedorSalud.estado}, el ${formatearFechaUTC(certificado.fechaCertificado)}.`
                : ` para los usos legales a que haya lugar, en el municipio de ${proveedorSalud.municipio}, ${proveedorSalud.estado}, en la fecha mencionada al inicio de este certificado.`,
          },
        ],
        style: 'paragraph',
        margin: [0, 20, 0, 0],
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
        text: `${firmanteActivo.tituloProfesional} ${firmanteActivo.nombre}`,
        fontSize: 12,
        bold: false,
        alignment: 'center',
        margin: [0, 0, 0, 0],
      },
      {
        text:
          proveedorSalud.pais === 'MX'
            ? `Cédula profesional No. ${firmanteActivo.numeroCedulaProfesional}.`
            : proveedorSalud.pais === 'GT'
              ? `Colegiado Activo No. ${firmanteActivo.numeroCedulaProfesional}.`
              : `Registro Profesional No. ${firmanteActivo.numeroCedulaProfesional}.`,
        fontSize: 10,
        bold: false,
        alignment: 'center',
        margin: [0, 0, 0, 0],
      },
      ...(firmanteActivo.nombreCredencialAdicional &&
      firmanteActivo.numeroCredencialAdicional
        ? [
            {
              text:
                proveedorSalud.pais === 'GT'
                  ? `Registro ${firmanteActivo.nombreCredencialAdicional} No. ${firmanteActivo.numeroCredencialAdicional}.`
                  : `${firmanteActivo.nombreCredencialAdicional} No. ${firmanteActivo.numeroCredencialAdicional}.`,
              fontSize: 10,
              bold: false,
              alignment: 'center' as const,
              margin: [0, 0, 0, 0] as [number, number, number, number],
            },
          ]
        : []),
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
