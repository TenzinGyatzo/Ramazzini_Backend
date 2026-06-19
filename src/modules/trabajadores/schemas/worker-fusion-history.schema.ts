import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: true })
export class WorkerFusionHistory extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  fuenteId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
  destinoId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Empresa', required: true })
  idEmpresa: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  actorId: Types.ObjectId;

  @Prop({ required: false, enum: ['CURP', 'FOLIO'] })
  criterio?: string;

  @Prop({ type: Object, default: {} })
  documentosMigradosPorColeccion: Record<string, number>;
}

export const WorkerFusionHistorySchema = SchemaFactory.createForClass(WorkerFusionHistory);

WorkerFusionHistorySchema.index({ fuenteId: 1 }, { unique: true });
