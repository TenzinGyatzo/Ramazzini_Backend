import { Injectable, Logger } from '@nestjs/common';
import { CatalogsService } from '../../catalogs/catalogs.service';
import { CatalogType } from '../../catalogs/interfaces/catalog-entry.interface';
import { CIE10Entry } from '../../catalogs/interfaces/catalog-entry.interface';
import { extractCIE10Code, getCIE10Prefix } from '../../../utils/cie10.util';

/**
 * Diagnosis rule from catalog
 */
export interface DiagnosisRule {
  key: string; // CATALOG_KEY used (exact or prefix)
  lsex: string; // Sex restriction: "NO", "MUJER", "HOMBRE", "SI"
  linf: string | null; // Lower age limit (raw format: "010A", "028D", etc.)
  lsup: string | null; // Upper age limit (raw format: "120A", etc.)
}

/**
 * CIE-10 Catalog Lookup Service
 *
 * Provides lookup functionality for CIE-10 diagnosis rules from the catalog
 * with fallback strategy: exact match → 3-char prefix → null
 */
@Injectable()
export class Cie10CatalogLookupService {
  private readonly logger = new Logger(Cie10CatalogLookupService.name);

  constructor(private readonly catalogsService: CatalogsService) {}

  /**
   * Finds a diagnosis rule for a given CIE-10 code
   *
   * Strategy:
   * 1. Try exact match by CATALOG_KEY
   * 2. If not found, try 3-character prefix
   * 3. If still not found, return null (no blocking, but log warning)
   *
   * @param code - CIE-10 code (can be in format "C530" or "C530 - DESCRIPTION")
   * @returns Diagnosis rule or null if not found
   */
  async findDiagnosisRule(
    code: string | null | undefined,
  ): Promise<DiagnosisRule | null> {
    if (!code) {
      return null;
    }

    // Extract and normalize code
    const normalizedCode = extractCIE10Code(code);
    if (!normalizedCode) {
      return null;
    }

    // Try exact match first
    const exactEntry = (await this.catalogsService.getCatalogEntry(
      CatalogType.CIE10,
      normalizedCode,
    )) as CIE10Entry | null;

    if (exactEntry && exactEntry.catalogKey) {
      return {
        key: exactEntry.catalogKey,
        lsex: exactEntry.lsex || 'NO',
        linf: this.getRawAgeLimit(exactEntry.linfRaw, exactEntry.linf),
        lsup: this.getRawAgeLimit(exactEntry.lsupRaw, exactEntry.lsup),
      };
    }

    // Try prefix match (3 characters)
    const prefix = getCIE10Prefix(normalizedCode);
    if (prefix && prefix !== normalizedCode) {
      const prefixEntry = (await this.catalogsService.getCatalogEntry(
        CatalogType.CIE10,
        prefix,
      )) as CIE10Entry | null;

      if (prefixEntry && prefixEntry.catalogKey) {
        this.logger.debug(
          `CIE-10 code ${normalizedCode} not found exactly, using prefix ${prefix} from catalog`,
        );
        return {
          key: prefixEntry.catalogKey,
          lsex: prefixEntry.lsex || 'NO',
          linf: this.getRawAgeLimit(prefixEntry.linfRaw, prefixEntry.linf),
          lsup: this.getRawAgeLimit(prefixEntry.lsupRaw, prefixEntry.lsup),
        };
      }
    }

    // Not found in catalog - log warning but don't block
    this.logger.warn(
      `CIE-10 code ${normalizedCode} (prefix: ${prefix || 'N/A'}) not found in catalog. No restrictions will be applied.`,
    );

    return null;
  }

  /**
   * Gets raw age limit value from catalog entry
   * Prefers raw values (linfRaw/lsupRaw) if available, otherwise uses parsed values
   */
  private getRawAgeLimit(
    rawValue: string | null | undefined,
    parsedValue: number | null | undefined,
  ): string | null {
    // Prefer raw value from catalog
    if (rawValue !== null && rawValue !== undefined) {
      const trimmed = String(rawValue).trim().toUpperCase();
      return trimmed === 'NO' || trimmed === '' ? null : trimmed;
    }

    // Fallback to parsed number (format as "XXXA" assuming years)
    if (
      parsedValue !== null &&
      parsedValue !== undefined &&
      !isNaN(parsedValue) &&
      parsedValue >= 0
    ) {
      return `${String(Math.floor(parsedValue)).padStart(3, '0')}A`;
    }

    return null;
  }
}
