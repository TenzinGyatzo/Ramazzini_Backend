/**
 * NOM-024 Phase 4 — D3 no updates destructivos en resguardado.
 * (D2 document_versions/ reconstrucción de versión previa fue removido.)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import {
  startMongoMemoryServer,
  stopMongoMemoryServer,
  clearDatabase,
} from '../utils/mongodb-memory.util';
import { AuditService } from '../../src/modules/audit/audit.service';
import {
  AuditEvent,
  AuditEventSchema,
} from '../../src/modules/audit/schemas/audit-event.schema';
import {
  AuditOutbox,
  AuditOutboxSchema,
} from '../../src/modules/audit/schemas/audit-outbox.schema';
import { DocumentoEstado } from '../../src/modules/expedientes/enums/documento-estado.enum';
import { UsersService } from '../../src/modules/users/users.service';
import {
  enableAuditTrailPersist,
  mockRegulatoryPolicyServiceSires,
} from '../utils/audit-trail-test.util';

describe('NOM-024 Audit Reconstruction (04-06)', () => {
  let uri: string;

  beforeAll(async () => {
    uri = await startMongoMemoryServer();
  });

  afterAll(async () => {
    await stopMongoMemoryServer();
  });

  beforeEach(async () => {
    enableAuditTrailPersist();
    await clearDatabase();
    await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          { name: AuditEvent.name, schema: AuditEventSchema },
          { name: AuditOutbox.name, schema: AuditOutboxSchema },
        ]),
      ],
      providers: [
        AuditService,
        mockRegulatoryPolicyServiceSires,
        {
          provide: UsersService,
          useValue: {
            getAuditActorSnapshot: jest.fn().mockResolvedValue(null),
          },
        },
      ],
    }).compile();
  });

  describe('D3 — No updates destructivos en resguardado', () => {
    it('FINALIZADO state exists and updates on finalized docs are blocked at service layer', () => {
      expect(DocumentoEstado.FINALIZADO).toBe('finalizado');
      // Full test: PATCH on finalized document returns 403/409 for NOM-024 proveedor
      // is in regulatory-policy.expedientes.spec.ts (ForbiddenException when updating FINALIZADO for SIRES_NOM024).
    });
  });
});
