import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from 'src/modules/users/entities/user.entity';
import { Empresa } from 'src/modules/empresas/entities/empresa.entity';

@Schema()
export class CentroTrabajo extends Document {
  @Prop({ required: true })
  nombreCentro: string;

  @Prop({ required: false })
  direccionCentro: string;

  @Prop({ required: false })
  codigoPostal: string;

  @Prop({ required: false })
  estado: string;

  @Prop({ required: false })
  municipio: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Empresa', required: true })
  idEmpresa: Empresa;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  updatedBy: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'CentroTrabajo', required: false })
  idCentroOrigen?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'ExpedienteColaboracion',
    required: false,
  })
  idExpedienteColaboracion?: MongooseSchema.Types.ObjectId;
}

export const CentroTrabajoSchema = SchemaFactory.createForClass(
  CentroTrabajo,
).set('timestamps', true);
// Índices para relación y ordenación frecuente
CentroTrabajoSchema.index({ idEmpresa: 1 });
CentroTrabajoSchema.index({ nombreCentro: 1 });
