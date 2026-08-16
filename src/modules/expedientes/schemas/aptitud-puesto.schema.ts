import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Trabajador } from '../../trabajadores/schemas/trabajador.schema';
import { User } from 'src/modules/users/entities/user.entity';
import { DocumentoEstado } from '../enums/documento-estado.enum';
import { PdfStatus } from '../enums/pdf-status.enum';
import { fichaSnapshotPlugin } from './ficha-snapshot.plugin';

const tipoAptitud = [
  'Apto Sin Restricciones',
  'Apto Con Precaución',
  'Apto Con Restricciones',
  'No Apto',
  'Evaluación No Completada',
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

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Trabajador',
    required: true,
  })
  idTrabajador: Trabajador;

  @Prop({ required: true })
  rutaPDF: string;

  @Prop({
    enum: PdfStatus,
    required: false,
  })
  pdfStatus?: PdfStatus;


  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  updatedBy: User;

  // Consentimiento tratamiento información SIRES
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Consentimiento',
    required: false,
  })
  consentimientoId?: MongooseSchema.Types.ObjectId;

  // Document State Management (NOM-024)
  @Prop({
    enum: DocumentoEstado,
    required: true,
    default: DocumentoEstado.BORRADOR,
  })
  estado: DocumentoEstado;

  @Prop({ required: false })
  fechaFinalizacion?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  finalizadoPor?: User;

  @Prop({ required: false })
  fechaAnulacion?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false })
  anuladoPor?: User;

  @Prop({ required: false })
  razonAnulacion?: string;
}

export const AptitudPuestoSchema = SchemaFactory.createForClass(
  AptitudPuesto,
).set('timestamps', true);
AptitudPuestoSchema.plugin(fichaSnapshotPlugin);
AptitudPuestoSchema.index({ idTrabajador: 1, fechaAptitudPuesto: -1 });
AptitudPuestoSchema.index({ createdBy: 1, createdAt: -1 });
