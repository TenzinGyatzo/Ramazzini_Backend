/**
 * Phase 4 AuditTrail — D4, D5.
 * Append-only: do NOT use update/delete on this collection.
 * proveedorSaludId required; indexes for (proveedorSaludId, timestamp), (proveedorSaludId, actorId, timestamp), (proveedorSaludId, resourceType, resourceId, timestamp).
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ collection: 'auditevents', timestamps: false })
export class AuditEvent extends Document {
  @Prop({ type: Types.ObjectId, required: false, default: null })
  proveedorSaludId: Types.ObjectId | null;

  @Prop({ type: String, required: true })
  actorId: string; // ObjectId hex or "SYSTEM"

  /** Snapshot del usuario al momento del evento (no forma parte del hash). */
  @Prop({
    type: { username: String, email: String, role: String },
    required: false,
    default: null,
  })
  actorSnapshot: { username?: string; email?: string; role?: string } | null;

  /** Régimen del proveedor al momento del evento (no forma parte del hash). */
  @Prop({
    type: String,
    enum: ['SIRES_NOM024', 'SIN_REGIMEN'],
    required: false,
    default: null,
  })
  regime: 'SIRES_NOM024' | 'SIN_REGIMEN' | null;

  @Prop({ required: true })
  timestamp: Date;

  @Prop({ required: true })
  actionType: string;

  @Prop({ default: null })
  resourceType: string | null;

  @Prop({ default: null })
  resourceId: string | null;

  @Prop({ type: Object, default: null })
  payload: Record<string, unknown> | null;

  @Prop({ required: true })
  hashEvento: string;

  @Prop({ default: null })
  hashEventoAnterior: string | null;
}

export const AuditEventSchema = SchemaFactory.createForClass(AuditEvent);
AuditEventSchema.index({ proveedorSaludId: 1, timestamp: -1 });
AuditEventSchema.index({ proveedorSaludId: 1, actorId: 1, timestamp: -1 });
AuditEventSchema.index({
  proveedorSaludId: 1,
  resourceType: 1,
  resourceId: 1,
  timestamp: -1,
});
