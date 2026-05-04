import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Trabajador } from 'src/modules/trabajadores/entities/trabajador.entity';
import { User } from 'src/modules/users/entities/user.entity';

const tipoAptitud = [
    "Apto Sin Restricciones",
    "Apto Con Precaución",
    "Apto Con Restricciones",
    "No Apto",
    "Evaluación No Completada",
  ];

@Schema()
export class AptitudPuesto extends Document {
    @Prop({ required: true })
    fechaAptitudPuesto: Date;

    @Prop()
    evaluacionAdicional1: string;

    @Prop()
    fechaEvaluacionAdicional1: Date;

    @Prop()
    resultadosEvaluacionAdicional1: string;

    @Prop()
    evaluacionAdicional2: string;

    @Prop()
    fechaEvaluacionAdicional2: Date;

    @Prop()
    resultadosEvaluacionAdicional2: string;

    @Prop()
    evaluacionAdicional3: string;

    @Prop()
    fechaEvaluacionAdicional3: Date;

    @Prop()
    resultadosEvaluacionAdicional3: string;

    @Prop()
    evaluacionAdicional4: string;

    @Prop()
    fechaEvaluacionAdicional4: Date;

    @Prop()
    resultadosEvaluacionAdicional4: string;

    @Prop()
    evaluacionAdicional5: string;

    @Prop()
    fechaEvaluacionAdicional5: Date;

    @Prop()
    resultadosEvaluacionAdicional5: string;

    @Prop()
    evaluacionAdicional6: string;

    @Prop()
    fechaEvaluacionAdicional6: Date;

    @Prop()
    resultadosEvaluacionAdicional6: string;

    @Prop({ required: true, enum: tipoAptitud })
    aptitudPuesto: string;

    @Prop()
    alteracionesSalud: string;

    @Prop()
    resultados: string;

    @Prop()
    medidasPreventivas: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Trabajador', required: true })
    idTrabajador: Trabajador;

    @Prop({ required: true })
    rutaPDF: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    createdBy: User;
  
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    updatedBy: User;
}

export const AptitudPuestoSchema = SchemaFactory.createForClass(AptitudPuesto).set('timestamps', true);
AptitudPuestoSchema.index({ idTrabajador: 1, fechaAptitudPuesto: -1 });