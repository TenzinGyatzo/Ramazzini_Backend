import { CAMPOS_ENTREVISTA_PSICOLOGICA_APTITUD } from 'src/utils/aptitud-informe-psicologia-resumenes';
import {
  APTITUD_INFORME_VECINO_TYPES,
  getAptitudInformeVecinoSelect,
} from './aptitud-informe-vecinos-projection';

/** Campos que getInformeAptitudPuesto / resúmenes leen del vecino seleccionado. */
const CAMPOS_CONSUMIDOS_POR_TIPO: Record<string, string[]> = {
  historiaClinica: ['fechaHistoriaClinica', 'resumenHistoriaClinica'],
  exploracionFisica: [
    'fechaExploracionFisica',
    'tensionArterialSistolica',
    'tensionArterialDiastolica',
    'categoriaTensionArterial',
    'indiceMasaCorporal',
    'categoriaIMC',
    'circunferenciaCintura',
    'categoriaCircunferenciaCintura',
    'resumenExploracionFisica',
  ],
  examenVista: [
    'fechaExamenVista',
    'ojoIzquierdoCegueraTotal',
    'ojoDerechoCegueraTotal',
    'ojoIzquierdoLejanaCegueraTotal',
    'ojoDerechoLejanaCegueraTotal',
    'ojoIzquierdoCercanaCegueraTotal',
    'ojoDerechoCercanaCegueraTotal',
    'sinCorreccionNoEvaluablePorLentesContacto',
    'ojoIzquierdoLejanaSinCorreccion',
    'ojoDerechoLejanaSinCorreccion',
    'sinCorreccionLejanaInterpretacion',
    'ojoIzquierdoLejanaConCorreccion',
    'ojoDerechoLejanaConCorreccion',
    'conCorreccionLejanaInterpretacion',
    'porcentajeIshihara',
    'interpretacionIshihara',
  ],
  audiometria: [
    'fechaAudiometria',
    'diagnosticoAudiometria',
    'hipoacusiaBilateralCombinada',
  ],
  antidoping: [
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
  ],
  entrevistaPsicologica: [
    'fechaEntrevistaPsicologica',
    ...CAMPOS_ENTREVISTA_PSICOLOGICA_APTITUD,
  ],
  trastornosEstadoAnimo: [
    'fechaTrastornosEstadoAnimo',
    'p1ExaltadoComportamientoNoHabitualOMetidoProblemas',
    'p2SituacionesMismoPeriodo',
    'p3NivelProblemaCausado',
  ],
  cuestionarioProdromalBreve: [
    'fechaCuestionarioProdromalBreve',
    'p1',
    'p21',
    'p1GradoAcuerdoStatement',
    'p21GradoAcuerdoStatement',
  ],
  trastornoLimitePersonalidad: [
    'fechaTrastornoLimitePersonalidad',
    'relacionesCercanasDiscusionesRupturas',
    'esfuerzosEvitarAbandono',
  ],
};

describe('getAptitudInformeVecinoSelect', () => {
  it('cubre los 9 tipos de documentos vecinos del informe de aptitud', () => {
    expect(APTITUD_INFORME_VECINO_TYPES).toHaveLength(9);
    for (const documentType of APTITUD_INFORME_VECINO_TYPES) {
      expect(CAMPOS_CONSUMIDOS_POR_TIPO[documentType]).toBeDefined();
    }
  });

  it('incluye todos los campos consumidos por el PDF/resúmenes (equivalencia de datos)', () => {
    for (const documentType of APTITUD_INFORME_VECINO_TYPES) {
      const select = getAptitudInformeVecinoSelect(documentType);
      const tokens = new Set(select.split(/\s+/));
      for (const field of CAMPOS_CONSUMIDOS_POR_TIPO[documentType]) {
        expect(tokens.has(field)).toBe(true);
      }
    }
  });

  it('no proyecta users ni consentimiento', () => {
    for (const documentType of APTITUD_INFORME_VECINO_TYPES) {
      const select = getAptitudInformeVecinoSelect(documentType);
      expect(select).not.toMatch(/createdBy|finalizadoPor|consentimientoId/);
    }
  });
});
