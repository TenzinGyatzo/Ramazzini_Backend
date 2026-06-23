import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Trabajador } from '../../trabajadores/schemas/trabajador.schema';
import { User } from 'src/modules/users/entities/user.entity';
import { DocumentoEstado } from '../enums/documento-estado.enum';

const resultado = ['Positivo', 'Negativo'];

@Schema()
export class Antidoping extends Document {
  @Prop({ required: true })
  fechaAntidoping: Date;

  @Prop({ required: true, enum: resultado })
  marihuana: string;

  @Prop({ required: true, enum: resultado })
  cocaina: string;

  @Prop({ enum: resultado })
  anfetaminas: string;

  @Prop({ enum: resultado })
  metanfetaminas: string;

  @Prop({ enum: resultado })
  opiaceos: string;

  @Prop({ enum: resultado })
  benzodiacepinas: string;

  @Prop({ enum: resultado })
  fenciclidina: string;

  @Prop({ enum: resultado })
  metadona: string;

  @Prop({ enum: resultado })
  barbituricos: string;

  @Prop({ enum: resultado })
  antidepresivosTriciclicos: string;

  @Prop({ enum: resultado })
  metilendioximetanfetamina: string;

  @Prop({ enum: resultado })
  ketamina: string;

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

export const AntidopingSchema = SchemaFactory.createForClass(Antidoping).set(
  'timestamps',
  true,
);
AntidopingSchema.index({ createdBy: 1, createdAt: -1 });
