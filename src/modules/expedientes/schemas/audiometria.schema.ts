import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Trabajador } from 'src/modules/trabajadores/entities/trabajador.entity';
import { User } from 'src/modules/users/entities/user.entity';

const metodoAudiometriaOpciones = ["AMA", "LFT"];

@Schema()
export class Audiometria extends Document {
    @Prop({ required: true })
    fechaAudiometria: Date;

    @Prop({ enum: metodoAudiometriaOpciones })
    metodoAudiometria: string;

    @Prop()
    oidoDerecho125?: number;
  
    @Prop()
    oidoDerecho250?: number;

    @Prop()
    oidoDerecho500?: number;
  
    @Prop()
    oidoDerecho1000?: number;

    @Prop()
    oidoDerecho2000?: number;
  
    @Prop()
    oidoDerecho3000?: number;

    @Prop()
    oidoDerecho4000?: number;
  
    @Prop()
    oidoDerecho6000?: number;

    @Prop()
    oidoDerecho8000?: number;

    @Prop()
    porcentajePerdidaOD?: number;

    // Campos específicos para AMA
    @Prop()
    perdidaAuditivaBilateralAMA?: number;

    @Prop()
    perdidaMonauralOD_AMA?: number;

    @Prop()
    perdidaMonauralOI_AMA?: number;

    @Prop()
    oidoIzquierdo125?: number;
  
    @Prop()
    oidoIzquierdo250?: number;

    @Prop()
    oidoIzquierdo500?: number;
  
    @Prop()
    oidoIzquierdo1000?: number;

    @Prop()
    oidoIzquierdo2000?: number;
  
    @Prop()
    oidoIzquierdo3000?: number;

    @Prop()
    oidoIzquierdo4000?: number;
  
    @Prop()
    oidoIzquierdo6000?: number;

    @Prop()
    oidoIzquierdo8000?: number;

    @Prop()
    porcentajePerdidaOI?: number;

    @Prop()
    hipoacusiaBilateralCombinada?: number;
  
    @Prop()
    observacionesAudiometria?: string;

    @Prop()
    interpretacionAudiometrica?: string;

    @Prop()
    diagnosticoAudiometria?: string;

    @Prop({ type: [String]})
    recomendacionesAudiometria?: string[];

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Trabajador', required: true })
    idTrabajador: Trabajador;

    @Prop({ required: true })
    rutaPDF: string;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    createdBy: User;
  
    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
    updatedBy: User;
}

export const AudiometriaSchema = SchemaFactory.createForClass(Audiometria).set('timestamps', true);
AudiometriaSchema.index({ idTrabajador: 1, fechaAudiometria: -1 });