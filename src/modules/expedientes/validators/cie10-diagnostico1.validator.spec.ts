import { validateCodigoCIEDiagnostico1 } from './cie10-diagnostico1.validator';
import { DiagnosisRule } from '../services/cie10-catalog-lookup.service';

const fechaNacimiento30 = new Date(1994, 0, 1);
const fechaNota30 = new Date(2024, 0, 1);
const fechaNacimiento5 = new Date(2019, 0, 1);
const fechaNacimiento10 = new Date(2014, 0, 1);

describe('validateCodigoCIEDiagnostico1', () => {
  const c530Rule: DiagnosisRule = {
    key: 'C530',
    lsex: 'MUJER',
    linf: '010A',
    lsup: '120A',
    tipoPersonal1VezCe: [1, 2, 3, 4],
    tipoPersonalSubsecCe: [1, 2, 3, 4],
  };

  const cpRule: DiagnosisRule = {
    key: 'CP01',
    lsex: 'NO',
    linf: '000H',
    lsup: '018A',
    letra: 'CP',
  };

  const lookup = jest.fn(async (code: string) => {
    if (code === 'C530') return c530Rule;
    if (code === 'CP01') return cpRule;
    return null;
  });
  const catalogExists = jest.fn(async (code: string) =>
    code === 'C530' || code === 'CP01',
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects codes that are not 4 characters', async () => {
    const issues = await validateCodigoCIEDiagnostico1({
      codigoCIE10Principal: 'C53',
      relacionTemporal: 0,
      sexoBiologico: 2,
      fechaNacimiento: fechaNacimiento30,
      fechaNotaMedica: fechaNota30,
      tipoPersonal: 2,
      lookup,
      catalogExists,
    });
    expect(issues.some((i) => i.reason === 'formato_invalido')).toBe(true);
  });

  it('rejects male patient for MUJER-only code', async () => {
    const issues = await validateCodigoCIEDiagnostico1({
      codigoCIE10Principal: 'C530',
      relacionTemporal: 0,
      sexoBiologico: 1,
      fechaNacimiento: fechaNacimiento30,
      fechaNotaMedica: fechaNota30,
      tipoPersonal: 2,
      lookup,
      catalogExists,
    });
    expect(issues.some((i) => i.reason === 'sexo_no_permitido')).toBe(true);
  });

  it('allows intersexual without sex check but validates age', async () => {
    const young = await validateCodigoCIEDiagnostico1({
      codigoCIE10Principal: 'C530',
      relacionTemporal: 0,
      sexoBiologico: 3,
      fechaNacimiento: fechaNacimiento5,
      fechaNotaMedica: fechaNota30,
      tipoPersonal: 2,
      lookup,
      catalogExists,
    });
    expect(young.some((i) => i.reason === 'sexo_no_permitido')).toBe(false);
    expect(young.some((i) => i.reason === 'edad_fuera_rango')).toBe(true);
  });

  it('accepts CP01 format (4 alfanuméricos) before scope block', async () => {
    const issues = await validateCodigoCIEDiagnostico1({
      codigoCIE10Principal: 'CP01',
      relacionTemporal: 0,
      sexoBiologico: 1,
      fechaNacimiento: fechaNacimiento10,
      fechaNotaMedica: fechaNota30,
      tipoPersonal: 4,
      lookup,
      catalogExists,
    });
    expect(issues.some((i) => i.reason === 'formato_invalido')).toBe(false);
    expect(issues.some((i) => i.reason === 'fuera_alcance_ramazzini')).toBe(true);
  });

  it('validates tipoPersonal vs relacionTemporal', async () => {
    const issues = await validateCodigoCIEDiagnostico1({
      codigoCIE10Principal: 'C530',
      relacionTemporal: 0,
      sexoBiologico: 2,
      fechaNacimiento: fechaNacimiento30,
      fechaNotaMedica: fechaNota30,
      tipoPersonal: 99,
      lookup,
      catalogExists,
    });
    expect(issues.some((i) => i.reason === 'tipo_personal_no_permitido')).toBe(
      true,
    );
  });

  it('blocks when TIPO_PERSONAL_1VEZ_CE is empty', async () => {
    const emptyTpLookup = jest.fn(async (code: string) => {
      if (code === 'C530') {
        return { ...c530Rule, tipoPersonal1VezCe: [], tipoPersonalSubsecCe: [1] };
      }
      return lookup(code);
    });
    const issues = await validateCodigoCIEDiagnostico1({
      codigoCIE10Principal: 'C530',
      relacionTemporal: 0,
      sexoBiologico: 2,
      fechaNacimiento: fechaNacimiento30,
      fechaNotaMedica: fechaNota30,
      tipoPersonal: 2,
      lookup: emptyTpLookup,
      catalogExists,
    });
    expect(issues.some((i) => i.reason === 'tipo_personal_no_permitido')).toBe(
      true,
    );
    expect(issues[0]?.message).toMatch(/no autoriza ningún tipo de personal/i);
  });
});
