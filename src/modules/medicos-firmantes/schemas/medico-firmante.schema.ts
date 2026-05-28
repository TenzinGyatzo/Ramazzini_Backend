import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from 'src/modules/users/entities/user.entity';

@Schema()
export class MedicoFirmante extends Document {
  @Prop({ required: true })
  nombre: string;
  @Prop()
  tituloProfesional?: string;
  @Prop()
  universidad?: string;
  @Prop()
  numeroCedulaProfesional?: string;
  @Prop()
  especialistaSaludTrabajo?: string;
  @Prop()
  numeroCedulaEspecialista?: string;
  @Prop()
  nombreCredencialAdicional?: string;
  @Prop()
  numeroCredencialAdicional?: string;
  @Prop()
  nombreCredencialAdicional2?: string;
  @Prop()
  numeroCredencialAdicional2?: string;
  @Prop({
    type: {
      data: { type: String },
      contentType: { type: String },
    },
  })
  firma?: object;
  @Prop({
    type: {
      data: { type: String },
      contentType: { type: String },
    },
  })
  firmaConAntefirma?: object;
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  idUser: User;

  @Prop()
  curp?: string;

  @Prop()
  sexo?: string;

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

  @Prop()
  paisNacimiento?: number;

  @Prop({ required: true })
  fechaNacimiento: Date;
}

export const MedicoFirmanteSchema =
  SchemaFactory.createForClass(MedicoFirmante);
