/** Mismo patrón que en trabajador.schema.ts @Prop curp */
const CURP_SCHEMA_REGEX =
  /^$|^([A-Z]{4}\d{6}[HMX][A-Z]{5}[0-9A-Z]\d|XXXX999999XXXXXX99|[A-Za-z0-9\s\-_.\/#]{4,30})$/;

describe('TrabajadorSchema - curp', () => {
  it('acepta identificador LATAM corto', () => {
    expect(CURP_SCHEMA_REGEX.test('AEEFAE')).toBe(true);
  });

  it('acepta CURP RENAPO mexicana', () => {
    expect(CURP_SCHEMA_REGEX.test('ROAJ850102HDFLRN08')).toBe(true);
  });

  it('rechaza formato fuera de rango LATAM', () => {
    expect(CURP_SCHEMA_REGEX.test('AB')).toBe(false);
  });
});
