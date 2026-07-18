/**
 * Proyección mínima para listado de expediente (miniaturas / chips).
 * El documento completo se carga en findDocument / getById al editar.
 */

export const DOCUMENTO_LIST_COMMON_FIELDS = [
  '_id',
  'idTrabajador',
  'rutaPDF',
  'rutaDocumento',
  'nombreDocumento',
  'extension',
  'updatedAt',
  'createdAt',
  'pdfStatus',
  'estado',
  'fechaFinalizacion',
  'finalizadoPor',
  'fechaAnulacion',
  'anuladoPor',
  'razonAnulacion',
] as const;

const ANTIDOPING_EXTRA = [
  'fechaAntidoping',
  'marihuana',
  'cocaina',
  'anfetaminas',
  'metanfetaminas',
  'opiaceos',
  'benzodiacepinas',
  'fenciclidina',
  'metadona',
  'barbituricos',
  'antidepresivosTriciclicos',
  'metilendioximetanfetamina',
  'ketamina',
];

const AUDIOMETRIA_EXTRA = [
  'fechaAudiometria',
  'metodoAudiometria',
  'hipoacusiaBilateralCombinada',
  'diagnosticoAudiometria',
  'oidoDerecho500',
  'oidoDerecho1000',
  'oidoDerecho2000',
  'oidoDerecho3000',
  'oidoIzquierdo500',
  'oidoIzquierdo1000',
  'oidoIzquierdo2000',
  'oidoIzquierdo3000',
];

const CONTROL_PRENATAL_EXTRA = [
  'fechaInicioControlPrenatal',
  'fpp',
  'eneroFecha',
  'febreroFecha',
  'marzoFecha',
  'abrilFecha',
  'mayoFecha',
  'junioFecha',
  'julioFecha',
  'agostoFecha',
  'septiembreFecha',
  'octubreFecha',
  'noviembreFecha',
  'diciembreFecha',
];

const MDQ_EXTRA = [
  'fechaTrastornosEstadoAnimo',
  'p1ExaltadoComportamientoNoHabitualOMetidoProblemas',
  'p1IrritableGritosPeleas',
  'p1MasSeguridadQueLoHabitual',
  'p1DormiaMenosSinNecesitarMasSueno',
  'p1HablabaMasOMasRapido',
  'p1PensamientosAgolpados',
  'p1DistraccionDificultadConcentracion',
  'p1MasEnergiaQueLoHabitual',
  'p1MasActivoOMasCosasQueLoHabitual',
  'p1MasSocialExtrovertido',
  'p1MasApetitoSexual',
  'p1CosasExageradasRiesgosas',
  'p1GastoDineroProblemas',
  'p2SituacionesMismoPeriodo',
  'p3NivelProblemaCausado',
];

const PQB_ITEM_FIELDS = Array.from({ length: 21 }, (_, i) => `p${i + 1}`);
const PQB_GRADO_FIELDS = Array.from(
  { length: 21 },
  (_, i) => `p${i + 1}GradoAcuerdoStatement`,
);

const PQB_EXTRA = [
  'fechaCuestionarioProdromalBreve',
  ...PQB_ITEM_FIELDS,
  ...PQB_GRADO_FIELDS,
];

const TLP_EXTRA = [
  'fechaTrastornoLimitePersonalidad',
  'relacionesCercanasDiscusionesRupturas',
  'autolesionIntentoSuicidio',
  'impulsividadOtrosDosProblemas',
  'extremadamenteMalHumor',
  'enojadoFrecuenteActuaEnojadoSarcastico',
  'desconfianzaOtrasPersonas',
  'sensacionIrrealidadEntornoIrreal',
  'vacioCronico',
  'faltaIdentidadQuienEs',
  'esfuerzosEvitarAbandono',
];

/** Campos adicionales por documentType (además de COMMON). */
export const DOCUMENTO_LIST_EXTRA_FIELDS: Record<string, string[]> = {
  antidoping: ANTIDOPING_EXTRA,
  aptitud: ['fechaAptitudPuesto', 'aptitudPuesto'],
  audiometria: AUDIOMETRIA_EXTRA,
  certificado: ['fechaCertificado', 'impedimentosFisicos'],
  certificadoExpedito: [
    'fechaCertificadoExpedito',
    'impedimentosFisicos',
    'aptitudPuesto',
  ],
  documentoExterno: [
    'fechaDocumento',
    'notasDocumento',
    'idResultadoClinico',
  ],
  examenVista: [
    'fechaExamenVista',
    'requiereLentesUsoGeneral',
    'porcentajeIshihara',
    'ojoIzquierdoLejanaConCorreccion',
    'ojoDerechoLejanaConCorreccion',
    'sinCorreccionLejanaInterpretacion',
    'conCorreccionLejanaInterpretacion',
  ],
  exploracionFisica: [
    'fechaExploracionFisica',
    'resumenExploracionFisica',
    'indiceMasaCorporal',
    'categoriaIMC',
    'categoriaTensionArterial',
  ],
  historiaClinica: [
    'fechaHistoriaClinica',
    'resumenHistoriaClinica',
    'motivoExamen',
    'accidenteLaboral',
    'secuelas',
  ],
  notaMedica: [
    'fechaNotaMedica',
    'diagnostico',
    'tipoNota',
    'codigoCIE10Principal',
  ],
  notaAclaratoria: [
    'fechaNotaAclaratoria',
    'documentoOrigenTipo',
    'documentoOrigenId',
    'documentoOrigenNombre',
    'documentoOrigenFecha',
    'alcanceAclaracion',
    'impactoClinico',
  ],
  controlPrenatal: CONTROL_PRENATAL_EXTRA,
  historiaOtologica: [
    'fechaHistoriaOtologica',
    'resultadoCuestionario',
    'resultadoCuestionarioPersonalizado',
  ],
  previoEspirometria: [
    'fechaPrevioEspirometria',
    'resultadoCuestionario',
    'resultadoCuestionarioPersonalizado',
  ],
  receta: ['fechaReceta', 'tratamiento', 'indicaciones'],
  constanciaAptitud: ['fechaConstanciaAptitud'],
  entrevistaPsicologica: [
    'fechaEntrevistaPsicologica',
    'ideacionSuicida',
    'conclusionClinica',
  ],
  trastornosEstadoAnimo: MDQ_EXTRA,
  cuestionarioProdromalBreve: PQB_EXTRA,
  trastornoLimitePersonalidad: TLP_EXTRA,
  eventoSeguimientoCardiometabolico: [
    'fechaEventoSeguimientoCardiometabolico',
    'estadoCondiciones',
  ],
  informeLongitudinalCardiometabolico: [
    'fechaInformeLongitudinalCardiometabolico',
    'nivelRiesgoLongitudinal',
    'tendenciaLongitudinal',
    'porcentajeAsistencia',
    'consistenciaSeguimiento',
  ],
};

export function getDocumentoListSelect(documentType: string): string {
  const extra = DOCUMENTO_LIST_EXTRA_FIELDS[documentType] ?? [];
  return [...DOCUMENTO_LIST_COMMON_FIELDS, ...extra].join(' ');
}
