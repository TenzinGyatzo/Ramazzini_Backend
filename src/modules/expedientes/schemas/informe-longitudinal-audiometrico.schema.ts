import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Trabajador } from '../../trabajadores/schemas/trabajador.schema';
import { User } from 'src/modules/users/entities/user.entity';
import { DocumentoEstado } from '../enums/documento-estado.enum';
import { PdfStatus } from '../enums/pdf-status.enum';
import { Audiometria } from './audiometria.schema';
import { HistoriaOtologica } from './historia-otologica.schema';
import {
  CriterioComparacionAudiometrica,
  RolAudiometriaEnInforme,
  VALORES_CRITERIO_COMPARACION_AUDIOMETRICA,
  VALORES_ROL_AUDIOMETRIA_EN_INFORME,
  VERSION_CRITERIO_AUDIOMETRICO_V1,
} from '../enums/informe-longitudinal-audiometrico.enums';
import { fichaSnapshotPlugin } from './ficha-snapshot.plugin';

@Schema({ _id: false })
export class AudiometriaConcentradaLongitudinal {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Audiometria.name })
  idAudiometriaOriginal?: MongooseSchema.Types.ObjectId;

  @Prop()
  fechaAudiometria?: Date;

  @Prop()
  metodoAudiometria?: string;

  @Prop({ enum: VALORES_ROL_AUDIOMETRIA_EN_INFORME })
  rolEnInforme?: RolAudiometriaEnInforme;

  @Prop()
  oidoDerecho125?: number;
  @Prop()
  oidoDerecho250?: number;
  @Prop()
  oidoDerecho500?: number;
  @Prop()
  oidoDerecho1000?: number;
  @Prop()
  oidoDerecho2000?: number;
  @Prop()
  oidoDerecho3000?: number;
  @Prop()
  oidoDerecho4000?: number;
  @Prop()
  oidoDerecho6000?: number;
  @Prop()
  oidoDerecho8000?: number;

  @Prop()
  oidoIzquierdo125?: number;
  @Prop()
  oidoIzquierdo250?: number;
  @Prop()
  oidoIzquierdo500?: number;
  @Prop()
  oidoIzquierdo1000?: number;
  @Prop()
  oidoIzquierdo2000?: number;
  @Prop()
  oidoIzquierdo3000?: number;
  @Prop()
  oidoIzquierdo4000?: number;
  @Prop()
  oidoIzquierdo6000?: number;
  @Prop()
  oidoIzquierdo8000?: number;

  @Prop()
  porcentajePerdidaOD?: number;
  @Prop()
  porcentajePerdidaOI?: number;
  @Prop()
  perdidaMonauralOD_AMA?: number;
  @Prop()
  perdidaMonauralOI_AMA?: number;
  @Prop()
  perdidaAuditivaBilateralAMA?: number;
  @Prop()
  hipoacusiaBilateralCombinada?: number;

  @Prop()
  diagnosticoAudiometria?: string;
  @Prop()
  interpretacionAudiometrica?: string;

  @Prop({ type: [Number] })
  frecuenciasFaltantes?: number[];

  @Prop()
  estudioIncompleto?: boolean;
}

const AudiometriaConcentradaLongitudinalSchema = SchemaFactory.createForClass(
  AudiometriaConcentradaLongitudinal,
);

@Schema({ _id: false })
export class AntecedenteExposicionRuidoLongitudinal {
  @Prop()
  fuente?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: HistoriaOtologica.name })
  idHistoriaOtologica?: MongooseSchema.Types.ObjectId;

  @Prop()
  trabajoAmbientesRuidosos?: string;

  @Prop()
  tiempoExposicionLaboral?: string;

  @Prop()
  usoProteccionAuditiva?: string;

  @Prop()
  ruidoEnAgentesRiesgoActuales?: boolean;

  @Prop()
  textoLibre?: string;
}

const AntecedenteExposicionRuidoLongitudinalSchema = SchemaFactory.createForClass(
  AntecedenteExposicionRuidoLongitudinal,
);

@Schema({ _id: false })
export class CeldaDeltaAudiometrico {
  @Prop()
  frecuenciaHz?: number;

  @Prop()
  deltaDb?: number;
}

const CeldaDeltaAudiometricoSchema = SchemaFactory.createForClass(CeldaDeltaAudiometrico);

@Schema({ _id: false })
export class FilaMatrizDeltaAudiometrico {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Audiometria.name })
  idAudiometriaOriginal?: MongooseSchema.Types.ObjectId;

  @Prop()
  fechaAudiometria?: Date;

  @Prop()
  oido?: string;

  @Prop({ type: [CeldaDeltaAudiometricoSchema] })
  deltas?: CeldaDeltaAudiometrico[];
}

const FilaMatrizDeltaAudiometricoSchema = SchemaFactory.createForClass(
  FilaMatrizDeltaAudiometrico,
);

@Schema({ _id: false })
export class ResumenCronologicoAudiometrico {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Audiometria.name })
  idAudiometriaOriginal?: MongooseSchema.Types.ObjectId;

  @Prop()
  fechaAudiometria?: Date;

  @Prop({ enum: VALORES_ROL_AUDIOMETRIA_EN_INFORME })
  tipo?: RolAudiometriaEnInforme;

  @Prop()
  metodoAudiometria?: string;

  @Prop()
  resultadoOD?: string;

  @Prop()
  resultadoOI?: string;

  @Prop()
  cambioRespectoBasal?: string;
}

const ResumenCronologicoAudiometricoSchema = SchemaFactory.createForClass(
  ResumenCronologicoAudiometrico,
);

@Schema()
export class InformeLongitudinalAudiometrico extends Document {
  @Prop({ required: true })
  fechaInformeLongitudinalAudiometrico: Date;

  @Prop({ required: true })
  periodoInicio: Date;

  @Prop({ required: true })
  periodoFin: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Trabajador', required: true })
  idTrabajador: Trabajador;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  updatedBy: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Audiometria.name })
  idAudiometriaBasal?: MongooseSchema.Types.ObjectId;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: Audiometria.name }],
  })
  audiometriasSubsecuentesIncluidas?: MongooseSchema.Types.ObjectId[];

  @Prop()
  numeroAudiometriasIncluidas?: number;

  @Prop({ type: AudiometriaConcentradaLongitudinalSchema })
  audiometriaBasalConcentrada?: AudiometriaConcentradaLongitudinal;

  @Prop({ type: [AudiometriaConcentradaLongitudinalSchema] })
  audiometriasSubsecuentesConcentradas?: AudiometriaConcentradaLongitudinal[];

  @Prop({ type: AntecedenteExposicionRuidoLongitudinalSchema })
  antecedenteExposicionRuido?: AntecedenteExposicionRuidoLongitudinal;

  @Prop({ type: [FilaMatrizDeltaAudiometricoSchema] })
  matrizDeltas?: FilaMatrizDeltaAudiometrico[];

  @Prop({ type: [ResumenCronologicoAudiometricoSchema] })
  resumenCronologico?: ResumenCronologicoAudiometrico[];

  @Prop({ type: [{ type: String }] })
  advertencias?: string[];

  @Prop()
  borradorInterpretacionObjetiva?: string;

  @Prop()
  borradorInterpretacionOidoDerecho?: string;

  @Prop()
  borradorInterpretacionOidoIzquierdo?: string;

  @Prop()
  interpretacionLongitudinal?: string;

  @Prop()
  interpretacionOidoDerecho?: string;

  @Prop()
  interpretacionOidoIzquierdo?: string;

  @Prop()
  recomendacionesSeguimientoAudiometrico?: string;

  @Prop({
    enum: VALORES_CRITERIO_COMPARACION_AUDIOMETRICA,
    default: CriterioComparacionAudiometrica.SOLO_DIFERENCIAS,
  })
  criterioComparacion?: CriterioComparacionAudiometrica;

  @Prop({ default: VERSION_CRITERIO_AUDIOMETRICO_V1 })
  versionCriterio?: string;

  @Prop()
  graficaAudiogramaOidoDerecho?: string;

  @Prop()
  graficaAudiogramaOidoIzquierdo?: string;

  @Prop()
  rutaPDF?: string;

  @Prop({
    enum: PdfStatus,
    required: false,
  })
  pdfStatus?: PdfStatus;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Consentimiento',
    required: false,
  })
  consentimientoId?: MongooseSchema.Types.ObjectId;

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

export const InformeLongitudinalAudiometricoSchema = SchemaFactory.createForClass(
  InformeLongitudinalAudiometrico,
).set('timestamps', true);
InformeLongitudinalAudiometricoSchema.plugin(fichaSnapshotPlugin);

InformeLongitudinalAudiometricoSchema.index({
  idTrabajador: 1,
  fechaInformeLongitudinalAudiometrico: -1,
});
InformeLongitudinalAudiometricoSchema.index({ createdBy: 1, createdAt: -1 });
