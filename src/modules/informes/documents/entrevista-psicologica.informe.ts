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
    text: '                                                                                ENTREVISTA PSICOLÓGICA\n',
    style: 'header',
    alignment: 'right',
    margin: [0, 35, 40, 0],
  };
  
  // ==================== FUNCIONES REUSABLES ====================
  const textoOGuion = (s?: string | null): string => {
    const t = s != null ? String(s).trim() : '';
    return t.length ? t : '—';
  };

  /** Descripciones largas: interlineado algo mayor (patrón exploración física / legibilidad). */
  const UMBRAL_CARACTERES_TEXTO_LARGO = 85;

  const esTextoLargoParaCelda = (t: string): boolean => {
    if (t.includes('\n')) return true;
    return t.length > UMBRAL_CARACTERES_TEXTO_LARGO;
  };

  const celdaValor = (
    valor: string | undefined,
    opts?: { riesgoSi?: boolean; textoLibre?: boolean },
  ): Content => {
    const raw = valor ?? '';
    const t = textoOGuion(valor);
    const destacar = opts?.riesgoSi && raw === 'Sí';
    const largo = esTextoLargoParaCelda(t);
    /** Todas las respuestas centradas horizontalmente; texto libre largo: arriba en vertical */
    const alignment = 'center' as const;
    const valign = opts?.textoLibre ? ('top' as const) : ('middle' as const);
    return {
      text: t,
      fontSize: 9,
      lineHeight: largo ? 1.18 : 1,
      alignment,
      bold: destacar,
      color: destacar ? '#b91c1c' : 'black',
      margin: [0, 0, 0, 0],
      valign,
    } as Content;
  };

  const filaCampo = (
    etiqueta: string,
    valor: string | undefined,
    opts?: { riesgoSi?: boolean; textoLibre?: boolean },
  ): [Content, Content] => [
    {
      text: etiqueta,
      bold: true,
      alignment: 'left',
      fontSize: 9,
      lineHeight: esTextoLargoParaCelda(etiqueta) ? 1.12 : 1,
      margin: [0, 0, 0, 0],
      valign: 'top',
    } as Content,
    celdaValor(valor, opts),
  ];

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

  const tablaSeccion = (titulo: string, filas: [Content, Content][]): Content => ({
    stack: [
      {
        text: titulo,
        fontSize: 10,
        bold: true,
        alignment: 'center',
        lineHeight: 0.9,
        margin: [0, 2, 0, 8],
      },
      {
        style: 'table',
        table: {
          widths: ['38%', '62%'],
          body: filas,
        },
        layout: layoutTablaCompacta,
        margin: [0, 0, 0, 2],
      },
    ],
  });

  /** Dos columnas (layout alineado con VisualizadorEntrevistaPsicologica: I+II, III+IV, etc.) */
  const filaDosColumnasSecciones = (izquierda: Content, derecha: Content): Content => ({
    columns: [
      { width: '*', stack: [izquierda] },
      { width: '*', stack: [derecha] },
    ],
    columnGap: 8,
    margin: [0, 0, 0, 12],
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
  
  interface EntrevistaPsicologica {
    fechaEntrevistaPsicologica: Date | string;
    apariencia: string;
    actitudHaciaEvaluador: string;
    nivelCooperacion: string;
    contactoVisual: string;
    conductaMotora: string;
    estadoAnimoPredominante: string;
    afecto: string;
    intensidadEmocional: string;
    cursoPensamiento: string;
    alteracionesPensamiento: string;
    descripcionAlteracionesPensamiento?: string;
    alteracionesPerceptuales: string;
    descripcionAlteracionesPerceptuales?: string;
    orientacion: string;
    atencionConcentracion: string;
    memoria: string;
    juicio: string;
    concienciaEstado: string;
    relacionesInterpersonales: string;
    desempenoLaboralAutorreporte: string;
    manejoEstres: string;
    ideacionSuicida: string;
    observacionesIdeacionSuicida?: string;
    conclusionClinica: string;
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
  export const entrevistaPsicologicaInforme = (
    nombreEmpresa: string,
    trabajador: Trabajador,
    entrevistaPsicologica: EntrevistaPsicologica,
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

    const ep = entrevistaPsicologica;
    const fechaEntrevista =
      ep.fechaEntrevistaPsicologica instanceof Date
        ? ep.fechaEntrevistaPsicologica
        : new Date(ep.fechaEntrevistaPsicologica as string);
  
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
                      text: formatearFechaUTC(fechaEntrevista),
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

        filaDosColumnasSecciones(
          tablaSeccion('I. Observación general (conductual)', [
            filaCampo('Apariencia', ep.apariencia),
            filaCampo('Actitud hacia el evaluador', ep.actitudHaciaEvaluador),
            filaCampo('Nivel de cooperación', ep.nivelCooperacion),
            filaCampo('Contacto visual', ep.contactoVisual),
            filaCampo('Conducta motora', ep.conductaMotora),
          ]),
          tablaSeccion('II. Estado de ánimo y afecto', [
            filaCampo('Estado de ánimo predominante', ep.estadoAnimoPredominante),
            filaCampo('Afecto', ep.afecto),
            filaCampo('Intensidad emocional', ep.intensidadEmocional),
          ]),
        ),
        filaDosColumnasSecciones(
          tablaSeccion('III. Pensamiento', [
            filaCampo('Curso del pensamiento', ep.cursoPensamiento),
            filaCampo('Alt. del pensamiento', ep.alteracionesPensamiento),
            filaCampo('Descripción', ep.descripcionAlteracionesPensamiento, {
              textoLibre: true,
            }),
          ]),
          tablaSeccion('IV. Percepción', [
            filaCampo('Alt. perceptuales', ep.alteracionesPerceptuales),
            filaCampo('Descripción', ep.descripcionAlteracionesPerceptuales, {
              textoLibre: true,
            }),
          ]),
        ),
        filaDosColumnasSecciones(
          tablaSeccion('V. Cognición', [
            filaCampo('Orientación', ep.orientacion),
            filaCampo('Atención y concentración', ep.atencionConcentracion),
            filaCampo('Memoria', ep.memoria),
          ]),
          tablaSeccion('VI. Juicio y conciencia de estado', [
            filaCampo('Juicio', ep.juicio),
            filaCampo('Conciencia de estado', ep.concienciaEstado),
          ]),
        ),
        filaDosColumnasSecciones(
          tablaSeccion('VII. Funcionamiento psicosocial', [
            filaCampo('Relaciones interpersonales', ep.relacionesInterpersonales),
            filaCampo('Desempeño laboral (autorreporte)', ep.desempenoLaboralAutorreporte),
            filaCampo('Manejo del estrés', ep.manejoEstres),
          ]),
          tablaSeccion('VIII. Riesgo inmediato (crítico)', [
            filaCampo('Ideación suicida', ep.ideacionSuicida, { riesgoSi: true }),
            filaCampo('Observaciones', ep.observacionesIdeacionSuicida, {
              textoLibre: true,
            }),
          ]),
        ),
        {
          stack: [
            {
              text: 'IX. Conclusión clínica',
              fontSize: 10,
              bold: true,
              alignment: 'center',
              lineHeight: 0.9,
              margin: [0, 4, 0, 8],
            },
            {
              style: 'table',
              table: {
                widths: ['100%'],
                body: [
                  [
                    {
                      text: textoOGuion(ep.conclusionClinica),
                      fontSize: 9,
                      lineHeight: 1.22,
                      alignment: 'justify',
                      margin: [2, 2, 2, 2],
                    },
                  ],
                ],
              },
              layout: layoutTablaCompacta,
              margin: [0, 0, 0, 4],
            },
          ],
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
  