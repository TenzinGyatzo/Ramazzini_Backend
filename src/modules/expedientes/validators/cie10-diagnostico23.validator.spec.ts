import { validateCodigoCIEDiagnostico23 } from './cie10-diagnostico23.validator';
import { DiagnosisRule } from '../services/cie10-catalog-lookup.service';

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
      edad: 30,
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
      edad: 30,
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
      edad: 30,
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
      edad: 30,
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
      edad: 30,
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
      edad: 10,
      tipoPersonal: 4,
      tipoPersonalMedicoGeneral: 2,
      tipoPersonalMedicoEspecialista: 4,
      lookup,
      catalogExists,
    });
    expect(issues.some((i) => i.reason === 'fuera_alcance_ramazzini')).toBe(true);
    expect(issues[0]?.message).toMatch(/medicina del trabajo/i);
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
      edad: 30,
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
      edad: 30,
      tipoPersonal: 2,
      tipoPersonalMedicoGeneral: 2,
      tipoPersonalMedicoEspecialista: 4,
      lookup,
      catalogExists,
    });
    expect(issues.some((i) => i.reason === 'sexo_no_permitido')).toBe(true);
  });
});
