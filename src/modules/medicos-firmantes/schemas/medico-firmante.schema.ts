import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { User } from 'src/modules/users/entities/user.entity';

interface Logotipo {
  data: string;
  contentType: string;
}

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
    firma?: Object;
    @Prop({
        type: {
        data: { type: String },
        contentType: { type: String },
        },
    })
    firmaConAntefirma?: Object;
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    idUser: User;
}

export const MedicoFirmanteSchema = SchemaFactory.createForClass(MedicoFirmante);