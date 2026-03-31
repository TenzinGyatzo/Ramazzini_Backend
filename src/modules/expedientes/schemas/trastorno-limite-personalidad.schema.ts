import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Trabajador } from 'src/modules/trabajadores/entities/trabajador.entity';
import { User } from 'src/modules/users/entities/user.entity';

const siNoOpciones = ['No', 'Sí'] as const;

@Schema()
export class TrastornoLimitePersonalidad extends Document {
  @Prop({ required: true })
  fechaTrastornoLimitePersonalidad: Date;

  /** Relaciones cercanas: muchas discusiones o rupturas repetidas */
  @Prop({ enum: siNoOpciones })
  relacionesCercanasDiscusionesRupturas?: string;

  /** Autolesión deliberada o intento de suicidio */
  @Prop({ enum: siNoOpciones })
  autolesionIntentoSuicidio?: string;

  /** Al menos otros dos problemas de impulsividad */
  @Prop({ enum: siNoOpciones })
  impulsividadOtrosDosProblemas?: string;

  /** Extremadamente de mal humor */
  @Prop({ enum: siNoOpciones })
  extremadamenteMalHumor?: string;

  /** Muy enojado la mayor parte del tiempo; actúa enojado o sarcástico con frecuencia */
  @Prop({ enum: siNoOpciones })
  enojadoFrecuenteActuaEnojadoSarcastico?: string;

  /** Desconfianza frecuente de otras personas */
  @Prop({ enum: siNoOpciones })
  desconfianzaOtrasPersonas?: string;

  /** Irrealidad propia o del entorno */
  @Prop({ enum: siNoOpciones })
  sensacionIrrealidadEntornoIrreal?: string;

  /** Vacío de manera crónica */
  @Prop({ enum: siNoOpciones })
  vacioCronico?: string;

  /** No sabe quién es o carece de identidad */
  @Prop({ enum: siNoOpciones })
  faltaIdentidadQuienEs?: string;

  /** Esfuerzos desesperados por evitar abandono */
  @Prop({ enum: siNoOpciones })
  esfuerzosEvitarAbandono?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Trabajador', required: true })
  idTrabajador: Trabajador;

  @Prop({ required: true })
  rutaPDF: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  updatedBy: User;
}

export const TrastornoLimitePersonalidadSchema =
  SchemaFactory.createForClass(TrastornoLimitePersonalidad).set('timestamps', true);
