import type {
    Content,
    StyleDictionary,
    TDocumentDefinitions,
  } from 'pdfmake/interfaces';
  import { formatearNombreTrabajador } from '../../../utils/names';
  
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
    label: { fontSize: 9, lineHeight: 1, margin: [0, 0, 0, 0] },
    value: {
      bold: true,
      fontSize: 9,
      lineHeight: 1,
      alignment: 'center',
      margin: [0, 0, 0, 0],
    },
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
    text: '                                                              TRASTORNOS DEL ESTADO DE ÁNIMO\n',
    style: 'header',
    alignment: 'right',
    margin: [0, 35, 40, 0],
  };
  
  // ==================== FUNCIONES REUSABLES (estilo tratorno-limite-personalidad / MSI-BPD) ====================

  /** Alineado con standardLayout en exploracion-fisica.informe.ts: padding vertical 0, líneas 0.8 */
  const layoutTablaCompacta = {
    hLineColor: '#d1d5db',
    vLineColor: '#d1d5db',
    hLineWidth: () => 0.8,
    vLineWidth: () => 0.8,
    paddingLeft: () => 2,
    paddingRight: () => 2,
    paddingTop: () => 0,
    paddingBottom: () => 0,
  };

  const layoutTablaCuestionario = {
    hLineColor: '#d1d5db',
    vLineColor: '#d1d5db',
    hLineWidth: () => 0.8,
    vLineWidth: () => 0.8,
    paddingLeft: () => 4,
    paddingRight: () => 4,
    paddingTop: () => 3,
    paddingBottom: () => 3,
  };

  const celdaMarcaX = (
    valor: string | undefined,
    esperado: 'Sí' | 'No',
    fillColor?: string,
  ): Content => {
    const coincide = valor === esperado;
    return {
      text: coincide ? 'X' : '',
      bold: true,
      fontSize: 11,
      alignment: 'center',
      color: '#111827',
      valign: 'middle',
      ...(fillColor ? { fillColor } : {}),
    } as Content;
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
  
  interface TrastornosEstadoAnimo {
    fechaTrastornosEstadoAnimo: Date | string;
    p1ExaltadoComportamientoNoHabitualOMetidoProblemas?: string;
    p1IrritableGritosPeleas?: string;
    p1MasSeguridadQueLoHabitual?: string;
    p1DormiaMenosSinNecesitarMasSueno?: string;
    p1HablabaMasOMasRapido?: string;
    p1PensamientosAgolpados?: string;
    p1DistraccionDificultadConcentracion?: string;
    p1MasEnergiaQueLoHabitual?: string;
    p1MasActivoOMasCosasQueLoHabitual?: string;
    p1MasSocialExtrovertido?: string;
    p1MasApetitoSexual?: string;
    p1CosasExageradasRiesgosas?: string;
    p1GastoDineroProblemas?: string;
    p2SituacionesMismoPeriodo?: string;
    p3NivelProblemaCausado?: string;
    p4FamiliarDirectoBipolar?: string;
    p5DiagnosticoProfesionalBipolar?: string;
  }

  /** Ítems P1: mismos textos y orden que `VisualizadorTrastornosEstadoAnimo.vue`. */
  const ITEMS_P1_MDQ: { key: keyof TrastornosEstadoAnimo; label: string }[] = [
    {
      key: 'p1ExaltadoComportamientoNoHabitualOMetidoProblemas',
      label:
        '… se sentía tan bien o tan exaltado que la gente pensó que su comportamiento no era el habitual, o estaba tan exaltado que se metió en problemas?',
    },
    {
      key: 'p1IrritableGritosPeleas',
      label: '… estaba tan irritable que le gritó a la gente o inició peleas físicas o verbales?',
    },
    {
      key: 'p1MasSeguridadQueLoHabitual',
      label: '… se sintió con mucha más seguridad en sí mismo que lo habitual?',
    },
    {
      key: 'p1DormiaMenosSinNecesitarMasSueno',
      label:
        '… dormía mucho menos que lo habitual, y se dio cuenta de que, a pesar de ello, no necesitaba más horas de sueño?',
    },
    {
      key: 'p1HablabaMasOMasRapido',
      label: '… hablaba más o más rápido que lo habitual?',
    },
    {
      key: 'p1PensamientosAgolpados',
      label: '… sentía que los pensamientos se agolpaban en su cabeza, o que no podía detenerlos?',
    },
    {
      key: 'p1DistraccionDificultadConcentracion',
      label:
        '… se distraía tan fácilmente con lo que sucedía a su alrededor que tenía dificultad para mantener la concentración?',
    },
    {
      key: 'p1MasEnergiaQueLoHabitual',
      label: '… tenía mucha más energía que lo habitual?',
    },
    {
      key: 'p1MasActivoOMasCosasQueLoHabitual',
      label: '… estaba mucho más activo o hacía muchas más cosas que lo habitual?',
    },
    {
      key: 'p1MasSocialExtrovertido',
      label:
        '… estaba mucho más social o extrovertido que lo habitual —por ejemplo, llamaba a sus amigos por teléfono a altas horas de la noche?',
    },
    {
      key: 'p1MasApetitoSexual',
      label: '… tenía mucho más apetito sexual que lo habitual?',
    },
    {
      key: 'p1CosasExageradasRiesgosas',
      label:
        '… hacía cosas que no eran comunes en usted, o que a la gente le podrían haber parecido exageradas, tontas, o riesgosas?',
    },
    {
      key: 'p1GastoDineroProblemas',
      label: '… gastó dinero que le causó problemas a usted o a su familia?',
    },
  ];

  const TEXTO_LEAD_IN_P1 =
    '¿Ha pasado alguna vez por un período en el cual su personalidad o comportamiento no fueron los habituales y…';

  const TEXTO_P2_MDQ =
    'Si respondió “Sí” a dos o más de las preguntas anteriores, ¿algunas de las situaciones descritas ocurrieron durante el mismo período de tiempo?';

  const TEXTO_P3_MDQ =
    '¿Cuánto problema le causaron algunas de estas situaciones —como por ejemplo, problemas en el trabajo, problemas familiares, financieros o legales, peleas físicas o verbales?';

  const TEXTO_P4_MDQ =
    '¿Alguno de sus familiares directos (es decir, hijos, hermanos, padres, abuelos, tíos) padeció alguna vez de trastorno maníaco-depresivo o bipolar?';

  const TEXTO_P5_MDQ =
    '¿Alguna vez algún profesional médico le ha dicho que usted padece de trastorno maníaco-depresivo o bipolar?';

  const OPCIONES_NIVEL_PROBLEMA_P3 = [
    'Ningún problema',
    'Problemas menores',
    'Problemas moderados',
    'Problemas serios',
  ] as const;

  const REGLA_TRIAJE_MDQ =
    'El responder «Sí» a 7 o más de los eventos de la pregunta Nº 1 y a la pregunta Nº 2, así como responder «Problemas moderados» o «Problemas serios» a la pregunta Nº 3 se considera una indicación positiva respecto al trastorno bipolar.';

  function contarSiMdqP1Informe(ep: TrastornosEstadoAnimo): number {
    let n = 0;
    for (const { key } of ITEMS_P1_MDQ) {
      if (ep[key] === 'Sí') n++;
    }
    return n;
  }

  function requierePregunta2MdqInforme(ep: TrastornosEstadoAnimo): boolean {
    return contarSiMdqP1Informe(ep) >= 2;
  }

  function cumpleCriterioTriajePositivoMdqInforme(ep: TrastornosEstadoAnimo): boolean {
    if (contarSiMdqP1Informe(ep) < 7) return false;
    if (ep.p2SituacionesMismoPeriodo !== 'Sí') return false;
    const p3 = ep.p3NivelProblemaCausado;
    return p3 === 'Problemas moderados' || p3 === 'Problemas serios';
  }

  const tablaCuestionarioMdqP1 = (ep: TrastornosEstadoAnimo): Content => {
    const headerRow: Content[] = [
      {
        text: '#',
        bold: true,
        fontSize: 9,
        fillColor: '#f3f4f6',
        alignment: 'center',
        color: '#374151',
        valign: 'middle',
      } as Content,
      {
        text: 'Pregunta',
        bold: true,
        fontSize: 9,
        fillColor: '#f3f4f6',
        alignment: 'left',
        color: '#374151',
        valign: 'middle',
      } as Content,
      {
        text: 'No',
        bold: true,
        fontSize: 9,
        fillColor: '#f3f4f6',
        alignment: 'center',
        color: '#374151',
        valign: 'middle',
      } as Content,
      {
        text: 'Sí',
        bold: true,
        fontSize: 9,
        fillColor: '#f3f4f6',
        alignment: 'center',
        color: '#374151',
        valign: 'middle',
      } as Content,
    ];

    const dataRows: Content[][] = ITEMS_P1_MDQ.map((item, idx) => {
      const fill = idx % 2 === 1 ? '#fafafa' : undefined;
      const v = ep[item.key] as string | undefined;
      return [
        {
          text: String(idx + 1),
          fontSize: 10,
          alignment: 'center',
          valign: 'top',
          color: '#4b5563',
          ...(fill ? { fillColor: fill } : {}),
        } as Content,
        {
          text: item.label,
          bold: false,
          fontSize: 10,
          alignment: 'left',
          valign: 'top',
          lineHeight: 1.12,
          ...(fill ? { fillColor: fill } : {}),
        } as Content,
        celdaMarcaX(v, 'No', fill),
        celdaMarcaX(v, 'Sí', fill),
      ];
    });

    return {
      table: {
        widths: [22, '*', 36, 36],
        body: [headerRow, ...dataRows],
      },
      layout: layoutTablaCuestionario,
    };
  };

  /** Punto medio entre 11 y 8 (~9,5): mismo tamaño y negrita para número y enunciado. */
  const FONT_MDQ_PREGUNTA = 10;

  /** Separación vertical extra (solo P1→P2 y P2→P3; P3–P4–P5 se dejan como están). */
  const ESPACIO_DESPUES_TABLA_P1_MDQ = 28;
  const ESPACIO_DESPUES_BLOQUE_P2_MDQ = 56;

  /**
   * Si la P3 empieza en página nueva, pdfmake suele ignorar margin superior;
   * mismo truco que PQ-B: `unbreakable` + línea en blanco con altura para despegar del borde.
   */
  const ESPACIO_SUPERIOR_INICIO_P3_MDQ = 12;

  /** Opción marcada (X); sin marcar tres espacios entre paréntesis, como en papel. */
  const marcaParentesis = (seleccionada: boolean): string => (seleccionada ? '(X)' : '(   )');

  /** Preguntas 2, 4 y 5: número y enunciado mismo tamaño/negrita; No/Sí en una sola fila. */
  const bloquePreguntaSiNoMdq = (
    tituloNumero: string,
    textoPregunta: string,
    valor: string | undefined,
    marginBottom = 8,
  ): Content => ({
    stack: [
      {
        text: [
          { text: `${tituloNumero} `, bold: true, fontSize: FONT_MDQ_PREGUNTA },
          { text: textoPregunta, bold: true, fontSize: FONT_MDQ_PREGUNTA },
        ],
        alignment: 'justify',
        lineHeight: 1.15,
        margin: [0, 0, 0, 6],
      },
      {
        columns: [
          {
            text: `${marcaParentesis(valor === 'No')} No`,
            fontSize: 9,
            lineHeight: 1.35,
            color: '#1f2937',
          },
          {
            text: `${marcaParentesis(valor === 'Sí')} Sí`,
            fontSize: 9,
            lineHeight: 1.35,
            color: '#1f2937',
          },
        ],
        columnGap: 28,
        margin: [0, 0, 0, 0],
      },
    ],
    margin: [0, 0, 0, marginBottom],
  });

  /** Pregunta 3: cuatro opciones en una sola fila (columnas). */
  const bloqueOpcionesP3Mdq = (ep: TrastornosEstadoAnimo): Content => {
    const sel = ep.p3NivelProblemaCausado;
    return {
      columns: OPCIONES_NIVEL_PROBLEMA_P3.map((op) => ({
        width: '*',
        text: `${marcaParentesis(sel === op)} ${op}`,
        fontSize: 9,
        lineHeight: 1.2,
        bold: sel === op,
        color: sel === op ? '#111827' : '#4b5563',
      })),
      columnGap: 6,
      margin: [0, 4, 0, 8],
    };
  };
  
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
    }
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
    }
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
    }
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
  export const trastornosEstadoAnimoInforme = (
    nombreEmpresa: string,
    trabajador: Trabajador,
    trastornosEstadoAnimo: TrastornosEstadoAnimo,
    medicoFirmante: MedicoFirmante | null,
    enfermeraFirmante: EnfermeraFirmante | null,
    tecnicoFirmante: TecnicoFirmante | null,
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

    const ep = trastornosEstadoAnimo;
    const fechaTrastornosEstadoAnimo =
      ep.fechaTrastornosEstadoAnimo instanceof Date
        ? ep.fechaTrastornosEstadoAnimo
        : new Date(ep.fechaTrastornosEstadoAnimo as string);

    const contarSiP1 = contarSiMdqP1Informe(ep);
    const aplicaP2 = requierePregunta2MdqInforme(ep);
    const cumpleTriaje = cumpleCriterioTriajePositivoMdqInforme(ep);
    const textoInterpretacion = cumpleTriaje
      ? 'Positivo para riesgo de trastorno bipolar'
      : 'Negativo para riesgo de trastorno bipolar';

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
                      text: formatearFechaUTC(fechaTrastornosEstadoAnimo),
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
                { text: 'NOMBRE', style: 'label', valign: 'top' } as Content,
                {
                  text: formatearNombreTrabajador(trabajador),
                  style: 'value',
                  valign: 'middle',
                } as Content,
                { text: 'EDAD', style: 'label', valign: 'top' } as Content,
                { text: trabajador.edad, style: 'value', valign: 'middle' } as Content,
              ],
              [
                { text: 'PUESTO', style: 'label', valign: 'top' } as Content,
                { text: trabajador.puesto, style: 'value', valign: 'middle' } as Content,
                { text: 'SEXO', style: 'label', valign: 'top' } as Content,
                { text: trabajador.sexo, style: 'value', valign: 'middle' } as Content,
              ],
            ],
          },
          layout: layoutTablaCompacta,
          margin: [0, 0, 0, 8],
        },

        {
          stack: [
            {
              text: 'Cuestionario MDQ',
              fontSize: 11,
              bold: true,
              alignment: 'left',
              margin: [0, 0, 0, 2],
            },
            {
              text: 'Mood Disorder Questionnaire',
              fontSize: 8,
              italics: true,
              color: '#6b7280',
              margin: [0, 0, 0, 8],
            },
            {
              text: [
                { text: '1. ', bold: true, fontSize: FONT_MDQ_PREGUNTA },
                { text: TEXTO_LEAD_IN_P1, bold: true, fontSize: FONT_MDQ_PREGUNTA },
              ],
              alignment: 'justify',
              lineHeight: 1.15,
              margin: [0, 0, 0, 6],
            },
            {
              stack: [tablaCuestionarioMdqP1(ep)],
              margin: [0, 0, 0, ESPACIO_DESPUES_TABLA_P1_MDQ],
            },
            {
              stack: [
                ...(aplicaP2
                  ? [bloquePreguntaSiNoMdq('2.', TEXTO_P2_MDQ, ep.p2SituacionesMismoPeriodo)]
                  : [
                      {
                        text: [
                          { text: '2. ', bold: true, fontSize: FONT_MDQ_PREGUNTA },
                          {
                            text:
                              'No aplica: la pregunta 2 solo se formula si hubo al menos dos respuestas «Sí» en la pregunta 1.',
                            bold: true,
                            fontSize: FONT_MDQ_PREGUNTA,
                            italics: true,
                            color: '#4b5563',
                          },
                        ],
                        alignment: 'justify',
                        margin: [0, 0, 0, 8],
                      } as Content,
                    ]),
              ],
              margin: [0, 0, 0, ESPACIO_DESPUES_BLOQUE_P2_MDQ],
            },
            {
              unbreakable: true,
              stack: [
                {
                  text: '\u00a0',
                  fontSize: ESPACIO_SUPERIOR_INICIO_P3_MDQ,
                  lineHeight: 1,
                  color: '#ffffff',
                },
                {
                  stack: [
                    {
                      text: [
                        { text: '3. ', bold: true, fontSize: FONT_MDQ_PREGUNTA },
                        { text: TEXTO_P3_MDQ, bold: true, fontSize: FONT_MDQ_PREGUNTA },
                      ],
                      alignment: 'justify',
                      lineHeight: 1.12,
                      margin: [0, 0, 0, 4],
                    },
                    bloqueOpcionesP3Mdq(ep),
                  ],
                },
              ],
            },
            bloquePreguntaSiNoMdq('4.*', TEXTO_P4_MDQ, ep.p4FamiliarDirectoBipolar),
            bloquePreguntaSiNoMdq('5.*', TEXTO_P5_MDQ, ep.p5DiagnosticoProfesionalBipolar),
            {
              text: [
                { text: 'Respuestas «Sí» en la pregunta 1: ', bold: true, fontSize: 10 },
                { text: `${contarSiP1} / 13`, fontSize: 10 },
              ],
              margin: [0, 10, 0, 6],
            },
            {
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      stack: [
                        {
                          text: 'Interpretación',
                          bold: true,
                          fontSize: 10,
                          margin: [0, 0, 0, 4],
                        },
                        {
                          text: textoInterpretacion,
                          fontSize: 12,
                          bold: true,
                          lineHeight: 1.25,
                          color: cumpleTriaje ? '#d97706' : '#16a34a',
                        },
                      ],
                      fillColor: '#f9fafb',
                    },
                  ],
                ],
              },
              layout: layoutTablaCuestionario,
              margin: [0, 0, 0, 8],
            },
            {
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      stack: [
                        {
                          text: 'Regla de evaluación de resultados (MDQ)',
                          bold: true,
                          fontSize: 10,
                          margin: [0, 0, 0, 6],
                        },
                        {
                          text: REGLA_TRIAJE_MDQ,
                          fontSize: 9,
                          lineHeight: 1.35,
                          color: '#374151',
                        },
                      ],
                    },
                  ],
                ],
              },
              layout: layoutTablaCuestionario,
              margin: [0, 0, 0, 6],
            },
            {
              text: 'Este cuestionario no sustituye el diagnóstico de un especialista.',
              fontSize: 8,
              italics: true,
              color: '#4b5563',
              lineHeight: 1.3,
            },
          ],
          margin: [0, 0, 0, 0],
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
                  (firmanteActivo?.tituloProfesional && firmanteActivo?.nombre)
                    ? {
                        text: `${firmanteActivo.tituloProfesional} ${firmanteActivo.nombre}\n`,
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
  