/**
 * Validaciones DIAGNOSTICO_SIS para codigoCIEDiagnostico1 (diagnóstico principal / CEX).
 */

import {
  isAgeAllowedForLimits,
  isCIE10Exact4Chars,
  isSexAllowedForLsex,
  isTipoPersonalAllowedForDiagnostico1,
  normalizeCie10CatalogKey,
  SexoBiologicoGiis,
} from '../../../utils/cie10-diagnostico-sis.util';
import { extractCIE10Code } from '../../../utils/cie10.util';
import { DiagnosisRule } from '../services/cie10-catalog-lookup.service';
import {
  getRamazziniLetraBlockMessage,
  resolveRamazziniLetraFueraDeAlcance,
} from '../../../utils/cie10-ramazzini-scope.util';

export interface Diagnostico1ValidationIssue {
  field: 'codigoCIE10Principal';
  code: string;
  reason:
    | 'formato_invalido'
    | 'no_en_catalogo'
    | 'sexo_no_permitido'
    | 'edad_fuera_rango'
    | 'tipo_personal_no_permitido'
    | 'fuera_alcance_ramazzini';
  message: string;
}

export interface ValidateDiagnostico1Params {
  codigoCIE10Principal?: string | null;
  relacionTemporal?: number | null;
  sexoBiologico: SexoBiologicoGiis | null;
  edad: number | null;
  tipoPersonal: number | null;
  lookup: (code: string) => Promise<DiagnosisRule | null>;
  catalogExists: (catalogKey: string) => Promise<boolean>;
}

export async function validateCodigoCIEDiagnostico1(
  params: ValidateDiagnostico1Params,
): Promise<Diagnostico1ValidationIssue[]> {
  const raw = params.codigoCIE10Principal?.trim() || '';
  if (!raw) return [];

  const issues: Diagnostico1ValidationIssue[] = [];
  const extracted = extractCIE10Code(raw);
  const catalogKey = normalizeCie10CatalogKey(raw);

  if (!catalogKey) {
    issues.push({
      field: 'codigoCIE10Principal',
      code: extracted || raw,
      reason: 'formato_invalido',
      message:
        'El diagnóstico principal debe ser un código CIE-10 de exactamente 4 caracteres (CATALOG_KEY DIAGNOSTICO_SIS).',
    });
    return issues;
  }

  const exists = await params.catalogExists(catalogKey);
  if (!exists) {
    issues.push({
      field: 'codigoCIE10Principal',
      code: catalogKey,
      reason: 'no_en_catalogo',
      message: `El código ${catalogKey} no está en el catálogo DIAGNOSTICO_SIS.`,
    });
    return issues;
  }

  const rule = await params.lookup(catalogKey);
  if (!rule) {
    return issues;
  }

  const ramazziniLetra = resolveRamazziniLetraFueraDeAlcance(
    catalogKey,
    rule.letra,
  );
  if (ramazziniLetra) {
    issues.push({
      field: 'codigoCIE10Principal',
      code: catalogKey,
      reason: 'fuera_alcance_ramazzini',
      message: getRamazziniLetraBlockMessage(
        ramazziniLetra,
        catalogKey,
        'Diagnóstico principal',
      ),
    });
    return issues;
  }

  if (
    params.sexoBiologico != null &&
    !isSexAllowedForLsex(rule.lsex, params.sexoBiologico)
  ) {
    issues.push({
      field: 'codigoCIE10Principal',
      code: catalogKey,
      reason: 'sexo_no_permitido',
      message: `El diagnóstico ${catalogKey} no aplica para el sexo biológico del paciente (restricción LSEX).`,
    });
  }

  if (
    params.edad != null &&
    !isAgeAllowedForLimits(rule.linf, rule.lsup, params.edad)
  ) {
    issues.push({
      field: 'codigoCIE10Principal',
      code: catalogKey,
      reason: 'edad_fuera_rango',
      message: `El diagnóstico ${catalogKey} no aplica para la edad del paciente (restricción LINF/LSUP).`,
    });
  }

  if (params.tipoPersonal != null || params.relacionTemporal === 0 || params.relacionTemporal === 1) {
    const tpCheck = isTipoPersonalAllowedForDiagnostico1(
      params.relacionTemporal,
      params.tipoPersonal,
      rule.tipoPersonal1VezCe ?? [],
      rule.tipoPersonalSubsecCe ?? [],
    );
    if (!tpCheck.allowed) {
      const temporalLabel =
        params.relacionTemporal === 1 ? 'subsecuente' : 'primera vez';
      const message = tpCheck.requiresTipoPersonal && params.tipoPersonal == null
        ? `El diagnóstico ${catalogKey} requiere un firmante médico o de enfermería registrado para validar el tipo de personal (${temporalLabel}).`
        : `El tipo de personal (${params.tipoPersonal}) no está autorizado para el diagnóstico ${catalogKey} en relación temporal ${temporalLabel}.`;
      issues.push({
        field: 'codigoCIE10Principal',
        code: catalogKey,
        reason: 'tipo_personal_no_permitido',
        message,
      });
    }
  }

  return issues;
}

export { isCIE10Exact4Chars, normalizeCie10CatalogKey };
