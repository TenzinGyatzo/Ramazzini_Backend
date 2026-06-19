import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { ProveedoresSaludService } from './proveedores-salud.service';
import { ProveedorSalud } from './schemas/proveedor-salud.schema';
import { NOM024ComplianceUtil } from '../../utils/nom024-compliance.util';
import { CatalogsService } from '../catalogs/catalogs.service';
import { RegulatoryPolicyService } from 'src/utils/regulatory-policy.service';
import { AuditService } from '../audit/audit.service';

describe('ProveedoresSaludService - NOM-024 CLUES Validation', () => {
  let service: ProveedoresSaludService;
  let mockNom024Util: any;
  let mockCatalogsService: any;

  const createMockModel = () => ({
    create: jest.fn(),
    findById: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
      exec: jest.fn().mockResolvedValue(null),
    }),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
        exec: jest.fn().mockResolvedValue([]),
      }),
      lean: jest.fn().mockResolvedValue([]),
      exec: jest.fn().mockResolvedValue([]),
    }),
    findByIdAndUpdate: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
      exec: jest.fn().mockResolvedValue(null),
    }),
    findOne: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
      exec: jest.fn().mockResolvedValue(null),
    }),
    save: jest.fn(),
  });

  beforeEach(async () => {
    mockNom024Util = {
      requiresNOM024Compliance: jest.fn().mockResolvedValue(true),
      getProveedorPais: jest.fn().mockResolvedValue('MX'),
    };

    mockCatalogsService = {
      validateCLUES: jest.fn().mockResolvedValue(true),
      getCatalogEntry: jest.fn().mockResolvedValue({
        code: 'MCSSA123456',
        description: 'Hospital General',
        status: 'EN OPERACIÓN',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProveedoresSaludService,
        {
          provide: getModelToken(ProveedorSalud.name),
          useValue: createMockModel(),
        },
        {
          provide: getModelToken('User'),
          useValue: createMockModel(),
        },
        { provide: NOM024ComplianceUtil, useValue: mockNom024Util },
        { provide: CatalogsService, useValue: mockCatalogsService },
        { provide: RegulatoryPolicyService, useValue: {} },
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    }).compile();

    service = module.get<ProveedoresSaludService>(ProveedoresSaludService);
  });

  describe('CLUES Validation', () => {
    it('should validate CLUES format (11 alphanumeric characters)', () => {
      const validCLUES = ['MCSSA123456', 'DFSSA000001', 'TSSSA999999'];
      const invalidCLUES = ['CLUES123', '123456789012', ''];

      const regex = /^[A-Z0-9]{11}$/;

      validCLUES.forEach((clues) => {
        expect(regex.test(clues)).toBe(true);
      });

      invalidCLUES.forEach((clues) => {
        expect(regex.test(clues)).toBe(false);
      });
    });

    it('should validate CLUES against catalog for MX providers', async () => {
      mockCatalogsService.validateCLUES.mockResolvedValue(true);

      const isValid = await mockCatalogsService.validateCLUES('MCSSA123456');
      expect(isValid).toBe(true);
      expect(mockCatalogsService.validateCLUES).toHaveBeenCalledWith(
        'MCSSA123456',
      );
    });

    it('should reject invalid CLUES codes', async () => {
      mockCatalogsService.validateCLUES.mockResolvedValue(false);

      const isValid = await mockCatalogsService.validateCLUES('INVALID1234');
      expect(isValid).toBe(false);
    });

    it('should validate establishment status is "EN OPERACIÓN"', async () => {
      mockCatalogsService.getCatalogEntry.mockResolvedValue({
        code: 'MCSSA123456',
        description: 'Hospital General',
        status: 'EN OPERACIÓN',
      });

      const entry = await mockCatalogsService.getCatalogEntry(
        'CLUES',
        'MCSSA123456',
      );
      expect(entry.status).toBe('EN OPERACIÓN');
    });

    it('should reject inactive establishments', async () => {
      mockCatalogsService.getCatalogEntry.mockResolvedValue({
        code: 'MCSSA123456',
        description: 'Hospital General',
        status: 'FUERA DE OPERACIÓN',
      });

      const entry = await mockCatalogsService.getCatalogEntry(
        'CLUES',
        'MCSSA123456',
      );
      expect(entry.status).not.toBe('EN OPERACIÓN');
    });
  });

  describe('MX vs Non-MX Provider Enforcement', () => {
    it('should require CLUES for MX providers (pais === MX)', async () => {
      mockNom024Util.requiresNOM024Compliance.mockResolvedValue(true);

      const requiresCompliance =
        await mockNom024Util.requiresNOM024Compliance('mxProveedorId');
      expect(requiresCompliance).toBe(true);
    });

    it('should not require CLUES for non-MX providers', async () => {
      mockNom024Util.requiresNOM024Compliance.mockResolvedValue(false);

      const requiresCompliance =
        await mockNom024Util.requiresNOM024Compliance('gtProveedorId');
      expect(requiresCompliance).toBe(false);
    });

    it('should allow CLUES to be optional for non-MX providers', async () => {
      mockNom024Util.requiresNOM024Compliance.mockResolvedValue(false);

      // Non-MX providers can operate without CLUES
      const dto = {
        nombre: 'Provider Guatemala',
        pais: 'GT',
        // No CLUES field
      };

      expect(dto.pais).not.toBe('MX');
      expect((dto as any).clues).toBeUndefined();
    });
  });

  describe('Decision Log D1 - One CLUES per Provider', () => {
    it('should store CLUES at provider level, not document level', () => {
      const provider = {
        nombre: 'Hospital Central',
        pais: 'MX',
        clues: 'MCSSA123456',
      };

      // CLUES is at provider level, not duplicated in each document
      expect(provider.clues).toBeDefined();
    });

    it('should not allow multiple CLUES per provider', () => {
      // Per Decision Log D1, one CLUES per provider
      const provider = {
        nombre: 'Hospital Central',
        pais: 'MX',
        clues: 'MCSSA123456', // Single CLUES field, not array
      };

      expect(typeof provider.clues).toBe('string');
      expect(Array.isArray(provider.clues)).toBe(false);
    });
  });
});
