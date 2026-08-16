import { validateCodigoCIEDiagnostico23 } from './cie10-diagnostico23.validator';
import { DiagnosisRule } from '../services/cie10-catalog-lookup.service';

const fechaNacimiento30 = new Date(1994, 0, 1);
const fechaNota30 = new Date(2024, 0, 1);
const fechaNacimiento10 = new Date(2014, 0, 1);

describe('validateCodigoCIEDiagnostico23', () => {
  const mtRule: DiagnosisRule = {
    key: 'MT01',
    lsex: 'NO',
    linf: null,
    lsup: null,
    letra: 'MT',
  };

  const cpRule: DiagnosisRule = {
    key: 'CP01',
    lsex: 'NO',
    linf: null,
    lsup: null,
    letra: 'CP',
  };

  const c530Rule: DiagnosisRule = {
    key: 'C530',
    lsex: 'MUJER',
    linf: '010A',
    lsup: '120A',
    letra: 'C',
  };

  const lookup = jest.fn(async (code: string) => {
    if (code === 'MT01') return mtRule;
    if (code === 'CP01') return cpRule;
    if (code === 'C530') return c530Rule;
    return null;
  });

  const catalogExists = jest.fn(async (code: string) =>
    ['MT01', 'CP01', 'C530', 'R69X'].includes(code),
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires empty code when primeraVez is -1', async () => {
    const issues = await validateCodigoCIEDiagnostico23({
      field: 'codigoCIEDiagnostico2',
      codigo: 'MT01',
      primeraVez: -1,
      codigoCIEDiagnostico1: 'A000',
      sexoBiologico: 1,
      fechaNacimiento: fechaNacimiento30,
      fechaNotaMedica: fechaNota30,
      tipoPersonal: 2,
      tipoPersonalMedicoGeneral: 2,
      tipoPersonalMedicoEspecialista: 4,
      lookup,
      catalogExists,
    });
    expect(issues.some((i) => i.reason === 'codigo_debe_estar_vacio')).toBe(true);
  });

  it('requires code when primeraVez is 0 or 1', async () => {
    const issues = await validateCodigoCIEDiagnostico23({
      field: 'codigoCIEDiagnostico2',
      codigo: '',
      primeraVez: 0,
      codigoCIEDiagnostico1: 'A000',
      sexoBiologico: 1,
      fechaNacimiento: fechaNacimiento30,
      fechaNotaMedica: fechaNota30,
      tipoPersonal: 2,
      tipoPersonalMedicoGeneral: 2,
      tipoPersonalMedicoEspecialista: 4,
      lookup,
      catalogExists,
    });
    expect(issues.some((i) => i.reason === 'codigo_requerido')).toBe(true);
  });

  it('allows duplicate when principal is R69X', async () => {
    const issues = await validateCodigoCIEDiagnostico23({
      field: 'codigoCIEDiagnostico2',
      codigo: 'R69X',
      primeraVez: 1,
      codigoCIEDiagnostico1: 'R69X',
      sexoBiologico: 1,
      fechaNacimiento: fechaNacimiento30,
      fechaNotaMedica: fechaNota30,
      tipoPersonal: 2,
      tipoPersonalMedicoGeneral: 2,
      tipoPersonalMedicoEspecialista: 4,
      lookup,
      catalogExists,
    });
    expect(issues.some((i) => i.reason === 'duplicado')).toBe(false);
  });

  it('allows diag3 equal diag2 when diag2 is R69X', async () => {
    const issues = await validateCodigoCIEDiagnostico23({
      field: 'codigoCIEDiagnostico3',
      codigo: 'R69X',
      primeraVez: 1,
      codigoCIEDiagnostico1: 'A000',
      codigoCIEDiagnostico2: 'R69X',
      sexoBiologico: 1,
      fechaNacimiento: fechaNacimiento30,
      fechaNotaMedica: fechaNota30,
      tipoPersonal: 2,
      tipoPersonalMedicoGeneral: 2,
      tipoPersonalMedicoEspecialista: 4,
      lookup,
      catalogExists,
    });
    expect(issues.some((i) => i.reason === 'duplicado')).toBe(false);
  });

  it('bloquea MT fuera del alcance Ramazzini', async () => {
    const issues = await validateCodigoCIEDiagnostico23({
      field: 'codigoCIEDiagnostico2',
      codigo: 'MT01',
      primeraVez: 1,
      codigoCIEDiagnostico1: 'A000',
      sexoBiologico: 1,
      fechaNacimiento: fechaNacimiento30,
      fechaNotaMedica: fechaNota30,
      tipoPersonal: 2,
      tipoPersonalMedicoGeneral: 2,
      tipoPersonalMedicoEspecialista: 4,
      lookup,
      catalogExists,
    });
    expect(issues.some((i) => i.reason === 'fuera_alcance_ramazzini')).toBe(true);
    expect(issues[0]?.message).toMatch(/medicina tradicional/i);
  });

  it('bloquea CP fuera del alcance Ramazzini', async () => {
    const issues = await validateCodigoCIEDiagnostico23({
      field: 'codigoCIEDiagnostico2',
      codigo: 'CP01',
      primeraVez: 1,
      codigoCIEDiagnostico1: 'A000',
      sexoBiologico: 1,
      fechaNacimiento: fechaNacimiento10,
      fechaNotaMedica: fechaNota30,
      tipoPersonal: 4,
      tipoPersonalMedicoGeneral: 2,
      tipoPersonalMedicoEspecialista: 4,
      lookup,
      catalogExists,
    });
    expect(issues.some((i) => i.reason === 'fuera_alcance_ramazzini')).toBe(true);
    expect(issues[0]?.message).toMatch(/oncología pediátrica|medicina del trabajo/i);
  });

  it('blocks diag2 when principal diagnosis is not registered', async () => {
    const issues = await validateCodigoCIEDiagnostico23({
      field: 'codigoCIEDiagnostico2',
      codigo: 'A001',
      primeraVez: 1,
      codigoCIEDiagnostico1: '',
      sexoBiologico: 1,
      fechaNacimiento: fechaNacimiento30,
      fechaNotaMedica: fechaNota30,
      tipoPersonal: 2,
      tipoPersonalMedicoGeneral: 2,
      tipoPersonalMedicoEspecialista: 4,
      lookup,
      catalogExists,
    });
    expect(issues.some((i) => i.reason === 'diag1_requerido')).toBe(true);
  });

  it('blocks diag3 when diag2 comorbilidad is not registered', async () => {
    const issues = await validateCodigoCIEDiagnostico23({
      field: 'codigoCIEDiagnostico3',
      codigo: 'A001',
      primeraVez: 1,
      primeraVezDiagnostico2: undefined,
      codigoCIEDiagnostico1: 'A000',
      codigoCIEDiagnostico2: '',
      sexoBiologico: 1,
      fechaNacimiento: fechaNacimiento30,
      fechaNotaMedica: fechaNota30,
      tipoPersonal: 2,
      tipoPersonalMedicoGeneral: 2,
      tipoPersonalMedicoEspecialista: 4,
      lookup,
      catalogExists,
    });
    expect(issues.some((i) => i.reason === 'diag2_requerido')).toBe(true);
  });

  it('validates sex restriction', async () => {
    const issues = await validateCodigoCIEDiagnostico23({
      field: 'codigoCIEDiagnostico2',
      codigo: 'C530',
      primeraVez: 1,
      codigoCIEDiagnostico1: 'A000',
      sexoBiologico: 1,
      fechaNacimiento: fechaNacimiento30,
      fechaNotaMedica: fechaNota30,
      tipoPersonal: 2,
      tipoPersonalMedicoGeneral: 2,
      tipoPersonalMedicoEspecialista: 4,
      lookup,
      catalogExists,
    });
    expect(issues.some((i) => i.reason === 'sexo_no_permitido')).toBe(true);
  });

  it('SIN_REGIMEN: sin código ni primeraVez no genera issues', async () => {
    const issues = await validateCodigoCIEDiagnostico23({
      field: 'codigoCIEDiagnostico2',
      codigo: '',
      primeraVez: undefined,
      codigoCIEDiagnostico1: 'A000',
      sexoBiologico: 1,
      fechaNacimiento: fechaNacimiento30,
      fechaNotaMedica: fechaNota30,
      tipoPersonal: 2,
      tipoPersonalMedicoGeneral: 2,
      tipoPersonalMedicoEspecialista: 4,
      lookup,
      catalogExists,
      requirePrimeraVez: false,
    });
    expect(issues).toEqual([]);
  });

  it('SIN_REGIMEN: permite código sin primeraVez', async () => {
    const catalogAll = jest.fn(async (code: string) =>
      ['MT01', 'CP01', 'C530', 'R69X', 'A001'].includes(code),
    );
    const lookupAll = jest.fn(async (code: string) => {
      if (code === 'A001') {
        return {
          key: 'A001',
          lsex: 'NO',
          linf: null,
          lsup: null,
          letra: 'A',
        } as DiagnosisRule;
      }
      return lookup(code);
    });

    const issues = await validateCodigoCIEDiagnostico23({
      field: 'codigoCIEDiagnostico2',
      codigo: 'A001',
      primeraVez: undefined,
      codigoCIEDiagnostico1: 'C530',
      sexoBiologico: 1,
      fechaNacimiento: fechaNacimiento30,
      fechaNotaMedica: fechaNota30,
      tipoPersonal: 2,
      tipoPersonalMedicoGeneral: 2,
      tipoPersonalMedicoEspecialista: 4,
      lookup: lookupAll,
      catalogExists: catalogAll,
      requirePrimeraVez: false,
    });
    expect(issues).toEqual([]);
  });

  it('SIN_REGIMEN: diag3 requiere diag2 por código aunque no haya primeraVez', async () => {
    const issues = await validateCodigoCIEDiagnostico23({
      field: 'codigoCIEDiagnostico3',
      codigo: 'A001',
      primeraVez: undefined,
      codigoCIEDiagnostico1: 'C530',
      codigoCIEDiagnostico2: '',
      sexoBiologico: 1,
      fechaNacimiento: fechaNacimiento30,
      fechaNotaMedica: fechaNota30,
      tipoPersonal: 2,
      tipoPersonalMedicoGeneral: 2,
      tipoPersonalMedicoEspecialista: 4,
      lookup,
      catalogExists,
      requirePrimeraVez: false,
    });
    expect(issues.some((i) => i.reason === 'diag2_requerido')).toBe(true);
  });
});
