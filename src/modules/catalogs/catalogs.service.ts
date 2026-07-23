import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify/sync';
import {
  CatalogEntry,
  CatalogType,
  INEGIEntry,
  CIE10Entry,
  CLUESEntry,
  CPEntry,
} from './interfaces/catalog-entry.interface';
import { normalizeCatalogDescription } from './utils/catalog-description.util';
import {
  sortEstadosByCode,
  sortMunicipiosByCode,
} from './utils/geo-catalog-sort.util';
import {
  BASE_CATALOG_TYPES,
  CATALOG_FILES,
  CATALOG_NORMALIZED_DIR,
  OPTIONAL_CATALOG_TYPES,
} from './constants/catalog-files.constant';
import { mapRecordToEntry } from './utils/catalog-record.mapper';

/**
 * Validation result for GIIS catalog validation
 */
export interface GIISValidationResult {
  valid: boolean;
  catalogLoaded: boolean;
  message?: string;
}

/**
 * Catalog Service
 *
 * Loads and caches NOM-024 mandatory catalogs from CSV files.
 * Provides validation and search methods for catalog entries.
 *
 * Supports two categories of catalogs:
 * - BASE (6): Required catalogs that MUST be present for full functionality
 * - GIIS (3): Optional catalogs (GIIS-B019) that are not publicly available from DGIS
 *
 * GIIS catalogs are loaded opportunistically. If missing, validation methods return
 * non-blocking results (true) and emit warnings instead of errors.
 */
@Injectable()
export class CatalogsService implements OnModuleInit {
  private readonly logger = new Logger(CatalogsService.name);

  // In-memory caches: Map<catalogType, Map<code, entry>>
  private catalogCaches = new Map<CatalogType, Map<string, CatalogEntry>>();

  // Indexes for hierarchical lookups (INEGI)
  private estadoCache = new Map<string, CatalogEntry>(); // estadoCode -> entry
  private municipioCache = new Map<string, Map<string, CatalogEntry>>(); // estadoCode -> Map<municipioCode, entry>
  private localidadCache = new Map<string, Map<string, CatalogEntry>>(); // municipioKey -> Map<localidadCode, entry>

  // Track which GIIS catalogs have emitted a warning (to avoid log spam)
  private giisWarningEmitted = new Set<CatalogType>();

  private readonly catalogFiles = CATALOG_FILES;
  private readonly optionalCatalogs = OPTIONAL_CATALOG_TYPES;
  private readonly baseCatalogs = BASE_CATALOG_TYPES;

  private readonly reloadLocks = new Map<CatalogType, Promise<void>>();

  async onModuleInit() {
    this.logger.log('Initializing catalog service...');
    await this.loadAllCatalogs();
    this.logger.log('Catalog service initialized successfully');
  }

  /**
   * Load all catalogs from CSV files
   */
  private async loadAllCatalogs(): Promise<void> {
    const catalogsPath = join(process.cwd(), CATALOG_NORMALIZED_DIR);

    const loadPromises = Object.entries(this.catalogFiles)
      .filter(([, filename]) => filename) // Filter out undefined entries
      .map(([type, filename]) => {
        const catalogType = type as CatalogType;
        const isOptional = this.optionalCatalogs.includes(catalogType);

        return this.loadCatalog(
          catalogType,
          join(catalogsPath, filename),
        ).catch((error) => {
          if (isOptional) {
            this.logger.warn(
              `Optional GIIS catalog ${filename} not found (DGIS does not publish these publicly). Continuing without strict validation.`,
            );
          } else {
            this.logger.error(
              `Failed to load catalog ${filename}: ${error.message}`,
              error.stack,
            );
          }
          // Continue startup even if a catalog fails to load
          return null;
        });
      });

    await Promise.all(loadPromises);
    this.logCacheStatistics();
  }

  /**
   * Reload a single catalog from disk into memory (thread-safe per catalog type).
   */
  async reloadCatalog(catalogType: CatalogType): Promise<void> {
    const prev = this.reloadLocks.get(catalogType) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    this.reloadLocks.set(
      catalogType,
      prev.then(() => gate),
    );
    await prev;
    try {
      if (catalogType === CatalogType.ENTIDADES_FEDERATIVAS) {
        this.estadoCache.clear();
      } else if (catalogType === CatalogType.MUNICIPIOS) {
        this.municipioCache.clear();
      } else if (catalogType === CatalogType.LOCALIDADES) {
        this.localidadCache.clear();
      }
      this.catalogCaches.delete(catalogType);
      const filename = this.catalogFiles[catalogType];
      if (!filename) {
        throw new Error(`No file mapping for ${catalogType}`);
      }
      const filePath = join(process.cwd(), CATALOG_NORMALIZED_DIR, filename);
      await this.loadCatalog(catalogType, filePath);
    } finally {
      release();
      if (this.reloadLocks.get(catalogType) === gate) {
        this.reloadLocks.delete(catalogType);
      }
    }
  }

  /**
   * Load a single catalog from CSV file
   */
  private async loadCatalog(
    catalogType: CatalogType,
    filePath: string,
  ): Promise<void> {
    // Check if file exists before attempting to load
    if (!existsSync(filePath)) {
      throw new Error(`Catalog file not found: ${filePath}`);
    }

    this.logger.log(`Loading catalog: ${filePath}`);
    const cache = new Map<string, CatalogEntry>();

    try {
      const records: any[] = await this.parseCSV(filePath);

      for (const record of records) {
        const entry = mapRecordToEntry(catalogType, record);
        if (entry && entry.code) {
          cache.set(entry.code, entry);
        }
      }

      this.catalogCaches.set(catalogType, cache);

      // Build hierarchical indexes for INEGI catalogs
      if (catalogType === CatalogType.ENTIDADES_FEDERATIVAS) {
        this.buildEstadoIndex(cache);
      } else if (catalogType === CatalogType.MUNICIPIOS) {
        await this.buildMunicipioIndex(cache);
      } else if (catalogType === CatalogType.LOCALIDADES) {
        await this.buildLocalidadIndex(cache);
      }

      this.logger.log(`Loaded ${cache.size} entries from ${catalogType}`);
    } catch (error) {
      this.logger.error(
        `Error loading catalog ${filePath}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Parse CSV file with streaming support for large files
   */
  private async parseCSV(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      // Defensive check: verify file exists before creating stream
      if (!existsSync(filePath)) {
        reject(new Error(`File not found: ${filePath}`));
        return;
      }

      const records: any[] = [];
      const stream = createReadStream(filePath, { encoding: 'utf-8' });

      // Handle stream errors immediately (before pipe)
      stream.on('error', (error) => {
        reject(error);
      });

      stream
        .pipe(
          parse({
            columns: true,
            skip_empty_lines: true,
            trim: true,
            bom: true, // Handle UTF-8 BOM
          }),
        )
        .on('data', (record) => {
          records.push(record);
        })
        .on('end', () => {
          resolve(records);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Build estado (state) index
   */
  private buildEstadoIndex(cache: Map<string, CatalogEntry>): void {
    for (const [code, entry] of cache) {
      this.estadoCache.set(code, entry);
    }
  }

  /**
   * Build municipio (municipality) index with estado grouping
   */
  private async buildMunicipioIndex(
    cache: Map<string, CatalogEntry>,
  ): Promise<void> {
    for (const [code, entry] of cache) {
      const inegiEntry = entry as INEGIEntry;
      const estadoCode = inegiEntry.estadoCode;

      if (estadoCode) {
        // Normalizar código de estado (2 dígitos)
        const normalizedEstadoCode = estadoCode
          .toString()
          .padStart(2, '0')
          .toUpperCase();
        if (!this.municipioCache.has(normalizedEstadoCode)) {
          this.municipioCache.set(normalizedEstadoCode, new Map());
        }
        this.municipioCache.get(normalizedEstadoCode)!.set(code, entry);
      } else {
        this.logger.warn(
          `Municipio entry ${code} has no estadoCode: ${JSON.stringify(entry)}`,
        );
      }
    }
    this.logger.log(
      `Built municipio index with ${this.municipioCache.size} estados`,
    );
  }

  /**
   * Build localidad (locality) index with municipio grouping
   */
  private async buildLocalidadIndex(
    cache: Map<string, CatalogEntry>,
  ): Promise<void> {
    for (const [code, entry] of cache) {
      const inegiEntry = entry as INEGIEntry;
      const estadoCode = inegiEntry.estadoCode;
      const municipioCode = inegiEntry.municipioCode;

      if (estadoCode && municipioCode) {
        // Normalizar códigos: asegurar padding para estado (2 dígitos) y municipio (3 dígitos)
        const normalizedEstadoCode = estadoCode
          .toString()
          .padStart(2, '0')
          .toUpperCase();
        const normalizedMunicipioCode = municipioCode
          .toString()
          .padStart(3, '0');
        const key = `${normalizedEstadoCode}-${normalizedMunicipioCode}`;
        if (!this.localidadCache.has(key)) {
          this.localidadCache.set(key, new Map());
        }
        this.localidadCache.get(key)!.set(code, entry);
      }
    }
  }

  /**
   * Log cache statistics with separate base vs GIIS counts
   */
  private logCacheStatistics(): void {
    let baseLoaded = 0;
    let giisLoaded = 0;

    for (const catalog of this.baseCatalogs) {
      if (this.catalogCaches.has(catalog)) {
        baseLoaded++;
      }
    }

    for (const catalog of this.optionalCatalogs) {
      if (this.catalogCaches.has(catalog)) {
        giisLoaded++;
      }
    }

    this.logger.log('=== Catalog Cache Statistics ===');
    this.logger.log(`Base catalogs loaded: ${baseLoaded}/${this.baseCatalogs.length}`);
    this.logger.log(
      `GIIS optional catalogs loaded: ${giisLoaded}/${this.optionalCatalogs.length}`,
    );
    this.logger.log('--- Detailed counts ---');

    for (const [type, cache] of this.catalogCaches) {
      this.logger.log(`${type}: ${cache.size} entries`);
    }

    this.logger.log(`Estado index: ${this.estadoCache.size} entries`);
    this.logger.log(`Municipio index: ${this.municipioCache.size} estados`);
    this.logger.log(`Localidad index: ${this.localidadCache.size} municipios`);
  }

  // ===========================================================================
  // BASE CATALOG VALIDATION METHODS
  // ===========================================================================

  /**
   * Validate CIE-10 diagnostic code
   */
  async validateCIE10(
    code: string,
    sex?: string,
    age?: number,
  ): Promise<boolean> {
    const cache = this.catalogCaches.get(CatalogType.CIE10);
    if (!cache) {
      this.logger.warn('CIE-10 catalog not loaded');
      return false;
    }

    const entry = cache.get(code) as CIE10Entry;
    if (!entry) {
      return false;
    }

    // Validate sex restriction if provided
    if (sex && entry.lsex && entry.lsex !== 'NO' && entry.lsex !== sex) {
      return false;
    }

    // Validate age restrictions if provided
    if (age !== undefined) {
      if (entry.linf !== undefined && age < entry.linf) {
        return false;
      }
      if (entry.lsup !== undefined && age > entry.lsup) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate CLUES establishment code
   */
  async validateCLUES(clues: string): Promise<boolean> {
    const cache = this.catalogCaches.get(CatalogType.CLUES);
    if (!cache) {
      this.logger.warn('CLUES catalog not loaded');
      return false;
    }

    return cache.has(clues);
  }

  /**
   * Validate CLUES establishment code and check if it's in operation
   * @param clues - CLUES code to validate
   * @returns true if CLUES exists and has status "EN OPERACION"
   */
  async validateCLUESInOperation(clues: string): Promise<boolean> {
    const cache = this.catalogCaches.get(CatalogType.CLUES);
    if (!cache) {
      this.logger.warn('CLUES catalog not loaded');
      return false;
    }

    const entry = cache.get(clues) as CLUESEntry;
    if (!entry) {
      return false;
    }

    // Check if establishment is in operation
    return entry.estatus === 'EN OPERACION';
  }

  /**
   * Get CLUES entry by code
   */
  async getCLUESEntry(clues: string): Promise<CLUESEntry | null> {
    const cache = this.catalogCaches.get(CatalogType.CLUES);
    if (!cache) {
      return null;
    }

    return (cache.get(clues) as CLUESEntry) || null;
  }

  /**
   * Validate INEGI geographic code (estado, municipio, or localidad)
   */
  async validateINEGI(
    type: 'estado' | 'municipio' | 'localidad',
    code: string,
    parentCode?: string,
  ): Promise<boolean> {
    switch (type) {
      case 'estado':
        return this.estadoCache.has(code);

      case 'municipio':
        if (!parentCode) {
          // Check if code exists in any estado
          // El código puede venir como "001" o "25-001", necesitamos buscar ambos formatos
          for (const municipioMap of this.municipioCache.values()) {
            // Buscar el código tal cual viene
            if (municipioMap.has(code)) {
              return true;
            }
            // Si el código no tiene guión, buscar en todas las entradas
            if (!code.includes('-')) {
              for (const entryCode of municipioMap.keys()) {
                const parts = entryCode.split('-');
                if (parts.length > 1 && parts[parts.length - 1] === code) {
                  return true;
                }
              }
            }
          }
          return false;
        }
        // Normalizar código de estado (2 dígitos)
        const normalizedEstadoCode = parentCode
          .toString()
          .padStart(2, '0')
          .toUpperCase();
        const municipioMap = this.municipioCache.get(normalizedEstadoCode);
        if (!municipioMap) {
          return false;
        }
        // Normalizar código de municipio (3 dígitos)
        const normalizedMunicipioCode = code.toString().padStart(3, '0');
        // Construir código completo: estado-municipio
        const fullMunicipioCode = `${normalizedEstadoCode}-${normalizedMunicipioCode}`;
        // Buscar el código completo en el cache
        return municipioMap.has(fullMunicipioCode);

      case 'localidad':
        if (!parentCode) {
          // Check if code exists in any municipio
          // El código puede venir como "0001" o "25-001-0001", necesitamos buscar ambos formatos
          for (const localidadMap of this.localidadCache.values()) {
            // Buscar el código tal cual viene
            if (localidadMap.has(code)) {
              return true;
            }
            // Si el código no tiene guión, buscar en todas las entradas
            if (!code.includes('-')) {
              for (const entryCode of localidadMap.keys()) {
                const parts = entryCode.split('-');
                if (parts.length > 2 && parts[parts.length - 1] === code) {
                  return true;
                }
              }
            }
          }
          return false;
        }
        // parentCode viene como "25-001" (estado-municipio)
        // Normalizar la clave del parent
        const parentParts = parentCode.split('-');
        if (parentParts.length !== 2) {
          return false;
        }
        const normalizedParentEstado = parentParts[0]
          .toString()
          .padStart(2, '0')
          .toUpperCase();
        const normalizedParentMunicipio = parentParts[1]
          .toString()
          .padStart(3, '0');
        const parentKey = `${normalizedParentEstado}-${normalizedParentMunicipio}`;
        const localidadMap = this.localidadCache.get(parentKey);
        if (!localidadMap) {
          return false;
        }
        // Normalizar código de localidad (4 dígitos)
        const normalizedLocalidadCode = code.toString().padStart(4, '0');
        // Construir código completo: estado-municipio-localidad
        const fullLocalidadCode = `${normalizedParentEstado}-${normalizedParentMunicipio}-${normalizedLocalidadCode}`;
        // Buscar el código completo en el cache
        return localidadMap.has(fullLocalidadCode);

      default:
        return false;
    }
  }

  // ===========================================================================
  // GIIS-B019 CATALOG VALIDATION METHODS (Optional)
  // ===========================================================================

  /**
   * Validate GIIS Tipo de Personal code (GIIS-B019)
   *
   * If catalog is not loaded, returns a non-blocking result (valid=true).
   */
  validateGIISTipoPersonal(code: number | string): GIISValidationResult {
    return this.validateGIISCatalog(
      CatalogType.TIPO_PERSONAL,
      code,
      'Tipo Personal',
    );
  }

  /**
   * Validate GIIS Servicio de Atención code (CEX)
   */
  validateGIISServicioAtencion(code: number | string): GIISValidationResult {
    return this.validateGIISCatalog(
      CatalogType.SERVICIOS_ATENCION_CE,
      code,
      'Servicios de Atención CE',
    );
  }

  /**
   * Find CATALOG_KEY by normalized description match in a loaded catalog.
   */
  findCatalogKeyByNormalizedDescription(
    catalogType: CatalogType,
    targetDescription: string,
  ): number | null {
    const cache = this.catalogCaches.get(catalogType);
    if (!cache) {
      return null;
    }
    const target = normalizeCatalogDescription(targetDescription);
    for (const entry of cache.values()) {
      if (normalizeCatalogDescription(entry.description) === target) {
        const n = Number(entry.code);
        return Number.isFinite(n) ? n : null;
      }
    }
    return null;
  }

  /**
   * Validate GIIS Afiliación code (GIIS-B019)
   *
   * If catalog is not loaded, returns a non-blocking result (valid=true).
   */
  validateGIISAfiliacion(code: number | string): GIISValidationResult {
    return this.validateGIISCatalog(CatalogType.AFILIACION, code, 'Afiliación');
  }

  /**
   * Validate GIIS País code (GIIS-B019)
   *
   * If catalog is not loaded, returns a non-blocking result (valid=true).
   */
  validateGIISPais(code: number | string): GIISValidationResult {
    return this.validateGIISCatalog(CatalogType.PAIS, code, 'País');
  }

  // ===========================================================================
  // GENERIC GIIS VALIDATION HELPER
  // ===========================================================================

  /**
   * Generic GIIS catalog validation
   *
   * Behavior:
   * - If catalog loaded: validates code exists (returns valid=true/false)
   * - If catalog NOT loaded: returns valid=true (non-blocking) + emits single WARN per process lifetime
   */
  private validateGIISCatalog(
    catalogType: CatalogType,
    code: number | string,
    catalogName: string,
  ): GIISValidationResult {
    const cache = this.catalogCaches.get(catalogType);
    const codeStr = String(code);

    if (!cache) {
      // Catalog not loaded - return non-blocking result
      // Emit warning only once per catalog type per process lifetime
      if (!this.giisWarningEmitted.has(catalogType)) {
        this.logger.warn(
          `GIIS catalog "${catalogName}" not loaded. ` +
            `Validation bypassed for code: ${codeStr}. ` +
            `This warning will not repeat for this catalog type.`,
        );
        this.giisWarningEmitted.add(catalogType);
      }

      return {
        valid: true, // Non-blocking
        catalogLoaded: false,
        message: `Optional GIIS catalog "${catalogName}" not available. Validation bypassed.`,
      };
    }

    // Catalog loaded - perform actual validation
    const isValid = cache.has(codeStr);

    return {
      valid: isValid,
      catalogLoaded: true,
      message: isValid
        ? undefined
        : `Code "${codeStr}" not found in GIIS catalog "${catalogName}"`,
    };
  }

  /**
   * Check if a GIIS catalog is loaded
   */
  isGIISCatalogLoaded(catalogType: CatalogType): boolean {
    return (
      this.optionalCatalogs.includes(catalogType) &&
      this.catalogCaches.has(catalogType)
    );
  }

  /**
   * Get statistics about loaded catalogs
   */
  getCatalogStats(): {
    baseLoaded: number;
    baseTotal: number;
    giisLoaded: number;
    giisTotal: number;
    loadedCatalogs: CatalogType[];
  } {
    const loadedCatalogs: CatalogType[] = [];
    let baseLoaded = 0;
    let giisLoaded = 0;

    for (const catalog of this.baseCatalogs) {
      if (this.catalogCaches.has(catalog)) {
        baseLoaded++;
        loadedCatalogs.push(catalog);
      }
    }

    for (const catalog of this.optionalCatalogs) {
      if (this.catalogCaches.has(catalog)) {
        giisLoaded++;
        loadedCatalogs.push(catalog);
      }
    }

    return {
      baseLoaded,
      baseTotal: this.baseCatalogs.length,
      giisLoaded,
      giisTotal: this.optionalCatalogs.length,
      loadedCatalogs,
    };
  }

  // ===========================================================================
  // GENERIC CATALOG ACCESS METHODS
  // ===========================================================================

  /**
   * Get catalog entry by code
   */
  async getCatalogEntry(
    catalog: CatalogType,
    code: string,
  ): Promise<CatalogEntry | null> {
    const cache = this.catalogCaches.get(catalog);
    if (!cache) {
      return null;
    }

    return cache.get(code) || null;
  }

  /**
   * Search catalog entries by query string
   */
  async searchCatalog(
    catalog: CatalogType,
    query: string,
    limit: number = 50,
  ): Promise<CatalogEntry[]> {
    const cache = this.catalogCaches.get(catalog);
    if (!cache) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    const results: CatalogEntry[] = [];

    for (const entry of cache.values()) {
      if (
        entry.code.toLowerCase().includes(lowerQuery) ||
        entry.description.toLowerCase().includes(lowerQuery)
      ) {
        results.push(entry);
        if (results.length >= limit) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Paginated admin listing from in-memory cache.
   */
  listCatalogPaginated(
    catalog: CatalogType,
    page: number = 1,
    limit: number = 50,
    q?: string,
    filters?: { estadoCode?: string; municipioCode?: string },
  ): {
    items: CatalogEntry[];
    total: number;
    page: number;
    limit: number;
  } {
    const cache = this.catalogCaches.get(catalog);
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    if (!cache) {
      return { items: [], total: 0, page: safePage, limit: safeLimit };
    }
    let entries = Array.from(cache.values());
    const lowerQ = q?.trim().toLowerCase();
    if (lowerQ) {
      entries = entries.filter(
        (e) =>
          e.code.toLowerCase().includes(lowerQ) ||
          (e.description || '').toLowerCase().includes(lowerQ),
      );
    }
    if (filters?.estadoCode) {
      const ec = filters.estadoCode.padStart(2, '0');
      entries = entries.filter((e) => {
        const geo = e as INEGIEntry;
        return (
          geo.estadoCode?.toString().padStart(2, '0') === ec ||
          e.code.startsWith(`${ec}-`)
        );
      });
    }
    if (filters?.municipioCode && catalog === CatalogType.LOCALIDADES) {
      const mc = filters.municipioCode.padStart(3, '0');
      entries = entries.filter((e) => {
        const geo = e as INEGIEntry;
        return geo.municipioCode?.toString().padStart(3, '0') === mc;
      });
    }
    entries.sort((a, b) => {
      const numA = Number(a.code);
      const numB = Number(b.code);
      if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
      return (a.description || '').localeCompare(b.description || '');
    });
    const total = entries.length;
    const skip = (safePage - 1) * safeLimit;
    const items = entries.slice(skip, skip + safeLimit).map((e) => {
      const { _csvRow, ...rest } = e;
      return rest as CatalogEntry;
    });
    return { items, total, page: safePage, limit: safeLimit };
  }

  getCacheRowCount(catalog: CatalogType): number {
    return this.catalogCaches.get(catalog)?.size ?? 0;
  }

  isCatalogLoaded(catalog: CatalogType): boolean {
    return this.catalogCaches.has(catalog);
  }

  /**
   * List all entries from a GIIS catalog (for populating selectors)
   * @param vigenteOnly When true, keep only entries with vigente !== false
   */
  listCatalog(
    catalog: CatalogType,
    limit: number = 500,
    vigenteOnly: boolean = false,
  ): CatalogEntry[] {
    const cache = this.catalogCaches.get(catalog);
    if (!cache) {
      return [];
    }
    let entries = Array.from(cache.values());
    if (vigenteOnly) {
      entries = entries.filter((e) => e.vigente !== false);
    }
    entries.sort((a, b) => {
      const numA = Number(a.code);
      const numB = Number(b.code);
      if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
        return numA - numB;
      }
      return (a.description || '').localeCompare(b.description || '');
    });
    return entries
      .slice(0, limit)
      .map(({ _csvRow, ...safe }) => safe);
  }

  /**
   * Search CIE-10 catalog entries with optional sex and age filters
   * NOM-024 GIIS-B015: Pre-filter results based on patient data
   */
  async searchCIE10WithFilters(
    query: string,
    limit: number = 50,
    sexo?: number,
    edad?: number,
  ): Promise<CIE10Entry[]> {
    const cache = this.catalogCaches.get(CatalogType.CIE10);
    if (!cache) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    const results: CIE10Entry[] = [];

    for (const entry of cache.values()) {
      const cie10Entry = entry as CIE10Entry;

      // Filter by query string
      if (
        !cie10Entry.code.toLowerCase().includes(lowerQuery) &&
        !cie10Entry.description.toLowerCase().includes(lowerQuery)
      ) {
        continue;
      }

      // Filter by sex (LSEX) if provided
      if (
        sexo !== undefined &&
        sexo !== null &&
        cie10Entry.lsex &&
        cie10Entry.lsex !== 'NO'
      ) {
        // LSEX = "SI" typically means male-only, validate accordingly
        // For now, we do basic filtering - more complex logic can be added
        if (cie10Entry.lsex === 'SI' && sexo === 2) {
          // Skip entries that are male-only when patient is female
          continue;
        }
        // Add more LSEX validation logic as needed based on catalog format
      }

      // Filter by age (LINF/LSUP) if provided
      if (edad !== undefined && edad !== null) {
        if (cie10Entry.linf !== undefined && edad < cie10Entry.linf) {
          continue; // Patient too young
        }
        if (cie10Entry.lsup !== undefined && edad > cie10Entry.lsup) {
          continue; // Patient too old
        }
      }

      results.push(cie10Entry);
      if (results.length >= limit) {
        break;
      }
    }

    return results;
  }

  /**
   * Get all entidades federativas (states)
   */
  getEstados(): CatalogEntry[] {
    return sortEstadosByCode(Array.from(this.estadoCache.values()));
  }

  /**
   * Get municipios for a given estado
   */
  getMunicipiosByEstado(estadoCode: string): CatalogEntry[] {
    // Normalizar código de estado (2 dígitos)
    const normalizedEstadoCode = estadoCode
      .toString()
      .padStart(2, '0')
      .toUpperCase();
    const municipioMap = this.municipioCache.get(normalizedEstadoCode);
    if (!municipioMap) {
      return [];
    }
    return sortMunicipiosByCode(Array.from(municipioMap.values()));
  }

  /**
   * Clave numérica para ordenar localidades por código INEGI (0001, 0002, …).
   */
  private getLocalidadSortKey(entry: CatalogEntry): number {
    const inegi = entry as INEGIEntry;
    const raw =
      inegi.localidadCode ??
      String(entry.code ?? '')
        .split('-')
        .pop() ??
      '';
    const num = parseInt(String(raw).trim(), 10);
    return Number.isNaN(num) ? Number.MAX_SAFE_INTEGER : num;
  }

  private sortLocalidadesByCode(entries: CatalogEntry[]): CatalogEntry[] {
    return [...entries].sort(
      (a, b) => this.getLocalidadSortKey(a) - this.getLocalidadSortKey(b),
    );
  }

  /**
   * Get localidades for a given municipio
   */
  getLocalidadesByMunicipio(
    estadoCode: string,
    municipioCode: string,
    query?: string,
  ): CatalogEntry[] {
    // Normalizar códigos: asegurar padding para estado (2 dígitos) y municipio (3 dígitos)
    const normalizedEstadoCode = estadoCode
      .toString()
      .padStart(2, '0')
      .toUpperCase();
    const normalizedMunicipioCode = municipioCode.toString().padStart(3, '0');
    const key = `${normalizedEstadoCode}-${normalizedMunicipioCode}`;
    const localidadMap = this.localidadCache.get(key);
    if (!localidadMap) {
      this.logger.debug(
        `No localidades found for key: ${key} (estado: ${estadoCode}, municipio: ${municipioCode})`,
      );
      this.logger.debug(
        `Available keys in cache: ${Array.from(this.localidadCache.keys()).slice(0, 10).join(', ')}...`,
      );
      return [];
    }

    const entries = Array.from(localidadMap.values());

    let filtered = entries;
    if (query && query.trim() !== '') {
      const lowerQuery = query.toLowerCase();
      filtered = entries.filter(
        (e) =>
          e.code.toLowerCase().includes(lowerQuery) ||
          e.description.toLowerCase().includes(lowerQuery),
      );
    }

    return this.sortLocalidadesByCode(filtered).slice(0, query?.trim() ? 50 : undefined);
  }

  /**
   * Search CLUES by query string (code or name)
   */
  async searchCLUES(query: string, limit: number = 20): Promise<CLUESEntry[]> {
    const cache = this.catalogCaches.get(CatalogType.CLUES);
    if (!cache) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    const results: CLUESEntry[] = [];

    for (const entry of cache.values()) {
      const cluesEntry = entry as CLUESEntry;
      if (
        cluesEntry.code.toLowerCase().includes(lowerQuery) ||
        cluesEntry.description.toLowerCase().includes(lowerQuery) ||
        (cluesEntry.nombreInstitucion &&
          cluesEntry.nombreInstitucion.toLowerCase().includes(lowerQuery))
      ) {
        results.push(cluesEntry);
        if (results.length >= limit) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Search Postal Codes by query string
   */
  async searchCP(query: string, limit: number = 20): Promise<CatalogEntry[]> {
    const cache = this.catalogCaches.get(CatalogType.CODIGOS_POSTALES);
    if (!cache) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    const results: CatalogEntry[] = [];

    for (const entry of cache.values()) {
      // Buscamos por el código postal o por la descripción (asentamiento, municipio, estado)
      // Usamos String() para mayor seguridad ante nulos o números
      const cp = String(entry.cp || '').toLowerCase();
      const description = String(entry.description || '').toLowerCase();

      if (cp.includes(lowerQuery) || description.includes(lowerQuery)) {
        results.push(entry);
        if (results.length >= limit) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Search estados by query string (code or description)
   */
  searchEstados(query: string, limit: number = 50): CatalogEntry[] {
    if (!query || query.trim() === '') {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    const results: CatalogEntry[] = [];

    for (const entry of this.estadoCache.values()) {
      const code = String(entry.code || '').toLowerCase();
      const description = String(entry.description || '').toLowerCase();

      if (code.includes(lowerQuery) || description.includes(lowerQuery)) {
        results.push(entry);
        if (results.length >= limit) {
          break;
        }
      }
    }

    return sortEstadosByCode(results);
  }

  /**
   * Get estado by code
   */
  getEstadoByCode(code: string): CatalogEntry | null {
    return this.estadoCache.get(code) || null;
  }

  /**
   * Search municipios by query string within a specific estado
   */
  searchMunicipios(
    estadoCode: string,
    query: string,
    limit: number = 50,
  ): CatalogEntry[] {
    if (!query || query.trim() === '' || !estadoCode) {
      return [];
    }

    // Normalizar código de estado (2 dígitos)
    const normalizedEstadoCode = estadoCode
      .toString()
      .padStart(2, '0')
      .toUpperCase();
    const municipioMap = this.municipioCache.get(normalizedEstadoCode);
    if (!municipioMap) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    const results: CatalogEntry[] = [];

    for (const entry of municipioMap.values()) {
      const code = String(entry.code || '').toLowerCase();
      const description = String(entry.description || '').toLowerCase();

      if (code.includes(lowerQuery) || description.includes(lowerQuery)) {
        results.push(entry);
        if (results.length >= limit) {
          break;
        }
      }
    }

    return sortMunicipiosByCode(results);
  }

  // ===========================================================================
  // IMPORT REFERENCE CSV (carga masiva SIRES)
  // ===========================================================================

  private getMunicipioExportCode(entry: CatalogEntry): string {
    const inegi = entry as INEGIEntry;
    if (inegi.municipioCode) {
      return String(inegi.municipioCode).padStart(3, '0');
    }
    const code = String(entry.code ?? '');
    return code.includes('-') ? code.split('-')[1] : code;
  }

  private getLocalidadExportCode(entry: CatalogEntry): string {
    const inegi = entry as INEGIEntry;
    if (inegi.localidadCode) {
      return String(inegi.localidadCode).padStart(4, '0');
    }
    const code = String(entry.code ?? '');
    return code.includes('-') ? code.split('-').pop() ?? code : code;
  }

  buildImportReferencePaisesCsv(): Buffer {
    const cache = this.catalogCaches.get(CatalogType.PAIS);
    const rows: string[][] = [['CATALOG_KEY', 'descripcion']];
    if (cache) {
      const entries = Array.from(cache.values()).sort((a, b) => {
        const numA = Number(a.code);
        const numB = Number(b.code);
        if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
          return numA - numB;
        }
        return (a.description || '').localeCompare(b.description || '');
      });
      for (const entry of entries) {
        rows.push([String(entry.code), entry.description || '']);
      }
    }
    return Buffer.from(stringify(rows), 'utf-8');
  }

  buildImportReferenceEntidadesCsv(): Buffer {
    const rows: string[][] = [['codigo', 'descripcion']];
    for (const entry of this.getEstados()) {
      rows.push([entry.code, entry.description || '']);
    }
    return Buffer.from(stringify(rows), 'utf-8');
  }

  buildImportReferenceMunicipiosCsv(): Buffer {
    const rows: string[][] = [
      ['entidadCode', 'municipioCode', 'descripcion'],
    ];
    const estados = sortEstadosByCode(Array.from(this.estadoCache.values()));
    for (const estado of estados) {
      const estadoCode = estado.code;
      for (const municipio of this.getMunicipiosByEstado(estadoCode)) {
        rows.push([
          estadoCode,
          this.getMunicipioExportCode(municipio),
          municipio.description || '',
        ]);
      }
    }
    return Buffer.from(stringify(rows), 'utf-8');
  }

  buildImportReferenceLocalidadesCsv(
    estadoCode: string,
    municipioCode: string,
  ): Buffer {
    const normalizedEstado = estadoCode.toString().padStart(2, '0').toUpperCase();
    const normalizedMunicipio = municipioCode.toString().padStart(3, '0');
    const rows: string[][] = [
      ['entidadCode', 'municipioCode', 'localidadCode', 'descripcion'],
    ];
    const localidades = this.getLocalidadesByMunicipio(
      normalizedEstado,
      normalizedMunicipio,
    );
    for (const localidad of localidades) {
      rows.push([
        normalizedEstado,
        normalizedMunicipio,
        this.getLocalidadExportCode(localidad),
        localidad.description || '',
      ]);
    }
    return Buffer.from(stringify(rows), 'utf-8');
  }

  // ===========================================================================
  // TEST HELPERS (for injecting mock data in tests)
  // ===========================================================================

  /**
   * Inject mock catalog data (for testing only)
   *
   * @param catalogType - The catalog type to inject
   * @param entries - Array of catalog entries to inject
   */
  injectMockCatalog(catalogType: CatalogType, entries: CatalogEntry[]): void {
    const cache = new Map<string, CatalogEntry>();
    for (const entry of entries) {
      cache.set(entry.code, entry);
    }
    this.catalogCaches.set(catalogType, cache);
    this.logger.debug(
      `Injected ${entries.length} mock entries for ${catalogType}`,
    );
  }

  /**
   * Clear a catalog (for testing only)
   *
   * @param catalogType - The catalog type to clear
   */
  clearCatalog(catalogType: CatalogType): void {
    this.catalogCaches.delete(catalogType);
    this.giisWarningEmitted.delete(catalogType);
    this.logger.debug(`Cleared catalog ${catalogType}`);
  }

  /**
   * Reset all warning flags (for testing only)
   */
  resetWarningFlags(): void {
    this.giisWarningEmitted.clear();
  }
}
