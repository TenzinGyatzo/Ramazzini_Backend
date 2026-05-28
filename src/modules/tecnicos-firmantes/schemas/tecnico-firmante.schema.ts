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
}

export const TecnicoFirmanteSchema = SchemaFactory.createForClass(TecnicoFirmante);


