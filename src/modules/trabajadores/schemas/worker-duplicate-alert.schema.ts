import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type WorkerDuplicateAlertEstado = 'PENDIENTE' | 'DESCARTADO' | 'FUSIONADO';
export type WorkerDuplicateAlertCriterio = 'CURP' | 'FOLIO';

@Schema({ timestamps: true })
export class WorkerDuplicateAlert extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Trabajador', required: true, index: true })
  trabajadorId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Trabajador', required: true, index: true })
  candidatoId: Types.ObjectId;

  @Prop({ required: true, enum: ['CURP', 'FOLIO'] })
  criterio: WorkerDuplicateAlertCriterio;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Empresa', required: true, index: true })
  idEmpresa: Types.ObjectId;

  @Prop({ required: true, enum: ['PENDIENTE', 'DESCARTADO', 'FUSIONADO'], default: 'PENDIENTE', index: true })
  estado: WorkerDuplicateAlertEstado;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  descartadoBy?: Types.ObjectId;
}

export const WorkerDuplicateAlertSchema = SchemaFactory.createForClass(WorkerDuplicateAlert);

WorkerDuplicateAlertSchema.index(
  { trabajadorId: 1, candidatoId: 1 },
  {
    unique: true,
    partialFilterExpression: { estado: 'PENDIENTE' },
  },
);
