import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../users/entities/user.entity';
import { ProveedoresSalud } from '../../proveedores-salud/entities/proveedores-salud.entity';

const sources = ['UI'];

@Schema({ collection: 'acuerdoconfidencialidadaceptaciones' })
export class AcuerdoConfidencialidadAceptacion extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'ProveedoresSalud',
    required: true,
    index: true,
  })
  proveedorSaludId: Types.ObjectId;

  @Prop({ required: true })
  fechaHoraAceptacion: Date;

  @Prop({ required: true })
  direccionIp: string;

  @Prop({ required: true })
  versionAco: string;

  @Prop({ required: true })
  agreementTextLiteral: string;

  @Prop({ required: true, enum: sources })
  source: string;
}

export const AcuerdoConfidencialidadAceptacionSchema =
  SchemaFactory.createForClass(AcuerdoConfidencialidadAceptacion).set(
    'timestamps',
    true,
  );

AcuerdoConfidencialidadAceptacionSchema.index(
  { userId: 1, versionAco: 1 },
  { name: 'userId_versionAco' },
);

AcuerdoConfidencialidadAceptacionSchema.index(
  { proveedorSaludId: 1, fechaHoraAceptacion: -1 },
  { name: 'proveedorSaludId_fechaHoraAceptacion' },
);
