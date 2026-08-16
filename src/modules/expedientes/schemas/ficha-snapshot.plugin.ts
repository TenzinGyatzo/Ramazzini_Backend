import { Schema } from 'mongoose';
import { FichaSnapshotSchema } from './ficha-snapshot.schema';

export function fichaSnapshotPlugin(schema: Schema): void {
  schema.add({
    fichaSnapshot: { type: FichaSnapshotSchema, required: false },
  });
}
