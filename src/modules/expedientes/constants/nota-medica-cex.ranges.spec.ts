import {
  normalizeNotaMedicaCexSentinels,
  validateNotaMedicaCexField,
  validateNotaMedicaCexQuantities,
} from './nota-medica-cex.ranges';

describe('nota-medica-cex.ranges', () => {
  describe('validateNotaMedicaCexField', () => {
    it('acepta bordes inclusivos', () => {
      expect(validateNotaMedicaCexField('peso', 1)).toBeNull();
      expect(validateNotaMedicaCexField('peso', 400)).toBeNull();
      expect(validateNotaMedicaCexField('talla', 30)).toBeNull();
      expect(validateNotaMedicaCexField('talla', 220)).toBeNull();
      expect(validateNotaMedicaCexField('tensionArterialSistolica', 50)).toBeNull();
      expect(validateNotaMedicaCexField('tensionArterialSistolica', 300)).toBeNull();
      expect(validateNotaMedicaCexField('frecuenciaRespiratoria', 10)).toBeNull();
      expect(validateNotaMedicaCexField('frecuenciaRespiratoria', 99)).toBeNull();
      expect(validateNotaMedicaCexField('temperatura', 30)).toBeNull();
      expect(validateNotaMedicaCexField('temperatura', 44)).toBeNull();
      expect(validateNotaMedicaCexField('saturacionOxigeno', 1)).toBeNull();
      expect(validateNotaMedicaCexField('saturacionOxigeno', 100)).toBeNull();
      expect(validateNotaMedicaCexField('glucemia', 20)).toBeNull();
      expect(validateNotaMedicaCexField('glucemia', 999)).toBeNull();
    });

    it('rechaza fuera de rango por 1', () => {
      expect(validateNotaMedicaCexField('peso', 0)).toContain('mínimo');
      expect(validateNotaMedicaCexField('peso', 401)).toContain('máximo');
      expect(validateNotaMedicaCexField('frecuenciaCardiaca', 39)).toContain('mínimo');
      expect(validateNotaMedicaCexField('saturacionOxigeno', 101)).toContain('máximo');
    });

    it('skipea sentinels y null', () => {
      expect(validateNotaMedicaCexField('peso', 999)).toBeNull();
      expect(validateNotaMedicaCexField('peso', null)).toBeNull();
      expect(validateNotaMedicaCexField('frecuenciaCardiaca', 0)).toBeNull();
      expect(validateNotaMedicaCexField('glucemia', 0)).toBeNull();
      expect(validateNotaMedicaCexField('circunferenciaCintura', 0)).toBeNull();
    });

    it('valida formato peso ###.### y temperatura ##.#', () => {
      expect(validateNotaMedicaCexField('peso', 70.123)).toBeNull();
      expect(validateNotaMedicaCexField('peso', 70.1234)).toContain('formato');
      expect(validateNotaMedicaCexField('temperatura', 36.5)).toBeNull();
      expect(validateNotaMedicaCexField('temperatura', 36.55)).toContain('formato');
    });

    it('acepta valores CEX que el util genérico rechazaba', () => {
      expect(validateNotaMedicaCexField('saturacionOxigeno', 65)).toBeNull();
      expect(validateNotaMedicaCexField('frecuenciaRespiratoria', 70)).toBeNull();
      expect(validateNotaMedicaCexField('tensionArterialSistolica', 55)).toBeNull();
      expect(validateNotaMedicaCexField('peso', 15)).toBeNull();
    });
  });

  describe('validateNotaMedicaCexQuantities', () => {
    it('acepta TA igual y rechaza S < D', () => {
      expect(
        validateNotaMedicaCexQuantities({
          tensionArterialSistolica: 100,
          tensionArterialDiastolica: 100,
        }),
      ).toBeNull();
      expect(
        validateNotaMedicaCexQuantities({
          tensionArterialSistolica: 80,
          tensionArterialDiastolica: 90,
        }),
      ).toContain('sistólica');
    });

    it('exige pareja 0/0 para desconoce TA', () => {
      expect(
        validateNotaMedicaCexQuantities({
          tensionArterialSistolica: 0,
          tensionArterialDiastolica: 80,
        }),
      ).toContain('ambas deben ser 0');
    });

    it('exige condicionales de glucemia cuando glucemia informada', () => {
      expect(
        validateNotaMedicaCexQuantities({
          glucemia: 80,
          tipoMedicion: -1,
          resultadoObtenidoaTravesde: -1,
        }),
      ).toContain('tipoMedicion');
      expect(
        validateNotaMedicaCexQuantities({
          glucemia: 80,
          tipoMedicion: 1,
          resultadoObtenidoaTravesde: -1,
        }),
      ).toContain('resultadoObtenidoaTravesde');
      expect(
        validateNotaMedicaCexQuantities({
          glucemia: 80,
          tipoMedicion: 0,
          resultadoObtenidoaTravesde: 2,
        }),
      ).toBeNull();
    });

    it('skipea condicionales si glucemia=0', () => {
      expect(
        validateNotaMedicaCexQuantities({
          glucemia: 0,
          tipoMedicion: -1,
          resultadoObtenidoaTravesde: -1,
        }),
      ).toBeNull();
    });
  });

  describe('normalizeNotaMedicaCexSentinels', () => {
    it('mapea null a sentinels', () => {
      const out = normalizeNotaMedicaCexSentinels({
        peso: null,
        talla: null,
        frecuenciaCardiaca: null,
        glucemia: null,
      } as Record<string, unknown>);
      expect(out.peso).toBe(999);
      expect(out.talla).toBe(999);
      expect(out.frecuenciaCardiaca).toBe(0);
      expect(out.glucemia).toBe(0);
      expect(out.tipoMedicion).toBe(-1);
      expect(out.resultadoObtenidoaTravesde).toBe(-1);
    });

    it('no inventa campos ausentes', () => {
      const out = normalizeNotaMedicaCexSentinels({
        motivoConsulta: 'x',
      } as Record<string, unknown>);
      expect(out.peso).toBeUndefined();
      expect(out.frecuenciaCardiaca).toBeUndefined();
    });
  });
});
