import {
  Injectable,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { GiisBatch } from './schemas/giis-batch.schema';
import { NotaMedica } from '../expedientes/schemas/nota-medica.schema';
import { DocumentoEstado } from '../expedientes/enums/documento-estado.enum';
import { FirmanteHelper } from '../expedientes/helpers/firmante-helper';
import { Trabajador } from '../trabajadores/schemas/trabajador.schema';
import { CentroTrabajo } from '../centros-trabajo/schemas/centro-trabajo.schema';
import { Empresa } from '../empresas/schemas/empresa.schema';
import { loadGiisSchema } from './schema-loader';
import { GiisSerializerService } from './giis-serializer.service';
import { mapNotaMedicaToCexRow } from './transformers/cex.mapper';
import { RegulatoryPolicyService } from '../../utils/regulatory-policy.service';
import { ProveedoresSaludService } from '../proveedores-salud/proveedores-salud.service';
import { formatCLUES } from './formatters/field.formatter';
import { GiisValidationService } from './validation/giis-validation.service';
import type {
  GiisExcludedReport,
  GiisBatchOptions,
  GiisBatchStatus,
  GiisValidationStatus,
} from './schemas/giis-batch.schema';
import { GiisCryptoService } from './crypto/giis-crypto.service';
import { DgisCifradoService } from './crypto/dgis-cifrado.service';
import {
  getOfficialBaseName,
  getOfficialFileName,
} from './naming/giis-official-naming';
import { GiisExportAuditService } from './giis-export-audit.service';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '../audit/constants/audit-action-type';
import { AuditEventClass } from '../audit/constants/audit-event-class';
import { CatalogsService } from '../catalogs/catalogs.service';

export type CreateBatchOptions = GiisBatchOptions;

export interface BatchListItem {
  batchId: string;
  yearMonth: string;
  status: GiisBatchStatus;
  completedAt?: Date;
  validationStatus?: GiisValidationStatus;
  establecimientoClues: string;
  errorMessage?: string;
  excludedReport?: { totalExcluded: number };
  artifacts: { guide: string; path?: string; zipPath?: string }[];
}

interface LeanGiisBatchDoc {
  _id: Types.ObjectId;
  yearMonth: string;
  status: GiisBatchStatus;
  completedAt?: Date;
  validationStatus?: GiisValidationStatus;
  establecimientoClues?: string;
  errorMessage?: string;
  excludedReport?: { totalExcluded?: number };
  artifacts?: { guide: string }[];
}

const EXPORTS_BASE = 'exports/giis';

@Injectable()
export class GiisBatchService {
  constructor(
    @InjectModel(GiisBatch.name)
    private readonly giisBatchModel: Model<GiisBatch>,
    @InjectModel(NotaMedica.name)
    private readonly notaMedicaModel: Model<NotaMedica>,
    @InjectModel(Trabajador.name)
    private readonly trabajadorModel: Model<Trabajador>,
    @InjectModel(CentroTrabajo.name)
    private readonly centroTrabajoModel: Model<CentroTrabajo>,
    @InjectModel(Empresa.name) private readonly empresaModel: Model<Empresa>,
    private readonly serializer: GiisSerializerService,
    private readonly regulatoryPolicyService: RegulatoryPolicyService,
    private readonly proveedoresSaludService: ProveedoresSaludService,
    private readonly giisValidationService: GiisValidationService,
    private readonly giisCryptoService: GiisCryptoService,
    private readonly dgisCifradoService: DgisCifradoService,
    private readonly giisExportAuditService: GiisExportAuditService,
    private readonly auditService: AuditService,
    private readonly firmanteHelper: FirmanteHelper,
    private readonly catalogsService: CatalogsService,
  ) {}

  /**
   * Obtiene los IDs de trabajadores que pertenecen al proveedor (tenant).
   * Cadena: ProveedorSalud → Empresas → CentrosTrabajo → Trabajadores.
   */
  private async getTrabajadorIdsForProveedor(
    proveedorSaludId: string,
  ): Promise<Types.ObjectId[]> {
    const empresas = await this.empresaModel
      .find({ idProveedorSalud: proveedorSaludId })
      .select('_id')
      .lean()
      .exec();
    const empresaIds = empresas.map((e) => e._id);
    if (empresaIds.length === 0) return [];

    const centros = await this.centroTrabajoModel
      .find({ idEmpresa: { $in: empresaIds } })
      .select('_id')
      .lean()
      .exec();
    const centroIds = centros.map((c) => c._id);
    if (centroIds.length === 0) return [];

    const trabajadores = await this.trabajadorModel
      .find({ idCentroTrabajo: { $in: centroIds } })
      .select('_id')
      .lean()
      .exec();
    return trabajadores.map((t) => t._id as unknown as Types.ObjectId);
  }

  async createBatch(
    proveedorSaludId: string,
    yearMonth: string,
    options?: CreateBatchOptions,
  ): Promise<GiisBatch> {
    const batch = await this.giisBatchModel.create({
      proveedorSaludId: new Types.ObjectId(proveedorSaludId),
      establecimientoClues: '',
      yearMonth,
      status: 'pending',
      artifacts: [],
      startedAt: new Date(),
      options: options ?? {},
    });
    return batch;
  }

  /**
   * Create batch for GIIS export with SIRES gate and CLUES resolution.
   * Only proveedores with regime SIRES_NOM024 can create. establecimientoClues = proveedor.clues (valid 11 chars) or "9998" (modo privado SMP).
   */
  async createBatchForExport(
    proveedorSaludId: string,
    yearMonth: string,
    options?: CreateBatchOptions,
  ): Promise<GiisBatch> {
    const policy =
      await this.regulatoryPolicyService.getRegulatoryPolicy(proveedorSaludId);
    if (policy.regime !== 'SIRES_NOM024') {
      throw new ForbiddenException(
        'La exportación GIIS solo está disponible para proveedores con régimen SIRES_NOM024.',
      );
    }

    const proveedor =
      await this.proveedoresSaludService.findOne(proveedorSaludId);
    const cluesRaw = proveedor?.clues?.trim() ?? '';
    const establecimientoClues =
      formatCLUES(cluesRaw) ||
      (cluesRaw.length === 11 ? cluesRaw.toUpperCase() : '') ||
      '9998';

    const batch = await this.giisBatchModel.create({
      proveedorSaludId: new Types.ObjectId(proveedorSaludId),
      establecimientoClues,
      yearMonth,
      status: 'pending',
      artifacts: [],
      startedAt: new Date(),
      options: options ?? {},
    });
    await this.auditService.record({
      proveedorSaludId,
      actorId:
        (options as { createdByUserId?: string })?.createdByUserId ?? 'SYSTEM',
      actionType: AuditActionType.GIIS_EXPORT_STARTED,
      resourceType: 'GiisBatch',
      resourceId: batch._id.toString(),
      eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
    });
    return batch;
  }

  async getBatch(batchId: string): Promise<GiisBatch | null> {
    if (!Types.ObjectId.isValid(batchId)) {
      return null;
    }
    return this.giisBatchModel.findById(batchId).exec();
  }

  /**
   * List batches for a proveedor, one row per yearMonth (most recent batch only).
   * Ordered by yearMonth descending. Used by UI to show export history without duplicate months.
   */
  async listBatchesForProveedor(
    proveedorSaludId: string,
  ): Promise<BatchListItem[]> {
    const docs = await this.giisBatchModel
      .find({ proveedorSaludId: new Types.ObjectId(proveedorSaludId) })
      .sort({ yearMonth: -1, completedAt: -1, _id: -1 })
      .lean()
      .exec();

    const seen = new Set<string>();
    const items = docs
      .filter((d) => {
        if (seen.has(d.yearMonth)) return false;
        seen.add(d.yearMonth);
        return true;
      })
      .map((d) => ({
        batchId: String(d._id),
        yearMonth: d.yearMonth,
        status: d.status,
        completedAt: d.completedAt,
        validationStatus: d.validationStatus,
        establecimientoClues: d.establecimientoClues ?? '',
        errorMessage: d.errorMessage,
        excludedReport: d.excludedReport
          ? { totalExcluded: d.excludedReport.totalExcluded ?? 0 }
          : undefined,
        artifacts: (d.artifacts ?? []).map(
          (a: { guide: string; path?: string; zipPath?: string }) => ({
            guide: a.guide,
            path: a.path,
            zipPath: a.zipPath,
          }),
        ),
      }));

    return items;
  }

  /**
   * Generate CEX (B015 Consulta externa) artifact for a batch and write TXT file.
   * Loads NotaMedica (consulta externa) for batch month; maps with schema-driven CEX mapper; serializes and writes.
   * When batch has no artifacts yet, acts as lead generator: sets status to generating then completed.
   */
  async generateBatchCex(batchId: string): Promise<GiisBatch | null> {
    const batch = await this.getBatch(batchId);
    if (!batch) return null;
    if (batch.status === 'failed') return null;

    const isFirstGenerator = (batch.artifacts?.length ?? 0) === 0;
    if (isFirstGenerator) {
      await this.giisBatchModel.updateOne(
        { _id: batch._id },
        { $set: { status: 'generating' } },
      );
    }

    const [year, month] = batch.yearMonth.split('-').map(Number);
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    const clues = batch.establecimientoClues || '9998';

    const trabajadorIds = await this.getTrabajadorIdsForProveedor(
      batch.proveedorSaludId.toString(),
    );
    const notas = await this.notaMedicaModel
      .find({
        estado: DocumentoEstado.FINALIZADO,
        fechaNotaMedica: { $gte: startOfMonth, $lte: endOfMonth },
        idTrabajador:
          trabajadorIds.length > 0 ? { $in: trabajadorIds } : { $in: [] },
      })
      .populate('idTrabajador')
      .lean()
      .exec();

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
    const notasDelAnio =
      trabajadorIds.length > 0
        ? await this.notaMedicaModel
            .find({
              estado: DocumentoEstado.FINALIZADO,
              fechaNotaMedica: { $gte: startOfYear, $lte: endOfYear },
              idTrabajador: { $in: trabajadorIds },
            })
            .select('idTrabajador fechaNotaMedica _id')
            .lean()
            .exec()
        : [];
    const firstInYearIds = new Set<string>();
    const byTrabajador = new Map<
      string,
      { fecha: Date; _id: Types.ObjectId }[]
    >();
    for (const n of notasDelAnio as any[]) {
      const key = n.idTrabajador?.toString?.() ?? n.idTrabajador;
      if (!key) continue;
      if (!byTrabajador.has(key)) byTrabajador.set(key, []);
      byTrabajador.get(key)!.push({
        fecha: n.fechaNotaMedica,
        _id: n._id,
      });
    }
    for (const arr of byTrabajador.values()) {
      arr.sort(
        (a, b) =>
          a.fecha.getTime() - b.fecha.getTime() ||
          a._id.toString().localeCompare(b._id.toString()),
      );
      if (arr.length > 0) firstInYearIds.add(arr[0]._id.toString());
    }

    const schema = loadGiisSchema('CEX');
    const rows: Record<string, string | number>[] = [];
    for (const doc of notas) {
      const nota = doc as any;
      const primeraVezAnio = firstInYearIds.has(nota._id.toString()) ? 1 : 0;
      const consultaWithPrimera = { ...nota, primeraVezAnio };
      const trabajador = nota.idTrabajador ? (nota.idTrabajador as any) : null;
      const rawUser = nota.finalizadoPor ?? nota.updatedBy;
      const userId =
        rawUser != null
          ? typeof rawUser === 'string'
            ? rawUser
            : (rawUser as Types.ObjectId).toString()
          : '';
      const prestadorData = userId
        ? await this.firmanteHelper.getPrestadorDataFromUser(userId)
        : null;
      const cexContext = {
        clues,
        getPaisCatalogKeyFromNacionalidad: (clave: string) =>
          this.catalogsService.getPaisCatalogKeyFromNacionalidad(clave),
      };
      const row = mapNotaMedicaToCexRow(
        consultaWithPrimera,
        cexContext,
        trabajador,
        prestadorData ?? undefined,
      );
      rows.push(row);
    }

    const { validRows, excludedReport, warnings } =
      await this.giisValidationService.validateAndFilterRows(
        'CEX',
        rows,
        schema,
      );
    const currentBatch = await this.getBatch(batchId);
    const existingEntries =
      (currentBatch?.excludedReport as GiisExcludedReport)?.entries ?? [];
    const mergedEntries = [
      ...existingEntries,
      ...excludedReport.entries.map((e) => ({
        guide: e.guide,
        rowIndex: e.rowIndex,
        field: e.field,
        cause: e.cause,
      })),
    ];
    const mergedTotalExcluded = new Set(
      mergedEntries.map((e) => `${e.guide}:${e.rowIndex}`),
    ).size;
    const hadBlockers =
      (currentBatch?.validationStatus as string) === 'has_blockers';
    const validationStatus =
      mergedTotalExcluded > 0
        ? 'has_blockers'
        : hadBlockers
          ? 'has_blockers'
          : warnings.length > 0
            ? 'has_warnings'
            : (currentBatch?.validationStatus ?? 'validated');

    const content = this.serializer.serialize(schema, validRows);
    const proveedorId = batch.proveedorSaludId.toString();
    const dir = path.join(
      process.cwd(),
      EXPORTS_BASE,
      proveedorId,
      batch.yearMonth,
    );
    fs.mkdirSync(dir, { recursive: true });
    const cexFileName = getOfficialFileName(
      getOfficialBaseName('CEX', clues, year, month),
      'TXT',
    );
    const filePath = path.join(dir, cexFileName);
    fs.writeFileSync(filePath, content, 'utf-8');

    const relativePath = path.join(
      EXPORTS_BASE,
      proveedorId,
      batch.yearMonth,
      cexFileName,
    );
    const setPayload: Record<string, unknown> = {
      excludedReport: {
        entries: mergedEntries,
        totalExcluded: mergedTotalExcluded,
      },
      validationStatus,
    };
    if (isFirstGenerator) {
      setPayload.status = 'completed';
      setPayload.completedAt = new Date();
    }
    await this.giisBatchModel.updateOne(
      { _id: batch._id },
      {
        $set: setPayload,
        $push: {
          artifacts: {
            guide: 'CEX',
            path: relativePath,
            rowCount: validRows.length,
          },
        },
      },
    );
    const afterCex = await this.getBatch(batchId);
    if (isFirstGenerator && afterCex?.status === 'completed') {
      const artifactCount = afterCex.artifacts?.length ?? 0;
      const needsEncryption = (afterCex.artifacts ?? []).some(
        (a) => !a.zipPath,
      );
      if (artifactCount >= 1 && needsEncryption) {
        await this.encryptAndZipArtifacts(batchId);
      }
    }
    return this.getBatch(batchId);
  }

  private async recordBatchCompletionAudit(batch: GiisBatch) {
    const [year, month] = batch.yearMonth.split('-').map(Number);
    const clues = batch.establecimientoClues || '9998';
    const totalRows = (batch.artifacts ?? []).reduce(
      (s, a) => s + (Number(a.rowCount) || 0),
      0,
    );
    const totalExcluded =
      (batch.excludedReport as GiisExcludedReport)?.totalExcluded ?? 0;
    const resumen = `${totalRows} procesados, ${totalExcluded} excluidos`;
    const userId = (batch.options as { createdByUserId?: string })
      ?.createdByUserId;

    const proveedorSaludId = batch.proveedorSaludId.toString();
    for (const art of batch.artifacts ?? []) {
      if (art.guide !== 'CEX') continue;
      const guide = art.guide;
      const baseName = getOfficialBaseName(guide, clues, year, month);
      await this.giisExportAuditService.recordGenerationAudit({
        proveedorSaludId,
        usuarioGeneradorId: userId,
        periodo: batch.yearMonth,
        establecimientoClues: clues,
        tipoGuia: guide,
        nombreArchivoOficial: getOfficialFileName(baseName, 'TXT'),
        resumenValidacion: resumen,
        batchId: batch._id.toString(),
      });
      await this.auditService.record({
        proveedorSaludId,
        actorId: userId ?? 'SYSTEM',
        actionType: AuditActionType.GIIS_EXPORT_FILE_GENERATED,
        resourceType: 'GiisBatch',
        resourceId: batch._id.toString(),
        payload: { guide },
        eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
      });
    }
  }

  /**
   * Phase 6: Cifrar y empaquetar (TXT → CIF → ZIP) para cada artifact del batch.
   * Invocado automáticamente al completar batch o como fallback vía build-deliverable.
   * Valida: batch existe, status completed o generating, validationStatus !== 'has_blockers'.
   *
   * Modo de cifrado (prioridad):
   * 1. DGIS: Si DGIS_CIFRADO_DIR está configurado con cifrado.jar y keystore/transferencia.jks.
   * 2. Node: Si GIIS_3DES_KEY_BASE64 está configurado (24 bytes base64).
   */
  private async encryptAndZipArtifacts(batchId: string): Promise<void> {
    const batch = await this.getBatch(batchId);
    if (!batch) return;
    if (batch.status === 'failed') return;
    if (batch.status !== 'completed' && batch.status !== 'generating') {
      return;
    }
    const status = batch.validationStatus as string | undefined;
    if (status === 'has_blockers') {
      throw new ConflictException(
        'El batch tiene errores bloqueantes de validación; no se puede generar entregable.',
      );
    }

    const useDgis = this.dgisCifradoService.isAvailable();
    let key: Buffer | null = null;

    if (!useDgis) {
      const keyBase64 = process.env.GIIS_3DES_KEY_BASE64;
      if (!keyBase64) {
        throw new ConflictException(
          'Configure DGIS_CIFRADO_DIR (con cifrado.jar y keystore/transferencia.jks) o GIIS_3DES_KEY_BASE64. Ver docs/nom-024/giis_encryption_spec.md.',
        );
      }
      try {
        key = Buffer.from(keyBase64, 'base64');
      } catch {
        throw new ConflictException(
          'GIIS_3DES_KEY_BASE64 no es base64 válido.',
        );
      }
      if (key.length !== 24) {
        throw new ConflictException(
          `La clave 3DES debe ser 24 bytes (base64), se recibieron ${key.length} bytes.`,
        );
      }
    }

    const [year, month] = batch.yearMonth.split('-').map(Number);
    const clues = batch.establecimientoClues || '9998';
    const proveedorId = batch.proveedorSaludId.toString();
    const dir = path.join(
      process.cwd(),
      EXPORTS_BASE,
      proveedorId,
      batch.yearMonth,
    );
    const artifacts = Array.isArray(batch.artifacts) ? batch.artifacts : [];
    const needsAny = artifacts.some((a) => !a.zipPath);
    if (!needsAny) return;

    const updatedArtifacts = [];

    for (const art of artifacts) {
      if (art.zipPath) {
        updatedArtifacts.push({ ...art });
        continue;
      }
      if (art.guide !== 'CEX') {
        updatedArtifacts.push({ ...art });
        continue;
      }
      const guide = art.guide;
      const relPath = art.path as string;
      const fullPath = path.join(process.cwd(), relPath);
      if (!fs.existsSync(fullPath)) {
        updatedArtifacts.push({ ...art });
        continue;
      }
      const baseName = getOfficialBaseName(guide, clues, year, month);

      let cifBuffer: Buffer;
      if (useDgis) {
        cifBuffer = await this.dgisCifradoService.encryptTxtToCif(
          fullPath,
          baseName,
        );
      } else {
        const txtContent = fs.readFileSync(fullPath, 'latin1');
        const plainBuffer = Buffer.from(txtContent, 'latin1');
        cifBuffer = this.giisCryptoService.encryptToCif(
          plainBuffer,
          key as Buffer,
        );
      }

      const cifPath = path.join(dir, getOfficialFileName(baseName, 'CIF'));
      fs.writeFileSync(cifPath, cifBuffer);

      const zipBuffer = await this.giisCryptoService.createZipWithCif(
        cifBuffer,
        baseName,
      );
      const zipFileName = getOfficialFileName(baseName, 'ZIP');
      const zipPathFull = path.join(dir, zipFileName);
      fs.writeFileSync(zipPathFull, zipBuffer);
      const relativeZipPath = path.join(
        EXPORTS_BASE,
        proveedorId,
        batch.yearMonth,
        zipFileName,
      );
      const hashSha256 = this.giisCryptoService.sha256Hex(zipBuffer);

      updatedArtifacts.push({
        guide: art.guide,
        path: art.path,
        rowCount: art.rowCount,
        zipPath: relativeZipPath,
        hashSha256,
      });
    }

    await this.giisBatchModel.updateOne(
      { _id: batch._id },
      { $set: { artifacts: updatedArtifacts } },
    );

    const cluesAudit = batch.establecimientoClues || '9998';
    const proveedorSaludId = batch.proveedorSaludId.toString();
    const usuarioGeneradorId = (batch.options as { createdByUserId?: string })
      ?.createdByUserId;
    for (const art of updatedArtifacts) {
      if (art.zipPath && art.hashSha256) {
        await this.giisExportAuditService.recordGenerationAudit({
          proveedorSaludId,
          usuarioGeneradorId,
          periodo: batch.yearMonth,
          establecimientoClues: cluesAudit,
          tipoGuia: art.guide,
          nombreArchivoOficial: path.basename(art.zipPath),
          hashSha256Archivo: art.hashSha256,
          resumenValidacion: `Entregable ZIP generado`,
          batchId: batch._id.toString(),
        });
      }
    }
  }

  /**
   * Phase 2B/6: Build deliverable (fallback). Delega en encryptAndZipArtifacts.
   * Mantenido para reintentos manuales; el flujo normal cifra automáticamente al completar.
   */
  async buildDeliverable(
    batchId: string,
    _confirmWarnings?: boolean,
    _usuarioGeneradorId?: string,
  ): Promise<GiisBatch | null> {
    const batch = await this.getBatch(batchId);
    if (!batch || batch.status === 'failed') return null;

    const needsEncryption = (batch.artifacts ?? []).some((a) => !a.zipPath);
    if (needsEncryption) {
      await this.encryptAndZipArtifacts(batchId);
    }
    return this.getBatch(batchId);
  }
}
