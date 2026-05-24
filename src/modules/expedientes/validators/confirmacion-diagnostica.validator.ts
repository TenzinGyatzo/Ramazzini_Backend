/**
 * Validación confirmacionDiagnostica1/2/3 (CEX / nota médica).
 */

import {
  aplicaConfirmacionDiagnostico1,
  aplicaConfirmacionDiagnostico23,
  calcularEdadAnios,
  isConfirmacionDiagnosticaValorValido,
} from '../../../utils/confirmacion-diagnostica.util';
import { extractCIE10Code } from '../../../utils/cie10.util';
import { DiagnosisRule } from '../services/cie10-catalog-lookup.service';

export type ConfirmacionDiagnosticaField =
  | 'confirmacionDiagnostica'
  | 'confirmacionDiagnostica2'
  | 'confirmacionDiagnostica3';

export interface ConfirmacionDiagnosticaIssue {
  field: ConfirmacionDiagnosticaField;
  code: string;
  reason: 'confirmacion_requerida' | 'confirmacion_no_aplica';
  message: string;
}

export interface ValidateConfirmacionDiagnosticaParams {
  confirmacionDiagnostica?: boolean | null;
  confirmacionDiagnostica2?: boolean | null;
  confirmacionDiagnostica3?: boolean | null;
  codigoCIE10Principal?: string | null;
  codigoCIEDiagnostico2?: string | null;
  codigoCIEDiagnostico3?: string | null;
  relacionTemporal?: number | null;
  primeraVezDiagnostico2?: number | null;
  primeraVezDiagnostico3?: number | null;
  tipoPersonal: number | null;
  fechaNacimiento?: Date | null;
  fechaNotaMedica?: Date | null;
  lookup: (code: string) => Promise<DiagnosisRule | null>;
}

function flagsFromRule(
  rule: DiagnosisRule | null,
): { diaCronicos: boolean; diaCaInfantil: boolean } | null {
  if (!rule) return null;
  return {
    diaCronicos: rule.diaCronicos ?? false,
    diaCaInfantil: rule.diaCaInfantil ?? false,
  };
}

async function validateOne(
  field: ConfirmacionDiagnosticaField,
  codigoRaw: string | null | undefined,
  valor: boolean | null | undefined,
  aplica: boolean,
): Promise<ConfirmacionDiagnosticaIssue | null> {
  const codigo = extractCIE10Code(codigoRaw ?? '') || codigoRaw?.trim() || '';

  if (!isConfirmacionDiagnosticaValorValido(aplica, valor)) {
    if (aplica) {
      return {
        field,
        code: 'confirmacion_requerida',
        reason: 'confirmacion_requerida',
        message: `${field}: debe registrarse Sí (1) o No (0) según la normativa CEX.`,
      };
    }
    if (valor !== undefined && valor !== null) {
      return {
        field,
        code: 'confirmacion_no_aplica',
        reason: 'confirmacion_no_aplica',
        message: `${field}: no aplica para este diagnóstico y debe omitirse.`,
      };
    }
  }

  return null;
}

export async function validateConfirmacionDiagnosticaFields(
  params: ValidateConfirmacionDiagnosticaParams,
): Promise<ConfirmacionDiagnosticaIssue[]> {
  const issues: ConfirmacionDiagnosticaIssue[] = [];
  const edad = calcularEdadAnios(
    params.fechaNacimiento,
    params.fechaNotaMedica,
  );

  const codigo1 = extractCIE10Code(params.codigoCIE10Principal ?? '');
  const rule1 = codigo1 ? await params.lookup(codigo1) : null;
  const aplica1 = aplicaConfirmacionDiagnostico1({
    tipoPersonal: params.tipoPersonal,
    edad,
    flags: flagsFromRule(rule1),
    relacionTemporal: params.relacionTemporal,
  });
  const issue1 = await validateOne(
    'confirmacionDiagnostica',
    params.codigoCIE10Principal,
    params.confirmacionDiagnostica,
    aplica1,
  );
  if (issue1) issues.push(issue1);

  const codigo2 = extractCIE10Code(params.codigoCIEDiagnostico2 ?? '');
  const rule2 = codigo2 ? await params.lookup(codigo2) : null;
  const aplica2 = aplicaConfirmacionDiagnostico23({
    tipoPersonal: params.tipoPersonal,
    edad,
    flags: flagsFromRule(rule2),
    primeraVezDiagnostico: params.primeraVezDiagnostico2,
  });
  const issue2 = await validateOne(
    'confirmacionDiagnostica2',
    params.codigoCIEDiagnostico2,
    params.confirmacionDiagnostica2,
    aplica2,
  );
  if (issue2) issues.push(issue2);

  const codigo3 = extractCIE10Code(params.codigoCIEDiagnostico3 ?? '');
  const rule3 = codigo3 ? await params.lookup(codigo3) : null;
  const aplica3 = aplicaConfirmacionDiagnostico23({
    tipoPersonal: params.tipoPersonal,
    edad,
    flags: flagsFromRule(rule3),
    primeraVezDiagnostico: params.primeraVezDiagnostico3,
  });
  const issue3 = await validateOne(
    'confirmacionDiagnostica3',
    params.codigoCIEDiagnostico3,
    params.confirmacionDiagnostica3,
    aplica3,
  );
  if (issue3) issues.push(issue3);

  return issues;
}
