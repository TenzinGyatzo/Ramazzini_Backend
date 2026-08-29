import { applyHoyListCap, INICIO_HOY_LIST_CAP } from './inicio-hoy-list.util';

describe('applyHoyListCap', () => {
  it('no trunca por debajo del límite', () => {
    const items = Array.from({ length: 3 }, (_, i) => i);
    expect(applyHoyListCap(items)).toEqual({
      items,
      total: 3,
      truncated: false,
    });
  });

  it('marca truncated y conserva el total real', () => {
    const items = Array.from({ length: INICIO_HOY_LIST_CAP + 5 }, (_, i) => i);
    const result = applyHoyListCap(items);
    expect(result.truncated).toBe(true);
    expect(result.items).toHaveLength(INICIO_HOY_LIST_CAP);
    expect(result.total).toBe(INICIO_HOY_LIST_CAP + 5);
    expect(result.items[0]).toBe(0);
  });
});
