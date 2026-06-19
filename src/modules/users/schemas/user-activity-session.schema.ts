import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type UserActivitySessionDocument = UserActivitySession & Document;

@Schema({ collection: 'useractivitysessions', timestamps: true })
export class UserActivitySession {
  @Prop({ required: true, unique: true, index: true })
  sid: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: string;

  @Prop({ required: true })
  lastActivityAt: Date;
}

export const UserActivitySessionSchema =
  SchemaFactory.createForClass(UserActivitySession);

UserActivitySessionSchema.index(
  { lastActivityAt: 1 },
  { expireAfterSeconds: 12 * 60 * 60 },
);
