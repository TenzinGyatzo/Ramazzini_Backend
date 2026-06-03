import {
  mapNumericToSexo,
  mapSexoToGiisBiologico,
} from './sexo-mapper.util';

describe('sexo-mapper.util', () => {
  describe('mapSexoToGiisBiologico', () => {
    it('maps Intersexual to 3', () => {
      expect(mapSexoToGiisBiologico('Intersexual')).toBe(3);
    });
  });

  describe('mapNumericToSexo', () => {
    it('maps 3 to Intersexual', () => {
      expect(mapNumericToSexo(3)).toBe('Intersexual');
    });
  });
});
