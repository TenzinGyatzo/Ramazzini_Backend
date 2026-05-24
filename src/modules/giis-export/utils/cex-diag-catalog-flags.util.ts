import { CatalogsService } from '../../catalogs/catalogs.service';
import {
  CatalogType,
  CIE10Entry,
} from '../../catalogs/interfaces/catalog-entry.interface';
import { DiagCatalogFlags } from '../../../utils/confirmacion-diagnostica.util';
import { extractCIE10Code, getCIE10Prefix } from '../../../utils/cie10.util';
import { CexMapperContext } from '../transformers/cex.mapper';

export async function resolveDiagCatalogFlags(
  catalogsService: CatalogsService,
  code: string | null | undefined,
): Promise<DiagCatalogFlags | null> {
  const normalized = extractCIE10Code(code ?? '');
  if (!normalized) return null;

  let entry = (await catalogsService.getCatalogEntry(
    CatalogType.CIE10,
    normalized,
  )) as CIE10Entry | null;

  if (!entry?.catalogKey) {
    const prefix = getCIE10Prefix(normalized);
    if (prefix && prefix !== normalized) {
      entry = (await catalogsService.getCatalogEntry(
        CatalogType.CIE10,
        prefix,
      )) as CIE10Entry | null;
    }
  }

  if (!entry?.catalogKey) return null;

  return {
    diaCronicos: entry.diaCronicos ?? false,
    diaCaInfantil: entry.diaCaInfantil ?? false,
  };
}

export async function resolveCexDiagCatalogFlags(
  catalogsService: CatalogsService,
  codes: {
    confirmacion1?: string | null;
    confirmacion2?: string | null;
    confirmacion3?: string | null;
  },
): Promise<CexMapperContext['diagCatalogFlags']> {
  const [confirmacion1, confirmacion2, confirmacion3] = await Promise.all([
    resolveDiagCatalogFlags(catalogsService, codes.confirmacion1),
    resolveDiagCatalogFlags(catalogsService, codes.confirmacion2),
    resolveDiagCatalogFlags(catalogsService, codes.confirmacion3),
  ]);
  return { confirmacion1, confirmacion2, confirmacion3 };
}
