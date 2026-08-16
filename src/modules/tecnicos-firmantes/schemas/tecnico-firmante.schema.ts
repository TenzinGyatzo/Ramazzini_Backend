import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from 'src/modules/users/entities/user.entity';

interface Logotipo {
  data: string;
  contentType: string;
}

@Schema()
export class TecnicoFirmante extends Document {
  @Prop({ required: true })
  nombre: string;

  @Prop()
  primerApellido?: string;

  @Prop()
  segundoApellido?: string;

  @Prop()
  sexo?: string;

  /** Sexo RENAPO para CURP (1=Hombre, 2=Mujer, 3=No binario). Solo SIRES_NOM024. */
  @Prop({ required: false, enum: [1, 2, 3] })
  sexoCURP?: number;

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
  firma?: Logotipo;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  idUser: User;

  @Prop()
  curp?: string;

  @Prop({ required: false })
  tipoPersonalId?: number;

  @Prop()
  entidadNacimiento?: string;

  @Prop({
    required: false,
    match: /^$|^(0[1-9]|[12][0-9]|3[0-2]|NE|00|88|99)$/,
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
  paisResidencia?: number;

  @Prop()
  paisNacimiento?: number;

  @Prop({ required: false })
  fechaNacimiento?: Date;

  // NOM-024-SSA3-2012: Folio alfanumérico de 18 caracteres (Identificador en la UM)
  // Generado por backend al crear. Null para firmantes existentes (no retroactivo)
  @Prop({
    required: false,
    match: /^[A-Za-z0-9]{18}$/,
  })
  folio?: string;
}

export const TecnicoFirmanteSchema =
  SchemaFactory.createForClass(TecnicoFirmante);
