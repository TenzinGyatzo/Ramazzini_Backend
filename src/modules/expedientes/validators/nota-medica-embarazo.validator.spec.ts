import {
  aplicaRelacionTemporalEmbarazo,
  calcularEdadEmbarazo,
  normalizarCamposEmbarazo,
  resolverCamposEmbarazoCex,
  validarCamposEmbarazo,
} from './nota-medica-embarazo.validator';

describe('nota-medica-embarazo.validator', () => {
  const mujer25 = {
    sexo: 'Femenino',
    fechaNacimiento: new Date('2000-01-15'),
  };
  const hombre25 = {
    sexo: 'Masculino',
    fechaNacimiento: new Date('2000-01-15'),
  };
  const mujer8 = {
    sexo: 'Femenino',
    fechaNacimiento: new Date('2017-06-01'),
  };
  const fechaConsulta = new Date('2026-05-23');

  describe('aplicaRelacionTemporalEmbarazo', () => {
    it('aplica para mujer 9–59 años', () => {
      const edad = calcularEdadEmbarazo(
        mujer25.fechaNacimiento,
        fechaConsulta,
      );
      expect(aplicaRelacionTemporalEmbarazo('Femenino', edad)).toBe(true);
    });

    it('no aplica para hombre', () => {
      const edad = calcularEdadEmbarazo(
        hombre25.fechaNacimiento,
        fechaConsulta,
      );
      expect(aplicaRelacionTemporalEmbarazo('Masculino', edad)).toBe(false);
    });

    it('no aplica para intersexual', () => {
      const edad = calcularEdadEmbarazo(
        hombre25.fechaNacimiento,
        fechaConsulta,
      );
      expect(aplicaRelacionTemporalEmbarazo('Intersexual', edad)).toBe(false);
    });

    it('no aplica para mujer menor de 9 años', () => {
      const edad = calcularEdadEmbarazo(mujer8.fechaNacimiento, fechaConsulta);
      expect(aplicaRelacionTemporalEmbarazo('Femenino', edad)).toBe(false);
    });
  });

  describe('normalizarCamposEmbarazo', () => {
    it('fuerza -1 para hombre', () => {
      const dto = {
        relacionTemporalEmbarazo: 0,
        trimestreGestacional: 2,
        fechaNotaMedica: fechaConsulta,
      };
      normalizarCamposEmbarazo(dto, hombre25);
      expect(dto.relacionTemporalEmbarazo).toBe(-1);
      expect(dto.trimestreGestacional).toBe(-1);
    });

    it('conserva embarazo válido para mujer elegible', () => {
      const dto = {
        relacionTemporalEmbarazo: 1,
        trimestreGestacional: 3,
        fechaNotaMedica: fechaConsulta,
      };
      normalizarCamposEmbarazo(dto, mujer25);
      expect(dto.relacionTemporalEmbarazo).toBe(1);
      expect(dto.trimestreGestacional).toBe(3);
    });

    it('normaliza trimestre inválido a -1 cuando embarazo es -1', () => {
      const dto = {
        relacionTemporalEmbarazo: -1,
        trimestreGestacional: 2,
        fechaNotaMedica: fechaConsulta,
      };
      normalizarCamposEmbarazo(dto, mujer25);
      expect(dto.relacionTemporalEmbarazo).toBe(-1);
      expect(dto.trimestreGestacional).toBe(-1);
    });
  });

  describe('validarCamposEmbarazo', () => {
    it('rechaza embarazo sin trimestre', () => {
      const dto = {
        relacionTemporalEmbarazo: 0,
        trimestreGestacional: -1,
        fechaNotaMedica: fechaConsulta,
      };
      const result = validarCamposEmbarazo(dto, mujer25);
      expect(result.ok).toBe(false);
    });

    it('acepta no aplica para mujer elegible', () => {
      const dto = {
        relacionTemporalEmbarazo: -1,
        trimestreGestacional: -1,
        fechaNotaMedica: fechaConsulta,
      };
      expect(validarCamposEmbarazo(dto, mujer25).ok).toBe(true);
    });

    it('rechaza trimestre cuando embarazo es -1', () => {
      const dto = {
        relacionTemporalEmbarazo: -1,
        trimestreGestacional: 1,
        fechaNotaMedica: fechaConsulta,
      };
      expect(validarCamposEmbarazo(dto, mujer25).ok).toBe(false);
    });
  });

  describe('resolverCamposEmbarazoCex', () => {
    it('exporta valores válidos', () => {
      const result = resolverCamposEmbarazoCex(
        { relacionTemporalEmbarazo: 0, trimestreGestacional: 1 },
        2,
        26,
      );
      expect(result).toEqual({
        relacionTemporalEmbarazo: 0,
        trimestreGestacional: 1,
      });
    });

    it('exporta -1 para hombre', () => {
      const result = resolverCamposEmbarazoCex(
        { relacionTemporalEmbarazo: 0, trimestreGestacional: 2 },
        1,
        26,
      );
      expect(result).toEqual({
        relacionTemporalEmbarazo: -1,
        trimestreGestacional: -1,
      });
    });
  });
});
