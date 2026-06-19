import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ConsentimientoDiarioController } from './consentimiento-diario.controller';
import { ConsentimientoDiarioService } from './consentimiento-diario.service';
import { ConsentMethod } from './dto/create-consentimiento-diario.dto';

describe('ConsentimientoDiarioController', () => {
  let controller: ConsentimientoDiarioController;
  let service: {
    getStatus: jest.Mock;
    create: jest.Mock;
  };

  const userId = new Types.ObjectId().toString();
  const trabajadorId = new Types.ObjectId().toString();
  const mockReq = { userId } as Parameters<
    ConsentimientoDiarioController['getStatus']
  >[2];

  beforeEach(async () => {
    service = {
      getStatus: jest.fn().mockResolvedValue({
        hasConsent: false,
        dateKey: '2026-06-19',
      }),
      create: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId().toString(),
        proveedorSaludId: new Types.ObjectId().toString(),
        trabajadorId,
        dateKey: '2026-06-19',
        acceptedAt: new Date(),
        acceptedByUserId: userId,
        consentMethod: ConsentMethod.VERBAL,
        consentTextVersion: 'v1',
        createdAt: new Date(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConsentimientoDiarioController],
      providers: [
        { provide: ConsentimientoDiarioService, useValue: service },
      ],
    }).compile();

    controller = module.get<ConsentimientoDiarioController>(
      ConsentimientoDiarioController,
    );
  });

  it('getStatus usa req.userId asignado por JwtAuthGuard (cookie HttpOnly)', async () => {
    const result = await controller.getStatus(trabajadorId, undefined, mockReq);

    expect(result).toEqual({
      hasConsent: false,
      dateKey: '2026-06-19',
    });
    expect(service.getStatus).toHaveBeenCalledWith(
      trabajadorId,
      userId,
      undefined,
    );
  });

  it('create usa req.userId asignado por JwtAuthGuard (cookie HttpOnly)', async () => {
    const createDto = {
      trabajadorId,
      consentMethod: ConsentMethod.VERBAL,
      dateKey: '2026-06-19',
    };

    const result = await controller.create(createDto, mockReq);

    expect(result.acceptedByUserId).toBe(userId);
    expect(service.create).toHaveBeenCalledWith(createDto, userId);
  });

  it('getStatus rechaza trabajadorId inválido', async () => {
    await expect(
      controller.getStatus('invalid-id', undefined, mockReq),
    ).rejects.toThrow(BadRequestException);
    expect(service.getStatus).not.toHaveBeenCalled();
  });
});
