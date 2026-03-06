import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GiisBatchStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface GiisBatchArtifact {
  guide: 'CEX';
  path: string;
  rowCount?: number;
  /** Phase 2B: path to ZIP deliverable (only .CIF inside) */
  zipPath?: string;
  /** Phase 2B: SHA-256 hex of the ZIP file */
  hashSha256?: string;
}

export interface GiisBatchOptions {
  onlyFinalized?: boolean;
  /** User ID who triggered the batch (for audit). */
  createdByUserId?: string;
}

export interface GiisExcludedRowEntry {
  guide: string;
  rowIndex: number;
  field: string;
  cause: string;
}

export interface GiisExcludedReport {
  entries: GiisExcludedRowEntry[];
  totalExcluded: number;
}

export type GiisValidationStatus =
  | 'validated'
  | 'has_warnings'
  | 'has_blockers';

@Schema({ collection: 'giisbatches', timestamps: false })
export class GiisBatch extends Document {
  @Prop({ type: Types.ObjectId, ref: 'ProveedorSalud', required: true })
  proveedorSaludId: Types.ObjectId;

  @Prop({ default: '' })
  establecimientoClues: string;

  @Prop({ required: true, match: /^\d{4}-\d{2}$/ })
  yearMonth: string;

  @Prop({
    required: true,
    enum: ['pending', 'generating', 'completed', 'failed'],
    default: 'pending',
  })
  status: GiisBatchStatus;

  @Prop({
    type: [
      {
        guide: String,
        path: String,
        rowCount: Number,
        zipPath: String,
        hashSha256: String,
      },
    ],
    default: [],
  })
  artifacts: GiisBatchArtifact[];

  @Prop({ default: () => new Date() })
  startedAt: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  errorMessage?: string;

  @Prop({ type: Object })
  options?: GiisBatchOptions;

  @Prop({ enum: ['validated', 'has_warnings', 'has_blockers'] })
  validationStatus?: GiisValidationStatus;

  @Prop({
    type: {
      entries: [
        { guide: String, rowIndex: Number, field: String, cause: String },
      ],
      totalExcluded: Number,
    },
  })
  excludedReport?: GiisExcludedReport;
}

export const GiisBatchSchema = SchemaFactory.createForClass(GiisBatch);
