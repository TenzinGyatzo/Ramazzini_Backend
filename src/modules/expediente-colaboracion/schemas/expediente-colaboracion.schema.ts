import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ExpedienteColaboracionEstado } from '../enums/expediente-colaboracion-estado.enum';
import { User } from 'src/modules/users/entities/user.entity';

@Schema({ _id: false })
export class TrabajadorColaboracionMapEntry {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  origenId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
  destinoId: MongooseSchema.Types.ObjectId;
}

export const TrabajadorColaboracionMapEntrySchema =
  SchemaFactory.createForClass(TrabajadorColaboracionMapEntry);

@Schema({ collection: 'expedientecolaboraciones' })
export class ExpedienteColaboracion extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ProveedoresSalud', required: true })
  proveedorOrigenId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ProveedoresSalud', required: true })
  proveedorDestinoId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'CentroTrabajo', required: true })
  centroOrigenId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'CentroTrabajo', required: true })
  centroDestinoId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Empresa', required: true })
  empresaOrigenId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Empresa', required: true })
  empresaDestinoId: MongooseSchema.Types.ObjectId;

  @Prop({
    enum: ExpedienteColaboracionEstado,
    required: true,
    default: ExpedienteColaboracionEstado.ACTIVA,
  })
  estado: ExpedienteColaboracionEstado;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  autorizadoPor?: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  creadoPor?: User;

  @Prop({ required: false })
  cloneRunId?: string;

  @Prop({ type: [TrabajadorColaboracionMapEntrySchema], default: [] })
  trabajadorMap: TrabajadorColaboracionMapEntry[];
}

export const ExpedienteColaboracionSchema = SchemaFactory.createForClass(
  ExpedienteColaboracion,
).set('timestamps', true);

ExpedienteColaboracionSchema.index({ centroDestinoId: 1, estado: 1 });
ExpedienteColaboracionSchema.index({ centroOrigenId: 1, estado: 1 });
ExpedienteColaboracionSchema.index({ proveedorDestinoId: 1, estado: 1 });
ExpedienteColaboracionSchema.index({ 'trabajadorMap.origenId': 1, estado: 1 });
ExpedienteColaboracionSchema.index({ 'trabajadorMap.destinoId': 1, estado: 1 });
