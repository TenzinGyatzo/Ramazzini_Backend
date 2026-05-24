/**
 * Validaciones DIAGNOSTICO_SIS para codigoCIEDiagnostico2 y codigoCIEDiagnostico3 (CEX).
 */

import {
  isAgeAllowedForLimits,
  isPrimeraVezComorbilidadActiva,
  isR69XFamily,
  isSexAllowedForLsex,
  normalizeCie10CatalogKey,
  normalizePrimeraVezDiagnostico,
  SexoBiologicoGiis,
} from '../../../utils/cie10-diagnostico-sis.util';
import { extractCIE10Code } from '../../../utils/cie10.util';
import { DiagnosisRule } from '../services/cie10-catalog-lookup.service';
import {
  getRamazziniLetraBlockMessage,
  resolveRamazziniLetraFueraDeAlcance,
} from '../../../utils/cie10-ramazzini-scope.util';

export type Diagnostico23Field =
  | 'codigoCIEDiagnostico2'
  | 'codigoCIEDiagnostico3';

export interface Diagnostico23ValidationIssue {
  field: Diagnostico23Field;
  code: string;
  reason:
    | 'codigo_requerido'
    | 'codigo_debe_estar_vacio'
    | 'formato_invalido'
    | 'no_en_catalogo'
    | 'duplicado'
    | 'sexo_no_permitido'
    | 'edad_fuera_rango'
    | 'tipo_personal_no_permitido'
    | 'diag2_requerido'
    | 'fuera_alcance_ramazzini';
  message: string;
}

export interface ValidateDiagnostico23Params {
  field: Diagnostico23Field;
  codigo?: string | null;
  primeraVez?: number | null;
  codigoCIEDiagnostico1?: string | null;
  /** Solo para diag3 */
  codigoCIEDiagnostico2?: string | null;
  /** Solo para diag3: requiere comorbilidad 2 registrada */
  primeraVezDiagnostico2?: number | null;
  sexoBiologico: SexoBiologicoGiis | null;
  edad: number | null;
  tipoPersonal: number | null;
  tipoPersonalMedicoGeneral: number;
  tipoPersonalMedicoEspecialista: number;
  lookup: (code: string) => Promise<DiagnosisRule | null>;
  catalogExists: (catalogKey: string) => Promise<boolean>;
}

function keysEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  const ka = normalizeCie10CatalogKey(a);
  const kb = normalizeCie10CatalogKey(b);
  return ka !== '' && kb !== '' && ka === kb;
}

function pushRamazziniScopeIssue(
  issues: Diagnostico23ValidationIssue[],
  field: Diagnostico23Field,
  catalogKey: string,
  letra: string | null | undefined,
  label: string,
): boolean {
  const blocked = resolveRamazziniLetraFueraDeAlcance(catalogKey, letra);
  if (!blocked) return false;
  issues.push({
    field,
    code: catalogKey,
    reason: 'fuera_alcance_ramazzini',
    message: getRamazziniLetraBlockMessage(
      blocked,
      catalogKey,
      `Diagnóstico ${label}`,
    ),
  });
  return true;
}

export async function validateCodigoCIEDiagnostico23(
  params: ValidateDiagnostico23Params,
): Promise<Diagnostico23ValidationIssue[]> {
  const issues: Diagnostico23ValidationIssue[] = [];
  const field = params.field;
  const label = field === 'codigoCIEDiagnostico2' ? '2' : '3';
  const pv = normalizePrimeraVezDiagnostico(params.primeraVez);
  const raw = params.codigo?.trim() || '';

  if (pv === -1) {
    if (raw) {
      issues.push({
        field,
        code: extractCIE10Code(raw) || raw,
        reason: 'codigo_debe_estar_vacio',
        message: `Si el diagnóstico ${label} no aplica (primeraVez = -1), el código CIE-10 debe estar vacío.`,
      });
    }
    return issues;
  }

  if (!raw) {
    issues.push({
      field,
      code: '',
      reason: 'codigo_requerido',
      message: `El código CIE-10 diagnóstico ${label} es obligatorio cuando primeraVezDiagnostico${label} está activo (0 o 1).`,
    });
    return issues;
  }

  if (
    field === 'codigoCIEDiagnostico3' &&
    !isPrimeraVezComorbilidadActiva(params.primeraVezDiagnostico2)
  ) {
    issues.push({
      field,
      code: extractCIE10Code(raw) || raw,
      reason: 'diag2_requerido',
      message:
        'No puede registrar el diagnóstico 3 sin haber registrado antes el diagnóstico 2 (comorbilidad).',
    });
    return issues;
  }

  const extracted = extractCIE10Code(raw);
  const catalogKey = normalizeCie10CatalogKey(raw);

  if (!catalogKey) {
    issues.push({
      field,
      code: extracted || raw,
      reason: 'formato_invalido',
      message: `Diagnóstico ${label}: el código CIE-10 debe tener exactamente 4 caracteres (CATALOG_KEY DIAGNOSTICO_SIS).`,
    });
    return issues;
  }

  const exists = await params.catalogExists(catalogKey);
  if (!exists) {
    issues.push({
      field,
      code: catalogKey,
      reason: 'no_en_catalogo',
      message: `Diagnóstico ${label}: el código ${catalogKey} no está en el catálogo DIAGNOSTICO_SIS.`,
    });
    return issues;
  }

  const diag1Key = normalizeCie10CatalogKey(params.codigoCIEDiagnostico1);
  if (
    keysEqual(catalogKey, diag1Key) &&
    !isR69XFamily(params.codigoCIEDiagnostico1)
  ) {
    issues.push({
      field,
      code: catalogKey,
      reason: 'duplicado',
      message: `El diagnóstico ${label} debe ser diferente al diagnóstico principal.`,
    });
    return issues;
  }

  if (field === 'codigoCIEDiagnostico3') {
    const diag2Key = normalizeCie10CatalogKey(params.codigoCIEDiagnostico2);
    if (
      keysEqual(catalogKey, diag2Key) &&
      !isR69XFamily(params.codigoCIEDiagnostico2)
    ) {
      issues.push({
        field,
        code: catalogKey,
        reason: 'duplicado',
        message: 'El diagnóstico 3 debe ser diferente al diagnóstico 2.',
      });
      return issues;
    }
  }

  const rule = await params.lookup(catalogKey);
  if (!rule) {
    return issues;
  }

  if (pushRamazziniScopeIssue(issues, field, catalogKey, rule.letra, label)) {
    return issues;
  }

  if (
    params.sexoBiologico != null &&
    !isSexAllowedForLsex(rule.lsex, params.sexoBiologico)
  ) {
    issues.push({
      field,
      code: catalogKey,
      reason: 'sexo_no_permitido',
      message: `El diagnóstico ${label} (${catalogKey}) no aplica para el sexo biológico del paciente (restricción LSEX).`,
    });
  }

  if (
    params.edad != null &&
    !isAgeAllowedForLimits(rule.linf, rule.lsup, params.edad)
  ) {
    issues.push({
      field,
      code: catalogKey,
      reason: 'edad_fuera_rango',
      message: `El diagnóstico ${label} (${catalogKey}) no aplica para la edad del paciente (restricción LINF/LSUP).`,
    });
  }

  return issues;
}
