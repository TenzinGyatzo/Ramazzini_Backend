import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Trabajador } from 'src/modules/trabajadores/entities/trabajador.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
  CategoriaCircunferenciaCintura,
  CategoriaFrecuenciaCardiaca,
  CategoriaIMC,
  CategoriaTensionArterial,
} from '../enums/clinical-categories.enum';
import {
  DiagnosticoCardiometabolico,
  EstadoControlCondicion,
  GradoObesidad,
} from './cardiometabolico.enums';

const DIAGNOSTICOS_CARDIOMETABOLICOS = Object.values(DiagnosticoCardiometabolico);
const ESTADOS_CONTROL = Object.values(EstadoControlCondicion);
const GRADOS_OBESIDAD = Object.values(GradoObesidad);
const VALORES_CATEGORIA_IMC = Object.values(CategoriaIMC);
const VALORES_CATEGORIA_CINTURA = Object.values(CategoriaCircunferenciaCintura);
const VALORES_CATEGORIA_TA = Object.values(CategoriaTensionArterial);
const VALORES_CATEGORIA_FC = Object.values(CategoriaFrecuenciaCardiaca);

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

  @Prop()
  hba1cPorcentaje?: number;

  @Prop()
  colesterolTotalMgDl?: number;

  @Prop()
  ldlMgDl?: number;

  @Prop()
  hdlMgDl?: number;

  @Prop()
  trigliceridosMgDl?: number;
}

@Schema({ _id: false })
export class CondicionMetabolicaEstado {
  @Prop()
  presente?: boolean;

  @Prop({ enum: ESTADOS_CONTROL })
  control?: EstadoControlCondicion;
}

@Schema({ _id: false })
export class CondicionObesidadEstado {
  @Prop()
  presente?: boolean;

  @Prop({ enum: GRADOS_OBESIDAD })
  grado?: GradoObesidad;
}

const CondicionMetabolicaEstadoSchema = SchemaFactory.createForClass(
  CondicionMetabolicaEstado,
);
const CondicionObesidadEstadoSchema = SchemaFactory.createForClass(CondicionObesidadEstado);

@Schema({ _id: false })
export class EstadoCondicionesCardiometabolicas {
  @Prop({ type: CondicionMetabolicaEstadoSchema })
  hipertension?: CondicionMetabolicaEstado;

  @Prop({ type: CondicionMetabolicaEstadoSchema })
  diabetes?: CondicionMetabolicaEstado;

  @Prop({ type: CondicionMetabolicaEstadoSchema })
  dislipidemia?: CondicionMetabolicaEstado;

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

@Schema()
export class EventoSeguimientoCardiometabolico extends Document {
  @Prop({ required: true })
  fechaControlCardiometabolico: Date;

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

  @Prop()
  adherenciaTerapeutica?: string;

  @Prop()
  sintomasRelevantes?: string;

  @Prop()
  evaluacionClinica?: string;

  @Prop()
  plan?: string;

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
}

export const EventoSeguimientoCardiometabolicoSchema = SchemaFactory.createForClass(
  EventoSeguimientoCardiometabolico,
).set('timestamps', true);

EventoSeguimientoCardiometabolicoSchema.index({ idTrabajador: 1, fechaControlCardiometabolico: -1 });
