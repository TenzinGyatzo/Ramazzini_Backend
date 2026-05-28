import { deriveCurpNameSegments, CurpNameData } from './curp-name-segments.util';

interface GoldenCase {
  label: string;
  data: CurpNameData;
  iniciales: string;
  consonantes?: string;
}

const goldenCases: GoldenCase[] = [
  // 1.1 Ñ en iniciales
  {
    label: '1.1 Ñacurutú Zárate y Heredia',
    data: { primerApellido: 'Zárate', segundoApellido: 'Heredia', nombre: 'Ñacurutú' },
    iniciales: 'ZAHX',
  },
  {
    label: '1.1 Alberto Ñando Rodríguez',
    data: { primerApellido: 'Ñando', segundoApellido: 'Rodríguez', nombre: 'Alberto' },
    iniciales: 'XARA',
  },
  {
    label: '1.1 Tomás Castillejo Ñandú',
    data: { primerApellido: 'Castillejo', segundoApellido: 'Ñandú', nombre: 'Tomás' },
    iniciales: 'CAXT',
  },
  // 1.2 Nombre compuesto
  {
    label: '1.2 Lucero Beatriz Alondra Pérez García',
    data: {
      primerApellido: 'Pérez',
      segundoApellido: 'García',
      nombre: 'Lucero Beatriz Alondra',
    },
    iniciales: 'PEGL',
    consonantes: 'RRC',
  },
  {
    label: '1.2 Javier Enrique Romero Palazuelos',
    data: {
      primerApellido: 'Romero',
      segundoApellido: 'Palazuelos',
      nombre: 'Javier Enrique',
    },
    iniciales: 'ROPJ',
    consonantes: 'MLV',
  },
  {
    label: '1.2 Guadalupe José María Reyes Gardu',
    data: {
      primerApellido: 'Reyes',
      segundoApellido: 'Gardu',
      nombre: 'Guadalupe José María',
    },
    iniciales: 'REGG',
    consonantes: 'YRD',
  },
  // 1.3 Excepción MARIA/JOSE
  {
    label: '1.3 María Luisa Pérez Hernández',
    data: {
      primerApellido: 'Pérez',
      segundoApellido: 'Hernández',
      nombre: 'María Luisa',
    },
    iniciales: 'PEHL',
  },
  {
    label: '1.3 Ma. Guadalupe Estrada López',
    data: {
      primerApellido: 'Estrada',
      segundoApellido: 'López',
      nombre: 'Ma. Guadalupe',
    },
    iniciales: 'EALG',
  },
  {
    label: '1.3 José María Hernández Lugo',
    data: {
      primerApellido: 'Hernández',
      segundoApellido: 'Lugo',
      nombre: 'José María',
    },
    iniciales: 'HELM',
    consonantes: 'RGR',
  },
  {
    label: '1.3 J Ricardo López Blanco',
    data: {
      primerApellido: 'López',
      segundoApellido: 'Blanco',
      nombre: 'J Ricardo',
    },
    iniciales: 'LOBR',
  },
  // 1.4 Caracteres especiales
  {
    label: "1.4 Juan José D/Amico Álvarez",
    data: {
      primerApellido: 'D/Amico',
      segundoApellido: 'Álvarez',
      nombre: 'Juan José',
    },
    iniciales: 'DXAJ',
    consonantes: 'XLN',
  },
  {
    label: "1.4 Juan José D'Amico Álvarez",
    data: {
      primerApellido: "D'Amico",
      segundoApellido: 'Álvarez',
      nombre: 'Juan José',
    },
    iniciales: 'DXAJ',
  },
  {
    label: "1.4 'Essio Torres Bravo",
    data: {
      primerApellido: 'Torres',
      segundoApellido: 'Bravo',
      nombre: "'Essio",
    },
    iniciales: 'TOBX',
  },
  {
    label: '1.4 guión en apellido L-Castillo',
    data: {
      primerApellido: 'L-Castillo',
      segundoApellido: 'Hogaza',
      nombre: 'Roberto',
    },
    iniciales: 'LXHR',
  },
  // 1.5 Apellidos compuestos (varias palabras por espacio)
  {
    label: '1.5 Rocío Riva Palacio Cruz',
    data: { primerApellido: 'Riva', segundoApellido: 'Cruz', nombre: 'Rocío' },
    iniciales: 'RICR',
  },
  {
    label: '1.5 Roberto López-Castillo Hogaza',
    data: {
      primerApellido: 'López-Castillo',
      segundoApellido: 'Hogaza',
      nombre: 'Roberto',
    },
    iniciales: 'LOHR',
  },
  {
    label: '1.5 Iliana Guillen del Castillo-Rodríguez',
    data: {
      primerApellido: 'Guillen',
      segundoApellido: 'del Castillo-Rodríguez',
      nombre: 'Iliana',
    },
    iniciales: 'GUCI',
  },
  // 1.6 Ü → U
  {
    label: '1.6 Dalia Argüello Pérez',
    data: { primerApellido: 'Argüello', segundoApellido: 'Pérez', nombre: 'Dalia' },
    iniciales: 'AUPD',
  },
  // 1.7 Partículas
  {
    label: '1.7 Carlos Mc Gregor López',
    data: {
      primerApellido: 'Mc Gregor',
      segundoApellido: 'López',
      nombre: 'Carlos',
    },
    iniciales: 'GELC',
  },
  {
    label: '1.7 Juan Ángel de las Lomas Garces',
    data: {
      primerApellido: 'de las Lomas',
      segundoApellido: 'Garces',
      nombre: 'Ángel',
    },
    iniciales: 'LOGA',
  },
  {
    label: '1.7 Van Rob Pérez Galeazi',
    data: {
      primerApellido: 'Pérez',
      segundoApellido: 'Galeazi',
      nombre: 'Van Rob',
    },
    iniciales: 'PEGR',
  },
  // 1.8 Palabras inconvenientes
  {
    label: '1.8 Ofelia Pedrero Domínguez',
    data: {
      primerApellido: 'Pedrero',
      segundoApellido: 'Domínguez',
      nombre: 'Ofelia',
    },
    iniciales: 'PXDO',
  },
  {
    label: '1.8 Oscar Johnson Torres',
    data: {
      primerApellido: 'Johnson',
      segundoApellido: 'Torres',
      nombre: 'Oscar',
    },
    iniciales: 'JXTO',
  },
  // 1.9 Sin vocal interna en primer apellido
  {
    label: '1.9 Andrés Ich Rodríguez',
    data: {
      primerApellido: 'Ich',
      segundoApellido: 'Rodríguez',
      nombre: 'Andrés',
    },
    iniciales: 'IXRA',
  },
  {
    label: '1.9 Yazbek Smrz Jarosval',
    data: {
      primerApellido: 'Smrz',
      segundoApellido: 'Jarosval',
      nombre: 'Yazbek',
    },
    iniciales: 'SXJY',
  },
  // 1.10 Un solo apellido
  {
    label: '1.10 Julio Tomás Garduño',
    data: { primerApellido: 'Garduño', nombre: 'Julio Tomás' },
    iniciales: 'GAXJ',
  },
  {
    label: '1.10 Margarita Zaro',
    data: { primerApellido: 'Zaro', nombre: 'Margarita' },
    iniciales: 'ZAXM',
    consonantes: 'RXR',
  },
  // 1.11 Sin apellidos
  {
    label: '1.11 Juan',
    data: { nombre: 'Juan' },
    iniciales: 'XXXJ',
    consonantes: 'XXN',
  },
  {
    label: '1.11 Nancy',
    data: { nombre: 'Nancy' },
    iniciales: 'XXXN',
  },
  // 1.12 Ñ consonante interna
  {
    label: '1.12 Alberto Oñate Rodríguez',
    data: {
      primerApellido: 'Oñate',
      segundoApellido: 'Rodríguez',
      nombre: 'Alberto',
    },
    consonantes: 'XDL',
    iniciales: 'OARA',
  },
  {
    label: '1.12 Paola Eñuma Rosas',
    data: {
      primerApellido: 'Eñuma',
      segundoApellido: 'Rosas',
      nombre: 'Paola',
    },
    consonantes: 'XSL',
    iniciales: 'EURP',
  },
  // 1.13 Sin consonante interna
  {
    label: '1.13 Andrés Po Barrios',
    data: {
      primerApellido: 'Po',
      segundoApellido: 'Barrios',
      nombre: 'Andrés',
    },
    consonantes: 'XRN',
    iniciales: 'POBA',
  },
  {
    label: '1.13 Manuel Pedroza Ueia',
    data: {
      primerApellido: 'Pedroza',
      segundoApellido: 'Ueia',
      nombre: 'Manuel',
    },
    consonantes: 'DXN',
    iniciales: 'PEUM',
  },
  // 1.14 Un solo apellido consonantes
  {
    label: '1.14 Leticia Luna',
    data: { primerApellido: 'Luna', nombre: 'Leticia' },
    consonantes: 'NXT',
    iniciales: 'LUXL',
  },
  {
    label: '1.14 Claudio Zitlalpopoca',
    data: { primerApellido: 'Zitlalpopoca', nombre: 'Claudio' },
    consonantes: 'TXL',
    iniciales: 'ZIXC',
  },
  // 1.16 MARIA/JOSE consonantes
  {
    label: '1.16 Ma. de los Ángeles Moreno Sánchez',
    data: {
      primerApellido: 'Moreno',
      segundoApellido: 'Sánchez',
      nombre: 'Ma. de los Ángeles',
    },
    consonantes: 'RNN',
    iniciales: 'MOSA',
  },
  {
    label: '1.16 María José Estrada López',
    data: {
      primerApellido: 'Estrada',
      segundoApellido: 'López',
      nombre: 'María José',
    },
    consonantes: 'SPS',
    iniciales: 'EALJ',
  },
  // 1.17 Sin apellidos consonantes
  {
    label: '1.17 Federico',
    data: { nombre: 'Federico' },
    iniciales: 'XXXF',
    consonantes: 'XXD',
  },
  {
    label: '1.17 Fabiola',
    data: { nombre: 'Fabiola' },
    iniciales: 'XXXF',
    consonantes: 'XXB',
  },
  // 1.18 Caracteres especiales consonantes
  {
    label: "1.18 Juan José O'Hara Álvarez",
    data: {
      primerApellido: "O'Hara",
      segundoApellido: 'Álvarez',
      nombre: 'Juan José',
    },
    consonantes: 'XLN',
    iniciales: 'OXAJ',
  },
];

describe('curp-name-segments.special-cases', () => {
  it.each(goldenCases)('$label', ({ data, iniciales, consonantes }) => {
    const result = deriveCurpNameSegments(data);
    expect(result.iniciales).toBe(iniciales);
    if (consonantes !== undefined) {
      expect(result.consonantes).toBe(consonantes);
    }
  });
});
