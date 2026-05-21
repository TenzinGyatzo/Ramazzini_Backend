import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Trabajador } from 'src/modules/trabajadores/entities/trabajador.entity';
import { User } from 'src/modules/users/entities/user.entity';
import {
  EstadoSeguimientoProgramadoCardiometabolico,
  ESTADOS_SEGUIMIENTO_PROGRAMADO_CARDIOMETABOLICO,
  MotivoSeguimientoProgramadoCardiometabolico,
  MOTIVOS_SEGUIMIENTO_PROGRAMADO_CARDIOMETABOLICO,
} from '../enums/seguimiento-programado-cardiometabolico.enum';

@Schema()
export class SeguimientoProgramadoCardiometabolico extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Trabajador', required: true })
  idTrabajador: Trabajador;

  @Prop({ required: true })
  fechaProgramada: Date;

  @Prop({
    type: String,
    enum: ESTADOS_SEGUIMIENTO_PROGRAMADO_CARDIOMETABOLICO,
    required: true,
    default: EstadoSeguimientoProgramadoCardiometabolico.PROGRAMADA,
  })
  estado: EstadoSeguimientoProgramadoCardiometabolico;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'EventoSeguimientoCardiometabolico' })
  idEventoClinico?: MongooseSchema.Types.ObjectId;

  @Prop()
  fechaReprogramada?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'SeguimientoProgramadoCardiometabolico' })
  idSeguimientoReprogramado?: MongooseSchema.Types.ObjectId;

  @Prop()
  observaciones?: string;

  @Prop({
    type: String,
    enum: MOTIVOS_SEGUIMIENTO_PROGRAMADO_CARDIOMETABOLICO,
  })
  motivo?: MotivoSeguimientoProgramadoCardiometabolico;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  updatedBy: User;
}

export const SeguimientoProgramadoCardiometabolicoSchema = SchemaFactory.createForClass(
  SeguimientoProgramadoCardiometabolico,
).set('timestamps', true);

SeguimientoProgramadoCardiometabolicoSchema.index({
  idTrabajador: 1,
  fechaProgramada: -1,
});

SeguimientoProgramadoCardiometabolicoSchema.index({
  idTrabajador: 1,
  estado: 1,
  fechaProgramada: -1,
});

SeguimientoProgramadoCardiometabolicoSchema.index({
  estado: 1,
  fechaProgramada: 1,
});
