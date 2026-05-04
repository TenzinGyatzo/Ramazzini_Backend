import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Trabajador } from 'src/modules/trabajadores/entities/trabajador.entity';
import { User } from 'src/modules/users/entities/user.entity';

const tipoNota = ["Inicial", "Seguimiento", "Alta"];

@Schema()
export class NotaMedica extends Document {
    @Prop({enum: tipoNota})
    tipoNota: string;

    @Prop({ required: true })
    fechaNotaMedica: Date;

    @Prop({ required: true })
    motivoConsulta: string;

    @Prop()
    antecedentes: string;

    @Prop()
    exploracionFisica: string;

    @Prop()
    tensionArterialSistolica: number;
  
    @Prop()
    tensionArterialDiastolica: number;

    @Prop()
    frecuenciaCardiaca: number;

    @Prop()
    frecuenciaRespiratoria: number;

    @Prop()
    temperatura: number;

    @Prop()
    saturacionOxigeno: number;

    @Prop({ required: true })
    diagnostico: string;

    @Prop({ type: [String]})
    tratamiento: string[];

    @Prop({ type: [String]})
    recomendaciones: string;

    @Prop()
    observaciones: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Trabajador', required: true })
    idTrabajador: Trabajador;

    @Prop({ required: true })
    rutaPDF: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    createdBy: User;
  
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    updatedBy: User;
}

export const NotaMedicaSchema = SchemaFactory.createForClass(NotaMedica).set('timestamps', true);
NotaMedicaSchema.index({ idTrabajador: 1, fechaNotaMedica: -1 });