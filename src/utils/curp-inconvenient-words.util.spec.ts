import {
  applyInconvenientWordFilter,
  CURP_INCONVENIENT_WORDS,
} from './curp-inconvenient-words.util';

/** Pares origen → reemplazo según catálogo RENAPO oficial. */
const INCONVENIENT_WORD_REPLACEMENTS: Array<[string, string]> = [
  ['BACA', 'BXCA'],
  ['BAKA', 'BXKA'],
  ['BUEI', 'BXEI'],
  ['BUEY', 'BXEY'],
  ['CACA', 'CXCA'],
  ['CACO', 'CXCO'],
  ['CAGA', 'CXGA'],
  ['CAGO', 'CXGO'],
  ['CAKA', 'CXKA'],
  ['CAKO', 'CXKO'],
  ['COGE', 'CXGE'],
  ['COGI', 'CXGI'],
  ['COJA', 'CXJA'],
  ['COJE', 'CXJE'],
  ['COJI', 'CXJI'],
  ['COJO', 'CXJO'],
  ['COLA', 'CXLA'],
  ['CULO', 'CXLO'],
  ['FALO', 'FXLO'],
  ['FETO', 'FXTO'],
  ['GETA', 'GXTA'],
  ['GUEI', 'GXEI'],
  ['GUEY', 'GXEY'],
  ['JETA', 'JXTA'],
  ['JOTO', 'JXTO'],
  ['KACA', 'KXCA'],
  ['KACO', 'KXCO'],
  ['KAGA', 'KXGA'],
  ['KAGO', 'KXGO'],
  ['KAKA', 'KXKA'],
  ['KAKO', 'KXKO'],
  ['KOGE', 'KXGE'],
  ['KOGI', 'KXGI'],
  ['KOJA', 'KXJA'],
  ['KOJE', 'KXJE'],
  ['KOJI', 'KXJI'],
  ['KOJO', 'KXJO'],
  ['KOLA', 'KXLA'],
  ['KULO', 'KXLO'],
  ['LILO', 'LXLO'],
  ['LOCA', 'LXCA'],
  ['LOCO', 'LXCO'],
  ['LOKA', 'LXKA'],
  ['LOKO', 'LXKO'],
  ['MAME', 'MXME'],
  ['MAMO', 'MXMO'],
  ['MEAR', 'MXAR'],
  ['MEAS', 'MXAS'],
  ['MEON', 'MXON'],
  ['MIAR', 'MXAR'],
  ['MION', 'MXON'],
  ['MOCO', 'MXCO'],
  ['MOKO', 'MXKO'],
  ['MULA', 'MXLA'],
  ['MULO', 'MXLO'],
  ['NACA', 'NXCA'],
  ['NACO', 'NXCO'],
  ['PEDA', 'PXDA'],
  ['PEDO', 'PXDO'],
  ['PENE', 'PXNE'],
  ['PIPI', 'PXPI'],
  ['PITO', 'PXTO'],
  ['POPO', 'PXPO'],
  ['PUTA', 'PXTA'],
  ['PUTO', 'PXTO'],
  ['QULO', 'QXLO'],
  ['RATA', 'RXTA'],
  ['ROBA', 'RXBA'],
  ['ROBE', 'RXBE'],
  ['ROBO', 'RXBO'],
  ['RUIN', 'RXIN'],
  ['SENO', 'SXNO'],
  ['TETA', 'TXTA'],
  ['VACA', 'VXCA'],
  ['VAGA', 'VXGA'],
  ['VAGO', 'VXGO'],
  ['VAKA', 'VXKA'],
  ['VUEI', 'VXEI'],
  ['VUEY', 'VXEY'],
  ['WUEI', 'WXEI'],
  ['WUEY', 'WXEY'],
];

describe('curp-inconvenient-words.util', () => {
  it('debe contener las 80 palabras del catálogo RENAPO', () => {
    expect(CURP_INCONVENIENT_WORDS.size).toBe(81);
    for (const [word] of INCONVENIENT_WORD_REPLACEMENTS) {
      expect(CURP_INCONVENIENT_WORDS.has(word)).toBe(true);
    }
  });

  describe('applyInconvenientWordFilter', () => {
    it.each(INCONVENIENT_WORD_REPLACEMENTS)(
      'debe reemplazar %s por %s',
      (original, expected) => {
        expect(applyInconvenientWordFilter(original)).toBe(expected);
      },
    );

    it('debe dejar sin cambio palabras no listadas', () => {
      expect(applyInconvenientWordFilter('GALJ')).toBe('GALJ');
      expect(applyInconvenientWordFilter('SABC')).toBe('SABC');
    });

    it('debe normalizar a mayúsculas antes de evaluar', () => {
      expect(applyInconvenientWordFilter('coge')).toBe('CXGE');
    });

    it('debe retornar sin cambio si la longitud no es 4', () => {
      expect(applyInconvenientWordFilter('COG')).toBe('COG');
      expect(applyInconvenientWordFilter('COGEE')).toBe('COGEE');
      expect(applyInconvenientWordFilter('')).toBe('');
    });
  });
});
