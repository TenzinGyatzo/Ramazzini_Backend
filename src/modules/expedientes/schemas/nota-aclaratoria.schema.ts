import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Trabajador } from '../../trabajadores/schemas/trabajador.schema';
import { User } from 'src/modules/users/entities/user.entity';
import { DocumentoEstado } from '../enums/documento-estado.enum';

const alcanceAclaracion = ['ACLARA', 'CORRIGE', 'COMPLEMENTA', 'INVALIDA'];
const impactoClinico = ['LEVE', 'MODERADO', 'SEVERO'];

@Schema()
export class NotaAclaratoria extends Document {
  @Prop({ required: true })
  fechaNotaAclaratoria: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: true,
  })
  documentoOrigenId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  documentoOrigenTipo: string; // 'notaMedica', 'historiaClinica', etc.

  @Prop({ required: false })
  documentoOrigenNombre?: string; // Nombre del documento (para documentos externos)

  @Prop({ required: false })
  documentoOrigenFecha?: Date; // Fecha del documento origen (creación o subida)

  @Prop({ required: true })
  motivoAclaracion: string;

  @Prop({ required: true })
  descripcionAclaracion: string;

  @Prop({
    enum: alcanceAclaracion,
    required: true,
  })
  alcanceAclaracion: string;

  @Prop({
    enum: impactoClinico,
    required: true,
  })
  impactoClinico: string;

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

export const NotaAclaratoriaSchema = SchemaFactory.createForClass(
  NotaAclaratoria,
).set('timestamps', true);
