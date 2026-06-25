import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Trabajador } from 'src/modules/trabajadores/entities/trabajador.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { DocumentoEstado } from '../enums/documento-estado.enum';
import {
  EstadoSeguimientoProgramadoCardiometabolico,
  ESTADOS_SEGUIMIENTO_PROGRAMADO_CARDIOMETABOLICO,
  MotivoSeguimientoProgramadoCardiometabolico,
  MOTIVOS_SEGUIMIENTO_PROGRAMADO_CARDIOMETABOLICO,
} from '../enums/seguimiento-programado-cardiometabolico.enum';
import {
  EventoSeguimientoCardiometabolico,
  LaboratorioCardiometabolico,
  SignosVitalesCardiometabolico,
  SomatometriaCardiometabolico,
  TratamientoActualCardiometabolico,
} from './evento-seguimiento-cardiometabolico.schema';
import {
  SeguimientoProgramadoCardiometabolico,
} from './seguimiento-programado-cardiometabolico.schema';
import { EstadoControlCondicion, GradoObesidad } from '../enums/cardiometabolico.enums';
import {
  ConsistenciaSeguimientoLongitudinal,
  NivelRiesgoLongitudinal,
  VALORES_CONSISTENCIA_SEGUIMIENTO_LONGITUDINAL,
  VALORES_NIVEL_RIESGO_LONGITUDINAL,
  VALORES_TENDENCIA_LONGITUDINAL,
  VALORES_TRAYECTORIA_LONGITUDINAL_INFORME,
  TendenciaLongitudinal,
  TrayectoriaLongitudinalInforme,
} from '../enums/informe-longitudinal-cardiometabolico.enums';

const ESTADOS_CONTROL = Object.values(EstadoControlCondicion);
const GRADOS_OBESIDAD = Object.values(GradoObesidad);

const SignosVitalesCardiometabolicoSnapshotSchema = SchemaFactory.createForClass(
  SignosVitalesCardiometabolico,
);
const SomatometriaCardiometabolicoSnapshotSchema = SchemaFactory.createForClass(
  SomatometriaCardiometabolico,
);
const LaboratorioCardiometabolicoSnapshotSchema = SchemaFactory.createForClass(
  LaboratorioCardiometabolico,
);
const TratamientoActualCardiometabolicoSnapshotSchema = SchemaFactory.createForClass(
  TratamientoActualCardiometabolico,
);

@Schema({ _id: false })
export class CondicionControlResumenLongitudinal {
  /** True solo si hubo diagnóstico activo documentado en el periodo (no por hallazgo/alteración). */
  @Prop()
  presente?: boolean;

  @Prop({ enum: ESTADOS_CONTROL })
  estadoActual?: EstadoControlCondicion;

  /** Última visita con dato relevante (motor ESC): hallazgo, alteración o control. */
  @Prop()
  codigoEstadoVigencia?: string;

  @Prop()
  razonUltimaVisita?: string;

  @Prop({ enum: VALORES_TENDENCIA_LONGITUDINAL })
  tendencia?: TendenciaLongitudinal;

  @Prop()
  observaciones?: string;

  @Prop()
  interpretacionAutomatica?: string;
}

const CondicionControlResumenLongitudinalSchema = SchemaFactory.createForClass(
  CondicionControlResumenLongitudinal,
);

@Schema({ _id: false })
export class CondicionObesidadResumenLongitudinal {
  @Prop()
  presente?: boolean;

  @Prop({ enum: GRADOS_OBESIDAD })
  gradoActual?: GradoObesidad;

  @Prop({ enum: VALORES_TENDENCIA_LONGITUDINAL })
  tendencia?: TendenciaLongitudinal;

  @Prop()
  observaciones?: string;

  @Prop()
  interpretacionAutomatica?: string;
}

const CondicionObesidadResumenLongitudinalSchema = SchemaFactory.createForClass(
  CondicionObesidadResumenLongitudinal,
);

@Schema({ _id: false })
export class ResumenCondicionesCardiometabolicas {
  @Prop({ type: CondicionControlResumenLongitudinalSchema })
  hipertension?: CondicionControlResumenLongitudinal;

  @Prop({ type: CondicionControlResumenLongitudinalSchema })
  diabetes?: CondicionControlResumenLongitudinal;

  @Prop({ type: CondicionControlResumenLongitudinalSchema })
  dislipidemia?: CondicionControlResumenLongitudinal;

  @Prop({ type: CondicionObesidadResumenLongitudinalSchema })
  obesidad?: CondicionObesidadResumenLongitudinal;
}

const ResumenCondicionesCardiometabolicasSchema = SchemaFactory.createForClass(
  ResumenCondicionesCardiometabolicas,
);

@Schema({ _id: false })
export class ResumenIndicadorLongitudinal {
  @Prop()
  valorInicial?: number;

  @Prop()
  valorFinal?: number;

  @Prop()
  cambioAbsoluto?: number;

  @Prop({ enum: VALORES_TENDENCIA_LONGITUDINAL })
  tendencia?: TendenciaLongitudinal;
}

const ResumenIndicadorLongitudinalSchema = SchemaFactory.createForClass(ResumenIndicadorLongitudinal);

@Schema({ _id: false })
export class ResumenIndicadoresLongitudinal {
  @Prop({ type: ResumenIndicadorLongitudinalSchema })
  tensionArterialSistolica?: ResumenIndicadorLongitudinal;

  @Prop({ type: ResumenIndicadorLongitudinalSchema })
  tensionArterialDiastolica?: ResumenIndicadorLongitudinal;

  @Prop({ type: ResumenIndicadorLongitudinalSchema })
  peso?: ResumenIndicadorLongitudinal;

  @Prop({ type: ResumenIndicadorLongitudinalSchema })
  indiceMasaCorporal?: ResumenIndicadorLongitudinal;

  @Prop({ type: ResumenIndicadorLongitudinalSchema })
  glucosaMgDl?: ResumenIndicadorLongitudinal;

  @Prop({ type: ResumenIndicadorLongitudinalSchema })
  hba1cPorcentaje?: ResumenIndicadorLongitudinal;
}

const ResumenIndicadoresLongitudinalSchema = SchemaFactory.createForClass(ResumenIndicadoresLongitudinal);

@Schema({ _id: false })
export class EventoConcentradoCardiometabolico {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: EventoSeguimientoCardiometabolico.name })
  idEventoOriginal?: MongooseSchema.Types.ObjectId;

  @Prop()
  fechaControl?: Date;

  @Prop({ type: SignosVitalesCardiometabolicoSnapshotSchema })
  signosVitales?: SignosVitalesCardiometabolico;

  @Prop({ type: SomatometriaCardiometabolicoSnapshotSchema })
  somatometria?: SomatometriaCardiometabolico;

  @Prop({ type: LaboratorioCardiometabolicoSnapshotSchema })
  laboratorio?: LaboratorioCardiometabolico;

  @Prop({ type: [TratamientoActualCardiometabolicoSnapshotSchema] })
  tratamientoActual?: TratamientoActualCardiometabolico[];

  @Prop({ type: [String] })
  diagnosticosActivos?: string[];

  /** Copia ligera de `estadoCondiciones` del evento (control por visita). */
  @Prop({ type: MongooseSchema.Types.Mixed })
  estadoCondiciones?: Record<string, unknown>;
}

const EventoConcentradoCardiometabolicoSchema = SchemaFactory.createForClass(EventoConcentradoCardiometabolico);

@Schema({ _id: false })
export class SeguimientoProgramadoConcentradoCardiometabolico {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: SeguimientoProgramadoCardiometabolico.name,
  })
  idSeguimientoProgramadoOriginal?: MongooseSchema.Types.ObjectId;

  @Prop()
  fechaProgramada?: Date;

  @Prop()
  fechaReprogramada?: Date;

  @Prop()
  esResultadoDeReprogramacion?: boolean;

  @Prop({ enum: ESTADOS_SEGUIMIENTO_PROGRAMADO_CARDIOMETABOLICO })
  estado?: EstadoSeguimientoProgramadoCardiometabolico;

  @Prop({ enum: MOTIVOS_SEGUIMIENTO_PROGRAMADO_CARDIOMETABOLICO })
  motivo?: MotivoSeguimientoProgramadoCardiometabolico;

  @Prop()
  observaciones?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: EventoSeguimientoCardiometabolico.name })
  idEventoClinico?: MongooseSchema.Types.ObjectId;
}

const SeguimientoProgramadoConcentradoCardiometabolicoSchema = SchemaFactory.createForClass(
  SeguimientoProgramadoConcentradoCardiometabolico,
);

@Schema()
export class InformeLongitudinalCardiometabolico extends Document {
  @Prop({ required: true })
  fechaInformeLongitudinalCardiometabolico: Date;

  @Prop({ required: true })
  periodoInicio: Date;

  @Prop({ required: true })
  periodoFin: Date;

  @Prop({ required: true })
  numeroEventosIncluidos: number;

  @Prop()
  numeroEventosValidos?: number;

  @Prop()
  numeroSeguimientosProgramados?: number;

  @Prop()
  numeroSeguimientosRealizados?: number;

  @Prop()
  numeroInasistencias?: number;

  @Prop()
  numeroCancelaciones?: number;

  @Prop()
  numeroReprogramaciones?: number;

  @Prop()
  porcentajeAsistencia?: number;

  @Prop({ enum: VALORES_CONSISTENCIA_SEGUIMIENTO_LONGITUDINAL })
  consistenciaSeguimiento?: ConsistenciaSeguimientoLongitudinal;

  @Prop({ type: [{ type: String }] })
  datosFaltantesRelevantes?: string[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Trabajador', required: true })
  idTrabajador: Trabajador;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  updatedBy: User;

  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: EventoSeguimientoCardiometabolico.name }],
  })
  eventosIncluidos?: MongooseSchema.Types.ObjectId[];

  @Prop({
    type: [
      {
        type: MongooseSchema.Types.ObjectId,
        ref: SeguimientoProgramadoCardiometabolico.name,
      },
    ],
  })
  seguimientosProgramadosIncluidos?: MongooseSchema.Types.ObjectId[];

  @Prop({ type: ResumenCondicionesCardiometabolicasSchema })
  resumenCondiciones?: ResumenCondicionesCardiometabolicas;

  @Prop({ type: [EventoConcentradoCardiometabolicoSchema] })
  eventosConcentrados?: EventoConcentradoCardiometabolico[];

  @Prop({ type: [SeguimientoProgramadoConcentradoCardiometabolicoSchema] })
  seguimientosProgramadosConcentrados?: SeguimientoProgramadoConcentradoCardiometabolico[];

  @Prop({ type: ResumenIndicadoresLongitudinalSchema })
  resumenIndicadores?: ResumenIndicadoresLongitudinal;

  @Prop({ enum: VALORES_NIVEL_RIESGO_LONGITUDINAL })
  nivelRiesgoLongitudinal?: NivelRiesgoLongitudinal;

  @Prop({ enum: VALORES_TRAYECTORIA_LONGITUDINAL_INFORME })
  tendenciaLongitudinal?: TrayectoriaLongitudinalInforme;

  @Prop()
  interpretacionRiesgoLongitudinal?: string;

  /** Viñetas de contexto terapéutico; solo evidencia de soporte (no alertas). */
  @Prop({ type: [{ type: String }] })
  contextoTerapeutico?: string[];

  /** Imagen PNG en base64 (data URL) para PDF / almacenamiento, patrón audiometría. */
  @Prop()
  graficaEvolucionGlucemica?: string;

  @Prop()
  graficaEvolucionPresionArterial?: string;

  @Prop()
  graficaEvolucionPesoImc?: string;

  @Prop()
  graficaEvolucionPerfilLipidico?: string;

  @Prop()
  rutaPDF?: string;

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

export const InformeLongitudinalCardiometabolicoSchema = SchemaFactory.createForClass(
  InformeLongitudinalCardiometabolico,
).set('timestamps', true);

InformeLongitudinalCardiometabolicoSchema.index({
  idTrabajador: 1,
  fechaInformeLongitudinalCardiometabolico: -1,
});
