import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { Trabajador } from '../../trabajadores/schemas/trabajador.schema';
import { User } from 'src/modules/users/entities/user.entity';
import { ProveedoresSalud } from '../../proveedores-salud/entities/proveedores-salud.entity';
import { TIPO_CONSENTIMIENTO_TRATAMIENTO } from '../constants/consentimiento-text.constants';

const consentMethods = ['VERBAL', 'AUTOGRAFO'];
const sources = ['UI'];

@Schema({ collection: 'consentimientos' })
export class Consentimiento extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'ProveedoresSalud',
    required: true,
    index: true,
  })
  proveedorSaludId: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Trabajador',
    required: true,
    index: true,
  })
  trabajadorId: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: [TIPO_CONSENTIMIENTO_TRATAMIENTO],
    default: TIPO_CONSENTIMIENTO_TRATAMIENTO,
  })
  tipoConsentimiento: string;

  @Prop({ required: true })
  version: string;

  @Prop({ required: true })
  literal: string;

  @Prop({ required: true })
  declaracionProfesional: string;

  @Prop({ required: true, enum: consentMethods })
  metodo: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  acceptedByUserId: Types.ObjectId;

  @Prop({ required: true })
  acceptedAt: Date;

  @Prop({ required: true, enum: sources })
  source: string;
}

export const ConsentimientoSchema = SchemaFactory.createForClass(
  Consentimiento,
).set('timestamps', true);

ConsentimientoSchema.index(
  {
    proveedorSaludId: 1,
    trabajadorId: 1,
    tipoConsentimiento: 1,
    version: 1,
  },
  { unique: true, name: 'consentimiento_unico_por_version' },
);

ConsentimientoSchema.index(
  { proveedorSaludId: 1, trabajadorId: 1, tipoConsentimiento: 1, version: -1 },
  { name: 'consentimiento_por_trabajador' },
);

ConsentimientoSchema.index(
  { proveedorSaludId: 1, acceptedAt: -1 },
  { name: 'proveedorSaludId_acceptedAt' },
);
