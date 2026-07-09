import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express';
import { CatalogsImportReferenceController } from './catalogs-import-reference.controller';
import { CatalogsService } from './catalogs.service';
import { UsersService } from '../users/users.service';
import { RegulatoryPolicyService } from '../../utils/regulatory-policy.service';
import { CatalogType } from './interfaces/catalog-entry.interface';

jest.mock('../../utils/auth-helpers', () => ({
  getUserIdFromRequest: jest.fn(() => 'user-1'),
}));

describe('CatalogsImportReferenceController', () => {
  let controller: CatalogsImportReferenceController;
  let catalogsService: jest.Mocked<CatalogsService>;
  let usersService: jest.Mocked<UsersService>;
  let regulatoryPolicyService: jest.Mocked<RegulatoryPolicyService>;

  const siresPolicy = {
    regime: 'SIRES_NOM024' as const,
    features: {} as any,
    validation: {} as any,
  };

  const sinRegimenPolicy = {
    regime: 'SIN_REGIMEN' as const,
    features: {} as any,
    validation: {} as any,
  };

  beforeEach(async () => {
    catalogsService = {
      buildImportReferencePaisesCsv: jest
        .fn()
        .mockReturnValue(Buffer.from('CATALOG_KEY,descripcion\n142,México\n')),
      buildImportReferenceEntidadesCsv: jest
        .fn()
        .mockReturnValue(Buffer.from('codigo,descripcion\n09,Ciudad de México\n')),
      buildImportReferenceMunicipiosCsv: jest
        .fn()
        .mockReturnValue(
          Buffer.from('entidadCode,municipioCode,descripcion\n09,015,Cuauhtémoc\n'),
        ),
      buildImportReferenceLocalidadesCsv: jest
        .fn()
        .mockReturnValue(
          Buffer.from(
            'entidadCode,municipioCode,localidadCode,descripcion\n09,015,0001,Centro\n',
          ),
        ),
    } as any;

    usersService = {
      findById: jest.fn().mockResolvedValue({
        idProveedorSalud: '507f1f77bcf86cd799439055',
      }),
    } as any;

    regulatoryPolicyService = {
      getRegulatoryPolicy: jest.fn().mockResolvedValue(siresPolicy),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogsImportReferenceController],
      providers: [
        { provide: CatalogsService, useValue: catalogsService },
        { provide: UsersService, useValue: usersService },
        { provide: RegulatoryPolicyService, useValue: regulatoryPolicyService },
      ],
    }).compile();

    controller = module.get(CatalogsImportReferenceController);
  });

  const mockRes = () => {
    const res: Partial<Response> = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    return res as Response;
  };

  it('exporta paises CSV para proveedor SIRES', async () => {
    const res = mockRes();
    await controller.exportImportReference(
      {} as any,
      'paises',
      undefined,
      undefined,
      res,
    );

    expect(catalogsService.buildImportReferencePaisesCsv).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/csv; charset=utf-8',
    );
    expect(res.send).toHaveBeenCalled();
  });

  it('rechaza localidades sin entidadCode y municipioCode', async () => {
    await expect(
      controller.exportImportReference({} as any, 'localidades', undefined, undefined, mockRes()),
    ).rejects.toThrow(BadRequestException);
  });

  it('exporta localidades filtradas con parámetros', async () => {
    const res = mockRes();
    await controller.exportImportReference(
      {} as any,
      'localidades',
      '09',
      '015',
      res,
    );

    expect(catalogsService.buildImportReferenceLocalidadesCsv).toHaveBeenCalledWith(
      '09',
      '015',
    );
    expect(res.send).toHaveBeenCalled();
  });

  it('rechaza proveedor SIN_REGIMEN', async () => {
    regulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(
      sinRegimenPolicy as any,
    );

    await expect(
      controller.exportImportReference({} as any, 'paises', undefined, undefined, mockRes()),
    ).rejects.toThrow(ForbiddenException);
  });
});

describe('CatalogsService - import reference CSV', () => {
  let service: CatalogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CatalogsService],
    }).compile();
    service = module.get(CatalogsService);
  });

  it('genera CSV de países con encabezados esperados', () => {
    service.injectMockCatalog(CatalogType.PAIS, [
      { code: '142', description: 'México' },
      { code: '248', description: 'NO ESPECIFICADO' },
    ]);

    const csv = service.buildImportReferencePaisesCsv().toString('utf-8');
    expect(csv).toContain('CATALOG_KEY,descripcion');
    expect(csv).toContain('142,México');
  });

  it('genera CSV de entidades desde caché INEGI', () => {
    service.injectMockCatalog(CatalogType.ENTIDADES_FEDERATIVAS, [
      { code: '09', description: 'Ciudad de México' },
    ]);
    (service as any).estadoCache.set('09', {
      code: '09',
      description: 'Ciudad de México',
    });

    const csv = service.buildImportReferenceEntidadesCsv().toString('utf-8');
    expect(csv).toContain('codigo,descripcion');
    expect(csv).toContain('09,Ciudad de México');
  });
});
