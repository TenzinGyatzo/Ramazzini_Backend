import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  renameSync,
  copyFileSync,
  statSync,
  writeFileSync,
  unlinkSync,
  readFileSync,
} from 'fs';
import { join } from 'path';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify/sync';
import {
  CatalogEntry,
  CatalogType,
  CLUESEntry,
} from './interfaces/catalog-entry.interface';
import {
  CATALOG_BACKUPS_DIR,
  CATALOG_FILES,
  CATALOG_NORMALIZED_DIR,
} from './constants/catalog-files.constant';
import {
  applyEntryToCsvRow,
  entryToNewCsvRow,
  getEntryCode,
  mapRecordToEntry,
  CsvRow,
} from './utils/catalog-record.mapper';
import { syncEntryLabelsAfterPatch } from './utils/catalog-csv-columns.util';
import { CatalogsService } from './catalogs.service';

export interface CatalogFileMeta {
  catalogType: CatalogType;
  filename: string;
  filePath: string;
  rowCount: number;
  fileSize: number;
  lastModified: string;
  headers: string[];
}

@Injectable()
export class CatalogCsvStoreService {
  private readonly logger = new Logger(CatalogCsvStoreService.name);
  private readonly writeLocks = new Map<CatalogType, Promise<void>>();

  constructor(
    @Inject(forwardRef(() => CatalogsService))
    private readonly catalogsService: CatalogsService,
  ) {}

  getFilePath(catalogType: CatalogType): string {
    const filename = CATALOG_FILES[catalogType];
    if (!filename) {
      throw new BadRequestException(`Catálogo no configurado: ${catalogType}`);
    }
    return join(process.cwd(), CATALOG_NORMALIZED_DIR, filename);
  }

  async getFileMeta(catalogType: CatalogType): Promise<CatalogFileMeta> {
    const filePath = this.getFilePath(catalogType);
    const filename = CATALOG_FILES[catalogType]!;
    if (!existsSync(filePath)) {
      return {
        catalogType,
        filename,
        filePath,
        rowCount: 0,
        fileSize: 0,
        lastModified: '',
        headers: [],
      };
    }
    const { headers, rows } = await this.readAllRows(catalogType);
    const stat = statSync(filePath);
    return {
      catalogType,
      filename,
      filePath,
      rowCount: rows.length,
      fileSize: stat.size,
      lastModified: stat.mtime.toISOString(),
      headers,
    };
  }

  async readAllRows(
    catalogType: CatalogType,
  ): Promise<{ headers: string[]; rows: CsvRow[]; withBom: boolean }> {
    const filePath = this.getFilePath(catalogType);
    if (!existsSync(filePath)) {
      return { headers: [], rows: [], withBom: false };
    }
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      createReadStream(filePath)
        .on('data', (c) => chunks.push(c as Buffer))
        .on('end', () => resolve(Buffer.concat(chunks)))
        .on('error', reject);
    });
    const withBom =
      buffer.length >= 3 &&
      buffer[0] === 0xef &&
      buffer[1] === 0xbb &&
      buffer[2] === 0xbf;
    const records = await this.parseCSV(filePath);
    const headers = this.readCsvHeaderLine(filePath, withBom);
    return { headers, rows: records as CsvRow[], withBom };
  }

  /** Conserva nombres de columna exactos de la primera línea del archivo. */
  private readCsvHeaderLine(filePath: string, withBom: boolean): string[] {
    const raw = readFileSync(filePath, 'utf-8');
    const first = raw.split(/\r?\n/)[0] ?? '';
    const line = withBom ? first.replace(/^\uFEFF/, '') : first;
    if (!line.trim()) return [];
    return line.split(',');
  }

  /** Alinea cada fila a las cabeceras del archivo (csv-parse normaliza nombres de columna). */
  private alignRowsToHeaders(headers: string[], rows: CsvRow[]): CsvRow[] {
    if (!headers.length) return rows;
    return rows.map((row) => {
      const rowKeys = Object.keys(row);
      const values = Object.values(row);
      const aligned: CsvRow = {};
      headers.forEach((header, i) => {
        const trimmed = header.trim();
        const value =
          row[header] ??
          row[trimmed] ??
          row[rowKeys[i]] ??
          values[i];
        if (value !== undefined) aligned[header] = value;
      });
      return aligned;
    });
  }

  private async parseCSV(filePath: string): Promise<CsvRow[]> {
    return new Promise((resolve, reject) => {
      const records: CsvRow[] = [];
      createReadStream(filePath, { encoding: 'utf-8' })
        .on('error', reject)
        .pipe(
          parse({
            columns: true,
            skip_empty_lines: true,
            trim: true,
            bom: true,
          }),
        )
        .on('data', (record) => records.push(record))
        .on('end', () => resolve(records))
        .on('error', reject);
    });
  }

  private backupFile(filePath: string, catalogType: CatalogType): string {
    const backupsDir = join(process.cwd(), CATALOG_BACKUPS_DIR);
    mkdirSync(backupsDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = join(backupsDir, `${catalogType}_${ts}.csv`);
    copyFileSync(filePath, dest);
    this.logger.log(`Backup catálogo: ${dest}`);
    return dest;
  }

  private async withWriteLock<T>(
    catalogType: CatalogType,
    fn: () => Promise<T>,
  ): Promise<T> {
    const prev = this.writeLocks.get(catalogType) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    this.writeLocks.set(
      catalogType,
      prev.then(() => gate),
    );
    await prev;
    try {
      return await fn();
    } finally {
      release();
      if (this.writeLocks.get(catalogType) === gate) {
        this.writeLocks.delete(catalogType);
      }
    }
  }

  async writeRows(
    catalogType: CatalogType,
    headers: string[],
    rows: CsvRow[],
    withBom: boolean,
  ): Promise<void> {
    const filePath = this.getFilePath(catalogType);
    const tmpPath = `${filePath}.tmp`;
    if (existsSync(filePath)) {
      this.backupFile(filePath, catalogType);
    }
    const alignedRows = this.alignRowsToHeaders(headers, rows);
    const csvBody = stringify(alignedRows, {
      header: true,
      columns: headers.length ? headers : undefined,
    });
    const content = withBom ? `\uFEFF${csvBody}` : csvBody;
    writeFileSync(tmpPath, content, 'utf-8');
    renameSync(tmpPath, filePath);
  }

  async importFile(
    catalogType: CatalogType,
    fileBuffer: Buffer,
  ): Promise<{ rowCount: number; headers: string[] }> {
    return this.withWriteLock(catalogType, async () => {
      const filePath = this.getFilePath(catalogType);
      const tmpValidate = `${filePath}.import.tmp`;
      writeFileSync(tmpValidate, fileBuffer);
      try {
        const records = await this.parseCSV(tmpValidate);
        if (records.length === 0) {
          throw new BadRequestException('El CSV no contiene filas de datos');
        }
        const validCount = records.filter(
          (r) => mapRecordToEntry(catalogType, r)?.code,
        ).length;
        if (validCount === 0) {
          throw new BadRequestException(
            'Ninguna fila tiene un código válido para este catálogo',
          );
        }
        const withBom =
          fileBuffer.length >= 3 &&
          fileBuffer[0] === 0xef &&
          fileBuffer[1] === 0xbb &&
          fileBuffer[2] === 0xbf;
        if (existsSync(filePath)) {
          this.backupFile(filePath, catalogType);
        }
        writeFileSync(filePath, fileBuffer);
        await this.catalogsService.reloadCatalog(catalogType);
        const headers = Object.keys(records[0]);
        return { rowCount: records.length, headers };
      } finally {
        try {
          if (existsSync(tmpValidate)) unlinkSync(tmpValidate);
        } catch {
          /* ignore */
        }
      }
    });
  }

  async createEntry(
    catalogType: CatalogType,
    entry: CatalogEntry,
  ): Promise<CatalogEntry> {
    return this.withWriteLock(catalogType, async () => {
      const { headers, rows, withBom } = await this.readAllRows(catalogType);
      if (!entry.code?.trim()) {
        throw new BadRequestException('El código es obligatorio');
      }
      const code = entry.code.trim();
      const exists = rows.some(
        (r) => getEntryCode(catalogType, r) === code,
      );
      if (exists) {
        throw new ConflictException(`Ya existe el código ${code}`);
      }
      const newHeaders =
        headers.length > 0 ? headers : this.defaultHeaders(catalogType);
      const row = entryToNewCsvRow(catalogType, entry, newHeaders);
      rows.push(row);
      await this.writeRows(catalogType, newHeaders, rows, withBom);
      await this.catalogsService.reloadCatalog(catalogType);
      const created = await this.catalogsService.getCatalogEntry(
        catalogType,
        code,
      );
      if (!created) {
        throw new BadRequestException('No se pudo cargar la entrada creada');
      }
      return created;
    });
  }

  async updateEntry(
    catalogType: CatalogType,
    code: string,
    patch: Partial<CatalogEntry>,
  ): Promise<CatalogEntry> {
    return this.withWriteLock(catalogType, async () => {
      const { headers, rows, withBom } = await this.readAllRows(catalogType);
      const idx = rows.findIndex((r) => getEntryCode(catalogType, r) === code);
      if (idx < 0) {
        throw new NotFoundException(`Código ${code} no encontrado`);
      }
      const current = mapRecordToEntry(catalogType, rows[idx]);
      if (!current) {
        throw new NotFoundException(`Fila inválida para código ${code}`);
      }
      const merged: CatalogEntry = {
        ...current,
        ...patch,
        code,
        _csvRow: current._csvRow ?? { ...rows[idx] },
      };
      syncEntryLabelsAfterPatch(merged, patch);
      const patchKeys = Object.keys(patch);
      applyEntryToCsvRow(
        catalogType,
        merged,
        rows[idx],
        patchKeys.length > 0 ? { onlyFields: patchKeys } : undefined,
      );
      await this.writeRows(catalogType, headers, rows, withBom);
      await this.catalogsService.reloadCatalog(catalogType);
      const updated = await this.catalogsService.getCatalogEntry(
        catalogType,
        code,
      );
      if (!updated) {
        throw new NotFoundException(`Código ${code} no encontrado tras actualizar`);
      }
      return updated;
    });
  }

  async deleteEntry(catalogType: CatalogType, code: string): Promise<void> {
    return this.withWriteLock(catalogType, async () => {
      if (catalogType === CatalogType.CLUES) {
        const entry = await this.catalogsService.getCatalogEntry(
          catalogType,
          code,
        );
        if (entry) {
          await this.updateEntry(catalogType, code, {
            estatus: 'NO EN OPERACION',
          } as CLUESEntry);
        }
        return;
      }
      const { headers, rows, withBom } = await this.readAllRows(catalogType);
      const filtered = rows.filter(
        (r) => getEntryCode(catalogType, r) !== code,
      );
      if (filtered.length === rows.length) {
        throw new NotFoundException(`Código ${code} no encontrado`);
      }
      await this.writeRows(catalogType, headers, filtered, withBom);
      await this.catalogsService.reloadCatalog(catalogType);
    });
  }

  private defaultHeaders(catalogType: CatalogType): string[] {
    switch (catalogType) {
      case CatalogType.CIE10:
        return [
          'CATALOG_KEY',
          'NOMBRE',
          'LSEX',
          'LINF',
          'LSUP',
          'LETRA',
          'TIPO_PERSONAL_1VEZ_CE',
          'TIPO_PERSONAL_SUBSEC_CE',
          'DIA_CRONICOS',
          'DIA_CAINFANTIL',
        ];
      case CatalogType.CLUES:
        return [
          'clues',
          'nombre_unidad',
          'id_entidad_federativa',
          'MUNICIPIO',
          'LOCALIDAD',
          'en_operacion',
        ];
      case CatalogType.ENTIDADES_FEDERATIVAS:
        return ['CATALOG_KEY', 'ENTIDAD_FEDERATIVA', 'ABREVIATURA'];
      case CatalogType.MUNICIPIOS:
        return ['EFE_KEY', 'CATALOG_KEY', 'MUNICIPIO'];
      case CatalogType.LOCALIDADES:
        return ['EFE_KEY', 'MUN_KEY', 'CATALOG_KEY', 'LOCALIDAD'];
      case CatalogType.ESCOLARIDAD:
        return ['CATALOG_KEY', 'ESCOLARIDAD'];
      case CatalogType.TIPO_PERSONAL:
        return ['CATALOG_KEY', 'TIPO_PERSONAL'];
      case CatalogType.SERVICIOS_ATENCION_CE:
        return ['CATALOG_KEY', 'DESCRIPCION'];
      case CatalogType.AFILIACION:
        return ['CATALOG_KEY', 'DESCRIPCIÓN CORTA', 'DESCRIPCIÓN LARGA', 'VIGENTE'];
      case CatalogType.PAIS:
        return ['CATALOG_KEY', 'DESCRIPCION', 'ORDEN'];
      default:
        return ['CATALOG_KEY', 'DESCRIPCION'];
    }
  }
}
