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
    text: '                                                                 CUESTIONARIO PRODROMAL BREVE\n',
    style: 'header',
    alignment: 'right',
    margin: [0, 35, 40, 0],
  };
  
  // ==================== FUNCIONES REUSABLES (estilo MSI-BPD / tratorno-limite-personalidad) ====================

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

  const PUNTO_POR_GRADO_MALESTAR: Record<string, number> = {
    'Totalmente en desacuerdo': 0,
    'En desacuerdo': 1,
    Neutral: 2,
    'De acuerdo': 3,
    'Totalmente de acuerdo': 4,
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

  const celdaTextoMalestar = (
    respSiNo: string | undefined,
    grado: string | undefined,
    fillColor?: string,
  ): Content => {
    if (respSiNo !== 'Sí') {
      return {
        text: '—',
        fontSize: 8,
        alignment: 'center',
        valign: 'middle',
        color: '#9ca3af',
        ...(fillColor ? { fillColor } : {}),
      } as Content;
    }
    const g = (grado ?? '').trim();
    if (!g) {
      return {
        text: 'Sin dato',
        fontSize: 7,
        italics: true,
        alignment: 'center',
        valign: 'middle',
        color: '#6b7280',
        ...(fillColor ? { fillColor } : {}),
      } as Content;
    }
    const pts = g in PUNTO_POR_GRADO_MALESTAR ? PUNTO_POR_GRADO_MALESTAR[g] : null;
    const t = pts !== null ? `${g} (${pts})` : g;
    return {
      text: t,
      fontSize: 7,
      alignment: 'left',
      valign: 'top',
      lineHeight: 1.1,
      color: '#1f2937',
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
  
  interface CuestionarioProdromalBreve {
    fechaCuestionarioProdromalBreve: Date | string;
    p1?: string;
    p1GradoAcuerdoStatement?: string;
    p2?: string;
    p2GradoAcuerdoStatement?: string;
    p3?: string;
    p3GradoAcuerdoStatement?: string;
    p4?: string;
    p4GradoAcuerdoStatement?: string;
    p5?: string;
    p5GradoAcuerdoStatement?: string;
    p6?: string;
    p6GradoAcuerdoStatement?: string;
    p7?: string;
    p7GradoAcuerdoStatement?: string;
    p8?: string;
    p8GradoAcuerdoStatement?: string;
    p9?: string;
    p9GradoAcuerdoStatement?: string;
    p10?: string;
    p10GradoAcuerdoStatement?: string;
    p11?: string;
    p11GradoAcuerdoStatement?: string;
    p12?: string;
    p12GradoAcuerdoStatement?: string;
    p13?: string;
    p13GradoAcuerdoStatement?: string;
    p14?: string;
    p14GradoAcuerdoStatement?: string;
    p15?: string;
    p15GradoAcuerdoStatement?: string;
    p16?: string;
    p16GradoAcuerdoStatement?: string;
    p17?: string;
    p17GradoAcuerdoStatement?: string;
    p18?: string;
    p18GradoAcuerdoStatement?: string;
    p19?: string;
    p19GradoAcuerdoStatement?: string;
    p20?: string;
    p20GradoAcuerdoStatement?: string;
    p21?: string;
    p21GradoAcuerdoStatement?: string;
  }

  const TEXTO_SI_CONSECUENCIA_PRODROMAL =
    'Si contestó Sí: Cuando esto sucede, me siento asustado, preocupado o me causa problemas:';

  const PREGUNTAS_CUESTIONARIO_PRODROMAL_BREVE: string[] = [
    '¿Los ambientes conocidos le parecen a veces extraños, confusos, amenazantes o irreales?',
    '¿Alguna vez ha percibido sonidos inusuales como estallidos, chasquidos, silbidos, aplausos o timbres en sus oídos?',
    '¿Las cosas que ve le parecen diferentes a como normalmente son (más brillantes o más apagadas, más grandes o más pequeñas, o con cambios en algún otro aspecto)?',
    '¿Ha tenido experiencias de telepatía, poderes de vidente o de adivino?',
    '¿Alguna vez ha sentido como si no tuviera control de sus propias ideas o pensamientos?',
    '¿Tiene dificultad para seguir su propio tema, debido a que divaga o pierde mucho la pista cuando habla?',
    '¿Tiene la fuerte sensación o la creencia de que posee alguna clase de dones o talentos inusuales?',
    '¿Tiene la sensación de que otras personas le observan o hablan de usted?',
    '¿Nota a veces extrañas sensaciones en la piel o debajo de ella, como bichos reptando?',
    '¿Se siente a veces repentinamente distraído por sonidos distantes de los que normalmente no se da cuenta?',
    '¿Alguna vez ha tenido la sensación de que había alguna persona o fuerza a su alrededor, aunque no podía ver a nadie?',
    '¿Le preocupa a veces que algo pueda ir mal en su mente?',
    '¿Ha sentido alguna vez que no existía, que el mundo no existía o que estaba muerto?',
    '¿Se ha sentido a veces confuso sobre si algo de lo que le pasaba era real o imaginario?',
    '¿Tiene creencias que a otras personas les parecerían extrañas o inusuales?',
    '¿Siente que partes de su cuerpo han cambiado de alguna manera o que partes de su cuerpo están funcionando de manera diferente?',
    '¿Sus pensamientos son a veces tan intensos que casi puede oírlos?',
    '¿Experimenta sentimientos de recelo y desconfianza hacia otras personas?',
    '¿Alguna vez ha visto cosas inusuales como flashes, llamas, luces deslumbrantes o figuras geométricas?',
    '¿Alguna vez ha visto cosas que otras personas no pueden ver o no parecen ver?',
    '¿A veces a la gente le cuesta entender lo que está diciendo?',
  ];

  const CLAVES_PRODROMAL: {
    si: keyof CuestionarioProdromalBreve;
    grado: keyof CuestionarioProdromalBreve;
  }[] = [
    { si: 'p1', grado: 'p1GradoAcuerdoStatement' },
    { si: 'p2', grado: 'p2GradoAcuerdoStatement' },
    { si: 'p3', grado: 'p3GradoAcuerdoStatement' },
    { si: 'p4', grado: 'p4GradoAcuerdoStatement' },
    { si: 'p5', grado: 'p5GradoAcuerdoStatement' },
    { si: 'p6', grado: 'p6GradoAcuerdoStatement' },
    { si: 'p7', grado: 'p7GradoAcuerdoStatement' },
    { si: 'p8', grado: 'p8GradoAcuerdoStatement' },
    { si: 'p9', grado: 'p9GradoAcuerdoStatement' },
    { si: 'p10', grado: 'p10GradoAcuerdoStatement' },
    { si: 'p11', grado: 'p11GradoAcuerdoStatement' },
    { si: 'p12', grado: 'p12GradoAcuerdoStatement' },
    { si: 'p13', grado: 'p13GradoAcuerdoStatement' },
    { si: 'p14', grado: 'p14GradoAcuerdoStatement' },
    { si: 'p15', grado: 'p15GradoAcuerdoStatement' },
    { si: 'p16', grado: 'p16GradoAcuerdoStatement' },
    { si: 'p17', grado: 'p17GradoAcuerdoStatement' },
    { si: 'p18', grado: 'p18GradoAcuerdoStatement' },
    { si: 'p19', grado: 'p19GradoAcuerdoStatement' },
    { si: 'p20', grado: 'p20GradoAcuerdoStatement' },
    { si: 'p21', grado: 'p21GradoAcuerdoStatement' },
  ];

  const textoReglaSistemaPuntuacionPqB =
    'Sistema de puntuación:\n' +
    '• Frecuencia: sumar las respuestas «Sí» (Sí = 1, No = 0).\n' +
    '• Malestar: sumar la puntuación de las respuestas de malestar (escala 0 a 4 por ítem cuando contestó «Sí»: Totalmente en desacuerdo = 0 … Totalmente de acuerdo = 4).\n' +
    '• Punto de corte: Frecuencia > 6 y Malestar > 13 indican posible riesgo psicótico.';

  function contarFrecuenciaPQB(ep: CuestionarioProdromalBreve): number {
    let c = 0;
    for (let n = 1; n <= 21; n++) {
      const k = `p${n}` as keyof CuestionarioProdromalBreve;
      if (ep[k] === 'Sí') c++;
    }
    return c;
  }

  function sumarMalestarPQB(ep: CuestionarioProdromalBreve): number {
    let s = 0;
    for (let n = 1; n <= 21; n++) {
      const pk = `p${n}` as keyof CuestionarioProdromalBreve;
      if (ep[pk] !== 'Sí') continue;
      const gk = `p${n}GradoAcuerdoStatement` as keyof CuestionarioProdromalBreve;
      const g = ep[gk];
      if (typeof g === 'string' && g in PUNTO_POR_GRADO_MALESTAR) {
        s += PUNTO_POR_GRADO_MALESTAR[g];
      }
    }
    return s;
  }

  function esPositivoRiesgoPsicoticoPQB(frecuencia: number, malestar: number): boolean {
    return frecuencia > 6 && malestar > 13;
  }

  /** Positivo solo con ambos cortes; en cualquier otro caso, negativo (alineado con el helper del frontend). */
  function textoInterpretacionPQB(frecuencia: number, malestar: number): string {
    return esPositivoRiesgoPsicoticoPQB(frecuencia, malestar)
      ? 'Positivo para riesgo psicótico'
      : 'Negativo para riesgo psicótico';
  }

  /** Cabecera por tabla (copia nueva cada vez) para que 1–15 y 16–21 muestren igual #, PREGUNTA, NO, SÍ, MALESTAR. */
  const crearCabeceraTablaPqB = (): Content[] => [
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
      text: 'PREGUNTA',
      bold: true,
      fontSize: 9,
      fillColor: '#f3f4f6',
      alignment: 'left',
      color: '#374151',
      valign: 'middle',
    } as Content,
    {
      text: 'NO',
      bold: true,
      fontSize: 9,
      fillColor: '#f3f4f6',
      alignment: 'center',
      color: '#374151',
      valign: 'middle',
    } as Content,
    {
      text: 'SÍ',
      bold: true,
      fontSize: 9,
      fillColor: '#f3f4f6',
      alignment: 'center',
      color: '#374151',
      valign: 'middle',
    } as Content,
    {
      text: 'MALESTAR',
      bold: true,
      fontSize: 9,
      fillColor: '#f3f4f6',
      alignment: 'left',
      color: '#374151',
      valign: 'middle',
    } as Content,
  ];

  const tablaCuestionarioPqBTramo = (
    ep: CuestionarioProdromalBreve,
    indiceInicio: number,
    indiceFin: number,
  ): Content => {
    const dataRows: Content[][] = [];
    for (let idx = indiceInicio; idx <= indiceFin; idx++) {
      const label = PREGUNTAS_CUESTIONARIO_PRODROMAL_BREVE[idx];
      const fill = idx % 2 === 1 ? '#fafafa' : undefined;
      const { si, grado } = CLAVES_PRODROMAL[idx];
      const v = ep[si] as string | undefined;
      const g = ep[grado] as string | undefined;
      dataRows.push([
        {
          text: String(idx + 1),
          fontSize: 8,
          alignment: 'center',
          valign: 'top',
          color: '#4b5563',
          ...(fill ? { fillColor: fill } : {}),
        } as Content,
        {
          text: label,
          bold: true,
          fontSize: 8,
          alignment: 'left',
          valign: 'top',
          lineHeight: 1.12,
          ...(fill ? { fillColor: fill } : {}),
        } as Content,
        celdaMarcaX(v, 'No', fill),
        celdaMarcaX(v, 'Sí', fill),
        celdaTextoMalestar(v, g, fill),
      ]);
    }

    return {
      table: {
        widths: [22, '*', 36, 36, 98],
        body: [crearCabeceraTablaPqB(), ...dataRows],
      },
      layout: layoutTablaCuestionario,
    };
  };

  /** Preguntas 1–15 y 16–21 en tablas separadas.
   * El `margin` del bloque no se aplica bien como primer nodo tras un salto de página en pdfmake.
   * Se envuelve la 2.ª tabla con `unbreakable` + línea en blanco con altura: al mover el bloque entero
   * a la página siguiente, ese espacio queda arriba y despega la tabla del borde superior. */
  const ESPACIO_SUPERIOR_SEGUNDA_TABLA_PQ_B = 12;

  const tablaCuestionarioPqB = (ep: CuestionarioProdromalBreve): Content => ({
    stack: [
      tablaCuestionarioPqBTramo(ep, 0, 14),
      {
        unbreakable: true,
        stack: [
          {
            text: '\u00a0',
            fontSize: ESPACIO_SUPERIOR_SEGUNDA_TABLA_PQ_B,
            lineHeight: 1,
            color: '#ffffff',
          },
          tablaCuestionarioPqBTramo(ep, 15, 20),
        ],
        margin: [0, 32, 0, 0],
      },
    ],
  });
  
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
  export const cuestionarioProdromalBreveInforme = (
    nombreEmpresa: string,
    trabajador: Trabajador,
    cuestionarioProdromalBreve: CuestionarioProdromalBreve,
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

    const ep = cuestionarioProdromalBreve;
    const fechaCuestionarioProdromalBreve =
      ep.fechaCuestionarioProdromalBreve instanceof Date
        ? ep.fechaCuestionarioProdromalBreve
        : new Date(ep.fechaCuestionarioProdromalBreve as string);

    const frecuenciaPQB = contarFrecuenciaPQB(ep);
    const malestarPQB = sumarMalestarPQB(ep);
    const textoInterpretacion = textoInterpretacionPQB(frecuenciaPQB, malestarPQB);

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
                      text: formatearFechaUTC(fechaCuestionarioProdromalBreve),
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
              text: 'Cuestionario PQ-B',
              fontSize: 11,
              bold: true,
              alignment: 'left',
              margin: [0, 0, 0, 2],
            },
            {
              text: 'Prodromal Questionnaire — Brief',
              fontSize: 8,
              italics: true,
              color: '#6b7280',
              margin: [0, 0, 0, 4],
            },
            {
              text: TEXTO_SI_CONSECUENCIA_PRODROMAL,
              fontSize: 8,
              color: '#374151',
              margin: [0, 0, 0, 6],
            },
            tablaCuestionarioPqB(ep),
            {
              text: [
                { text: 'Frecuencia (respuestas «Sí»): ', bold: true, fontSize: 10 },
                { text: `${frecuenciaPQB} / 21`, fontSize: 10 },
              ],
              margin: [0, 10, 0, 2],
            },
            {
              text: [
                { text: 'Malestar (suma de puntuaciones): ', bold: true, fontSize: 10 },
                { text: String(malestarPQB), fontSize: 10 },
              ],
              margin: [0, 0, 0, 6],
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
                          color: esPositivoRiesgoPsicoticoPQB(frecuenciaPQB, malestarPQB)
                            ? '#d97706'
                            : '#16a34a',
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
                          text: 'Sistema de puntuación',
                          bold: true,
                          fontSize: 10,
                          margin: [0, 0, 0, 6],
                        },
                        {
                          text: textoReglaSistemaPuntuacionPqB,
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
  