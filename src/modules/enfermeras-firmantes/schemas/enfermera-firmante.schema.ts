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

  // NOM-024: CURP for healthcare professionals (required for MX providers)
  @Prop()
  curp?: string;

  // NOM-024 GIIS-B015: Tipo de personal de salud (código numérico oficial DGIS)
  @Prop({ required: false })
  tipoPersonalId?: number; // Código numérico oficial DGIS (ej: 1, 15, 30)

  // NOM-024 GIIS: País de nacimiento (CATALOG_KEY de cat_pais)
  @Prop({ required: false })
  paisNacimiento?: number;
}

export const EnfermeraFirmanteSchema =
  SchemaFactory.createForClass(EnfermeraFirmante);
