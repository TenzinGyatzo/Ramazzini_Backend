import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Trabajador } from '../../trabajadores/schemas/trabajador.schema';
import { User } from 'src/modules/users/entities/user.entity';
import { DocumentoEstado } from '../enums/documento-estado.enum';
import { PdfStatus } from '../enums/pdf-status.enum';

@Schema()
export class Receta extends Document {
  @Prop({ required: true })
  fechaReceta: Date;

  @Prop({ type: [String] })
  tratamiento: string[];

  @Prop({ type: [String] })
  recomendaciones: string[];

  @Prop()
  indicaciones: string;

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

export const RecetaSchema = SchemaFactory.createForClass(Receta).set(
  'timestamps',
  true,
);
