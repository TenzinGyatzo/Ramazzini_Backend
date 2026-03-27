import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Trabajador } from 'src/modules/trabajadores/entities/trabajador.entity';
import { User } from 'src/modules/users/entities/user.entity';

/** I. Observación general (conductual) */
const aparienciaOpciones = [
  'Adecuada',
  'Descuidada',
  'Incongruente con el contexto',
] as const;

const actitudHaciaEvaluadorOpciones = [
  'Colaboradora',
  'Indiferente',
  'Hostil',
  'Evasiva',
] as const;

const nivelCooperacionOpciones = ['Alta', 'Media', 'Baja'] as const;

const contactoVisualOpciones = [
  'Adecuado',
  'Escaso',
  'Evitativo',
  'Excesivo',
] as const;

const conductaMotoraOpciones = [
  'Normal',
  'Inquietud psicomotora',
  'Retardo psicomotor',
  'Movimientos inusuales',
] as const;

/** II. Estado de ánimo y afecto */
const estadoAnimoPredominanteOpciones = [
  'Eutímico (normal)',
  'Ansioso',
  'Deprimido',
  'Irritable',
] as const;

const afectoOpciones = ['Adecuado', 'Plano', 'Lábil', 'Incongruente'] as const;

const intensidadEmocionalOpciones = [
  'Normal',
  'Disminuida',
  'Aumentada',
] as const;

/** III. Pensamiento */
const cursoPensamientoOpciones = [
  'Normal',
  'Acelerado',
  'Enlentecido',
  'Disgregado',
] as const;

const siNoOpciones = ['No', 'Sí'] as const;

/** V. Cognición */
const orientacionOpciones = [
  'Orientación en tiempo, espacio y persona',
  'Desorientación parcial',
  'Desorientación global',
] as const;

const atencionConcentracionOpciones = [
  'Adecuada',
  'Disminuida',
  'Muy limitada',
] as const;

const memoriaOpciones = [
  'Conservada',
  'Leve alteración',
  'Alteración significativa',
] as const;

/** VI. Juicio y conciencia de estado */
const juicioOpciones = [
  'Conservado',
  'Parcialmente alterado',
  'Alterado',
] as const;

const concienciaEstadoOpciones = ['Presente', 'Parcial', 'Ausente'] as const;

/** VII. Funcionamiento psicosocial */
const relacionesInterpersonalesOpciones = [
  'Adecuadas',
  'Conflictos ocasionales',
  'Conflictos frecuentes',
  'Aislamiento',
] as const;

const desempenoLaboralOpciones = [
  'Adecuado',
  'Disminuido',
  'Inestable',
] as const;

const manejoEstresOpciones = ['Adecuado', 'Limitado', 'Inadecuado'] as const;

@Schema()
export class EntrevistaPsicologica extends Document {
  @Prop({ required: true })
  fechaEntrevistaPsicologica: Date;

  // I. Observación general (conductual)
  @Prop({ required: true, enum: aparienciaOpciones })
  apariencia: string;

  @Prop({ required: true, enum: actitudHaciaEvaluadorOpciones })
  actitudHaciaEvaluador: string;

  @Prop({ required: true, enum: nivelCooperacionOpciones })
  nivelCooperacion: string;

  @Prop({ required: true, enum: contactoVisualOpciones })
  contactoVisual: string;

  @Prop({ required: true, enum: conductaMotoraOpciones })
  conductaMotora: string;

  // II. Estado de ánimo y afecto
  @Prop({ required: true, enum: estadoAnimoPredominanteOpciones })
  estadoAnimoPredominante: string;

  @Prop({ required: true, enum: afectoOpciones })
  afecto: string;

  @Prop({ required: true, enum: intensidadEmocionalOpciones })
  intensidadEmocional: string;

  // III. Pensamiento
  @Prop({ required: true, enum: cursoPensamientoOpciones })
  cursoPensamiento: string;

  @Prop({ required: true, enum: siNoOpciones })
  alteracionesPensamiento: string;

  @Prop()
  descripcionAlteracionesPensamiento?: string;

  // IV. Percepción
  @Prop({ required: true, enum: siNoOpciones })
  alteracionesPerceptuales: string;

  @Prop()
  descripcionAlteracionesPerceptuales?: string;

  // V. Cognición
  @Prop({ required: true, enum: orientacionOpciones })
  orientacion: string;

  @Prop({ required: true, enum: atencionConcentracionOpciones })
  atencionConcentracion: string;

  @Prop({ required: true, enum: memoriaOpciones })
  memoria: string;

  // VI. Juicio y conciencia de estado
  @Prop({ required: true, enum: juicioOpciones })
  juicio: string;

  @Prop({ required: true, enum: concienciaEstadoOpciones })
  concienciaEstado: string;

  // VII. Funcionamiento psicosocial
  @Prop({ required: true, enum: relacionesInterpersonalesOpciones })
  relacionesInterpersonales: string;

  @Prop({ required: true, enum: desempenoLaboralOpciones })
  desempenoLaboralAutorreporte: string;

  @Prop({ required: true, enum: manejoEstresOpciones })
  manejoEstres: string;

  // VIII. Riesgo inmediato (crítico)
  @Prop({ required: true, enum: siNoOpciones })
  ideacionSuicida: string;

  @Prop()
  observacionesIdeacionSuicida?: string;

  // IX. Conclusión clínica (obligatorio)
  @Prop({ required: true })
  conclusionClinica: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Trabajador', required: true })
  idTrabajador: Trabajador;

  @Prop({ required: true })
  rutaPDF: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  updatedBy: User;
}

export const EntrevistaPsicologicaSchema =
  SchemaFactory.createForClass(EntrevistaPsicologica).set('timestamps', true);
