import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Trabajador } from 'src/modules/trabajadores/entities/trabajador.entity';
import { User } from 'src/modules/users/entities/user.entity';

const siNoOpciones = ['No', 'Sí'] as const;

/** Pregunta 3: impacto de las situaciones (trabajo, familia, financiero, legal, peleas, etc.) */
const nivelProblemaSituacionesOpciones = [
  'Ningún problema',
  'Problemas menores',
  'Problemas moderados',
  'Problemas serios',
] as const;

@Schema()
export class TrastornosEstadoAnimo extends Document {
  @Prop({ required: true })
  fechaTrastornosEstadoAnimo: Date;

  /**
   * Pregunta 1: período en que personalidad o comportamiento no fueron los habituales
   * (cada subítem: Sí / No).
   */
  @Prop({ enum: siNoOpciones })
  p1ExaltadoComportamientoNoHabitualOMetidoProblemas?: string;

  @Prop({ enum: siNoOpciones })
  p1IrritableGritosPeleas?: string;

  @Prop({ enum: siNoOpciones })
  p1MasSeguridadQueLoHabitual?: string;

  @Prop({ enum: siNoOpciones })
  p1DormiaMenosSinNecesitarMasSueno?: string;

  @Prop({ enum: siNoOpciones })
  p1HablabaMasOMasRapido?: string;

  @Prop({ enum: siNoOpciones })
  p1PensamientosAgolpados?: string;

  @Prop({ enum: siNoOpciones })
  p1DistraccionDificultadConcentracion?: string;

  @Prop({ enum: siNoOpciones })
  p1MasEnergiaQueLoHabitual?: string;

  @Prop({ enum: siNoOpciones })
  p1MasActivoOMasCosasQueLoHabitual?: string;

  @Prop({ enum: siNoOpciones })
  p1MasSocialExtrovertido?: string;

  @Prop({ enum: siNoOpciones })
  p1MasApetitoSexual?: string;

  @Prop({ enum: siNoOpciones })
  p1CosasExageradasRiesgosas?: string;

  @Prop({ enum: siNoOpciones })
  p1GastoDineroProblemas?: string;

  /** Pregunta 2: si hubo ≥2 “Sí” en la pregunta 1, ¿las situaciones ocurrieron en el mismo período? */
  @Prop({ enum: siNoOpciones })
  p2SituacionesMismoPeriodo?: string;

  /** Pregunta 3: nivel de problema causado por las situaciones */
  @Prop({ enum: nivelProblemaSituacionesOpciones })
  p3NivelProblemaCausado?: string;

  /** Pregunta 4: familiares directos con trastorno maníaco-depresivo o bipolar */
  @Prop({ enum: siNoOpciones })
  p4FamiliarDirectoBipolar?: string;

  /** Pregunta 5: algún profesional médico indicó trastorno maníaco-depresivo o bipolar */
  @Prop({ enum: siNoOpciones })
  p5DiagnosticoProfesionalBipolar?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Trabajador', required: true })
  idTrabajador: Trabajador;

  @Prop({ required: true })
  rutaPDF: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  updatedBy: User;
}

export const TrastornosEstadoAnimoSchema =
  SchemaFactory.createForClass(TrastornosEstadoAnimo).set('timestamps', true);
