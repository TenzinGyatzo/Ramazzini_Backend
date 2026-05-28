import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from 'src/modules/users/entities/user.entity';

@Schema()
export class EnfermeraFirmante extends Document {
  @Prop({ required: true })
  nombre: string;
  @Prop()
  sexo?: string;
  @Prop()
  tituloProfesional?: string;
  @Prop()
  numeroCedulaProfesional?: string;
  @Prop()
  nombreCredencialAdicional?: string;
  @Prop()
  numeroCredencialAdicional?: string;
  @Prop({
    type: {
      data: { type: String },
      contentType: { type: String },
    },
  })
  firma?: object;
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  idUser: User;

  @Prop()
  curp?: string;

  // NOM-024 GIIS-B015: Tipo de personal de salud (código numérico oficial DGIS)
  @Prop({ required: false })
  tipoPersonalId?: number;

  @Prop()
  entidadNacimiento?: string;

  @Prop({
    required: false,
    match: /^$|^(0[1-9]|[12][0-9]|3[0-2]|NE|00)$/,
  })
  entidadResidencia?: string;

  @Prop({
    required: false,
    match: /^$|^[0-9]{3}$/,
  })
  municipioResidencia?: string;

  @Prop({
    required: false,
    match: /^$|^[0-9]{4}$/,
  })
  localidadResidencia?: string;

  // NOM-024 GIIS: País de nacimiento (CATALOG_KEY de cat_pais)
  @Prop({ required: true })
  paisNacimiento: number;

  @Prop({ required: true })
  fechaNacimiento: Date;
}

export const EnfermeraFirmanteSchema =
  SchemaFactory.createForClass(EnfermeraFirmante);
