import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Trabajador } from '../../trabajadores/schemas/trabajador.schema';
import { User } from 'src/modules/users/entities/user.entity';
import { DocumentoEstado } from '../enums/documento-estado.enum';
import { PdfStatus } from '../enums/pdf-status.enum';
import { fichaSnapshotPlugin } from './ficha-snapshot.plugin';

const siONo = ['SI', 'NO'];

const tabaquismoOpciones = ['NO FUMA', 'FUMA', 'EXFUMADOR'];

const cigarrosSemanaOpciones = ['0', '<10', '10–20', '>20'];

const disneaOpciones = ['NINGUNA', 'AL ESFUERZO', 'EN REPOSO'];

const resultadoCuestionarioOpciones = [
  'PROCEDENTE',
  'PROCEDENTE CON PRECAUCIÓN',
  'NO PROCEDENTE',
  'OTRO',
];

@Schema()
export class PrevioEspirometria extends Document {
  @Prop({ required: true })
  fechaPrevioEspirometria: Date;

  // Factores de riesgo respiratorio
  @Prop({ enum: tabaquismoOpciones })
  tabaquismo: string;

  @Prop({ enum: cigarrosSemanaOpciones })
  cigarrosSemana: string;

  @Prop({ enum: siONo })
  exposicionHumosBiomasa: string;

  @Prop({ enum: siONo })
  exposicionLaboralPolvos: string;

  @Prop({ enum: siONo })
  exposicionVaporesGasesIrritantes: string;

  @Prop({ enum: siONo })
  antecedentesTuberculosisInfeccionesRespiratorias: string;

  // Síntomas respiratorios
  @Prop({ enum: siONo })
  tosCronica: string;

  @Prop({ enum: siONo })
  expectoracionFrecuente: string;

  @Prop({ enum: disneaOpciones })
  disnea: string;

  @Prop({ enum: siONo })
  sibilancias: string;

  @Prop({ enum: siONo })
  hemoptisis: string;

  @Prop()
  otrosSintomas: string;

  // Antecedentes médicos relevantes
  @Prop({ enum: siONo })
  asma: string;

  @Prop({ enum: siONo })
  epocBronquitisCronica: string;

  @Prop({ enum: siONo })
  fibrosisPulmonar: string;

  @Prop({ enum: siONo })
  apneaSueno: string;

  @Prop({ enum: siONo })
  medicamentosActuales: string;

  @Prop()
  medicamentosActualesEspecificar: string;

  // Contraindicaciones Relativas
  @Prop({ enum: siONo })
  cirugiaReciente: string;

  @Prop({ enum: siONo })
  infeccionRespiratoriaActiva: string;

  @Prop({ enum: siONo })
  embarazoComplicado: string;

  @Prop({ enum: siONo })
  derramePleural: string;

  @Prop({ enum: siONo })
  neumotorax: string;

  // Contraindicaciones Absolutas
  @Prop({ enum: siONo })
  infartoAgudoAnginaInestable: string;

  @Prop({ enum: siONo })
  aneurismaAorticoConocido: string;

  @Prop({ enum: siONo })
  inestabilidadHemodinamicaGrave: string;

  @Prop({ enum: siONo })
  hipertensionIntracraneal: string;

  @Prop({ enum: siONo })
  desprendimientoAgudoRetina: string;

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

export const PrevioEspirometriaSchema = SchemaFactory.createForClass(
  PrevioEspirometria,
).set('timestamps', true);
PrevioEspirometriaSchema.plugin(fichaSnapshotPlugin);
