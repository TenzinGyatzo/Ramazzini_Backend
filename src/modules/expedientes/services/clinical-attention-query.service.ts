import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { CLINICAL_DOCUMENT_COLLECTION_NAMES } from '../../trabajadores/constants/worker-linked-collections.constant';
import { DocumentoEstado } from '../enums/documento-estado.enum';

const ATTENTION_STATES = [
  DocumentoEstado.FINALIZADO,
  DocumentoEstado.ANULADO,
] as const;

@Injectable()
export class ClinicalAttentionQueryService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async hasFinalizedClinicalDocumentForTrabajador(
    trabajadorId: string | Types.ObjectId | undefined | null,
  ): Promise<boolean> {
    const oid = this.toObjectId(trabajadorId);
    if (!oid) {
      return false;
    }

    return this.existsInAnyClinicalCollection({
      idTrabajador: oid,
      estado: { $in: [...ATTENTION_STATES] },
    });
  }

  async hasFinalizedClinicalDocumentByUser(
    userId: string | Types.ObjectId | undefined | null,
  ): Promise<boolean> {
    const oid = this.toObjectId(userId);
    if (!oid) {
      return false;
    }

    return this.existsInAnyClinicalCollection({
      finalizadoPor: oid,
    });
  }

  async withFirmanteAttentionFlag<T>(
    doc: T | null | undefined,
  ): Promise<(T & { tieneDocumentoClinicoFinalizado: boolean }) | T | null> {
    if (!doc) {
      return (doc ?? null) as T | null;
    }

    const plain = this.toPlainRecord(doc);
    const userId =
      (plain.idUser as { toString?: () => string } | string | undefined)
        ?.toString?.() ?? String(plain.idUser ?? '');

    return {
      ...plain,
      tieneDocumentoClinicoFinalizado:
        await this.hasFinalizedClinicalDocumentByUser(userId),
    } as T & { tieneDocumentoClinicoFinalizado: boolean };
  }

  private toPlainRecord(doc: unknown): Record<string, unknown> {
    if (doc && typeof (doc as { toObject?: () => unknown }).toObject === 'function') {
      return (doc as { toObject: () => Record<string, unknown> }).toObject();
    }
    return { ...(doc as Record<string, unknown>) };
  }

  private toObjectId(
    id: string | Types.ObjectId | undefined | null,
  ): Types.ObjectId | null {
    if (!id) {
      return null;
    }
    const value = String(id);
    if (!Types.ObjectId.isValid(value)) {
      return null;
    }
    return new Types.ObjectId(value);
  }

  private async existsInAnyClinicalCollection(
    filter: Record<string, unknown>,
  ): Promise<boolean> {
    const db = this.connection.db;
    if (!db) {
      return false;
    }

    const hits = await Promise.all(
      CLINICAL_DOCUMENT_COLLECTION_NAMES.map((name) =>
        db.collection(name).findOne(filter, { projection: { _id: 1 } }),
      ),
    );

    return hits.some((hit) => hit != null);
  }
}
