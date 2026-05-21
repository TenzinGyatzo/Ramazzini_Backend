import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Trabajador } from 'src/modules/trabajadores/entities/trabajador.entity';

// Enums para los campos comunes
export enum TipoEstudio {
  ESPIROMETRIA = 'ESPIROMETRIA',
  EKG = 'EKG',
  TIPO_SANGRE = 'TIPO_SANGRE',
  RAYOS_X = 'RAYOS_X',
  ANALISIS_LABORATORIO = 'ANALISIS_LABORATORIO',
}

export enum ResultadoGlobal {
  NORMAL = 'NORMAL',
  ANORMAL = 'ANORMAL',
  NO_CONCLUYENTE = 'NO_CONCLUYENTE',
}

export enum RelevanciaClinica {
  LEVE = 'LEVE',
  MODERADA = 'MODERADA',
  ALTA = 'ALTA',
}

// Enums específicos para Espirometría
export enum TipoAlteracionEspirometria {
  ANORMAL_OBSTRUCTIVO = 'ANORMAL_OBSTRUCTIVO',
  ANORMAL_RESTRICTIVO_SOSPECHADO = 'ANORMAL_RESTRICTIVO_SOSPECHADO',
  ANORMAL_MIXTO = 'ANORMAL_MIXTO',
}

// Enums específicos para EKG
export enum TipoAlteracionEKG {
  ANORMAL_ARRITMIA = 'ANORMAL_ARRITMIA',
  ANORMAL_TRASTORNO_CONDUCCION = 'ANORMAL_TRASTORNO_CONDUCCION',
  ANORMAL_ISQUEMIA_INFARTO = 'ANORMAL_ISQUEMIA_INFARTO',
  ANORMAL_REPOLARIZACION = 'ANORMAL_REPOLARIZACION',
  ANORMAL_HIPERTROFIA_CRECIMIENTO_CAVIDADES = 'ANORMAL_HIPERTROFIA_CRECIMIENTO_CAVIDADES',
  ANORMAL_QT_ALTERADO = 'ANORMAL_QT_ALTERADO',
}

// Enums específicos para Tipo de Sangre
export enum TipoSangre {
  A_POS = 'A_POS',
  A_NEG = 'A_NEG',
  B_POS = 'B_POS',
  B_NEG = 'B_NEG',
  AB_POS = 'AB_POS',
  AB_NEG = 'AB_NEG',
  O_POS = 'O_POS',
  O_NEG = 'O_NEG',
}

// Categorías paraguas para Rayos X (un solo bloque por documento; detalle en hallazgoEspecifico)
export enum TipoAlteracionRayosX {
  ALTERACION_PARENQUIMATOSA = 'ALTERACION_PARENQUIMATOSA',
  ALTERACION_PLEURAL = 'ALTERACION_PLEURAL',
  ALTERACION_CARDIOMEDIASTINICA = 'ALTERACION_CARDIOMEDIASTINICA',
  NODULO_O_MASA = 'NODULO_O_MASA',
  SECUELA_CRONICA = 'SECUELA_CRONICA',
  ALTERACION_OSEA = 'ALTERACION_OSEA',
  ALTERACION_ARTICULAR = 'ALTERACION_ARTICULAR',
  ALTERACION_ALINEACION = 'ALTERACION_ALINEACION',
  CAMBIO_DEGENERATIVO = 'CAMBIO_DEGENERATIVO',
  FRACTURA_O_TRAUMA = 'FRACTURA_O_TRAUMA',
  OTRA_ALTERACION = 'OTRA_ALTERACION',
}

// Categorías paraguas para Análisis de Laboratorio (un solo bloque por documento)
export enum TipoAlteracionAnalisisLaboratorio {
  ALTERACION_HEMATOLOGICA = 'ALTERACION_HEMATOLOGICA',
  ALTERACION_METABOLICA = 'ALTERACION_METABOLICA',
  ALTERACION_RENAL = 'ALTERACION_RENAL',
  ALTERACION_HEPATICA = 'ALTERACION_HEPATICA',
  ALTERACION_INFECCIOSA_O_INFLAMATORIA = 'ALTERACION_INFECCIOSA_O_INFLAMATORIA',
  ALTERACION_URINARIA = 'ALTERACION_URINARIA',
  OTRA_ALTERACION = 'OTRA_ALTERACION',
}

@Schema({ discriminatorKey: 'tipoEstudio', timestamps: true })
export class ResultadoClinico extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Trabajador', required: true, index: true })
  idTrabajador: Trabajador;

  @Prop({ type: String, enum: TipoEstudio, required: true, immutable: true })
  tipoEstudio: TipoEstudio;

  @Prop({ required: true })
  fechaEstudio: Date;

  @Prop({ type: Number, required: true, index: true })
  anioEstudio: number;

  @Prop({ type: String, enum: ResultadoGlobal })
  resultadoGlobal?: ResultadoGlobal;

  @Prop({ type: String })
  hallazgoEspecifico?: string;

  @Prop({ type: String, enum: RelevanciaClinica })
  relevanciaClinica?: RelevanciaClinica;

  @Prop({ type: String })
  recomendacion?: string;

  // Relación con Documento Externo (opcional)
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'DocumentoExterno' })
  idDocumentoExterno?: MongooseSchema.Types.ObjectId;

  // Campos específicos para Espirometría (solo si resultadoGlobal = ANORMAL)
  @Prop({ type: String, enum: TipoAlteracionEspirometria })
  tipoAlteracionEspirometria?: TipoAlteracionEspirometria;

  // Campos específicos para EKG (solo si resultadoGlobal = ANORMAL)
  @Prop({ type: String, enum: TipoAlteracionEKG })
  tipoAlteracionEKG?: TipoAlteracionEKG;

  // Campos específicos para Tipo de Sangre (siempre requerido para TIPO_SANGRE)
  @Prop({ type: String, enum: TipoSangre })
  tipoSangre?: TipoSangre;

  // Campos específicos para Rayos X (tipoEstudio = RAYOS_X; varias categorías paraguas por documento)
  @Prop({ type: [String], enum: TipoAlteracionRayosX })
  tipoAlteracionRayosX?: TipoAlteracionRayosX[];

  // Campos específicos para Análisis de Laboratorio (tipoEstudio = ANALISIS_LABORATORIO)
  @Prop({ type: [String], enum: TipoAlteracionAnalisisLaboratorio })
  tipoAlteracionAnalisisLaboratorio?: TipoAlteracionAnalisisLaboratorio[];
}

export const ResultadoClinicoSchema = SchemaFactory.createForClass(ResultadoClinico);
ResultadoClinicoSchema.index({ idTrabajador: 1, tipoEstudio: 1, fechaEstudio: -1 });

// Índice compuesto para optimizar consultas por trabajador y año
ResultadoClinicoSchema.index({ idTrabajador: 1, anioEstudio: 1 });

const TIPO_ALTERACION_PATHS = [
  'tipoAlteracionEspirometria',
  'tipoAlteracionEKG',
  'tipoAlteracionRayosX',
  'tipoAlteracionAnalisisLaboratorio',
] as const;

function allowedTipoAlteracionPath(tipoEstudio: TipoEstudio): (typeof TIPO_ALTERACION_PATHS)[number] | null {
  switch (tipoEstudio) {
    case TipoEstudio.ESPIROMETRIA:
      return 'tipoAlteracionEspirometria';
    case TipoEstudio.EKG:
      return 'tipoAlteracionEKG';
    case TipoEstudio.RAYOS_X:
      return 'tipoAlteracionRayosX';
    case TipoEstudio.ANALISIS_LABORATORIO:
      return 'tipoAlteracionAnalisisLaboratorio';
    default:
      return null;
  }
}

// Middleware pre-save: año del estudio; no persistir tipoAlteracion* ajenos ni arrays vacíos
ResultadoClinicoSchema.pre('save', function (next) {
  if (this.fechaEstudio && !this.anioEstudio) {
    this.anioEstudio = new Date(this.fechaEstudio).getFullYear();
  }

  const allowed = allowedTipoAlteracionPath(this.tipoEstudio as TipoEstudio);
  for (const key of TIPO_ALTERACION_PATHS) {
    if (key !== allowed) {
      this.set(key, undefined);
    }
  }
  if (allowed === 'tipoAlteracionRayosX') {
    const v = this.get('tipoAlteracionRayosX');
    if (Array.isArray(v) && v.length === 0) {
      this.set('tipoAlteracionRayosX', undefined);
    }
  }
  if (allowed === 'tipoAlteracionAnalisisLaboratorio') {
    const v = this.get('tipoAlteracionAnalisisLaboratorio');
    if (Array.isArray(v) && v.length === 0) {
      this.set('tipoAlteracionAnalisisLaboratorio', undefined);
    }
  }

  next();
});
