import * as fs from 'fs';
import * as path from 'path';
import { validateCURPCrossCheck } from './curp-validator.util';
import { buildCurpCrossCheckErrorContent } from './curp-cross-check-messages.util';

type Fixture = {
  id: string;
  curp: string;
  demographics: {
    fechaNacimiento: string;
    sexo: string;
    entidadNacimiento?: string;
    nombre?: string;
    primerApellido?: string;
    segundoApellido?: string;
  };
  expectCrossValid: boolean;
  expectCodes: string[];
};

const fixturesPath = path.join(
  __dirname,
  'fixtures',
  'curp-parity.fixtures.json',
);
const fixtures: Fixture[] = JSON.parse(
  fs.readFileSync(fixturesPath, 'utf8'),
);

const FIELD_TO_CODE: Record<string, string> = {
  fechaNacimiento: 'CURP_CROSS_FECHA',
  sexo: 'CURP_CROSS_SEXO',
  entidadNacimiento: 'CURP_CROSS_ENTIDAD',
  iniciales: 'CURP_CROSS_INICIALES',
  consonantesInternas: 'CURP_CROSS_CONSONANTES',
  homoclave: 'CURP_CROSS_HOMOCLAVE',
};

describe('CURP parity fixtures (BE)', () => {
  for (const fixture of fixtures) {
    it(`${fixture.id}: cross-check isValid=${fixture.expectCrossValid}`, () => {
      const result = validateCURPCrossCheck(
        fixture.curp,
        fixture.demographics,
      );
      expect(result.isValid).toBe(fixture.expectCrossValid);

      const codes = result.discrepancies.map((d) => FIELD_TO_CODE[d.field]);
      for (const code of fixture.expectCodes) {
        expect(codes).toContain(code);
      }

      if (!result.isValid) {
        const content = buildCurpCrossCheckErrorContent(result.discrepancies);
        expect(content.details.map((d) => d.code)).toEqual(
          expect.arrayContaining(fixture.expectCodes),
        );
        expect(content.details.every((d) => d.positions.length > 0)).toBe(
          true,
        );
      }
    });
  }
});
