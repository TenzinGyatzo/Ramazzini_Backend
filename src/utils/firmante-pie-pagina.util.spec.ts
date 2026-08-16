import {
  buildEnfermeraPiePaginaPdfBlock,
  buildTecnicoPiePaginaPdfBlock,
  hasFirmanteSexoForPie,
  resolveEnfermeraPiePaginaText,
} from './firmante-pie-pagina.util';

describe('firmante-pie-pagina.util', () => {
  describe('hasFirmanteSexoForPie', () => {
    it('detecta sexoCURP SIRES', () => {
      expect(hasFirmanteSexoForPie({ sexoCURP: 2 })).toBe(true);
    });

    it('detecta sexo legacy SIN_REGIMEN', () => {
      expect(hasFirmanteSexoForPie({ sexo: 'Masculino' })).toBe(true);
    });
  });

  describe('resolveEnfermeraPiePaginaText', () => {
    it('sexoCURP=1 → Enfermero', () => {
      expect(resolveEnfermeraPiePaginaText({ sexoCURP: 1 })).toBe(
        'Enfermero responsable de la evaluación\n',
      );
    });

    it('sexoCURP=2 → Enfermera', () => {
      expect(resolveEnfermeraPiePaginaText({ sexoCURP: 2 })).toBe(
        'Enfermera responsable de la evaluación\n',
      );
    });

    it('sexoCURP=3 → Enfermera/o', () => {
      expect(resolveEnfermeraPiePaginaText({ sexoCURP: 3 })).toBe(
        'Enfermera/o responsable de la evaluación\n',
      );
    });

    it('fallback legacy con sexo Femenino', () => {
      expect(resolveEnfermeraPiePaginaText({ sexo: 'Femenino' })).toBe(
        'Enfermera responsable de la evaluación\n',
      );
    });
  });

  describe('buildPdfBlocks', () => {
    it('genera bloque PDF para enfermera', () => {
      expect(
        buildEnfermeraPiePaginaPdfBlock({ sexoCURP: 3 }, 'de la nota'),
      ).toEqual({
        text: 'Enfermera/o responsable de la nota\n',
        bold: false,
      });
    });

    it('genera bloque PDF para técnico cuando hay sexoCURP', () => {
      expect(buildTecnicoPiePaginaPdfBlock({ sexoCURP: 1 })).toEqual({
        text: 'Responsable de la evaluación\n',
        bold: false,
      });
    });
  });
});
