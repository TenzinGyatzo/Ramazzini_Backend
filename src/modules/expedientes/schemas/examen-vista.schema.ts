import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Trabajador } from '../../trabajadores/schemas/trabajador.schema';
import { User } from 'src/modules/users/entities/user.entity';
import { DocumentoEstado } from '../enums/documento-estado.enum';

const siONo = ['Si', 'No'];

const ishiharaInterpretaciones = ['Normal', 'Daltonismo'];

@Schema()
export class ExamenVista extends Document {
  @Prop({ required: true })
  fechaExamenVista: Date;

  // Agudeza Visual

  // Ceguera total por ojo (afecta lejana, cercana, sin y con corrección)
  @Prop({ default: false })
  ojoIzquierdoCegueraTotal: boolean;

  @Prop({ default: false })
  ojoDerechoCegueraTotal: boolean;

  // Obsoleto: mantener para backward compat al leer docs antiguos
  @Prop({ required: false })
  ojoIzquierdoLejanaCegueraTotal?: boolean;

  @Prop({ required: false })
  ojoDerechoLejanaCegueraTotal?: boolean;

  @Prop({ required: false })
  ojoIzquierdoCercanaCegueraTotal?: boolean;

  @Prop({ required: false })
  ojoDerechoCercanaCegueraTotal?: boolean;

  // Sin corrección vista lejana
  @Prop({ required: false })
  ojoIzquierdoLejanaSinCorreccion: number;

  @Prop({ required: false })
  ojoDerechoLejanaSinCorreccion: number;

  @Prop({ required: true })
  sinCorreccionLejanaInterpretacion: string;

  @Prop({ required: true, enum: siONo })
  requiereLentesUsoGeneral: string;

  // Sin corrección vista cercana
  @Prop({ required: false })
  ojoIzquierdoCercanaSinCorreccion: number;

  @Prop({ required: false })
  ojoDerechoCercanaSinCorreccion: number;

  @Prop({ required: true })
  sinCorreccionCercanaInterpretacion: string;

  @Prop({ required: true, enum: siONo })
  requiereLentesParaLectura: string;

  // Con corrección vista lejana
  @Prop()
  ojoIzquierdoLejanaConCorreccion: number;

  @Prop()
  ojoDerechoLejanaConCorreccion: number;

  @Prop()
  conCorreccionLejanaInterpretacion: string;

  // Con corrección vista cercana
  @Prop()
  ojoIzquierdoCercanaConCorreccion: number;

  @Prop()
  ojoDerechoCercanaConCorreccion: number;

  @Prop()
  conCorreccionCercanaInterpretacion: string;

  // Ishihara
  @Prop({ required: true })
  placasCorrectas: number;

  @Prop({ required: true })
  porcentajeIshihara: number;

  @Prop({ required: true, enum: ishiharaInterpretaciones })
  interpretacionIshihara: string;

  // Pruebas de función ocular
  @Prop()
  testEstereopsis: string;

  @Prop()
  testCampoVisual: string;

  @Prop()
  coverTest: string;

  // Receta Final
  @Prop()
  esferaOjoIzquierdo: string;

  @Prop()
  cilindroOjoIzquierdo: string;

  @Prop()
  adicionOjoIzquierdo: string;

  @Prop()
  esferaOjoDerecho: string;

  @Prop()
  cilindroOjoDerecho: string;

  @Prop()
  adicionOjoDerecho: string;

  // Diagnóstico y recomendaciones
  @Prop()
  diagnosticoRecomendaciones: string;

  // Campos exclusivos Guatemala
  @Prop()
  antecedentes?: string;

  @Prop()
  anamnesis?: string;

  @Prop({ enum: siONo })
  utilizaAnteojos?: string;

  // Trabajador, ruta al archivo e info de creador y actualizador
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

export const ExamenVistaSchema = SchemaFactory.createForClass(ExamenVista).set(
  'timestamps',
  true,
);
