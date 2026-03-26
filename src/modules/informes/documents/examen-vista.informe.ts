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
    fontSize: 11,
    alignment: 'right',
  },
  sectionHeader: {
    fontSize: 12,
    bold: true,
    alignment: 'center',
    margin: [0, 0, 0, 0],
  },
  label: { fontSize: 11 },
  value: { bold: true, fontSize: 11, margin: [0, 0, 0, 0] },
  tableHeader: {
    fillColor: '#343A40',
    color: '#FFFFFF',
    bold: true,
    fontSize: 12,
    alignment: 'center',
    margin: [0, 0, 0, 0],
  },
  tableCell: {
    fontSize: 11,
    bold: false,
    alignment: 'center',
    margin: [0, 0, 0, 0],
  },
  tableCellBold: {
    fontSize: 11,
    bold: true,
    alignment: 'center',
    margin: [0, 0, 0, 0],
  },
};

// ==================== CONTENIDO ====================
const headerText: Content = {
  text: '                                                                                              EXAMEN DE LA VISTA\n',
  style: 'header',
  alignment: 'right',
  margin: [0, 35, 40, 0],
};

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
}

interface ExamenVistaInforme {
  fechaExamenVista: Date;
  ojoIzquierdoCegueraTotal?: boolean;
  ojoDerechoCegueraTotal?: boolean;
  ojoIzquierdoLejanaCegueraTotal?: boolean;
  ojoDerechoLejanaCegueraTotal?: boolean;
  ojoIzquierdoCercanaCegueraTotal?: boolean;
  ojoDerechoCercanaCegueraTotal?: boolean;
  ojoIzquierdoLejanaSinCorreccion: number | null;
  ojoDerechoLejanaSinCorreccion: number | null;
  sinCorreccionLejanaInterpretacion: string;
  requiereLentesUsoGeneral: string;
  ojoIzquierdoCercanaSinCorreccion: number | null;
  ojoDerechoCercanaSinCorreccion: number | null;
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
  testEstereopsis?: string;
  testCampoVisual?: string;
  coverTest?: string;
  esferaOjoIzquierdo?: string;
  cilindroOjoIzquierdo?: string;
  adicionOjoIzquierdo?: string;
  esferaOjoDerecho?: string;
  cilindroOjoDerecho?: string;
  adicionOjoDerecho?: string;
  diagnosticoRecomendaciones?: string;
  antecedentes?: string;
  anamnesis?: string;
  utilizaAnteojos?: string;
}

function getCiegaOI(ev: ExamenVistaInforme): boolean {
  return (
    ev?.ojoIzquierdoCegueraTotal ??
    ev?.ojoIzquierdoLejanaCegueraTotal ??
    ev?.ojoIzquierdoCercanaCegueraTotal ??
    false
  );
}
function getCiegaOD(ev: ExamenVistaInforme): boolean {
  return (
    ev?.ojoDerechoCegueraTotal ??
    ev?.ojoDerechoLejanaCegueraTotal ??
    ev?.ojoDerechoCercanaCegueraTotal ??
    false
  );
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
export const examenVistaInforme = (
  nombreEmpresa: string,
  trabajador: Trabajador,
  examenVista: ExamenVistaInforme,
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

  // Guatemala: fuentes y espaciado más compactos
  const esGT = proveedorSalud.pais === 'GT';
  const marginBottom = esGT ? 8 : 10;
  const marginBottomSmall = esGT ? 10 : 12;
  const paddingCell = esGT ? 1 : 2;
  const pageMarginsV = esGT
    ? ([55, 65] as [number, number])
    : ([70, 80] as [number, number]);

  if (esGT) {
    updatedStyles.tableHeader = { ...updatedStyles.tableHeader, fontSize: 10 };
    updatedStyles.tableCell = { ...updatedStyles.tableCell, fontSize: 9 };
    updatedStyles.tableCellBold = {
      ...updatedStyles.tableCellBold,
      fontSize: 9,
    };
    updatedStyles.label = { fontSize: 9 };
    updatedStyles.value = { bold: true, fontSize: 9, margin: [0, 0, 0, 0] };
    updatedStyles.nombreEmpresa = {
      ...updatedStyles.nombreEmpresa,
      fontSize: 13,
    };
    updatedStyles.fecha = { ...updatedStyles.fecha, fontSize: 10 };
  }

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

  // Secciones Guatemala (solo si pais es GT) - Antecedentes y Anamnesis en misma fila, dos columnas
  const seccionesGTInicio: Content[] =
    proveedorSalud.pais === 'GT'
      ? [
          ...(examenVista.antecedentes?.trim() || examenVista.anamnesis?.trim()
            ? [
                {
                  style: 'table',
                  table: {
                    widths: ['50%', '50%'],
                    body: [
                      [
                        {
                          text: 'ANTECEDENTES',
                          style: 'tableHeader',
                          alignment: 'center',
                        },
                        {
                          text: 'ANAMNESIS',
                          style: 'tableHeader',
                          alignment: 'center',
                        },
                      ],
                      [
                        {
                          text: examenVista.antecedentes?.trim() || ' ',
                          style: 'tableCell',
                          alignment: 'left',
                        },
                        {
                          text: examenVista.anamnesis?.trim() || ' ',
                          style: 'tableCell',
                          alignment: 'left',
                        },
                      ],
                    ],
                  },
                  layout: {
                    hLineWidth: () => 0.5,
                    vLineWidth: () => 0.5,
                    hLineColor: '#e5e7eb',
                    vLineColor: '#e5e7eb',
                    paddingTop: () => paddingCell,
                    paddingBottom: () => paddingCell,
                    paddingLeft: () => 2,
                    paddingRight: () => 2,
                  },
                  margin: [0, 0, 0, marginBottom],
                } as Content,
              ]
            : []),
          ...(examenVista.utilizaAnteojos
            ? [
                {
                  columns: [
                    {
                      text: [
                        { text: 'Utiliza Lentes: ' },
                        {
                          text: `(${examenVista.utilizaAnteojos})`,
                          bold: true,
                        },
                      ],
                    },
                  ],
                  fontSize: 10,
                  margin: [0, 0, 0, marginBottomSmall],
                } as Content,
              ]
            : []),
        ]
      : [];

  return {
    pageSize: 'LETTER',
    pageMargins: [40, pageMarginsV[0], 40, pageMarginsV[1]],
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
                    text: formatearFechaUTC(examenVista.fechaExamenVista),
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
          paddingTop: (_i: number, _node: any) => 0, // Reducir el espacio superior
          paddingBottom: (_i: number, _node: any) => 0, // Reducir el espacio inferior
          paddingLeft: (_i: number, _node: any) => 2,
          paddingRight: (_i: number, _node: any) => 2,
        },
        margin: [0, 0, 0, marginBottom],
      },
      ...seccionesGTInicio,
      // Agudeza Visual Sin Corrección
      {
        style: 'table',
        table: {
          widths: ['20%', '20%', '20%', '*'],
          body: [
            // Encabezado
            [
              {
                text: 'AGUDEZA VISUAL SIN CORRECCIÓN',
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
              {
                text: 'OJO IZQUIERDO',
                style: 'tableHeader',
                alignment: 'center',
              },
              {
                text: 'OJO DERECHO',
                style: 'tableHeader',
                alignment: 'center',
              },
              {
                text: 'INTERPRETACIÓN',
                style: 'tableHeader',
                alignment: 'center',
              },
            ],
            // Filas de datos
            ...[
              [
                'LEJANA',
                formatearAgudezaVisual(
                  examenVista.ojoIzquierdoLejanaSinCorreccion,
                  getCiegaOI(examenVista),
                ),
                formatearAgudezaVisual(
                  examenVista.ojoDerechoLejanaSinCorreccion,
                  getCiegaOD(examenVista),
                ),
                examenVista.sinCorreccionLejanaInterpretacion,
              ],
              [
                'CERCANA',
                formatearAgudezaVisual(
                  examenVista.ojoIzquierdoCercanaSinCorreccion,
                  getCiegaOI(examenVista),
                ),
                formatearAgudezaVisual(
                  examenVista.ojoDerechoCercanaSinCorreccion,
                  getCiegaOD(examenVista),
                ),
                examenVista.sinCorreccionCercanaInterpretacion,
              ],
            ].map((row) =>
              row.map((text, i) => ({
                text,
                style: i === 0 ? 'tableCellBold' : 'tableCell',
                alignment: 'center',
              })),
            ),
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: '#e5e7eb',
          vLineColor: '#e5e7eb',
          paddingTop: (_i: number, _node: any) => 0,
          paddingBottom: (_i: number, _node: any) => 0,
          paddingLeft: (_i: number, _node: any) => 2,
          paddingRight: (_i: number, _node: any) => 2,
        },
        margin: [0, 0, 0, marginBottom],
      },
      // Requiere Lentes
      {
        columns: [
          {
            text: [
              {
                text: `Requiere Lentes de Uso General: `,
              },
              {
                text: `(${examenVista.requiereLentesUsoGeneral})`,
                bold: true,
              },
            ],
          },
          {
            text: [
              {
                text: `Requiere Lentes para Lectura: `,
              },
              {
                text: `(${examenVista.requiereLentesParaLectura})`,
                bold: true,
              },
            ],
          },
        ],
        ...(esGT && { fontSize: 10 }),
        margin: [0, 0, 0, marginBottomSmall],
      },
      // Agudeza Visual Con Corrección
      {
        style: 'table',
        table: {
          widths: ['20%', '20%', '20%', '*'],
          body: [
            // Encabezado
            [
              {
                text: 'AGUDEZA VISUAL CON CORRECCIÓN',
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
              {
                text: 'OJO IZQUIERDO',
                style: 'tableHeader',
                alignment: 'center',
              },
              {
                text: 'OJO DERECHO',
                style: 'tableHeader',
                alignment: 'center',
              },
              {
                text: 'INTERPRETACIÓN',
                style: 'tableHeader',
                alignment: 'center',
              },
            ],
            // Filas de datos (con corrección: ojos con ceguera total muestran "Ceguera Total")
            ...[
              [
                'LEJANA',
                formatearAgudezaVisual(
                  examenVista.ojoIzquierdoLejanaConCorreccion,
                  getCiegaOI(examenVista),
                ),
                formatearAgudezaVisual(
                  examenVista.ojoDerechoLejanaConCorreccion,
                  getCiegaOD(examenVista),
                ),
                examenVista.conCorreccionLejanaInterpretacion ?? 'NA',
              ],
              [
                'CERCANA',
                formatearAgudezaVisual(
                  examenVista.ojoIzquierdoCercanaConCorreccion,
                  getCiegaOI(examenVista),
                ),
                formatearAgudezaVisual(
                  examenVista.ojoDerechoCercanaConCorreccion,
                  getCiegaOD(examenVista),
                ),
                examenVista.conCorreccionCercanaInterpretacion ?? 'NA',
              ],
            ].map((row) =>
              row.map((text, i) => ({
                text,
                style: i === 0 ? 'tableCellBold' : 'tableCell',
                alignment: 'center',
              })),
            ),
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: '#e5e7eb',
          vLineColor: '#e5e7eb',
          paddingTop: (_i: number, _node: any) => 0,
          paddingBottom: (_i: number, _node: any) => 0,
          paddingLeft: (_i: number, _node: any) => 2,
          paddingRight: (_i: number, _node: any) => 2,
        },
        margin: [0, 0, 0, marginBottom],
      },
      // Prueba de Ishihara
      {
        style: 'table',
        table: {
          widths: ['33.33%', '33.33%', '*'],
          body: [
            // Encabezado
            [
              {
                text: 'PRUEBA DE ISHIHARA',
                style: 'tableHeader',
                colSpan: 3,
                alignment: 'center',
              },
              {},
              {},
            ],
            [
              {
                text: 'PLACAS CORRECTAS',
                style: 'tableHeader',
                alignment: 'center',
              },
              { text: 'PORCENTAJE', style: 'tableHeader', alignment: 'center' },
              {
                text: 'INTERPRETACIÓN',
                style: 'tableHeader',
                alignment: 'center',
              },
            ],
            // Filas de datos
            ...[
              [
                `${examenVista.placasCorrectas} de 14`,
                `${examenVista.porcentajeIshihara} %`,
                examenVista.interpretacionIshihara,
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
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: '#e5e7eb',
          vLineColor: '#e5e7eb',
          paddingTop: (_i: number, _node: any) => 0,
          paddingBottom: (_i: number, _node: any) => 0,
          paddingLeft: (_i: number, _node: any) => 2,
          paddingRight: (_i: number, _node: any) => 2,
        },
        margin: [0, 0, 0, marginBottom],
      },
      // Secciones adicionales solo para Guatemala
      ...(proveedorSalud.pais === 'GT'
        ? [
            // Pruebas de función ocular
            {
              style: 'table',
              table: {
                widths: ['33.33%', '33.33%', '*'],
                body: [
                  [
                    {
                      text: 'PRUEBAS DE FUNCIÓN OCULAR',
                      style: 'tableHeader',
                      colSpan: 3,
                      alignment: 'center',
                    },
                    {},
                    {},
                  ],
                  [
                    {
                      text: 'TEST DE ESTEREOPSIS',
                      style: 'tableHeader',
                      alignment: 'center',
                    },
                    {
                      text: 'CAMPOS VISUALES',
                      style: 'tableHeader',
                      alignment: 'center',
                    },
                    {
                      text: 'COVER TEST',
                      style: 'tableHeader',
                      alignment: 'center',
                    },
                  ],
                  [
                    examenVista.testEstereopsis || '',
                    examenVista.testCampoVisual || '',
                    examenVista.coverTest || '',
                  ].map((text) => ({
                    text: text || ' ', // Espacio en blanco si está vacío para mantener el recuadro visible
                    style: 'tableCell',
                    alignment: 'center',
                  })),
                ],
              },
              layout: {
                hLineWidth: () => 0.5,
                vLineWidth: () => 0.5,
                hLineColor: '#e5e7eb',
                vLineColor: '#e5e7eb',
                paddingTop: (_i: number, _node: any) => 0,
                paddingBottom: (_i: number, _node: any) => 0,
                paddingLeft: (_i: number, _node: any) => 2,
                paddingRight: (_i: number, _node: any) => 2,
              },
              margin: [0, 0, 0, marginBottom] as [
                number,
                number,
                number,
                number,
              ],
            },
            // Receta Final
            {
              style: 'table',
              table: {
                widths: ['20%', '40%', '40%'],
                body: [
                  [
                    {
                      text: 'RECETA FINAL',
                      style: 'tableHeader',
                      colSpan: 3,
                      alignment: 'center',
                    },
                    {},
                    {},
                  ],
                  [
                    { text: '-', style: 'tableHeader', alignment: 'center' },
                    {
                      text: 'OJO IZQUIERDO',
                      style: 'tableHeader',
                      alignment: 'center',
                    },
                    {
                      text: 'OJO DERECHO',
                      style: 'tableHeader',
                      alignment: 'center',
                    },
                  ],
                  ...[
                    [
                      'ESFERA',
                      examenVista.esferaOjoIzquierdo || '',
                      examenVista.esferaOjoDerecho || '',
                    ],
                    [
                      'CILINDRO',
                      examenVista.cilindroOjoIzquierdo || '',
                      examenVista.cilindroOjoDerecho || '',
                    ],
                    [
                      'ADICIÓN',
                      examenVista.adicionOjoIzquierdo || '',
                      examenVista.adicionOjoDerecho || '',
                    ],
                  ].map((row) =>
                    row.map((text, i) => ({
                      text,
                      style: i === 0 ? 'tableCellBold' : 'tableCell',
                      alignment: 'center',
                    })),
                  ),
                ],
              },
              layout: {
                hLineWidth: () => 0.5,
                vLineWidth: () => 0.5,
                hLineColor: '#e5e7eb',
                vLineColor: '#e5e7eb',
                paddingTop: (_i: number, _node: any) => 0,
                paddingBottom: (_i: number, _node: any) => 0,
                paddingLeft: (_i: number, _node: any) => 2,
                paddingRight: (_i: number, _node: any) => 2,
              },
              margin: [0, 0, 0, 10] as [number, number, number, number],
            },
            // Diagnóstico y recomendaciones
            {
              style: 'table',
              table: {
                widths: ['100%'],
                body: [
                  [
                    {
                      text: 'DIAGNÓSTICO Y RECOMENDACIONES',
                      style: 'tableHeader',
                      alignment: 'center',
                    },
                  ],
                  [
                    {
                      text: examenVista.diagnosticoRecomendaciones || ' ', // Espacio en blanco si está vacío para mantener el recuadro visible
                      style: 'tableCell',
                      alignment: 'center',
                    },
                  ],
                ],
              },
              layout: {
                hLineWidth: () => 0.5,
                vLineWidth: () => 0.5,
                hLineColor: '#e5e7eb',
                vLineColor: '#e5e7eb',
                paddingTop: (_i: number, _node: any) => 0,
                paddingBottom: (_i: number, _node: any) => 0,
                paddingLeft: (_i: number, _node: any) => 2,
                paddingRight: (_i: number, _node: any) => 2,
              },
              margin: [0, 0, 0, marginBottom] as [
                number,
                number,
                number,
                number,
              ],
            },
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
    styles: updatedStyles, // Regresar a styles cuando se elimine la parte específica para el Dr. García
  };
};
