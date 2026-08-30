import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as fs from 'fs/promises';
import * as os from 'os';
import path from 'path';

jest.mock('fs/promises', () => {
  const actual = jest.requireActual('fs/promises');
  return {
    ...actual,
    writeFile: jest.fn(actual.writeFile),
  };
});
import { convertirFechaISOaDDMMYYYY } from '../../utils/dates';
import { ClinicalFilesService } from '../files/clinical-files.service';
import { ExpedientesController } from './expedientes.controller';
import { ExpedientesService } from './expedientes.service';
import { CreateDocumentoExternoDto } from './dto/create-documento-externo.dto';
import {
  buildClinicalDirectoryPath,
  buildExternalDocumentFilename,
} from './utils/clinical-directory-path';

const ACTOR_ID = '60d9f70fc39b3c1b8f0d6c0b';
const URL_ID = '507f1f77bcf86cd799439011';
const CANONICAL_ID = '507f1f77bcf86cd799439014';
const OTHER_ID = '507f191e810c19729de860ea';
const FECHA_ISO = '2024-10-25T07:00:00.000Z';

const EMPRESA = 'ACEROS DE GUATEMALA';
const CENTRO = 'MEGA PRODUCTO / NUEVOS INGRESOS';
const TRABAJADOR_NOMBRE = 'JAIME EMANUEL';

function makeFile(
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File {
  const buffer = overrides.buffer ?? Buffer.from('%PDF-1.4 fixture');
  return {
    fieldname: 'file',
    originalname: 'lab.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    buffer,
    size: buffer.length,
    destination: '',
    filename: '',
    path: '',
    stream: undefined as any,
    ...overrides,
  };
}

function makeDto(overrides: Record<string, unknown> = {}) {
  return {
    nombreDocumento: 'Prueba de laboratorio',
    fechaDocumento: FECHA_ISO,
    extension: '.pdf',
    idTrabajador: URL_ID,
    rutaDocumento: '../../../etc/passwd',
    createdBy: '60d9f70fc39b3c1b8f0d6c0b',
    updatedBy: '60d9f70fc39b3c1b8f0d6c0c',
    ...overrides,
  };
}

/** Réplica de la rama de removeDocument para documentoExterno (no se modifica en IMP-009). */
function reconstructDeletePath(document: {
  rutaDocumento: string;
  nombreDocumento: string;
  fechaDocumento: string;
  extension: string;
}): string {
  let fullPath = document.rutaDocumento;
  if (
    !fullPath.includes('.pdf') &&
    !fullPath.includes('.png') &&
    !fullPath.includes('.jpg') &&
    !fullPath.includes('.jpeg')
  ) {
    const fecha = convertirFechaISOaDDMMYYYY(document.fechaDocumento).replace(
      /\//g,
      '-',
    );
    const fileName = `${document.nombreDocumento} ${fecha}${document.extension}`;
    fullPath = path.join(document.rutaDocumento, fileName);
  }
  return fullPath;
}

function leanFind(value: unknown) {
  return { lean: jest.fn().mockResolvedValue(value) };
}

function createUploadHarness(options?: {
  canonicalId?: string;
  saveImpl?: () => Promise<any>;
  updatedAtImpl?: () => Promise<any>;
  empresaNombre?: string;
  centroNombre?: string;
  trabajadorNombre?: string;
  missingChain?: 'trabajador' | 'centro' | 'empresa';
}) {
  const saved: any[] = [];
  const canonicalId = options?.canonicalId ?? CANONICAL_ID;

  const trabajador = {
    _id: canonicalId,
    nombre: options?.trabajadorNombre ?? TRABAJADOR_NOMBRE,
    idCentroTrabajo: 'c1',
    fechaNacimiento: new Date('1990-01-01'),
  };
  const centro = {
    _id: 'c1',
    nombreCentro: options?.centroNombre ?? CENTRO,
    idEmpresa: 'e1',
  };
  const empresa = {
    _id: 'e1',
    nombreComercial: options?.empresaNombre ?? EMPRESA,
    idProveedorSalud: 'p1',
  };

  function MockDocumentoExterno(this: any, dto: any) {
    Object.assign(this, dto);
    this.save =
      options?.saveImpl != null
        ? jest.fn().mockImplementation(options.saveImpl)
        : jest.fn().mockImplementation(async () => {
            const rec = { ...dto, _id: `mongo-${saved.length + 1}` };
            saved.push(rec);
            return rec;
          });
  }

  const service = Object.create(
    ExpedientesService.prototype,
  ) as ExpedientesService;

  (service as any).models = { documentoExterno: MockDocumentoExterno };
  (service as any).workerFusionService = {
    getCanonicalTrabajadorId: jest.fn().mockResolvedValue(canonicalId),
  };
  (service as any).organizationalAccessService = {
    assertUserCanAccessTrabajadorId: jest.fn().mockResolvedValue(undefined),
  };
  (service as any).trabajadorModel = {
    findById: jest.fn().mockImplementation((id: string) => {
      if (options?.missingChain === 'trabajador') {
        return leanFind(null);
      }
      return leanFind(
        String(id) === String(canonicalId) ? trabajador : null,
      );
    }),
    findByIdAndUpdate:
      options?.updatedAtImpl != null
        ? jest.fn().mockImplementation(options.updatedAtImpl)
        : jest.fn().mockResolvedValue({}),
  };
  (service as any).centroTrabajoModel = {
    findById: jest.fn().mockImplementation(() => {
      if (options?.missingChain === 'centro') {
        return leanFind(null);
      }
      return leanFind(centro);
    }),
  };
  (service as any).empresaModel = {
    findById: jest.fn().mockImplementation(() => {
      if (options?.missingChain === 'empresa') {
        return leanFind(null);
      }
      return leanFind(empresa);
    }),
  };
  (service as any).regulatoryPolicyService = {
    getRegulatoryPolicy: jest
      .fn()
      .mockResolvedValue({ regime: 'SIN_REGIMEN' }),
  };

  return { service, saved, canonicalId };
}

describe('IMP-009 upload de documento externo', () => {
  let tmpRoot: string;
  const previousEnv = process.env.EXPEDIENTES_DIR;

  beforeEach(async () => {
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'imp009-'));
    process.env.EXPEDIENTES_DIR = tmpRoot;
  });

  afterEach(async () => {
    if (previousEnv === undefined) {
      delete process.env.EXPEDIENTES_DIR;
    } else {
      process.env.EXPEDIENTES_DIR = previousEnv;
    }
    await fs.rm(tmpRoot, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  function expectedRelative(trabajadorId = CANONICAL_ID) {
    return buildClinicalDirectoryPath(
      EMPRESA,
      CENTRO,
      TRABAJADOR_NOMBRE,
      trabajadorId,
    );
  }

  describe('seguridad: el body no determina el destino', () => {
    it.each([
      '../../../etc',
      '..\\..\\windows',
      '/etc/passwd',
      'C:\\Windows\\System32',
      `expedientes-medicos/Otra/Centro/Ajeno_${OTHER_ID}`,
    ])('ignora rutaDocumento=%s y escribe en la ruta canónica', async (malicious) => {
      const { service, saved } = createUploadHarness();
      const dto = makeDto({ rutaDocumento: malicious });
      const file = makeFile();

      const result = await service.uploadDocument(dto, file, URL_ID, ACTOR_ID);
      const relative = expectedRelative();
      const filename = buildExternalDocumentFilename(
        dto.nombreDocumento,
        dto.fechaDocumento,
        file.originalname,
      );
      const absolute = path.resolve(tmpRoot, relative, filename);

      expect(result.rutaDocumento).toBe(relative);
      expect(saved).toHaveLength(1);
      expect(saved[0].rutaDocumento).toBe(relative);
      expect(saved[0].idTrabajador).toBe(CANONICAL_ID);
      await expect(fs.readFile(absolute)).resolves.toEqual(file.buffer);

      const outside = path.resolve(tmpRoot, '..');
      const entries = await fs.readdir(outside);
      expect(entries).not.toContain('passwd');
      expect(absolute.startsWith(path.resolve(tmpRoot) + path.sep)).toBe(true);
    });
  });

  describe('identidad y canónico', () => {
    it('persiste id y carpeta del trabajador canónico (fusión)', async () => {
      const { service, saved } = createUploadHarness({
        canonicalId: CANONICAL_ID,
      });
      const result = await service.uploadDocument(
        makeDto({ idTrabajador: URL_ID }),
        makeFile(),
        URL_ID,
        ACTOR_ID,
      );

      expect(result.idTrabajador).toBe(CANONICAL_ID);
      expect(result.rutaDocumento).toBe(expectedRelative(CANONICAL_ID));
      expect(saved[0].idTrabajador).toBe(CANONICAL_ID);
      expect(result.rutaDocumento).toContain(`_${CANONICAL_ID}`);
      expect(result.rutaDocumento).not.toContain(`_${URL_ID}`);
    });

    it('cadena incompleta no escribe ni persiste', async () => {
      const { service, saved } = createUploadHarness({
        missingChain: 'empresa',
      });
      await expect(
        service.uploadDocument(makeDto(), makeFile(), URL_ID, ACTOR_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(saved).toHaveLength(0);
      const leftover = await fs.readdir(tmpRoot);
      expect(leftover).toHaveLength(0);
    });
  });

  describe('colisión wx', () => {
    it('segunda subida al mismo destino → 409, bytes y Mongo originales intactos', async () => {
      const first = createUploadHarness();
      const file = makeFile({ buffer: Buffer.from('ORIGINAL-BYTES') });
      await first.service.uploadDocument(makeDto(), file, URL_ID, ACTOR_ID);

      const relative = expectedRelative();
      const filename = buildExternalDocumentFilename(
        'Prueba de laboratorio',
        FECHA_ISO,
        'lab.pdf',
      );
      const absolute = path.resolve(tmpRoot, relative, filename);
      const before = await fs.readFile(absolute);

      const second = createUploadHarness();
      await expect(
        second.service.uploadDocument(
          makeDto(),
          makeFile({ buffer: Buffer.from('OVERWRITE-ATTEMPT') }),
          URL_ID,
          ACTOR_ID,
        ),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(await fs.readFile(absolute)).toEqual(before);
      expect(await fs.readFile(absolute)).toEqual(Buffer.from('ORIGINAL-BYTES'));
      expect(first.saved).toHaveLength(1);
      expect(second.saved).toHaveLength(0);
    });
  });

  describe('funcional', () => {
    it.each([
      ['lab.pdf', '.pdf', Buffer.from('%PDF')],
      ['foto.jpg', '.jpg', Buffer.from('jpg')],
      ['foto.jpeg', '.jpeg', Buffer.from('jpeg')],
      ['imagen.png', '.png', Buffer.from('png')],
    ])('acepta %s', async (originalname, extension, buffer) => {
      const { service, saved } = createUploadHarness();
      const result = await service.uploadDocument(
        makeDto({ extension }),
        makeFile({ originalname, buffer }),
        URL_ID,
        ACTOR_ID,
      );
      expect(result.rutaDocumento).toBe(expectedRelative());
      expect(saved).toHaveLength(1);
      const filename = buildExternalDocumentFilename(
        'Prueba de laboratorio',
        FECHA_ISO,
        originalname,
      );
      const absolute = path.resolve(tmpRoot, expectedRelative(), filename);
      await expect(fs.readFile(absolute)).resolves.toEqual(buffer);
    });

    it('sanitiza / en empresa/centro y conserva acentos', async () => {
      const { service } = createUploadHarness({
        empresaNombre: 'Aceros / Sur',
        centroNombre: 'Planta / Norte',
        trabajadorNombre: 'José Pérez',
      });
      const result = await service.uploadDocument(makeDto(), makeFile(), URL_ID, ACTOR_ID);
      expect(result.rutaDocumento).toBe(
        'expedientes-medicos/Aceros - Sur/Planta - Norte/José Pérez_507f1f77bcf86cd799439014',
      );
    });
  });

  describe('compatibilidad de lecturas con el persistido (sin tocar esos servicios)', () => {
    it('el localizador nuevo es interpretable por HEAD/visor y por delete/rename', async () => {
      const relative = expectedRelative();
      const filename = buildExternalDocumentFilename(
        'Prueba de laboratorio',
        FECHA_ISO,
        'lab.pdf',
      );
      const filesSvc = new ClinicalFilesService(
        {} as any,
        {} as any,
        {} as any,
      );
      const headPath = filesSvc.resolveSafePath(`${relative}/${filename}`);
      expect(headPath.endsWith(filename)).toBe(true);

      const deletePath = reconstructDeletePath({
        rutaDocumento: relative,
        nombreDocumento: 'Prueba de laboratorio',
        fechaDocumento: FECHA_ISO,
        extension: '.pdf',
      });
      expect(path.basename(deletePath)).toBe(
        'Prueba de laboratorio 25-10-2024.pdf',
      );
    });
  });

  describe('históricos (fixtures, sin recálculo ni move)', () => {
    const fecha = FECHA_ISO;
    const nombre = 'Lab legado';
    const extension = '.pdf';

    it('con _ObjectId: delete/rename usan el persistido tal cual', () => {
      const rutaDocumento =
        'expedientes-medicos/Empresa/Centro/Nombre_507f1f77bcf86cd799439014';
      const full = reconstructDeletePath({
        rutaDocumento,
        nombreDocumento: nombre,
        fechaDocumento: fecha,
        extension,
      });
      expect(full.replace(/\\/g, '/').startsWith(rutaDocumento)).toBe(true);
      expect(rutaDocumento).not.toBe(
        buildClinicalDirectoryPath(
          'Otra',
          'Otra',
          'Otra',
          '507f1f77bcf86cd799439014',
        ),
      );
    });

    it('sin _ObjectId: no se recalcula', () => {
      const rutaDocumento = 'expedientes-medicos/Empresa/Centro/Nombre';
      const full = reconstructDeletePath({
        rutaDocumento,
        nombreDocumento: nombre,
        fechaDocumento: fecha,
        extension,
      });
      expect(full).toBe(path.join(rutaDocumento, `${nombre} 25-10-2024.pdf`));
    });

    it('con filename en el campo: se usa el persistido sin join', () => {
      const rutaDocumento =
        'expedientes-medicos/Empresa/Centro/Nombre_507f1f77bcf86cd799439014/Lab legado 25-10-2024.pdf';
      expect(
        reconstructDeletePath({
          rutaDocumento,
          nombreDocumento: nombre,
          fechaDocumento: fecha,
          extension,
        }),
      ).toBe(rutaDocumento);
    });
  });

  describe('fallos parciales', () => {
    it('validación antes de write: buffer vacío → 0 disco, 0 Mongo', async () => {
      const { service, saved } = createUploadHarness();
      await expect(
        service.uploadDocument(
          makeDto(),
          makeFile({ buffer: Buffer.alloc(0) }),
          URL_ID,
          ACTOR_ID,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(saved).toHaveLength(0);
      expect(await fs.readdir(tmpRoot)).toHaveLength(0);
    });

    it('validación de fecha antes de write', async () => {
      const { service, saved } = createUploadHarness();
      await expect(
        service.uploadDocument(
          makeDto({ fechaDocumento: undefined }),
          makeFile(),
          URL_ID,
          ACTOR_ID,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(saved).toHaveLength(0);
      expect(await fs.readdir(tmpRoot)).toHaveLength(0);
    });

    it('write falla → 0 Mongo, 0 archivo nuevo', async () => {
      const { service, saved } = createUploadHarness();
      (fs.writeFile as jest.Mock).mockRejectedValueOnce(
        Object.assign(new Error('EACCES'), { code: 'EACCES' }),
      );
      await expect(
        service.uploadDocument(makeDto(), makeFile(), URL_ID, ACTOR_ID),
      ).rejects.toMatchObject({ code: 'EACCES' });
      expect(saved).toHaveLength(0);
    });

    it('save falla tras wx OK → unlink del nuevo; un original en otro path intacto', async () => {
      const siblingDir = path.join(tmpRoot, 'sibling-original');
      await fs.mkdir(siblingDir, { recursive: true });
      const siblingFile = path.join(siblingDir, 'keep-me.pdf');
      await fs.writeFile(siblingFile, Buffer.from('KEEP'));

      const { service, saved } = createUploadHarness({
        saveImpl: async () => {
          throw new Error('Mongo down');
        },
      });

      await expect(
        service.uploadDocument(makeDto(), makeFile(), URL_ID, ACTOR_ID),
      ).rejects.toThrow('Mongo down');
      expect(saved).toHaveLength(0);

      const relative = expectedRelative();
      const filename = buildExternalDocumentFilename(
        'Prueba de laboratorio',
        FECHA_ISO,
        'lab.pdf',
      );
      const attempted = path.resolve(tmpRoot, relative, filename);
      await expect(fs.stat(attempted)).rejects.toMatchObject({
        code: 'ENOENT',
      });
      expect(await fs.readFile(siblingFile)).toEqual(Buffer.from('KEEP'));
    });

    it('updatedAt best-effort: fallo no hace rollback', async () => {
      const { service, saved } = createUploadHarness({
        updatedAtImpl: async () => {
          throw new Error('updatedAt fail');
        },
      });
      const result = await service.uploadDocument(makeDto(), makeFile(), URL_ID, ACTOR_ID);
      expect(result.rutaDocumento).toBe(expectedRelative());
      expect(saved).toHaveLength(1);
    });
  });

  describe('rollback de formato', () => {
    it('ruta + filename nuevos = fórmula FE + filename multer viejo', () => {
      const relative = buildClinicalDirectoryPath(
        EMPRESA,
        CENTRO,
        TRABAJADOR_NOMBRE,
        CANONICAL_ID,
      );
      const filename = buildExternalDocumentFilename(
        'Prueba de laboratorio',
        FECHA_ISO,
        'scan.PDF',
      );
      expect(relative).toBe(
        'expedientes-medicos/ACEROS DE GUATEMALA/MEGA PRODUCTO - NUEVOS INGRESOS/JAIME EMANUEL_507f1f77bcf86cd799439014',
      );
      const legacyFecha = convertirFechaISOaDDMMYYYY(FECHA_ISO);
      const legacyFilename =
        `Prueba de laboratorio ${legacyFecha}${path.extname('scan.PDF')}`.replace(
          /[<>:"/\\|?*]/g,
          '-',
        );
      expect(filename).toBe(legacyFilename);
    });
  });
});

describe('IMP-009 controller: identidad y rethrow', () => {
  const uploadDocument = jest.fn();
  const usersService = {
    findById: jest.fn().mockResolvedValue({
      role: 'Médico',
      permisos: { gestionarDocumentosExternos: true },
    }),
  };
  let controller: ExpedientesController;

  beforeEach(() => {
    uploadDocument.mockReset().mockResolvedValue({ _id: 'doc1' });
    usersService.findById.mockResolvedValue({
      role: 'Médico',
      permisos: { gestionarDocumentosExternos: true },
    });
    controller = new ExpedientesController(
      { uploadDocument } as any,
      {} as any,
      usersService as any,
    );
  });

  const req = { userId: 'user-1' } as any;

  it('URL + body mismo ID → llama al service con id de URL', async () => {
    const dto = makeDto({ idTrabajador: URL_ID });
    const file = makeFile();
    await controller.uploadDocument(URL_ID, dto as any, file, req);
    expect(uploadDocument).toHaveBeenCalledWith(
      expect.objectContaining({ idTrabajador: URL_ID }),
      file,
      URL_ID,
      'user-1',
    );
  });

  it('URL + body distinto → 400, sin service', async () => {
    const dto = makeDto({ idTrabajador: OTHER_ID });
    await expect(
      controller.uploadDocument(URL_ID, dto as any, makeFile(), req),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it('URL inválida → 400, sin service', async () => {
    await expect(
      controller.uploadDocument(
        'no-es-objectid',
        makeDto() as any,
        makeFile(),
        req,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it('sin archivo → 400, sin service', async () => {
    await expect(
      controller.uploadDocument(URL_ID, makeDto() as any, undefined as any, req),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(uploadDocument).not.toHaveBeenCalled();
  });

  it('re-lanza ConflictException del service', async () => {
    uploadDocument.mockRejectedValueOnce(
      new ConflictException('Ya existe un archivo'),
    );
    await expect(
      controller.uploadDocument(URL_ID, makeDto() as any, makeFile(), req),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('re-lanza BadRequestException del service', async () => {
    uploadDocument.mockRejectedValueOnce(
      new BadRequestException('cadena incompleta'),
    );
    await expect(
      controller.uploadDocument(URL_ID, makeDto() as any, makeFile(), req),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('sin permiso no llega al service', async () => {
    usersService.findById.mockResolvedValueOnce({
      role: 'Administrativo',
      permisos: { gestionarDocumentosExternos: false },
    });
    await expect(
      controller.uploadDocument(URL_ID, makeDto() as any, makeFile(), req),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(uploadDocument).not.toHaveBeenCalled();
  });
});

describe('CreateDocumentoExternoDto — rutaDocumento opcional', () => {
  const base = {
    nombreDocumento: 'Lab',
    fechaDocumento: FECHA_ISO,
    extension: '.pdf',
    idTrabajador: URL_ID,
    createdBy: '60d9f70fc39b3c1b8f0d6c0b',
    updatedBy: '60d9f70fc39b3c1b8f0d6c0c',
  };

  it('acepta DTO sin rutaDocumento', async () => {
    const dto = plainToInstance(CreateDocumentoExternoDto, base);
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'rutaDocumento')).toHaveLength(
      0,
    );
  });

  it('acepta DTO con rutaDocumento (se ignora en escritura)', async () => {
    const dto = plainToInstance(CreateDocumentoExternoDto, {
      ...base,
      rutaDocumento: '../../../etc',
    });
    const errors = await validate(dto);
    expect(errors.filter((e) => e.property === 'rutaDocumento')).toHaveLength(
      0,
    );
  });
});
