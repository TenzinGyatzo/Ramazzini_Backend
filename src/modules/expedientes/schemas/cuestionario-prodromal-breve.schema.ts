import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Trabajador } from 'src/modules/trabajadores/entities/trabajador.entity';
import { User } from 'src/modules/users/entities/user.entity';

const siNoOpciones = ['No', 'Sí'] as const;

/**
 * Si contestó Sí: grado de acuerdo con «Cuando esto sucede, me siento asustado, preocupado o me causa problemas».
 */
const gradoAcuerdoStatementSiOpciones = [
  'Totalmente en desacuerdo',
  'En desacuerdo',
  'Neutral',
  'De acuerdo',
  'Totalmente de acuerdo',
] as const;

@Schema()
export class CuestionarioProdromalBreve extends Document {
  @Prop({ required: true })
  fechaCuestionarioProdromalBreve: Date;

  /** Preguntas 1–21: respuesta principal (Sí / No). */
  @Prop({ enum: siNoOpciones })
  p1?: string;

  @Prop({ enum: gradoAcuerdoStatementSiOpciones })
  p1GradoAcuerdoStatement?: string;

  @Prop({ enum: siNoOpciones })
  p2?: string;

  @Prop({ enum: gradoAcuerdoStatementSiOpciones })
  p2GradoAcuerdoStatement?: string;

  @Prop({ enum: siNoOpciones })
  p3?: string;

  @Prop({ enum: gradoAcuerdoStatementSiOpciones })
  p3GradoAcuerdoStatement?: string;

  @Prop({ enum: siNoOpciones })
  p4?: string;

  @Prop({ enum: gradoAcuerdoStatementSiOpciones })
  p4GradoAcuerdoStatement?: string;

  @Prop({ enum: siNoOpciones })
  p5?: string;

  @Prop({ enum: gradoAcuerdoStatementSiOpciones })
  p5GradoAcuerdoStatement?: string;

  @Prop({ enum: siNoOpciones })
  p6?: string;

  @Prop({ enum: gradoAcuerdoStatementSiOpciones })
  p6GradoAcuerdoStatement?: string;

  @Prop({ enum: siNoOpciones })
  p7?: string;

  @Prop({ enum: gradoAcuerdoStatementSiOpciones })
  p7GradoAcuerdoStatement?: string;

  @Prop({ enum: siNoOpciones })
  p8?: string;

  @Prop({ enum: gradoAcuerdoStatementSiOpciones })
  p8GradoAcuerdoStatement?: string;

  @Prop({ enum: siNoOpciones })
  p9?: string;

  @Prop({ enum: gradoAcuerdoStatementSiOpciones })
  p9GradoAcuerdoStatement?: string;

  @Prop({ enum: siNoOpciones })
  p10?: string;

  @Prop({ enum: gradoAcuerdoStatementSiOpciones })
  p10GradoAcuerdoStatement?: string;

  @Prop({ enum: siNoOpciones })
  p11?: string;

  @Prop({ enum: gradoAcuerdoStatementSiOpciones })
  p11GradoAcuerdoStatement?: string;

  @Prop({ enum: siNoOpciones })
  p12?: string;

  @Prop({ enum: gradoAcuerdoStatementSiOpciones })
  p12GradoAcuerdoStatement?: string;

  @Prop({ enum: siNoOpciones })
  p13?: string;

  @Prop({ enum: gradoAcuerdoStatementSiOpciones })
  p13GradoAcuerdoStatement?: string;

  @Prop({ enum: siNoOpciones })
  p14?: string;

  @Prop({ enum: gradoAcuerdoStatementSiOpciones })
  p14GradoAcuerdoStatement?: string;

  @Prop({ enum: siNoOpciones })
  p15?: string;

  @Prop({ enum: gradoAcuerdoStatementSiOpciones })
  p15GradoAcuerdoStatement?: string;

  @Prop({ enum: siNoOpciones })
  p16?: string;

  @Prop({ enum: gradoAcuerdoStatementSiOpciones })
  p16GradoAcuerdoStatement?: string;

  @Prop({ enum: siNoOpciones })
  p17?: string;

  @Prop({ enum: gradoAcuerdoStatementSiOpciones })
  p17GradoAcuerdoStatement?: string;

  @Prop({ enum: siNoOpciones })
  p18?: string;

  @Prop({ enum: gradoAcuerdoStatementSiOpciones })
  p18GradoAcuerdoStatement?: string;

  @Prop({ enum: siNoOpciones })
  p19?: string;

  @Prop({ enum: gradoAcuerdoStatementSiOpciones })
  p19GradoAcuerdoStatement?: string;

  @Prop({ enum: siNoOpciones })
  p20?: string;

  @Prop({ enum: gradoAcuerdoStatementSiOpciones })
  p20GradoAcuerdoStatement?: string;

  @Prop({ enum: siNoOpciones })
  p21?: string;

  @Prop({ enum: gradoAcuerdoStatementSiOpciones })
  p21GradoAcuerdoStatement?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Trabajador', required: true })
  idTrabajador: Trabajador;

  @Prop({ required: true })
  rutaPDF: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  updatedBy: User;
}

export const CuestionarioProdromalBreveSchema =
  SchemaFactory.createForClass(CuestionarioProdromalBreve).set('timestamps', true);
