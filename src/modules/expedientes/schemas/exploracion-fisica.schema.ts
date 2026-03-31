import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Trabajador } from 'src/modules/trabajadores/entities/trabajador.entity';
import { User } from 'src/modules/users/entities/user.entity';

const categoriasIMC = [
  '',
  'Bajo peso',
  'Normal',
  'Sobrepeso',
  'Obesidad clase I',
  'Obesidad clase II',
  'Obesidad clase III',
];

const categoriasCircunferenciaCintura = [
  '',
  'Bajo Riesgo',
  'Riesgo Aumentado',
  'Alto Riesgo',
];

const categoriasTensionArterial = [
  '',
  'Óptima',
  'Normal',
  'Alta',
  'Hipertensión grado 1',
  'Hipertensión grado 2',
  'Hipertensión grado 3',
];

const categoriasFrecuenciaCardiaca = [
  '',
  'Excelente',
  'Buena',
  'Normal',
  'Elevada',
  'Alta',
  'Muy alta',
];

const categoriasFrecuenciaRespiratoria = [
  '',
  'Bradipnea',
  'Normal',
  'Taquipnea',
  'Hiperventilación',
];

const categoriaSaturacionOxigeno = [
  '',
  'Normal',
  'Aceptable',
  'Moderadamente baja',
  'Hipoxemia leve',
  'Hipoxemia grave',
];

@Schema()
export class ExploracionFisica extends Document {
  @Prop({ required: true })
  fechaExploracionFisica: Date;

  // Somatometría
  @Prop()
  peso: number;

  @Prop()
  altura: number;

  @Prop()
  indiceMasaCorporal: number;

  @Prop({ required: true, enum: categoriasIMC })
  categoriaIMC: string;

  @Prop()
  circunferenciaCintura: number;

  @Prop({ enum: categoriasCircunferenciaCintura })
  categoriaCircunferenciaCintura: string;

  // Signos Vitales
  @Prop()
  tensionArterialSistolica: number;

  @Prop()
  tensionArterialDiastolica: number;

  @Prop({ enum: categoriasTensionArterial })
  categoriaTensionArterial: string;

  @Prop()
  frecuenciaCardiaca: number;

  @Prop({ enum: categoriasFrecuenciaCardiaca })
  categoriaFrecuenciaCardiaca: string;

  @Prop()
  frecuenciaRespiratoria: number;

  @Prop({ enum: categoriasFrecuenciaRespiratoria })
  categoriaFrecuenciaRespiratoria: string;

  @Prop()
  saturacionOxigeno: number;

  @Prop({ enum: categoriaSaturacionOxigeno })
  categoriaSaturacionOxigeno: string;

  // Cabeza y Cuello
  @Prop()
  craneoCara: string;

  @Prop()
  ojos: string;

  @Prop()
  oidos: string;

  @Prop()
  nariz: string;

  @Prop()
  boca: string;

  @Prop()
  cuello: string;

  // Extremidades Superiores
  @Prop()
  hombros: string;

  @Prop()
  codos: string;

  @Prop()
  manos: string;

  @Prop()
  reflejosOsteoTendinososSuperiores: string;

  @Prop()
  vascularESuperiores: string;

  // Tórax
  @Prop()
  torax: string;

  // Abdomen
  @Prop()
  abdomen: string;

  // Extremidades Inferiores
  @Prop()
  cadera: string;

  @Prop()
  rodillas: string;

  @Prop()
  tobillosPies: string;

  @Prop()
  reflejosOsteoTendinososInferiores: string;

  @Prop()
  vascularEInferiores: string;

  // Columna
  @Prop()
  inspeccionColumna: string;

  @Prop()
  movimientosColumna: string;

  // Piel
  @Prop()
  lesionesPiel: string;

  @Prop()
  cicatrices: string;

  @Prop()
  nevos: string;

  // Exploración Neurológica Complementaria
  @Prop()
  coordinacion: string;

  @Prop()
  sensibilidad: string;

  @Prop()
  equilibrio: string;

  @Prop()
  marcha: string;

  // Resumen de la exploración física
  @Prop()
  resumenExploracionFisica: string;

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
}

export const ExploracionFisicaSchema = SchemaFactory.createForClass(ExploracionFisica).set('timestamps', true);
