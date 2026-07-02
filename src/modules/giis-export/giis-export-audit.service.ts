/**
 * Phase 2C: Records audit entries for GIIS batch completion and deliverable generation.
 */

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GiisExportAudit } from './schemas/giis-export-audit.schema';
import { isAuditTrailPersistEnabled } from '../audit/utils/audit-trail-persist.util';

export interface RecordGenerationAuditPayload {
  proveedorSaludId?: string; // Phase 4 D5: required for new records
  usuarioGeneradorId?: string;
  periodo: string;
  establecimientoClues: string;
  tipoGuia: 'CEX';
  nombreArchivoOficial: string;
  hashSha256Archivo?: string;
  resumenValidacion: string;
  batchId: string;
  versionInterna?: string;
}

@Injectable()
export class GiisExportAuditService {
  constructor(
    @InjectModel(GiisExportAudit.name)
    private readonly auditModel: Model<GiisExportAudit>,
  ) {}

  async recordGenerationAudit(payload: RecordGenerationAuditPayload) {
    if (!isAuditTrailPersistEnabled()) {
      return null;
    }

    const clues = payload.establecimientoClues?.trim() ?? '';
    const doc = await this.auditModel.create({
      proveedorSaludId: payload.proveedorSaludId
        ? new Types.ObjectId(payload.proveedorSaludId)
        : undefined,
      usuarioGeneradorId: payload.usuarioGeneradorId
        ? new Types.ObjectId(payload.usuarioGeneradorId)
        : undefined,
      fechaHora: new Date(),
      periodo: payload.periodo,
      establecimientoClues: clues,
      cluesEs9998: clues === '9998',
      tipoGuia: payload.tipoGuia,
      nombreArchivoOficial: payload.nombreArchivoOficial || '',
      hashSha256Archivo: payload.hashSha256Archivo || '',
      resumenValidacion: payload.resumenValidacion || '',
      batchId: new Types.ObjectId(payload.batchId),
      versionInterna: payload.versionInterna,
    });
    return doc;
  }
}
