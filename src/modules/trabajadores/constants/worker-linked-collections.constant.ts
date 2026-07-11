/**
 * Single source of truth for MongoDB collections linked to Trabajador via FK.
 * Used by manual fusion, legacy migration script, and tests.
 */
export interface WorkerLinkedCollectionConfig {
  /** Mongoose model name (schema class .name) */
  modelName: string;
  /** MongoDB collection name (lowercase plural) */
  collectionName: string;
  fkField: 'idTrabajador' | 'trabajadorId';
  fileField?: 'rutaPDF' | 'rutaDocumento';
}

export const WORKER_LINKED_COLLECTIONS: WorkerLinkedCollectionConfig[] = [
  { modelName: 'Antidoping', collectionName: 'antidopings', fkField: 'idTrabajador', fileField: 'rutaPDF' },
  { modelName: 'AptitudPuesto', collectionName: 'aptitudpuestos', fkField: 'idTrabajador', fileField: 'rutaPDF' },
  { modelName: 'Audiometria', collectionName: 'audiometrias', fkField: 'idTrabajador', fileField: 'rutaPDF' },
  { modelName: 'Certificado', collectionName: 'certificados', fkField: 'idTrabajador', fileField: 'rutaPDF' },
  { modelName: 'CertificadoExpedito', collectionName: 'certificadoexpeditos', fkField: 'idTrabajador', fileField: 'rutaPDF' },
  { modelName: 'ExamenVista', collectionName: 'examenvistas', fkField: 'idTrabajador', fileField: 'rutaPDF' },
  { modelName: 'ExploracionFisica', collectionName: 'exploracionfisicas', fkField: 'idTrabajador', fileField: 'rutaPDF' },
  { modelName: 'HistoriaClinica', collectionName: 'historiaclinicas', fkField: 'idTrabajador', fileField: 'rutaPDF' },
  { modelName: 'NotaMedica', collectionName: 'notamedicas', fkField: 'idTrabajador', fileField: 'rutaPDF' },
  { modelName: 'NotaAclaratoria', collectionName: 'notaaclaratorias', fkField: 'idTrabajador', fileField: 'rutaPDF' },
  { modelName: 'ControlPrenatal', collectionName: 'controlprenatals', fkField: 'idTrabajador', fileField: 'rutaPDF' },
  { modelName: 'HistoriaOtologica', collectionName: 'historiaotologicas', fkField: 'idTrabajador', fileField: 'rutaPDF' },
  { modelName: 'PrevioEspirometria', collectionName: 'previoespirometrias', fkField: 'idTrabajador', fileField: 'rutaPDF' },
  { modelName: 'ConstanciaAptitud', collectionName: 'constanciaaptituds', fkField: 'idTrabajador', fileField: 'rutaPDF' },
  { modelName: 'Receta', collectionName: 'recetas', fkField: 'idTrabajador', fileField: 'rutaPDF' },
  { modelName: 'EntrevistaPsicologica', collectionName: 'entrevistapsicologicas', fkField: 'idTrabajador', fileField: 'rutaPDF' },
  { modelName: 'TrastornosEstadoAnimo', collectionName: 'trastornosestadoanimos', fkField: 'idTrabajador', fileField: 'rutaPDF' },
  { modelName: 'CuestionarioProdromalBreve', collectionName: 'cuestionarioprodromalbreves', fkField: 'idTrabajador', fileField: 'rutaPDF' },
  { modelName: 'TrastornoLimitePersonalidad', collectionName: 'trastornolimitepersonalidads', fkField: 'idTrabajador', fileField: 'rutaPDF' },
  { modelName: 'EventoSeguimientoCardiometabolico', collectionName: 'eventoseguimientocardiometabolicos', fkField: 'idTrabajador', fileField: 'rutaPDF' },
  { modelName: 'InformeLongitudinalCardiometabolico', collectionName: 'informelongitudinalcardiometabolicos', fkField: 'idTrabajador', fileField: 'rutaPDF' },
  { modelName: 'SeguimientoProgramadoCardiometabolico', collectionName: 'seguimientoprogramadocardiometabolicos', fkField: 'idTrabajador', fileField: 'rutaPDF' },
  { modelName: 'Deteccion', collectionName: 'deteccions', fkField: 'idTrabajador' },
  { modelName: 'DocumentoExterno', collectionName: 'documentoexternos', fkField: 'idTrabajador', fileField: 'rutaDocumento' },
  { modelName: 'RiesgoTrabajo', collectionName: 'riesgotrabajos', fkField: 'idTrabajador' },
  { modelName: 'ResultadoClinico', collectionName: 'resultadoclinicos', fkField: 'idTrabajador' },
  { modelName: 'Consentimiento', collectionName: 'consentimientos', fkField: 'trabajadorId' },
];

/**
 * Model names that appear as documents in ExpedienteMedicoView (documentos store).
 * Used for user-facing counts in fusion preview; must stay aligned with fetchAllDocuments.
 */
/** Mongoose model name → expedientes.service documentType key */
export const EXPEDIENTE_MODEL_NAME_TO_DOCUMENT_TYPE: Record<string, string> = {
  Antidoping: 'antidoping',
  AptitudPuesto: 'aptitud',
  Audiometria: 'audiometria',
  Certificado: 'certificado',
  CertificadoExpedito: 'certificadoExpedito',
  DocumentoExterno: 'documentoExterno',
  ExamenVista: 'examenVista',
  ExploracionFisica: 'exploracionFisica',
  HistoriaClinica: 'historiaClinica',
  NotaMedica: 'notaMedica',
  NotaAclaratoria: 'notaAclaratoria',
  ControlPrenatal: 'controlPrenatal',
  HistoriaOtologica: 'historiaOtologica',
  PrevioEspirometria: 'previoEspirometria',
  ConstanciaAptitud: 'constanciaAptitud',
  Receta: 'receta',
  EntrevistaPsicologica: 'entrevistaPsicologica',
  TrastornosEstadoAnimo: 'trastornosEstadoAnimo',
  CuestionarioProdromalBreve: 'cuestionarioProdromalBreve',
  TrastornoLimitePersonalidad: 'trastornoLimitePersonalidad',
  EventoSeguimientoCardiometabolico: 'eventoSeguimientoCardiometabolico',
  InformeLongitudinalCardiometabolico: 'informeLongitudinalCardiometabolico',
};

export const EXPEDIENTE_DOCUMENT_MODEL_NAMES = new Set<string>([
  'Antidoping',
  'AptitudPuesto',
  'Audiometria',
  'Certificado',
  'CertificadoExpedito',
  'ExamenVista',
  'ExploracionFisica',
  'HistoriaClinica',
  'NotaMedica',
  'NotaAclaratoria',
  'ControlPrenatal',
  'HistoriaOtologica',
  'PrevioEspirometria',
  'ConstanciaAptitud',
  'Receta',
  'EntrevistaPsicologica',
  'TrastornosEstadoAnimo',
  'CuestionarioProdromalBreve',
  'TrastornoLimitePersonalidad',
  'EventoSeguimientoCardiometabolico',
  'InformeLongitudinalCardiometabolico',
  'DocumentoExterno',
]);

/** Human-readable labels for non-expediente linked records shown in fusion preview. */
export const LINKED_RECORD_LABELS: Record<string, string> = {
  SeguimientoProgramadoCardiometabolico: 'Seguimiento programado cardiometabólico',
  Deteccion: 'Detección',
  RiesgoTrabajo: 'Riesgo de trabajo',
  ResultadoClinico: 'Resultado clínico (estudio)',
  Consentimiento: 'Consentimiento para tratamiento de información',
};
