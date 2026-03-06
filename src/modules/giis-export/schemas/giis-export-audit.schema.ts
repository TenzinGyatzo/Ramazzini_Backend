/**
 * Phase 2C: Audit record for each GIIS generation (batch completed or deliverable built).
 * Phase 4: proveedorSaludId added (D5). Migration: backfill proveedorSaludId from GiisBatch.proveedorSaludId for existing docs; new records must include proveedorSaludId.
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'giisexportaudits', timestamps: false })
export class GiisExportAudit extends Document {
  @Prop({ type: Types.ObjectId, required: false })
  proveedorSaludId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  usuarioGeneradorId?: Types.ObjectId;

  @Prop({ required: true })
  fechaHora: Date;

  @Prop({ required: true, match: /^\d{4}-\d{2}$/ })
  periodo: string;

  @Prop({ default: '' })
  establecimientoClues: string;

  @Prop({ default: false })
  cluesEs9998: boolean;

  @Prop({ required: true, enum: ['CEX'] })
  tipoGuia: 'CEX';

  @Prop({ default: '' })
  nombreArchivoOficial: string;

  @Prop({ default: '' })
  hashSha256Archivo: string;

  @Prop({ default: '' })
  resumenValidacion: string;

  @Prop({ type: Types.ObjectId, ref: 'GiisBatch', required: true })
  batchId: Types.ObjectId;

  @Prop()
  versionInterna?: string;
}

export const GiisExportAuditSchema =
  SchemaFactory.createForClass(GiisExportAudit);
GiisExportAuditSchema.index({ fechaHora: 1 });
GiisExportAuditSchema.index({ batchId: 1 });
GiisExportAuditSchema.index({ periodo: 1 });
GiisExportAuditSchema.index({ proveedorSaludId: 1, fechaHora: 1 });
