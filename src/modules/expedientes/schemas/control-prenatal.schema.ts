import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Trabajador } from '../../trabajadores/schemas/trabajador.schema';
import { User } from 'src/modules/users/entities/user.entity';
import { DocumentoEstado } from '../enums/documento-estado.enum';

@Schema()
export class ControlPrenatal extends Document {
  // Referencias
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Trabajador',
    required: true,
  })
  idTrabajador: Trabajador;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  updatedBy: User;

  // Información del embarazo actual
  @Prop({ required: true })
  fechaInicioControlPrenatal: Date;

  @Prop()
  altura: number;

  // Antecedentes gineco-obstétricos
  @Prop()
  menarca: number; // Edad de la primera menstruación

  @Prop()
  ciclos: string; // Características del ciclo menstrual

  @Prop()
  ivsa: number; // Inicio de Vida Sexual Activa (edad)

  @Prop()
  gestas: number; // Número total de embarazos

  @Prop()
  partos: number; // Número de partos vaginales

  @Prop()
  cesareas: number; // Número de cesáreas

  @Prop()
  abortos: number; // Número de abortos

  @Prop()
  fum: Date; // Fecha de Última Menstruación

  @Prop()
  fpp: Date; // Fecha Probable de Parto

  @Prop()
  metodoPlanificacionFamiliar: string; // Método anticonceptivo utilizado

  // Seguimiento mensual del embarazo - Enero
  @Prop()
  eneroFecha: Date;
  @Prop()
  eneroPeso: number;
  @Prop()
  eneroImc: number;
  @Prop()
  eneroTia: string; // Tensión Arterial (ej: "120/80")
  @Prop()
  eneroFcf: number; // Frecuencia Cardíaca Fetal (latidos por minuto)
  @Prop()
  eneroSdg: number; // Semanas de Gestación
  @Prop()
  eneroFondoUterino: number; // Fondo Uterino en centímetros

  // Seguimiento mensual del embarazo - Febrero
  @Prop()
  febreroFecha: Date;
  @Prop()
  febreroPeso: number;
  @Prop()
  febreroImc: number;
  @Prop()
  febreroTia: string;
  @Prop()
  febreroFcf: number;
  @Prop()
  febreroSdg: number;
  @Prop()
  febreroFondoUterino: number;

  // Seguimiento mensual del embarazo - Marzo
  @Prop()
  marzoFecha: Date;
  @Prop()
  marzoPeso: number;
  @Prop()
  marzoImc: number;
  @Prop()
  marzoTia: string;
  @Prop()
  marzoFcf: number;
  @Prop()
  marzoSdg: number;
  @Prop()
  marzoFondoUterino: number;

  // Seguimiento mensual del embarazo - Abril
  @Prop()
  abrilFecha: Date;
  @Prop()
  abrilPeso: number;
  @Prop()
  abrilImc: number;
  @Prop()
  abrilTia: string;
  @Prop()
  abrilFcf: number;
  @Prop()
  abrilSdg: number;
  @Prop()
  abrilFondoUterino: number;

  // Seguimiento mensual del embarazo - Mayo
  @Prop()
  mayoFecha: Date;
  @Prop()
  mayoPeso: number;
  @Prop()
  mayoImc: number;
  @Prop()
  mayoTia: string;
  @Prop()
  mayoFcf: number;
  @Prop()
  mayoSdg: number;
  @Prop()
  mayoFondoUterino: number;

  // Seguimiento mensual del embarazo - Junio
  @Prop()
  junioFecha: Date;
  @Prop()
  junioPeso: number;
  @Prop()
  junioImc: number;
  @Prop()
  junioTia: string;
  @Prop()
  junioFcf: number;
  @Prop()
  junioSdg: number;
  @Prop()
  junioFondoUterino: number;

  // Seguimiento mensual del embarazo - Julio
  @Prop()
  julioFecha: Date;
  @Prop()
  julioPeso: number;
  @Prop()
  julioImc: number;
  @Prop()
  julioTia: string;
  @Prop()
  julioFcf: number;
  @Prop()
  julioSdg: number;
  @Prop()
  julioFondoUterino: number;

  // Seguimiento mensual del embarazo - Agosto
  @Prop()
  agostoFecha: Date;
  @Prop()
  agostoPeso: number;
  @Prop()
  agostoImc: number;
  @Prop()
  agostoTia: string;
  @Prop()
  agostoFcf: number;
  @Prop()
  agostoSdg: number;
  @Prop()
  agostoFondoUterino: number;

  // Seguimiento mensual del embarazo - Septiembre
  @Prop()
  septiembreFecha: Date;
  @Prop()
  septiembrePeso: number;
  @Prop()
  septiembreImc: number;
  @Prop()
  septiembreTia: string;
  @Prop()
  septiembreFcf: number;
  @Prop()
  septiembreSdg: number;
  @Prop()
  septiembreFondoUterino: number;

  // Seguimiento mensual del embarazo - Octubre
  @Prop()
  octubreFecha: Date;
  @Prop()
  octubrePeso: number;
  @Prop()
  octubreImc: number;
  @Prop()
  octubreTia: string;
  @Prop()
  octubreFcf: number;
  @Prop()
  octubreSdg: number;
  @Prop()
  octubreFondoUterino: number;

  // Seguimiento mensual del embarazo - Noviembre
  @Prop()
  noviembreFecha: Date;
  @Prop()
  noviembrePeso: number;
  @Prop()
  noviembreImc: number;
  @Prop()
  noviembreTia: string;
  @Prop()
  noviembreFcf: number;
  @Prop()
  noviembreSdg: number;
  @Prop()
  noviembreFondoUterino: number;

  // Seguimiento mensual del embarazo - Diciembre
  @Prop()
  diciembreFecha: Date;
  @Prop()
  diciembrePeso: number;
  @Prop()
  diciembreImc: number;
  @Prop()
  diciembreTia: string;
  @Prop()
  diciembreFcf: number;
  @Prop()
  diciembreSdg: number;
  @Prop()
  diciembreFondoUterino: number;

  // Observaciones por métrica (evolución a lo largo del tiempo)
  @Prop()
  observacionesPeso: string; // Observaciones sobre la evolución del peso

  @Prop()
  observacionesImc: string; // Observaciones sobre la evolución del IMC

  @Prop()
  observacionesTia: string; // Observaciones sobre la evolución de la tensión arterial

  @Prop()
  observacionesFcf: string; // Observaciones sobre la evolución de la frecuencia cardíaca fetal

  @Prop()
  observacionesSdg: string; // Observaciones sobre la evolución de las semanas de gestación

  @Prop()
  observacionesFondoUterino: string; // Observaciones sobre la evolución del fondo uterino

  // Archivos
  @Prop()
  rutaPDF: string;

  // Timestamps
  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;

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

export const ControlPrenatalSchema = SchemaFactory.createForClass(
  ControlPrenatal,
).set('timestamps', true);

// Crear índices para mejorar el rendimiento de las consultas
ControlPrenatalSchema.index({
  idTrabajador: 1,
  fechaInicioControlPreNatal: -1,
});
