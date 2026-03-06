/**
 * NOM-024 GIIS Official Naming (Phase 2 — 2B)
 * [TIPO]-[ENTIDAD][INST]-[AA][MM].[EXT]; 99SMP for 9998.
 */

import {
  getEntidadInst,
  getOfficialBaseName,
  getOfficialFileName,
} from '../../src/modules/giis-export/naming/giis-official-naming';

describe('NOM-024 GIIS Naming (Phase 2B)', () => {
  describe('getEntidadInst', () => {
    it('should return 99SMP for 9998', () => {
      expect(getEntidadInst('9998')).toBe('99SMP');
    });
    it('should return 99SMP for empty or blank', () => {
      expect(getEntidadInst('')).toBe('99SMP');
      expect(getEntidadInst('   ')).toBe('99SMP');
    });
    it('should return first 5 chars of CLUES uppercase', () => {
      expect(getEntidadInst('DFSSA000864')).toBe('DFSSA');
      expect(getEntidadInst('dfssa000864')).toBe('DFSSA');
    });
  });

  describe('getOfficialBaseName', () => {
    it('should produce CEX-DFSSA-2201 for CEX, DFSSA000864, 2022, 1', () => {
      expect(getOfficialBaseName('CEX', 'DFSSA000864', 2022, 1)).toBe(
        'CEX-DFSSA-2201',
      );
    });
    it('should produce CEX-99SMP-2410 for CEX, 9998, 2024, 10', () => {
      expect(getOfficialBaseName('CEX', '9998', 2024, 10)).toBe(
        'CEX-99SMP-2410',
      );
    });
    it('should produce CEX with 5-char entidad from 11-char CLUES', () => {
      expect(getOfficialBaseName('CEX', 'MCSSA123456', 2023, 6)).toBe(
        'CEX-MCSSA-2306',
      );
    });
  });

  describe('getOfficialFileName', () => {
    it('should append .TXT, .CIF, .ZIP', () => {
      expect(getOfficialFileName('CEX-DFSSA-2201', 'TXT')).toBe(
        'CEX-DFSSA-2201.TXT',
      );
      expect(getOfficialFileName('CEX-DFSSA-2201', 'CIF')).toBe(
        'CEX-DFSSA-2201.CIF',
      );
      expect(getOfficialFileName('CEX-DFSSA-2201', 'ZIP')).toBe(
        'CEX-DFSSA-2201.ZIP',
      );
    });
  });
});
