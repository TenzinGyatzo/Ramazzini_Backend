import { stripPersonNameAccents } from './person-name-accent.util';

describe('stripPersonNameAccents', () => {
  it('debe quitar acentos en vocales', () => {
    expect(stripPersonNameAccents('José')).toBe('Jose');
    expect(stripPersonNameAccents('MARÍA')).toBe('MARIA');
    expect(stripPersonNameAccents('Julián Fabio')).toBe('Julian Fabio');
  });

  it('debe preservar ñ y Ñ', () => {
    expect(stripPersonNameAccents('Muñoz')).toBe('Muñoz');
    expect(stripPersonNameAccents('MUÑOZ')).toBe('MUÑOZ');
    expect(stripPersonNameAccents('Peña')).toBe('Peña');
  });

  it('debe preservar diéresis en vocales', () => {
    expect(stripPersonNameAccents('Argüello')).toBe('Argüello');
    expect(stripPersonNameAccents('ARGÜELLO')).toBe('ARGÜELLO');
    expect(stripPersonNameAccents('Gärcia')).toBe('Gärcia');
  });
});
