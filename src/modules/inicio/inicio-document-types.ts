import {
  EXPEDIENTE_DOCUMENT_MODEL_NAMES,
  EXPEDIENTE_MODEL_NAME_TO_DOCUMENT_TYPE,
  WORKER_LINKED_COLLECTIONS,
} from '../trabajadores/constants/worker-linked-collections.constant';

export type InicioRegimen = 'SIRES_NOM024' | 'SIN_REGIMEN';

export interface InicioDocumentTypeConfig {
  modelName: string;
  collectionName: string;
  documentType: string;
  etiqueta: string;
}

export const INICIO_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  antidoping: 'Antidoping',
  aptitud: 'Aptitud al puesto',
  audiometria: 'Audiometría',
  certificado: 'Certificado',
  certificadoExpedito: 'Certificado expedito',
  documentoExterno: 'Documento externo',
  examenVista: 'Examen de la vista',
  exploracionFisica: 'Exploración física',
  historiaClinica: 'Historia clínica',
  notaMedica: 'Nota médica',
  notaAclaratoria: 'Nota aclaratoria',
  controlPrenatal: 'Control prenatal',
  historiaOtologica: 'Historia otológica',
  previoEspirometria: 'Previo espirometría',
  constanciaAptitud: 'Constancia de aptitud',
  receta: 'Receta',
  entrevistaPsicologica: 'Entrevista psicológica',
  trastornosEstadoAnimo: 'Trastornos del estado de ánimo',
  cuestionarioProdromalBreve: 'Cuestionario prodromal breve',
  trastornoLimitePersonalidad: 'Trastorno límite de la personalidad',
  eventoSeguimientoCardiometabolico: 'Seguimiento cardiometabólico',
  informeLongitudinalCardiometabolico: 'Informe longitudinal cardiometabólico',
  informeLongitudinalAudiometrico: 'Informe longitudinal audiométrico',
};

const SIRES_EXCLUDED = new Set(['controlPrenatal']);
const SIN_REGIMEN_EXCLUDED = new Set(['notaAclaratoria']);

export const INICIO_DOCUMENT_TYPES: InicioDocumentTypeConfig[] =
  WORKER_LINKED_COLLECTIONS.filter((item) =>
    EXPEDIENTE_DOCUMENT_MODEL_NAMES.has(item.modelName),
  )
    .map((item) => {
      const documentType =
        EXPEDIENTE_MODEL_NAME_TO_DOCUMENT_TYPE[item.modelName];
      return {
        modelName: item.modelName,
        collectionName: item.collectionName,
        documentType,
        etiqueta: INICIO_DOCUMENT_TYPE_LABELS[documentType] ?? documentType,
      };
    })
    .filter((item): item is InicioDocumentTypeConfig =>
      Boolean(item.documentType),
    );

export function getInicioDocumentTypesForRegime(
  regimen: InicioRegimen,
): InicioDocumentTypeConfig[] {
  const excluded =
    regimen === 'SIRES_NOM024' ? SIRES_EXCLUDED : SIN_REGIMEN_EXCLUDED;
  return INICIO_DOCUMENT_TYPES.filter(
    (item) => !excluded.has(item.documentType),
  );
}

export function getInicioDocumentTypeByCollection(
  collectionName: string,
): InicioDocumentTypeConfig | undefined {
  return INICIO_DOCUMENT_TYPES.find(
    (item) => item.collectionName === collectionName,
  );
}
