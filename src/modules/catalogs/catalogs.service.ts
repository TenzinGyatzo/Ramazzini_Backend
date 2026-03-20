import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { parse } from 'csv-parse';
import {
  CatalogEntry,
  CatalogType,
  INEGIEntry,
  CIE10Entry,
  CLUESEntry,
  CPEntry,
} from './interfaces/catalog-entry.interface';

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
 * - BASE (11): Required catalogs that MUST be present for full functionality
 * - GIIS (8): Optional catalogs (GIIS-B013 + GIIS-B019) that are not publicly available from DGIS
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

  // Catalog file mappings
  private readonly catalogFiles: Partial<Record<CatalogType, string>> = {
    // Base catalogs (11)
    [CatalogType.CIE10]: 'diagnosticos_sis.csv',
    [CatalogType.CLUES]: 'establecimiento_de_salud_sis.csv',
    [CatalogType.ENTIDADES_FEDERATIVAS]: 'enitades_federativas.csv',
    [CatalogType.MUNICIPIOS]: 'municipios.csv',
    [CatalogType.LOCALIDADES]: 'localidades.csv',
    [CatalogType.CODIGOS_POSTALES]: 'codigos_postales.csv',
    [CatalogType.NACIONALIDADES]: 'cat_nacionalidades.csv',
    [CatalogType.RELIGIONES]: 'cat_religiones.csv',
    [CatalogType.LENGUAS_INDIGENAS]: 'lenguas_indigenas.csv',
    [CatalogType.FORMACION_ACADEMICA]: 'formacion_academica.csv',
    [CatalogType.ESCOLARIDAD]: 'escolaridad.csv',
    // GIIS-B013 Catalogs (4) - Optional
    [CatalogType.SITIO_OCURRENCIA]: 'cat_sitio_ocurrencia.csv',
    [CatalogType.AGENTE_LESION]: 'cat_agente_lesion.csv',
    [CatalogType.AREA_ANATOMICA]: 'cat_area_anatomica.csv',
    [CatalogType.CONSECUENCIA]: 'cat_consecuencia.csv',
    // GIIS-B019 Catalogs (4) - Optional
    [CatalogType.TIPO_PERSONAL]: 'cat_tipo_personal.csv',
    [CatalogType.SERVICIOS_DET]: 'cat_servicios_det.csv',
    [CatalogType.AFILIACION]: 'cat_afiliacion.csv',
    [CatalogType.PAIS]: 'cat_pais.csv',
    // GIIS Lesión catalogs (2) - Optional
    [CatalogType.TIPO_VIALIDAD]: 'cat_tipo_vialidad.csv',
    [CatalogType.TIPO_ASENTAMIENTO]: 'cat_tipo_asentamiento.csv',
    // CIE-10 GIIS para lesión/violencia (incluye V01-Y98)
    [CatalogType.CIE10_GIIS_LESION]: 'diagnosticos.csv',
  };

  // Define which catalogs are optional (GIIS)
  private readonly optionalCatalogs: CatalogType[] = [
    // GIIS-B013
    CatalogType.SITIO_OCURRENCIA,
    CatalogType.AGENTE_LESION,
    CatalogType.AREA_ANATOMICA,
    CatalogType.CONSECUENCIA,
    // GIIS-B019
    CatalogType.TIPO_PERSONAL,
    CatalogType.SERVICIOS_DET,
    CatalogType.AFILIACION,
    CatalogType.PAIS,
    // GIIS Lesión catalogs
    CatalogType.TIPO_VIALIDAD,
    CatalogType.TIPO_ASENTAMIENTO,
    CatalogType.CIE10_GIIS_LESION,
  ];

  // Base catalogs (required)
  private readonly baseCatalogs: CatalogType[] = [
    CatalogType.CIE10,
    CatalogType.CLUES,
    CatalogType.ENTIDADES_FEDERATIVAS,
    CatalogType.MUNICIPIOS,
    CatalogType.LOCALIDADES,
    CatalogType.CODIGOS_POSTALES,
    CatalogType.NACIONALIDADES,
    CatalogType.RELIGIONES,
    CatalogType.LENGUAS_INDIGENAS,
    CatalogType.FORMACION_ACADEMICA,
    CatalogType.ESCOLARIDAD,
  ];

  async onModuleInit() {
    this.logger.log('Initializing catalog service...');
    await this.loadAllCatalogs();
    this.logger.log('Catalog service initialized successfully');
  }

  /**
   * Load all catalogs from CSV files
   */
  private async loadAllCatalogs(): Promise<void> {
    const catalogsPath = join(process.cwd(), 'catalogs', 'normalized');

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
        const entry = this.mapRecordToEntry(catalogType, record);
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
   * Map CSV record to CatalogEntry based on catalog type
   */
  private mapRecordToEntry(
    catalogType: CatalogType,
    record: any,
  ): CatalogEntry | null {
    try {
      switch (catalogType) {
        case CatalogType.ENTIDADES_FEDERATIVAS:
          return {
            code: record.CATALOG_KEY || record.codigo || record.code,
            description:
              record.ENTIDAD_FEDERATIVA ||
              record.descripcion ||
              record.description,
            source: 'INEGI',
            version: record.version,
            abreviatura: record.ABREVIATURA || record.abreviatura,
          };

        case CatalogType.CIE10:
          // Store raw values for LINF/LSUP (format: "010A", "028D", "NO", etc.)
          const linfRaw = record.LINF
            ? String(record.LINF).trim().toUpperCase()
            : undefined;
          const lsupRaw = record.LSUP
            ? String(record.LSUP).trim().toUpperCase()
            : undefined;

          // Try to parse as number if it's a plain number, otherwise leave undefined
          let linf: number | undefined;
          let lsup: number | undefined;

          if (linfRaw && linfRaw !== 'NO') {
            const linfNum = parseInt(linfRaw, 10);
            if (!isNaN(linfNum) && linfRaw.match(/^\d+$/)) {
              // Only use parsed number if it's a plain number (no letters)
              linf = linfNum;
            }
          }

          if (lsupRaw && lsupRaw !== 'NO') {
            const lsupNum = parseInt(lsupRaw, 10);
            if (!isNaN(lsupNum) && lsupRaw.match(/^\d+$/)) {
              // Only use parsed number if it's a plain number (no letters)
              lsup = lsupNum;
            }
          }

          const letraRaw =
            record.LETRA ?? record.Letra ?? record.letra ?? undefined;
          const letra =
            letraRaw !== undefined &&
            letraRaw !== null &&
            String(letraRaw).trim() !== ''
              ? String(letraRaw).trim().toUpperCase()
              : undefined;

          return {
            code: record.CATALOG_KEY || record.codigo || record.code,
            description:
              record.NOMBRE || record.descripcion || record.description,
            source: 'CIE-10',
            version: record.version,
            catalogKey: record.CATALOG_KEY,
            nombre: record.NOMBRE,
            lsex: record.LSEX,
            linf,
            lsup,
            linfRaw,
            lsupRaw,
            letra,
          } as CIE10Entry;

        case CatalogType.CIE10_GIIS_LESION: {
          const code = record.CATALOG_KEY || record.codigo || record.code;
          const numCaracteres = record['NO. CARACTERES']
            ? parseInt(String(record['NO. CARACTERES']), 10)
            : code?.length;

          const linfRaw = record.LINF
            ? String(record.LINF).trim().toUpperCase()
            : undefined;
          const lsupRaw = record.LSUP
            ? String(record.LSUP).trim().toUpperCase()
            : undefined;
          let linf: number | undefined;
          let lsup: number | undefined;
          if (linfRaw && linfRaw !== 'NO') {
            const linfNum = parseInt(linfRaw, 10);
            if (!isNaN(linfNum) && linfRaw.match(/^\d+$/)) linf = linfNum;
          }
          if (lsupRaw && lsupRaw !== 'NO') {
            const lsupNum = parseInt(lsupRaw, 10);
            if (!isNaN(lsupNum) && lsupRaw.match(/^\d+$/)) lsup = lsupNum;
          }

          const rubricaType = record.RUBRICA_TYPE
            ? String(record.RUBRICA_TYPE).trim().toUpperCase()
            : undefined;
          const afPrin = record.AF_PRIN
            ? String(record.AF_PRIN).trim().toUpperCase()
            : undefined;

          return {
            code,
            description:
              record.NOMBRE || record.descripcion || record.description,
            source: 'CIE-10-GIIS',
            version: record.version,
            catalogKey: record.CATALOG_KEY,
            nombre: record.NOMBRE,
            lsex: record.LSEX,
            linf,
            lsup,
            linfRaw,
            lsupRaw,
            numCaracteres: !Number.isNaN(numCaracteres)
              ? numCaracteres
              : undefined,
            rubricaType,
            afPrin,
          } as CIE10Entry & {
            numCaracteres?: number;
            rubricaType?: string;
            afPrin?: string;
          };
        }

        case CatalogType.CLUES: {
          const rawClues =
            record.clues || record.CLUES || record.codigo || record.code;
          const code = rawClues ? String(rawClues).trim().toUpperCase() : '';
          const description =
            record.nombre_unidad ||
            record['NOMBRE DE LA INSTITUCION'] ||
            record.nombre ||
            record.descripcion ||
            record.description;
          let estatus: string | undefined;
          if (
            record.en_operacion !== undefined &&
            record.en_operacion !== null
          ) {
            estatus =
              record.en_operacion == 1 || record.en_operacion === '1'
                ? 'EN OPERACION'
                : 'NO EN OPERACION';
          } else {
            estatus = record['ESTATUS DE OPERACION'];
          }
          return {
            code,
            description,
            source: 'CLUES',
            version: record.version,
            clues: code,
            nombreInstitucion:
              record.nombre_unidad || record['NOMBRE DE LA INSTITUCION'],
            entidad:
              record.id_entidad_federativa ||
              record.ENTIDAD ||
              record['CLAVE DE LA ENTIDAD'],
            municipio: record.MUNICIPIO,
            localidad: record.LOCALIDAD,
            estatus,
          } as CLUESEntry;
        }

        case CatalogType.MUNICIPIOS:
          const efeKey =
            record.EFE_KEY ||
            record['CLAVE DE LA ENTIDAD'] ||
            record.estadoCode;
          const catKey = record.CATALOG_KEY || record.codigo || record.code;
          const munEntry = {
            // Usar combinación estado-municipio como código único
            code: efeKey && catKey ? `${efeKey}-${catKey}` : catKey,
            description:
              record.MUNICIPIO || record.descripcion || record.description,
            source: 'INEGI',
            version: record.version,
            estadoCode: efeKey,
            municipioCode: catKey,
          } as INEGIEntry;

          // Debug log para registros sin estadoCode
          if (!munEntry.estadoCode) {
            this.logger.warn(
              `Municipio sin estadoCode: ${JSON.stringify(record)}`,
            );
          }
          return munEntry;

        case CatalogType.LOCALIDADES:
          const locEfeKey =
            record.EFE_KEY ||
            record['CLAVE DE LA ENTIDAD'] ||
            record.estadoCode;
          const locMunKey =
            record.MUN_KEY ||
            record['CLAVE DEL MUNICIPIO'] ||
            record.municipioCode;
          const locCatKey = record.CATALOG_KEY || record.codigo || record.code;
          return {
            // Usar combinación completa como código único
            code:
              locEfeKey && locMunKey && locCatKey
                ? `${locEfeKey}-${locMunKey}-${locCatKey}`
                : locCatKey,
            description:
              record.LOCALIDAD || record.descripcion || record.description,
            source: 'INEGI',
            version: record.version,
            estadoCode: locEfeKey,
            municipioCode: locMunKey,
            localidadCode: locCatKey,
          } as INEGIEntry;

        case CatalogType.NACIONALIDADES:
          // Para NOM-024, el código debe ser de 3 letras (MEX, USA, NND)
          // Priorizar 'clave nacionalidad' que es el código RENAPO de 3 letras
          const claveNacionalidad =
            record['clave nacionalidad'] ||
            record['clave_nacionalidad'] ||
            record.claveNacionalidad;
          const codigoPais =
            record['codigo pais'] ||
            record['codigo_pais'] ||
            record.codigoPais ||
            record.codigo ||
            record.code;

          // Determinar el código RENAPO a usar (debe ser de 3 caracteres según NOM-024)
          let renapoCode: string;

          if (claveNacionalidad) {
            // Si existe clave nacionalidad, usarla (es el código RENAPO correcto)
            renapoCode = String(claveNacionalidad).trim().toUpperCase();
          } else if (codigoPais) {
            const codigoStr = String(codigoPais).trim().toUpperCase();
            // Si codigo pais tiene exactamente 3 caracteres, usarlo
            if (codigoStr.length === 3) {
              renapoCode = codigoStr;
            } else {
              // Si es numérico largo (como "223"), no podemos usarlo directamente
              // Para compatibilidad, intentar mapear códigos comunes conocidos
              // Por ahora, usar 'NND' como fallback seguro
              this.logger.warn(
                `Nacionalidad con código numérico largo (${codigoStr}) sin clave nacionalidad. Usando como código directamente, pero puede no cumplir NOM-024.`,
              );
              renapoCode = codigoStr;
            }
          } else {
            // Si no hay ningún código, usar NND (No disponible) como fallback
            renapoCode = 'NND';
          }

          const catalogKeyPaisRaw =
            record['catalog_key_pais'] ?? record.catalogKeyPais;
          const catalogKeyPais =
            catalogKeyPaisRaw != null
              ? parseInt(String(catalogKeyPaisRaw), 10)
              : undefined;

          return {
            code: renapoCode,
            description:
              record.pais || record.descripcion || record.description,
            source: 'RENAPO',
            version: record.version,
            claveNacionalidad: claveNacionalidad,
            codigoPais: codigoPais,
            catalogKeyPais: Number.isNaN(catalogKeyPais)
              ? undefined
              : catalogKeyPais,
          };

        case CatalogType.CODIGOS_POSTALES: {
          const cEstado = record.c_estado
            ? String(record.c_estado).padStart(2, '0')
            : undefined;
          const cMunicipio = record.c_mnpio
            ? String(record.c_mnpio).padStart(3, '0')
            : undefined;
          return {
            // Usamos una combinación de CP y asentamiento para asegurar unicidad
            code: `${record.d_codigo}-${record.id_asenta_cpcons}`,
            description: `${record.d_codigo} - ${record.d_asenta}, ${record.D_mnpio}, ${record.d_estado}`,
            cp: record.d_codigo,
            asentamiento: record.d_asenta,
            municipio: record.D_mnpio?.toUpperCase() || '',
            estado: record.d_estado?.toUpperCase() || '',
            ciudad: record.d_ciudad || undefined,
            tipoAsentamiento: record.d_tipo_asenta || undefined,
            cEstado,
            cMunicipio,
            source: 'SEPOMEX',
            version: record.version,
          } as CPEntry;
        }

        case CatalogType.SITIO_OCURRENCIA:
          return {
            code: String(record.CATALOG_KEY ?? record.codigo ?? record.code),
            description:
              record['DESCRIPCIÓN CORTA'] ||
              record.descripcion ||
              record.description ||
              '',
            source: 'GIIS',
            version: record.version,
          };

        case CatalogType.ESCOLARIDAD:
          return {
            code: String(
              record.CATALOG_KEY ?? record.codigo ?? record.code ?? '',
            ),
            description:
              record.ESCOLARIDAD || record.descripcion || record.description,
            source: 'ESCOLARIDAD',
            version: record.version,
          };

        case CatalogType.TIPO_VIALIDAD:
          return {
            code: String(record.CATALOG_KEY ?? record.codigo ?? record.code),
            description:
              record.TIPO_VIALIDAD || record.descripcion || record.description,
            source: 'GIIS',
            version: record.version,
          };

        case CatalogType.TIPO_ASENTAMIENTO:
          return {
            code: String(record.CATALOG_KEY ?? record.codigo ?? record.code),
            description:
              record.TIPO_ASENTAMIENTO ||
              record.descripcion ||
              record.description,
            source: 'GIIS',
            version: record.version,
          };

        case CatalogType.TIPO_PERSONAL:
          return {
            code: String(record.CATALOG_KEY ?? record.codigo ?? record.code),
            description:
              record.TIPO_PERSONAL || record.descripcion || record.description,
            source: 'GIIS',
            version: record.version,
          };

        default:
          // Generic mapping for other catalogs (including GIIS catalogs)
          const code =
            record.codigo || record.code || record.CATALOG_KEY || record.CODIGO;
          const description =
            record.descripcion ||
            record.description ||
            record.DESCRIPCION ||
            record.NOMBRE ||
            record['DESCRIPCIÓN CORTA'];

          if (!code || !description) {
            return null;
          }

          return {
            code: String(code),
            description: String(description),
            source: record.source,
            version: record.version,
            ...record, // Include all other fields
          };
      }
    } catch (error) {
      this.logger.warn(
        `Error mapping record for ${catalogType}: ${error.message}`,
      );
      return null;
    }
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
    this.logger.log(`Base catalogs loaded: ${baseLoaded}/11`);
    this.logger.log(`GIIS optional catalogs loaded: ${giisLoaded}/8`);
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

  /**
   * Validate nationality code
   */
  async validateNacionalidad(code: string): Promise<boolean> {
    const cache = this.catalogCaches.get(CatalogType.NACIONALIDADES);
    if (!cache) {
      this.logger.warn('Nacionalidades catalog not loaded');
      return false;
    }

    return cache.has(code);
  }

  // ===========================================================================
  // GIIS-B013 CATALOG VALIDATION METHODS (Optional)
  // ===========================================================================

  /**
   * Validate GIIS Sitio de Ocurrencia code (GIIS-B013)
   *
   * If catalog is not loaded, returns a non-blocking result (valid=true).
   */
  validateGIISSitioOcurrencia(code: number | string): GIISValidationResult {
    return this.validateGIISCatalog(
      CatalogType.SITIO_OCURRENCIA,
      code,
      'Sitio Ocurrencia',
    );
  }

  /**
   * Validate GIIS Agente de Lesión code (GIIS-B013)
   *
   * If catalog is not loaded, returns a non-blocking result (valid=true).
   */
  validateGIISAgenteLesion(code: number | string): GIISValidationResult {
    return this.validateGIISCatalog(
      CatalogType.AGENTE_LESION,
      code,
      'Agente Lesión',
    );
  }

  /**
   * Validate GIIS Area Anatómica code (GIIS-B013)
   *
   * If catalog is not loaded, returns a non-blocking result (valid=true).
   */
  validateGIISAreaAnatomica(code: number | string): GIISValidationResult {
    return this.validateGIISCatalog(
      CatalogType.AREA_ANATOMICA,
      code,
      'Area Anatómica',
    );
  }

  /**
   * Validate GIIS Consecuencia code (GIIS-B013)
   *
   * If catalog is not loaded, returns a non-blocking result (valid=true).
   */
  validateGIISConsecuencia(code: number | string): GIISValidationResult {
    return this.validateGIISCatalog(
      CatalogType.CONSECUENCIA,
      code,
      'Consecuencia',
    );
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
   * Validate GIIS Servicios de Detección code (GIIS-B019)
   *
   * If catalog is not loaded, returns a non-blocking result (valid=true).
   */
  validateGIISServiciosDet(code: number | string): GIISValidationResult {
    return this.validateGIISCatalog(
      CatalogType.SERVICIOS_DET,
      code,
      'Servicios Det',
    );
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

  /** CATALOG_KEY for "NO ESPECIFICADO" in cat_pais (fallback when nacionalidad has no mapping). */
  static readonly PAIS_NO_ESPECIFICADO = 248;

  /**
   * Get cat_pais CATALOG_KEY from nacionalidad clave (3-letter, e.g. MEX, USA).
   * Used for paisNacPaciente in CEX. Returns 248 (NO ESPECIFICADO) if not found.
   */
  getPaisCatalogKeyFromNacionalidad(clave: string): number {
    if (!clave || typeof clave !== 'string') {
      return CatalogsService.PAIS_NO_ESPECIFICADO;
    }
    const cache = this.catalogCaches.get(CatalogType.NACIONALIDADES);
    if (!cache) {
      return CatalogsService.PAIS_NO_ESPECIFICADO;
    }
    const code = clave.trim().toUpperCase();
    const entry = cache.get(code);
    const key =
      entry && (entry as any).catalogKeyPais != null
        ? Number((entry as any).catalogKeyPais)
        : null;
    if (key != null && !Number.isNaN(key)) {
      return key;
    }
    return CatalogsService.PAIS_NO_ESPECIFICADO;
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
      baseTotal: 11,
      giisLoaded,
      giisTotal: 8,
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
   * List all entries from a GIIS catalog (for populating selectors)
   */
  listCatalog(catalog: CatalogType, limit: number = 500): CatalogEntry[] {
    const cache = this.catalogCaches.get(catalog);
    if (!cache) {
      return [];
    }
    const entries = Array.from(cache.values());
    return entries.slice(0, limit).sort((a, b) => {
      const numA = Number(a.code);
      const numB = Number(b.code);
      if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
        return numA - numB;
      }
      return (a.description || '').localeCompare(b.description || '');
    });
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
   * Check if CIE-10 code is valid for LES afección principal.
   * Cap V: F00-F99, Cap XIX: S00-T98, O04-O07, O20, O267, O429, O468-O469, O68, O710-O719.
   */
  private isCIE10AfeccionPrincipalValid(code: string): boolean {
    if (!code || code.length < 3) return false;
    const c = code.replace(/\./g, '').toUpperCase();
    const letter = c[0];
    const num = c.slice(1);
    const numVal = parseInt(num, 10);
    if (isNaN(numVal)) return false;
    if (letter === 'F') return numVal >= 0 && numVal <= 999;
    if (letter === 'S') return numVal >= 0 && numVal <= 999;
    if (letter === 'T') {
      const base = numVal < 100 ? numVal : Math.floor(numVal / 10);
      return base >= 0 && base <= 98;
    }
    if (letter === 'O') {
      if (
        num.startsWith('04') ||
        num.startsWith('05') ||
        num.startsWith('06') ||
        num.startsWith('07')
      )
        return true;
      if (num.startsWith('20')) return true;
      if (num === '267' || num === '429' || num === '468' || num === '469')
        return true;
      if (num.startsWith('68')) return true;
      if (numVal >= 710 && numVal <= 719) return true;
      return false;
    }
    return false;
  }

  /**
   * Check if CIE-10 code is valid for LES causa externa (Cap XX: V01-Y98).
   */
  private isCIE10CausaExternaValid(code: string): boolean {
    if (!code || code.length < 3) return false;
    const c = code.replace(/\./g, '').toUpperCase();
    const letter = c[0];
    if (letter !== 'V' && letter !== 'W' && letter !== 'X' && letter !== 'Y')
      return false;
    const numVal = parseInt(c.slice(1), 10);
    if (isNaN(numVal)) return false;
    const base = numVal < 100 ? numVal : Math.floor(numVal / 10);
    return base >= 1 && base <= 98;
  }

  /**
   * Search CIE-10 GIIS catalog (diagnosticos.csv) for lesion/violence reports.
   * Includes V01-Y98 (external causes). Optionally filter to 4-character codes only.
   * filterVariant: 'afeccion' = Cap V, XIX, O específicos; 'causaExterna' = V01-Y98.
   */
  async searchCIE10GIIS(
    query: string,
    limit: number = 50,
    sexo?: number,
    edad?: number,
    solo4Caracteres: boolean = false,
    filterVariant?: 'afeccion' | 'causaExterna',
  ): Promise<CIE10Entry[]> {
    const cache = this.catalogCaches.get(CatalogType.CIE10_GIIS_LESION);
    if (!cache) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    const results: CIE10Entry[] = [];

    for (const entry of cache.values()) {
      const cieEntry = entry as CIE10Entry & { numCaracteres?: number };

      if (
        !cieEntry.code.toLowerCase().includes(lowerQuery) &&
        !(cieEntry.description || '').toLowerCase().includes(lowerQuery)
      ) {
        continue;
      }

      if (filterVariant === 'afeccion') {
        if (!this.isCIE10AfeccionPrincipalValid(cieEntry.code)) continue;
        const entryExt = cieEntry as CIE10Entry & {
          rubricaType?: string;
          afPrin?: string;
        };
        if (entryExt.rubricaType === 'B') continue;
        if (entryExt.afPrin !== undefined && entryExt.afPrin !== 'SI') continue;
      }
      if (
        filterVariant === 'causaExterna' &&
        !this.isCIE10CausaExternaValid(cieEntry.code)
      ) {
        continue;
      }

      if (solo4Caracteres) {
        const numChars =
          cieEntry.numCaracteres ?? cieEntry.code.replace('.', '').length;
        if (numChars !== 4) continue;
      }

      if (
        sexo !== undefined &&
        sexo !== null &&
        cieEntry.lsex &&
        cieEntry.lsex !== 'NO'
      ) {
        if (cieEntry.lsex === 'SI' && sexo === 2) continue;
      }

      if (edad !== undefined && edad !== null) {
        if (cieEntry.linf !== undefined && edad < cieEntry.linf) continue;
        if (cieEntry.lsup !== undefined && edad > cieEntry.lsup) continue;
      }

      results.push(cieEntry);
      if (results.length >= limit) break;
    }

    return results;
  }

  /**
   * Get CIE-10 GIIS entry by code (from diagnosticos.csv).
   * Tries exact match and normalized (no-dot) match.
   */
  async getCIE10GIISByCode(code: string): Promise<CIE10Entry | null> {
    const cache = this.catalogCaches.get(CatalogType.CIE10_GIIS_LESION);
    if (!cache || !code) return null;
    const trimmed = code.trim();
    const upper = trimmed.toUpperCase();
    const withoutDot = upper.replace(/\./g, '');
    let entry = cache.get(upper) ?? cache.get(trimmed) ?? cache.get(withoutDot);
    if (!entry) {
      for (const [k, v] of cache) {
        if (
          k.toUpperCase() === upper ||
          k.replace(/\./g, '').toUpperCase() === withoutDot
        ) {
          entry = v;
          break;
        }
      }
    }
    return (entry as CIE10Entry) || null;
  }

  /**
   * Validate CIE-10 code against GIIS lesion catalog.
   * Handles format variations: S00.0 vs S000.
   */
  async validateCIE10GIIS(code: string): Promise<boolean> {
    const cache = this.catalogCaches.get(CatalogType.CIE10_GIIS_LESION);
    if (!cache || !code) return false;
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return false;
    const withoutDot = trimmed.replace(/\./g, '');
    if (cache.has(trimmed)) return true;
    if (cache.has(withoutDot)) return true;
    for (const k of cache.keys()) {
      const kNorm = k.replace(/\./g, '');
      if (k.toUpperCase() === trimmed || kNorm.toUpperCase() === withoutDot)
        return true;
    }
    return false;
  }

  /**
   * Get all entidades federativas (states)
   */
  getEstados(): CatalogEntry[] {
    return Array.from(this.estadoCache.values()).sort((a, b) =>
      a.description.localeCompare(b.description),
    );
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
    return Array.from(municipioMap.values()).sort((a, b) =>
      a.description.localeCompare(b.description),
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

    if (query && query.trim() !== '') {
      const lowerQuery = query.toLowerCase();
      return entries
        .filter(
          (e) =>
            e.code.toLowerCase().includes(lowerQuery) ||
            e.description.toLowerCase().includes(lowerQuery),
        )
        .slice(0, 50);
    }

    return entries.sort((a, b) => a.description.localeCompare(b.description));
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

    return results.sort((a, b) => a.description.localeCompare(b.description));
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

    return results.sort((a, b) => a.description.localeCompare(b.description));
  }

  /**
   * Search nacionalidades by query string (code or description)
   */
  searchNacionalidades(query: string, limit: number = 50): CatalogEntry[] {
    const cache = this.catalogCaches.get(CatalogType.NACIONALIDADES);
    if (!cache) {
      return [];
    }

    if (!query || query.trim() === '') {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    const results: CatalogEntry[] = [];

    for (const entry of cache.values()) {
      const code = String(entry.code || '').toLowerCase();
      const description = String(entry.description || '').toLowerCase();

      if (code.includes(lowerQuery) || description.includes(lowerQuery)) {
        results.push(entry);
        if (results.length >= limit) {
          break;
        }
      }
    }

    return results.sort((a, b) => a.description.localeCompare(b.description));
  }

  /**
   * Get nacionalidad by code
   */
  getNacionalidadByCode(code: string): CatalogEntry | null {
    const cache = this.catalogCaches.get(CatalogType.NACIONALIDADES);
    if (!cache) {
      return null;
    }
    return cache.get(code) || null;
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
