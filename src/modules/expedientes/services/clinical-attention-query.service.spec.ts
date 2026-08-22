import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ClinicalAttentionQueryService } from './clinical-attention-query.service';
import { CLINICAL_DOCUMENT_COLLECTION_NAMES } from '../../trabajadores/constants/worker-linked-collections.constant';
import { DocumentoEstado } from '../enums/documento-estado.enum';

describe('ClinicalAttentionQueryService', () => {
  let service: ClinicalAttentionQueryService;
  let findOne: jest.Mock;
  let collection: jest.Mock;

  const trabajadorId = '507f1f77bcf86cd799439011';
  const userId = '507f1f77bcf86cd799439022';

  beforeEach(async () => {
    findOne = jest.fn().mockResolvedValue(null);
    collection = jest.fn(() => ({ findOne }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicalAttentionQueryService,
        {
          provide: getConnectionToken(),
          useValue: { db: { collection } },
        },
      ],
    }).compile();

    service = module.get(ClinicalAttentionQueryService);
  });

  it('returns false for invalid ids', async () => {
    expect(
      await service.hasFinalizedClinicalDocumentForTrabajador('no-id'),
    ).toBe(false);
    expect(await service.hasFinalizedClinicalDocumentByUser('')).toBe(false);
    expect(collection).not.toHaveBeenCalled();
  });

  it('returns false when only drafts exist', async () => {
    const result =
      await service.hasFinalizedClinicalDocumentForTrabajador(trabajadorId);
    expect(result).toBe(false);
    expect(collection).toHaveBeenCalledTimes(
      CLINICAL_DOCUMENT_COLLECTION_NAMES.length,
    );
    expect(findOne).toHaveBeenCalledWith(
      {
        idTrabajador: new Types.ObjectId(trabajadorId),
        estado: {
          $in: [DocumentoEstado.FINALIZADO, DocumentoEstado.ANULADO],
        },
      },
      { projection: { _id: 1 } },
    );
  });

  it('returns true when a finalized document exists for the worker', async () => {
    findOne.mockResolvedValueOnce({ _id: 'doc-1' });
    const result =
      await service.hasFinalizedClinicalDocumentForTrabajador(trabajadorId);
    expect(result).toBe(true);
  });

  it('returns true when the user has finalized a document', async () => {
    findOne.mockResolvedValueOnce({ _id: 'doc-1' });
    const result = await service.hasFinalizedClinicalDocumentByUser(userId);
    expect(result).toBe(true);
    expect(findOne).toHaveBeenCalledWith(
      { finalizadoPor: new Types.ObjectId(userId) },
      { projection: { _id: 1 } },
    );
  });

  it('attaches tieneDocumentoClinicoFinalizado on firmante records', async () => {
    findOne.mockResolvedValueOnce({ _id: 'doc-1' });
    const result = await service.withFirmanteAttentionFlag({
      _id: 'firmante-1',
      idUser: userId,
      nombre: 'JUAN',
    });
    expect(result).toEqual(
      expect.objectContaining({
        _id: 'firmante-1',
        tieneDocumentoClinicoFinalizado: true,
      }),
    );
  });
});
