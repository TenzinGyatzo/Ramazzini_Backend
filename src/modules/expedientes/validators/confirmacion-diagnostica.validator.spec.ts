import { validateConfirmacionDiagnosticaFields } from './confirmacion-diagnostica.validator';
import { DiagnosisRule } from '../services/cie10-catalog-lookup.service';

describe('validateConfirmacionDiagnosticaFields', () => {
  const lookup = async (code: string): Promise<DiagnosisRule | null> => {
    if (code === 'E110') {
      return {
        key: 'E110',
        lsex: 'NO',
        linf: null,
        lsup: null,
        diaCronicos: true,
        diaCaInfantil: false,
      };
    }
    if (code === 'CP01') {
      return {
        key: 'CP01',
        lsex: 'NO',
        linf: null,
        lsup: null,
        diaCronicos: false,
        diaCaInfantil: true,
      };
    }
    return null;
  };

  it('requiere confirmacionDiagnostica cuando aplica', async () => {
    const issues = await validateConfirmacionDiagnosticaFields({
      codigoCIE10Principal: 'E110',
      relacionTemporal: 0,
      tipoPersonal: 2,
      fechaNacimiento: new Date('1980-01-01'),
      fechaNotaMedica: new Date('2024-06-01'),
      lookup,
    });
    expect(issues.some((i) => i.field === 'confirmacionDiagnostica')).toBe(true);
  });

  it('rechaza confirmacion cuando no aplica', async () => {
    const issues = await validateConfirmacionDiagnosticaFields({
      codigoCIE10Principal: 'A000',
      confirmacionDiagnostica: true,
      relacionTemporal: 0,
      tipoPersonal: 2,
      fechaNacimiento: new Date('1980-01-01'),
      fechaNotaMedica: new Date('2024-06-01'),
      lookup,
    });
    expect(issues.some((i) => i.reason === 'confirmacion_no_aplica')).toBe(true);
  });

  it('acepta boolean cuando aplica', async () => {
    const issues = await validateConfirmacionDiagnosticaFields({
      codigoCIE10Principal: 'E110',
      confirmacionDiagnostica: false,
      relacionTemporal: 0,
      tipoPersonal: 2,
      fechaNacimiento: new Date('1980-01-01'),
      fechaNotaMedica: new Date('2024-06-01'),
      lookup,
    });
    expect(issues).toHaveLength(0);
  });
});
