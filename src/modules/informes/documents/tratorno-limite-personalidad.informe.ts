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
    text: '                                                                 TRASTORNO LIMITE PERSONALIDAD\n',
    style: 'header',
    alignment: 'right',
    margin: [0, 35, 40, 0],
  };

  /** Claves del cuestionario MSI-BPD (sin fecha). */
  type ClaveCampoMsibpd =
    | 'relacionesCercanasDiscusionesRupturas'
    | 'autolesionIntentoSuicidio'
    | 'impulsividadOtrosDosProblemas'
    | 'extremadamenteMalHumor'
    | 'enojadoFrecuenteActuaEnojadoSarcastico'
    | 'desconfianzaOtrasPersonas'
    | 'sensacionIrrealidadEntornoIrreal'
    | 'vacioCronico'
    | 'faltaIdentidadQuienEs'
    | 'esfuerzosEvitarAbandono';

  /** Mismas preguntas y orden que `VisualizadorTrastornoLimitePersonalidad.vue`. */
  const ITEMS_MSIBPD: { key: ClaveCampoMsibpd; label: string }[] = [
    {
      key: 'relacionesCercanasDiscusionesRupturas',
      label:
        '¿Alguna de sus relaciones más cercanas ha tenido problemas por muchas discusiones o rupturas repetidas?',
    },
    {
      key: 'autolesionIntentoSuicidio',
      label:
        '¿Se ha lastimado físicamente de manera deliberada (por ejemplo: se ha pegado un puñetazo, se ha cortado, se ha quemado)? ¿Ha tenido algún intento de suicidio?',
    },
    {
      key: 'impulsividadOtrosDosProblemas',
      label:
        '¿Ha tenido al menos otros dos problemas de impulsividad (por ejemplo: atracones de comida y gastar sin control, beber en exceso y arrebatos verbales)?',
    },
    {
      key: 'extremadamenteMalHumor',
      label: '¿Ha estado extremadamente de mal humor?',
    },
    {
      key: 'enojadoFrecuenteActuaEnojadoSarcastico',
      label:
        '¿Se ha sentido muy enojado la mayor parte del tiempo? ¿Actúa de manera enojada o sarcástica con frecuencia?',
    },
    {
      key: 'desconfianzaOtrasPersonas',
      label: '¿Ha desconfiado a menudo de otras personas?',
    },
    {
      key: 'sensacionIrrealidadEntornoIrreal',
      label:
        '¿Se ha sentido frecuentemente irreal o como si las cosas a su alrededor fueran irreales?',
    },
    {
      key: 'vacioCronico',
      label: '¿Se ha sentido vacío de manera crónica?',
    },
    {
      key: 'faltaIdentidadQuienEs',
      label:
        '¿Ha sentido a menudo que no tiene ni idea de quién es o que carece de identidad?',
    },
    {
      key: 'esfuerzosEvitarAbandono',
      label:
        '¿Ha hecho esfuerzos desesperados para evitar sentirse abandonado o que le abandonen (por ejemplo: llamó repetidamente a alguien para asegurarse de que todavía le importaba, le rogó que no le dejara, se aferró a la persona físicamente)?',
    },
  ];

  const puntajeSi = (tl: { [K in ClaveCampoMsibpd]?: string }): number =>
    ITEMS_MSIBPD.reduce((acc, { key }) => acc + (tl[key] === 'Sí' ? 1 : 0), 0);

  const textoInterpretacionMsibpd = (p: number): string => {
    if (p <= 4) return 'Síntomas improbables de TLP presentes.';
    if (p <= 6) return 'Posibles síntomas de TLP presentes.';
    return 'Probable presencia de síntomas de TLP.';
  };

  /** Alineado con `VisualizadorTrastornoLimitePersonalidad.vue` (Tailwind green-600 | yellow-600 | orange-600). */
  const COLOR_INTERP_MSIBPD_IMPROBABLES = '#16a34a';
  const COLOR_INTERP_MSIBPD_POSIBLES = '#ca8a04';
  const COLOR_INTERP_MSIBPD_PROBABLE = '#ea580c';

  const colorInterpretacionMsibpd = (p: number): string => {
    if (p <= 4) return COLOR_INTERP_MSIBPD_IMPROBABLES;
    if (p <= 6) return COLOR_INTERP_MSIBPD_POSIBLES;
    return COLOR_INTERP_MSIBPD_PROBABLE;
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

  /** Tabla # | Pregunta | No | Sí (X), alineada con el visualizador. */
  const tablaCuestionarioMsibpd = (
    tl: { [K in ClaveCampoMsibpd]?: string },
  ): Content => {
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

    const dataRows: Content[][] = ITEMS_MSIBPD.map((item, idx) => {
      const v = tl[item.key];
      const fill = idx % 2 === 1 ? '#fafafa' : undefined;
      return [
        {
          text: String(idx + 1),
          fontSize: 8,
          alignment: 'center',
          valign: 'top',
          color: '#4b5563',
          ...(fill ? { fillColor: fill } : {}),
        } as Content,
        {
          text: item.label,
          bold: true,
          fontSize: 8,
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
        widths: [22, '*', 38, 38],
        body: [headerRow, ...dataRows],
      },
      layout: layoutTablaCuestionario,
    };
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
  
  interface TrastornoLimitePersonalidad {
    fechaTrastornoLimitePersonalidad: Date | string;
    relacionesCercanasDiscusionesRupturas?: string;
    autolesionIntentoSuicidio?: string;
    impulsividadOtrosDosProblemas?: string;
    extremadamenteMalHumor?: string;
    enojadoFrecuenteActuaEnojadoSarcastico?: string;
    desconfianzaOtrasPersonas?: string;
    sensacionIrrealidadEntornoIrreal?: string;
    vacioCronico?: string;
    faltaIdentidadQuienEs?: string;
    esfuerzosEvitarAbandono?: string;
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
  export const trastornoLimitePersonalidadInforme = (
    nombreEmpresa: string,
    trabajador: Trabajador,
    trastornoLimitePersonalidad: TrastornoLimitePersonalidad,
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

    const tl = trastornoLimitePersonalidad;
    const fechaTrastornoLimitePersonalidad =
      tl.fechaTrastornoLimitePersonalidad instanceof Date
        ? tl.fechaTrastornoLimitePersonalidad
        : new Date(tl.fechaTrastornoLimitePersonalidad as string);

    const puntaje = puntajeSi(tl);
    const textoInterpretacion = textoInterpretacionMsibpd(puntaje);
    const colorInterpretacion = colorInterpretacionMsibpd(puntaje);

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
                      text: formatearFechaUTC(fechaTrastornoLimitePersonalidad),
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
              text: 'Cuestionario MSI-BPD',
              fontSize: 11,
              bold: true,
              alignment: 'left',
              margin: [0, 0, 0, 2],
            },
            {
              text: 'McLean Screening Instrument for Borderline Personality Disorder',
              fontSize: 8,
              italics: true,
              color: '#6b7280',
              margin: [0, 0, 0, 6],
            },
            tablaCuestionarioMsibpd(tl),
            {
              text: [
                { text: 'Puntuación: ', bold: true, fontSize: 10 },
                { text: `${puntaje} / 10`, fontSize: 10 },
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
                          color: colorInterpretacion,
                          lineHeight: 1.25,
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
                          text: 'Interpretación de su puntuación:',
                          bold: true,
                          fontSize: 10,
                          margin: [0, 0, 0, 6],
                        },
                        {
                          text: [
                            {
                              text: 'De 0 a 4: Síntomas improbables de TLP presentes.\n',
                            },
                            {
                              text: 'De 5 a 6: Posibles síntomas de TLP presentes.\n',
                            },
                            {
                              text: 'De 7 a 10: Probable presencia de síntomas de TLP.',
                            },
                          ],
                          fontSize: 9,
                          lineHeight: 1.35,
                          bold: false,
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
  