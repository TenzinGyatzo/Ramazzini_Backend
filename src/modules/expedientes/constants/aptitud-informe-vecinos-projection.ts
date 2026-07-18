/**
 * Proyección mínima de documentos vecinos para el PDF de aptitud al puesto.
 * Solo campos leídos por getInformeAptitudPuesto / resúmenes de psicología.
 * Sin users ni consentimiento.
 */
import { CAMPOS_ENTREVISTA_PSICOLOGICA_APTITUD } from 'src/utils/aptitud-informe-psicologia-resumenes';
import { DOCUMENTO_LIST_EXTRA_FIELDS } from './documento-list-projection';

export const APTITUD_INFORME_VECINO_TYPES = [
  'historiaClinica',
  'exploracionFisica',
  'examenVista',
  'audiometria',
  'antidoping',
  'entrevistaPsicologica',
  'trastornosEstadoAnimo',
  'cuestionarioProdromalBreve',
  'trastornoLimitePersonalidad',
] as const;

export type AptitudInformeVecinoType =
  (typeof APTITUD_INFORME_VECINO_TYPES)[number];

const HISTORIA_CLINICA_FIELDS = [
  'fechaHistoriaClinica',
  'resumenHistoriaClinica',
] as const;

const EXPLORACION_FISICA_FIELDS = [
  'fechaExploracionFisica',
  'tensionArterialSistolica',
  'tensionArterialDiastolica',
  'categoriaTensionArterial',
  'indiceMasaCorporal',
  'categoriaIMC',
  'circunferenciaCintura',
  'categoriaCircunferenciaCintura',
  'resumenExploracionFisica',
] as const;

const EXAMEN_VISTA_FIELDS = [
  'fechaExamenVista',
  'ojoIzquierdoCegueraTotal',
  'ojoDerechoCegueraTotal',
  'ojoIzquierdoLejanaCegueraTotal',
  'ojoDerechoLejanaCegueraTotal',
  'ojoIzquierdoCercanaCegueraTotal',
  'ojoDerechoCercanaCegueraTotal',
  'ojoIzquierdoLejanaSinCorreccion',
  'ojoDerechoLejanaSinCorreccion',
  'sinCorreccionLejanaInterpretacion',
  'ojoIzquierdoLejanaConCorreccion',
  'ojoDerechoLejanaConCorreccion',
  'conCorreccionLejanaInterpretacion',
  'porcentajeIshihara',
  'interpretacionIshihara',
] as const;

const AUDIOMETRIA_FIELDS = [
  'fechaAudiometria',
  'diagnosticoAudiometria',
  'hipoacusiaBilateralCombinada',
] as const;

const ANTIDOPING_FIELDS = [
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
] as const;

const ENTREVISTA_PSICOLOGICA_FIELDS = [
  'fechaEntrevistaPsicologica',
  ...CAMPOS_ENTREVISTA_PSICOLOGICA_APTITUD,
] as const;

const APTITUD_INFORME_VECINO_FIELDS: Record<
  AptitudInformeVecinoType,
  readonly string[]
> = {
  historiaClinica: HISTORIA_CLINICA_FIELDS,
  exploracionFisica: EXPLORACION_FISICA_FIELDS,
  examenVista: EXAMEN_VISTA_FIELDS,
  audiometria: AUDIOMETRIA_FIELDS,
  antidoping: ANTIDOPING_FIELDS,
  entrevistaPsicologica: ENTREVISTA_PSICOLOGICA_FIELDS,
  // MDQ / PQ-B / TLP: mismos campos que el listado (completos para el resumen).
  trastornosEstadoAnimo:
    DOCUMENTO_LIST_EXTRA_FIELDS.trastornosEstadoAnimo ?? [],
  cuestionarioProdromalBreve:
    DOCUMENTO_LIST_EXTRA_FIELDS.cuestionarioProdromalBreve ?? [],
  trastornoLimitePersonalidad:
    DOCUMENTO_LIST_EXTRA_FIELDS.trastornoLimitePersonalidad ?? [],
};

export function getAptitudInformeVecinoSelect(
  documentType: AptitudInformeVecinoType | string,
): string {
  const fields =
    APTITUD_INFORME_VECINO_FIELDS[documentType as AptitudInformeVecinoType];
  if (!fields?.length) {
    throw new Error(
      `Proyección de aptitud no definida para tipo: ${documentType}`,
    );
  }
  return ['_id', ...fields].join(' ');
}
