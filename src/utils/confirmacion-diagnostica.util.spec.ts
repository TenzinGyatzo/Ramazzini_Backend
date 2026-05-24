import {
  aplicaConfirmacionDiagnostico1,
  aplicaConfirmacionDiagnostico23,
  calcularEdadAnios,
  isTipoPersonalMedicoConfirmacion,
  parseCatalogSiFlag,
  toCexConfirmacionDiagnosticaValue,
  TIPO_PERSONAL_MEDICO_CONFIRMACION,
} from './confirmacion-diagnostica.util';

describe('confirmacion-diagnostica.util', () => {
  describe('isTipoPersonalMedicoConfirmacion', () => {
    it('acepta tipos médicos 1,2,3,4,19,24', () => {
      for (const tp of TIPO_PERSONAL_MEDICO_CONFIRMACION) {
        expect(isTipoPersonalMedicoConfirmacion(tp)).toBe(true);
      }
    });

    it('rechaza enfermera u otros', () => {
      expect(isTipoPersonalMedicoConfirmacion(6)).toBe(false);
      expect(isTipoPersonalMedicoConfirmacion(null)).toBe(false);
    });
  });

  describe('parseCatalogSiFlag', () => {
    it('parsea SI/NO del catálogo', () => {
      expect(parseCatalogSiFlag('SI')).toBe(true);
      expect(parseCatalogSiFlag('NO')).toBe(false);
      expect(parseCatalogSiFlag(true)).toBe(true);
    });
  });

  describe('aplicaConfirmacionDiagnostico1', () => {
    const flagsCronico = { diaCronicos: true, diaCaInfantil: false };
    const flagsInfantil = { diaCronicos: false, diaCaInfantil: true };

    it('cáncer infantil: edad < 18 y DIA_CAINFANTIL=SI', () => {
      expect(
        aplicaConfirmacionDiagnostico1({
          tipoPersonal: 2,
          edad: 10,
          flags: flagsInfantil,
          relacionTemporal: 1,
        }),
      ).toBe(true);
    });

    it('crónico: edad >= 20, primera vez y DIA_CRONICOS=SI', () => {
      expect(
        aplicaConfirmacionDiagnostico1({
          tipoPersonal: 4,
          edad: 45,
          flags: flagsCronico,
          relacionTemporal: 0,
        }),
      ).toBe(true);
    });

    it('no aplica con subsecuente en crónico', () => {
      expect(
        aplicaConfirmacionDiagnostico1({
          tipoPersonal: 2,
          edad: 45,
          flags: flagsCronico,
          relacionTemporal: 1,
        }),
      ).toBe(false);
    });

    it('no aplica edad 18-19', () => {
      expect(
        aplicaConfirmacionDiagnostico1({
          tipoPersonal: 2,
          edad: 18,
          flags: flagsInfantil,
          relacionTemporal: 0,
        }),
      ).toBe(false);
    });

    it('no aplica si tipoPersonal no es médico', () => {
      expect(
        aplicaConfirmacionDiagnostico1({
          tipoPersonal: 6,
          edad: 10,
          flags: flagsInfantil,
          relacionTemporal: 0,
        }),
      ).toBe(false);
    });
  });

  describe('aplicaConfirmacionDiagnostico23', () => {
    const flagsCronico = { diaCronicos: true, diaCaInfantil: false };

    it('requiere primeraVezDiagnostico=1 para crónicos >= 20', () => {
      expect(
        aplicaConfirmacionDiagnostico23({
          tipoPersonal: 2,
          edad: 30,
          flags: flagsCronico,
          primeraVezDiagnostico: 1,
        }),
      ).toBe(true);
      expect(
        aplicaConfirmacionDiagnostico23({
          tipoPersonal: 2,
          edad: 30,
          flags: flagsCronico,
          primeraVezDiagnostico: 0,
        }),
      ).toBe(false);
    });
  });

  describe('toCexConfirmacionDiagnosticaValue', () => {
    it('mapea a -1/0/1', () => {
      expect(toCexConfirmacionDiagnosticaValue(false, true)).toBe(-1);
      expect(toCexConfirmacionDiagnosticaValue(true, true)).toBe(1);
      expect(toCexConfirmacionDiagnosticaValue(true, false)).toBe(0);
    });
  });

  describe('calcularEdadAnios', () => {
    it('calcula edad en años', () => {
      expect(
        calcularEdadAnios(new Date('2010-05-15'), new Date('2024-05-14')),
      ).toBe(13);
      expect(
        calcularEdadAnios(new Date('2010-05-15'), new Date('2024-05-15')),
      ).toBe(14);
    });
  });
});
