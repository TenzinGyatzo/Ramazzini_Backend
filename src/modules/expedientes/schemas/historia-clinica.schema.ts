import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Trabajador } from '../../trabajadores/schemas/trabajador.schema';
import { User } from 'src/modules/users/entities/user.entity';
import { DocumentoEstado } from '../enums/documento-estado.enum';

const siONo = ['Si', 'No'];

const motivoExamen = ['Ingreso', 'Inicial', 'Periódico'];

const menarcaOpciones = [
  'Menos de 9 años',
  '9-11 años',
  '12-14 años',
  '15-17 años',
  '18-20 años',
  '21-24 años',
  '25 años o más',
];

const duracionOpciones = [
  '2 días',
  '3 días',
  '4 días',
  '5 días',
  '6 días',
  '7 días',
  'Otro',
];

const frecuenciaOpciones = [
  'Regular',
  'Oligomenorrea',
  'Polimenorrea',
  'Amenorrea',
];

const gestasOpciones = [
  '0 (Ninguna)',
  '1 gesta',
  '2 gestas',
  '3 gestas',
  '4 gestas',
  '5 gestas',
  'Más de 5 gestas',
];

const partosOpciones = [
  '0 (Ninguno)',
  '1 parto',
  '2 partos',
  '3 partos',
  '4 partos',
  '5 partos',
  'Más de 5 partos',
];

const cesareasOpciones = [
  '0 (Ninguna)',
  '1 cesarea',
  '2 cesareas',
  '3 cesareas',
  'Más de 3 cesareas',
];

const abortosOpciones = [
  '0 (Ninguno)',
  '1 aborto',
  '2 abortos',
  '3 abortos',
  'Más de 3 abortos',
];

const dolorMenstrualOpciones = ['Eumenorrea', 'Dismenorrea'];

@Schema()
export class HistoriaClinica extends Document {
  @Prop({ enum: motivoExamen })
  motivoExamen: string;

  @Prop({ required: true })
  fechaHistoriaClinica: Date;

  // Antecedentes Heredofamiliares

  @Prop({ enum: siONo })
  nefropatias: string;
  @Prop()
  nefropatiasEspecificar: string;

  @Prop({ enum: siONo })
  diabeticos: string;
  @Prop()
  diabeticosEspecificar: string;

  @Prop({ enum: siONo })
  hipertensivos: string;
  @Prop()
  hipertensivosEspecificar: string;

  @Prop({ enum: siONo })
  cardiopaticos: string;
  @Prop()
  cardiopaticosEspecificar: string;

  @Prop({ enum: siONo })
  neoplasicos: string;
  @Prop()
  neoplasicosEspecificar: string;

  @Prop({ enum: siONo })
  psiquiatricos: string;
  @Prop()
  psiquiatricosEspecificar: string;

  @Prop({ enum: siONo })
  epilepticos: string;
  @Prop()
  epilepticosEspecificar: string;

  @Prop({ enum: siONo })
  autoinmunes: string;
  @Prop()
  autoinmunesEspecificar: string;

  @Prop({ enum: siONo })
  tuberculosis: string;
  @Prop()
  tuberculosisEspecificar: string;

  @Prop({ enum: siONo })
  hepatopatias: string;
  @Prop()
  hepatopatiasEspecificar: string;

  // Antecedentes Personales Patológicos (PP)
  @Prop({ enum: siONo })
  lumbalgias: string;
  @Prop()
  lumbalgiasEspecificar: string;

  @Prop({ enum: siONo })
  diabeticosPP: string;
  @Prop()
  diabeticosPPEspecificar: string;

  @Prop({ enum: siONo })
  cardiopaticosPP: string;
  @Prop()
  cardiopaticosPPEspecificar: string;

  @Prop({ enum: siONo })
  alergicos: string;
  @Prop()
  alergicosEspecificar: string;

  @Prop({ enum: siONo })
  hipertensivosPP: string;
  @Prop()
  hipertensivosPPEspecificar: string;

  @Prop({ enum: siONo })
  respiratorios: string;
  @Prop()
  respiratoriosEspecificar: string;

  @Prop({ enum: siONo })
  epilepticosPP: string;
  @Prop()
  epilepticosPPEspecificar: string;

  @Prop({ enum: siONo })
  accidentes: string;
  @Prop()
  accidentesEspecificar: string;

  @Prop({ enum: siONo })
  quirurgicos: string;
  @Prop()
  quirurgicosEspecificar: string;

  @Prop({ enum: siONo })
  otros: string;
  @Prop()
  otrosEspecificar: string;

  // Antecedentes Personales No Patológicos
  @Prop({ enum: siONo })
  alcoholismo: string;
  @Prop()
  alcoholismoEspecificar: string;

  @Prop({ enum: siONo })
  tabaquismo: string;
  @Prop()
  tabaquismoEspecificar: string;

  @Prop({ enum: siONo })
  toxicomanias: string;
  @Prop()
  toxicomaniasEspecificar: string;

  @Prop({ enum: siONo })
  alimentacionDeficiente: string;
  @Prop()
  alimentacionDeficienteEspecificar: string;

  @Prop({ enum: siONo })
  actividadFisicaDeficiente: string;
  @Prop()
  actividadFisicaDeficienteEspecificar: string;

  @Prop({ enum: siONo })
  higienePersonalDeficiente: string;
  @Prop()
  higienePersonalDeficienteEspecificar: string;

  // Antecedentes Ginecoobstetricos
  @Prop({ enum: menarcaOpciones })
  menarca: string;

  @Prop({ enum: duracionOpciones })
  duracionPromedio: string;

  @Prop({ enum: frecuenciaOpciones })
  frecuencia: string;

  @Prop({ enum: gestasOpciones })
  gestas: string;

  @Prop({ enum: partosOpciones })
  partos: string;

  @Prop({ enum: cesareasOpciones })
  cesareas: string;

  @Prop({ enum: abortosOpciones })
  abortos: string;

  @Prop()
  fechaUltimaRegla: string;

  @Prop({ enum: dolorMenstrualOpciones })
  dolorMenstrual: string;

  @Prop()
  embarazoActual: string;

  @Prop()
  planificacionFamiliar: string;

  @Prop()
  vidaSexualActiva: string;

  @Prop()
  fechaUltimoPapanicolaou: string;

  @Prop()
  fechaUltimaMastografia: string;

  // Antecedentes Laborales
  @Prop()
  empresaAnterior1: string;

  @Prop()
  puestoAnterior1: string;

  @Prop()
  antiguedadAnterior1: string;

  @Prop()
  agentesAnterior1: string;

  @Prop()
  empresaAnterior2: string;

  @Prop()
  puestoAnterior2: string;

  @Prop()
  antiguedadAnterior2: string;

  @Prop()
  agentesAnterior2: string;

  @Prop()
  empresaAnterior3: string;

  @Prop()
  puestoAnterior3: string;

  @Prop()
  antiguedadAnterior3: string;

  @Prop()
  agentesAnterior3: string;

  @Prop({ enum: siONo })
  accidenteLaboral: string;

  @Prop()
  accidenteLaboralEspecificar: string;

  @Prop()
  descripcionDelDano: string;

  @Prop()
  secuelas: string;

  // Resumen de la historia clínica
  @Prop()
  resumenHistoriaClinica: string; // Free-text summary (kept for backward compatibility)

  // NOM-024: CIE-10 Diagnosis Codes
  @Prop({
    required: false,
    match: /^$|^[A-Z][0-9]{2}(\.[0-9]{1,2})?$/, // CIE-10 format: A00.0 or A00
  })
  codigoCIE10Principal?: string;

  @Prop({
    type: [String],
    required: false,
  })
  codigosCIE10Complementarios?: string[];

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

export const HistoriaClinicaSchema = SchemaFactory.createForClass(
  HistoriaClinica,
).set('timestamps', true);
HistoriaClinicaSchema.index({ idTrabajador: 1, fechaHistoriaClinica: -1 });
