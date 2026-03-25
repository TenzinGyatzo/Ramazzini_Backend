import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Trabajador } from '../../trabajadores/schemas/trabajador.schema';
import { User } from 'src/modules/users/entities/user.entity';
import { DocumentoEstado } from '../enums/documento-estado.enum';

@Schema()
export class ReporteLesionViolencia extends Document {
  @Prop({ required: true })
  fechaReporteLesionViolencia: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Trabajador',
    required: true,
  })
  idTrabajador: Trabajador;

  @Prop({ required: true })
  rutaPDF: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  updatedBy: User;

  // Consentimiento Diario (NOM-024)
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'ConsentimientoDiario',
    required: false,
  })
  consentimientoDiarioId?: MongooseSchema.Types.ObjectId;

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

export const ReporteLesionViolenciaSchema = SchemaFactory.createForClass(
  ReporteLesionViolencia,
).set('timestamps', true);
