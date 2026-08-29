import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Trabajador } from '../../trabajadores/schemas/trabajador.schema';
import { User } from 'src/modules/users/entities/user.entity';
import { DocumentoEstado } from '../enums/documento-estado.enum';
import { PdfStatus } from '../enums/pdf-status.enum';
import { fichaSnapshotPlugin } from './ficha-snapshot.plugin';

const siONo = ['SI', 'NO'];

const proteccionAuditivaOpciones = ['NA', 'SIEMPRE', 'A VECES', 'NUNCA'];

const otoscopiaOpciones = ['PERMEABLE', 'NO PERMEABLE'];

const tiempoExposicionOpciones = [
  'NINGUNO',
  'MENOS DE 1 AÑO',
  '1 - 5 AÑOS',
  '6 - 10 AÑOS',
  '11 - 15 AÑOS',
  '16 - 20 AÑOS',
  'MÁS DE 20 AÑOS',
];

const resultadoCuestionarioOpciones = [
  'PROCEDENTE',
  'PROCEDENTE CON PRECAUCIÓN',
  'NO PROCEDENTE',
  'OTRO',
];

@Schema()
export class HistoriaOtologica extends Document {
  @Prop({ required: true })
  fechaHistoriaOtologica: Date;

  // Síntomas recientes (últimos 2 meses)
  @Prop({ enum: siONo })
  dolorOido: string;

  @Prop({ enum: siONo })
  supuracionOido: string;

  @Prop({ enum: siONo })
  mareoVertigo: string;

  @Prop({ enum: siONo })
  zumbidoTinnitus: string;

  @Prop({ enum: siONo })
  perdidaAudicion: string;

  @Prop({ enum: siONo })
  oidoTapadoPlenitud: string;

  // Antecedentes personales
  @Prop({ enum: siONo })
  otitisFrecuentesInfancia: string;

  @Prop({ enum: siONo })
  cirugiasOido: string;

  @Prop({ enum: siONo })
  traumatismoCranealBarotrauma: string;

  @Prop({ enum: siONo })
  usoAudifonos: string;

  @Prop({ enum: siONo })
  meningitisInfeccionGraveInfancia: string;

  @Prop({ enum: siONo })
  diabetes: string;

  @Prop({ enum: siONo })
  enfermedadRenal: string;

  @Prop({ enum: siONo })
  medicamentosOtotoxicos: string;

  // Exposición a ruido
  @Prop({ enum: siONo })
  trabajoAmbientesRuidosos: string;

  @Prop({ enum: tiempoExposicionOpciones })
  tiempoExposicionLaboral: string;

  @Prop({ enum: proteccionAuditivaOpciones })
  usoProteccionAuditiva: string;

  @Prop({ enum: siONo })
  musicaFuerteAudifonos: string;

  @Prop({ enum: siONo })
  armasFuegoPasatiemposRuidosos: string;

  @Prop({ enum: siONo })
  servicioMilitar: string;

  // Otros
  @Prop({ enum: siONo })
  alergias: string;

  @Prop({ enum: siONo })
  resfriadoDiaPrueba: string;

  // Otoscopia
  @Prop({ enum: otoscopiaOpciones })
  otoscopiaOidoDerecho: string;

  @Prop({ enum: otoscopiaOpciones })
  otoscopiaOidoIzquierdo: string;

  // Resultado de cuestionario
  @Prop({ enum: resultadoCuestionarioOpciones })
  resultadoCuestionario: string;

  @Prop()
  resultadoCuestionarioPersonalizado: string;

  // Trabajador, ruta al archivo e info de creador y actualizador
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

export const HistoriaOtologicaSchema = SchemaFactory.createForClass(
  HistoriaOtologica,
).set('timestamps', true);
HistoriaOtologicaSchema.plugin(fichaSnapshotPlugin);
HistoriaOtologicaSchema.index({ createdBy: 1, createdAt: -1 });
