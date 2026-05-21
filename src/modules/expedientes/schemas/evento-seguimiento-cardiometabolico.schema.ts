import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Trabajador } from 'src/modules/trabajadores/entities/trabajador.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { DocumentoEstado } from '../enums/documento-estado.enum';
import {
  CategoriaCircunferenciaCintura,
  CategoriaColesterolTotal,
  CategoriaFrecuenciaCardiaca,
  CategoriaGlucosa,
  CategoriaHbA1c,
  CategoriaHDL,
  CategoriaIMC,
  CategoriaLDL,
  CategoriaTensionArterial,
  CategoriaTrigliceridos,
} from '../enums/clinical-categories.enum';
import {
  DiagnosticoCardiometabolico,
  EstadoControlCondicion,
  GradoObesidad,
} from '../enums/cardiometabolico.enums';

const DIAGNOSTICOS_CARDIOMETABOLICOS = Object.values(DiagnosticoCardiometabolico);
const ESTADOS_CONTROL = Object.values(EstadoControlCondicion);
const GRADOS_OBESIDAD = Object.values(GradoObesidad);
const VALORES_CATEGORIA_IMC = Object.values(CategoriaIMC);
const VALORES_CATEGORIA_CINTURA = Object.values(CategoriaCircunferenciaCintura);
const VALORES_CATEGORIA_TA = Object.values(CategoriaTensionArterial);
const VALORES_CATEGORIA_FC = Object.values(CategoriaFrecuenciaCardiaca);
const VALORES_CATEGORIA_GLUCOSA = Object.values(CategoriaGlucosa);
const VALORES_CATEGORIA_HBA1C = Object.values(CategoriaHbA1c);
const VALORES_CATEGORIA_COLESTEROL_TOTAL = Object.values(CategoriaColesterolTotal);
const VALORES_CATEGORIA_LDL = Object.values(CategoriaLDL);
const VALORES_CATEGORIA_HDL = Object.values(CategoriaHDL);
const VALORES_CATEGORIA_TRIG = Object.values(CategoriaTrigliceridos);

@Schema({ _id: false })
export class SignosVitalesCardiometabolico {
  @Prop()
  tensionArterialSistolica?: number;

  @Prop()
  tensionArterialDiastolica?: number;

  @Prop({ enum: VALORES_CATEGORIA_TA })
  categoriaTensionArterial?: CategoriaTensionArterial;

  @Prop()
  frecuenciaCardiaca?: number;

  @Prop({ enum: VALORES_CATEGORIA_FC })
  categoriaFrecuenciaCardiaca?: CategoriaFrecuenciaCardiaca;
}

@Schema({ _id: false })
export class SomatometriaCardiometabolico {
  @Prop()
  peso?: number;

  @Prop()
  altura?: number;

  @Prop()
  indiceMasaCorporal?: number;

  @Prop({ enum: VALORES_CATEGORIA_IMC })
  categoriaIMC?: CategoriaIMC;

  @Prop()
  circunferenciaCintura?: number;

  @Prop({ enum: VALORES_CATEGORIA_CINTURA })
  categoriaCircunferenciaCintura?: CategoriaCircunferenciaCintura;
}

@Schema({ _id: false })
export class LaboratorioCardiometabolico {
  @Prop()
  glucosaMgDl?: number;

  @Prop({ enum: VALORES_CATEGORIA_GLUCOSA })
  categoriaGlucosa?: CategoriaGlucosa;

  @Prop()
  hba1cPorcentaje?: number;

  @Prop({ enum: VALORES_CATEGORIA_HBA1C })
  categoriaHbA1c?: CategoriaHbA1c;

  @Prop()
  colesterolTotalMgDl?: number;

  @Prop({ enum: VALORES_CATEGORIA_COLESTEROL_TOTAL })
  categoriaColesterolTotal?: CategoriaColesterolTotal;

  @Prop()
  ldlMgDl?: number;

  @Prop({ enum: VALORES_CATEGORIA_LDL })
  categoriaLDL?: CategoriaLDL;

  @Prop()
  hdlMgDl?: number;

  @Prop({ enum: VALORES_CATEGORIA_HDL })
  categoriaHDL?: CategoriaHDL;

  @Prop()
  trigliceridosMgDl?: number;

  @Prop({ enum: VALORES_CATEGORIA_TRIG })
  categoriaTrigliceridos?: CategoriaTrigliceridos;
}

@Schema({ _id: false })
export class VisitaControlCondicion {
  @Prop({ enum: ESTADOS_CONTROL })
  control?: EstadoControlCondicion;
}

const VisitaControlCondicionSchema = SchemaFactory.createForClass(VisitaControlCondicion);

@Schema({ _id: false })
export class CondicionObesidadEstado {
  @Prop({ enum: GRADOS_OBESIDAD })
  grado?: GradoObesidad;
}

const CondicionObesidadEstadoSchema = SchemaFactory.createForClass(CondicionObesidadEstado);

@Schema({ _id: false })
export class EstadoCondicionesCardiometabolicas {
  @Prop({ type: VisitaControlCondicionSchema })
  hipertensionArterial?: VisitaControlCondicion;

  @Prop({ type: VisitaControlCondicionSchema })
  diabetesMellitusTipo2?: VisitaControlCondicion;

  @Prop({ type: VisitaControlCondicionSchema })
  dislipidemia?: VisitaControlCondicion;

  @Prop({ type: CondicionObesidadEstadoSchema })
  obesidad?: CondicionObesidadEstado;
}

const SignosVitalesCardiometabolicoSchema = SchemaFactory.createForClass(
  SignosVitalesCardiometabolico,
);
const SomatometriaCardiometabolicoSchema = SchemaFactory.createForClass(
  SomatometriaCardiometabolico,
);
const LaboratorioCardiometabolicoSchema = SchemaFactory.createForClass(
  LaboratorioCardiometabolico,
);

const EstadoCondicionesCardiometabolicasSchema = SchemaFactory.createForClass(
  EstadoCondicionesCardiometabolicas,
);

@Schema({ _id: false })
export class TratamientoActualCardiometabolico {
  @Prop()
  medicamento?: string;

  @Prop()
  dosis?: string;

  @Prop()
  frecuencia?: string;

  @Prop()
  motivoUso?: string;
}

const TratamientoActualCardiometabolicoSchema = SchemaFactory.createForClass(
  TratamientoActualCardiometabolico,
);

@Schema()
export class EventoSeguimientoCardiometabolico extends Document {
  @Prop({ required: true })
  fechaEventoSeguimientoCardiometabolico: Date;

  @Prop({ required: true })
  motivoSeguimiento: string;

  @Prop({
    type: [{ type: String, enum: DIAGNOSTICOS_CARDIOMETABOLICOS }],
  })
  diagnosticosActivos?: DiagnosticoCardiometabolico[];

  @Prop({ type: EstadoCondicionesCardiometabolicasSchema })
  estadoCondiciones?: EstadoCondicionesCardiometabolicas;

  @Prop({ type: SignosVitalesCardiometabolicoSchema })
  signosVitales?: SignosVitalesCardiometabolico;

  @Prop({ type: SomatometriaCardiometabolicoSchema })
  somatometria?: SomatometriaCardiometabolico;

  @Prop({ type: LaboratorioCardiometabolicoSchema })
  laboratorio?: LaboratorioCardiometabolico;

  @Prop({ type: [TratamientoActualCardiometabolicoSchema] })
  tratamientoActual?: TratamientoActualCardiometabolico[];

  @Prop()
  adherenciaTerapeutica?: string;

  @Prop()
  sintomasRelevantes?: string;

  @Prop()
  riesgosActuales?: string;

  @Prop()
  proximaRevisionSugerida?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Trabajador', required: true })
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

export const EventoSeguimientoCardiometabolicoSchema = SchemaFactory.createForClass(
  EventoSeguimientoCardiometabolico,
).set('timestamps', true);

EventoSeguimientoCardiometabolicoSchema.index({ idTrabajador: 1, fechaEventoSeguimientoCardiometabolico: -1 });
