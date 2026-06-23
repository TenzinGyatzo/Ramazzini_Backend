import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Trabajador } from '../../trabajadores/schemas/trabajador.schema';
import { User } from 'src/modules/users/entities/user.entity';
import { DocumentoEstado } from '../enums/documento-estado.enum';

const extensiones = ['.pdf', '.jpeg', '.jpg', '.png'];

@Schema()
export class DocumentoExterno extends Document {
  @Prop({ required: true })
  nombreDocumento: string;

  @Prop({ required: true })
  fechaDocumento: Date;

  @Prop()
  notasDocumento: string;

  @Prop({ required: true, enum: extensiones })
  extension: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Trabajador',
    required: true,
  })
  idTrabajador: Trabajador;

  @Prop({ required: true })
  rutaDocumento: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ResultadoClinico' })
  idResultadoClinico?: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  updatedBy: User;

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

export const DocumentoExternoSchema = SchemaFactory.createForClass(
  DocumentoExterno,
).set('timestamps', true);
DocumentoExternoSchema.index({ createdBy: 1, createdAt: -1 });
