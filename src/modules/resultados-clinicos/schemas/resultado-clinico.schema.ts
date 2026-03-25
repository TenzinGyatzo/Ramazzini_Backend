import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Trabajador } from 'src/modules/trabajadores/entities/trabajador.entity';
import { User } from 'src/modules/users/entities/user.entity';

// Enums para los campos comunes
export enum TipoEstudio {
  ESPIROMETRIA = 'ESPIROMETRIA',
  EKG = 'EKG',
  TIPO_SANGRE = 'TIPO_SANGRE',
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
  tipoAlteracion?: TipoAlteracionEspirometria;

  // Campos específicos para EKG (solo si resultadoGlobal = ANORMAL)
  @Prop({ type: String, enum: TipoAlteracionEKG })
  tipoAlteracionPrincipal?: TipoAlteracionEKG;

  // Campos específicos para Tipo de Sangre (siempre requerido para TIPO_SANGRE)
  @Prop({ type: String, enum: TipoSangre })
  tipoSangre?: TipoSangre;
}

export const ResultadoClinicoSchema = SchemaFactory.createForClass(ResultadoClinico);

// Índice compuesto para optimizar consultas por trabajador y año
ResultadoClinicoSchema.index({ idTrabajador: 1, anioEstudio: 1 });

// Middleware pre-save para calcular anioEstudio desde fechaEstudio
ResultadoClinicoSchema.pre('save', function (next) {
  if (this.fechaEstudio && !this.anioEstudio) {
    this.anioEstudio = new Date(this.fechaEstudio).getFullYear();
  }
  next();
});
