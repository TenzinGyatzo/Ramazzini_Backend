import { CatalogsService } from '../../catalogs/catalogs.service';
import { resolveDiagCatalogFlags } from '../../giis-export/utils/cex-diag-catalog-flags.util';
import {
  aplicaConfirmacionDiagnostico1,
  aplicaConfirmacionDiagnostico23,
  calcularEdadAnios,
} from '../../../utils/confirmacion-diagnostica.util';
import { extractCIE10Code } from '../../../utils/cie10.util';

export interface MuestraConfirmacionFlags {
  confirmacion1: boolean;
  confirmacion2: boolean;
  confirmacion3: boolean;
}

export async function computeMuestraConfirmacionFlagsForNotaMedica(
  catalogsService: CatalogsService,
  params: {
    codigoCIE10Principal?: string | null;
    codigoCIEDiagnostico2?: string | null;
    codigoCIEDiagnostico3?: string | null;
    relacionTemporal?: number | null;
    primeraVezDiagnostico2?: number | null;
    primeraVezDiagnostico3?: number | null;
    tipoPersonal: number | null;
    fechaNacimiento?: Date | null;
    fechaNotaMedica?: Date | null;
  },
): Promise<MuestraConfirmacionFlags> {
  const edad = calcularEdadAnios(
    params.fechaNacimiento,
    params.fechaNotaMedica,
  );

  const codigo1 = extractCIE10Code(params.codigoCIE10Principal ?? '');
  const flags1 = codigo1
    ? await resolveDiagCatalogFlags(catalogsService, codigo1)
    : null;

  const codigo2 = extractCIE10Code(params.codigoCIEDiagnostico2 ?? '');
  const flags2 = codigo2
    ? await resolveDiagCatalogFlags(catalogsService, codigo2)
    : null;

  const codigo3 = extractCIE10Code(params.codigoCIEDiagnostico3 ?? '');
  const flags3 = codigo3
    ? await resolveDiagCatalogFlags(catalogsService, codigo3)
    : null;

  return {
    confirmacion1: aplicaConfirmacionDiagnostico1({
      tipoPersonal: params.tipoPersonal,
      edad,
      flags: flags1,
      relacionTemporal: params.relacionTemporal,
    }),
    confirmacion2: aplicaConfirmacionDiagnostico23({
      tipoPersonal: params.tipoPersonal,
      edad,
      flags: flags2,
      primeraVezDiagnostico: params.primeraVezDiagnostico2,
    }),
    confirmacion3: aplicaConfirmacionDiagnostico23({
      tipoPersonal: params.tipoPersonal,
      edad,
      flags: flags3,
      primeraVezDiagnostico: params.primeraVezDiagnostico3,
    }),
  };
}
