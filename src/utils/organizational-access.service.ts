import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/modules/users/entities/user.entity';
import { CentroTrabajo } from 'src/modules/centros-trabajo/schemas/centro-trabajo.schema';
import { Empresa } from 'src/modules/empresas/schemas/empresa.schema';
import { Trabajador } from 'src/modules/trabajadores/schemas/trabajador.schema';
import { ExpedienteColaboracionService } from 'src/modules/expediente-colaboracion/expediente-colaboracion.service';

const TRABAJADOR_ID_FROM_FOLDER = /_([0-9a-fA-F]{24})$/;

@Injectable()
export class OrganizationalAccessService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(CentroTrabajo.name)
    private readonly centroTrabajoModel: Model<CentroTrabajo>,
    @InjectModel(Empresa.name) private readonly empresaModel: Model<Empresa>,
    @InjectModel(Trabajador.name)
    private readonly trabajadorModel: Model<Trabajador>,
    @Optional()
    private readonly expedienteColaboracionService?: ExpedienteColaboracionService,
  ) {}

  async assertUserCanAccessCentro(
    userId: string,
    empresaId: string,
    centroId: string,
  ): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new ForbiddenException('Usuario no encontrado');
    }

    const centro = await this.centroTrabajoModel.findById(centroId).exec();
    if (!centro) {
      throw new NotFoundException('Centro de trabajo no encontrado');
    }

    if (String(centro.idEmpresa) !== String(empresaId)) {
      throw new ForbiddenException(
        'El centro de trabajo no pertenece a la empresa indicada',
      );
    }

    const empresa = await this.empresaModel.findById(empresaId).exec();
    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    this.assertUserCanAccessEmpresaCentro(user, empresa.idProveedorSalud, centroId);
  }

  async assertUserCanAccessEmpresa(
    userId: string,
    empresaId: string,
  ): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new ForbiddenException('Usuario no encontrado');
    }

    const empresa = await this.empresaModel.findById(empresaId).exec();
    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    if (!user.idProveedorSalud) {
      throw new ForbiddenException(
        'No tiene permiso para acceder a este recurso',
      );
    }

    if (String(user.idProveedorSalud) !== String(empresa.idProveedorSalud)) {
      throw new ForbiddenException(
        'No tiene permiso para acceder a recursos de otro proveedor de salud',
      );
    }

    if (user.role === 'Principal') {
      return;
    }

    if (user.permisos?.accesoCompletoEmpresasCentros) {
      return;
    }

    const centrosEmpresa = await this.centroTrabajoModel
      .find({ idEmpresa: empresaId })
      .select('_id')
      .lean()
      .exec();
    const idsEmpresa = centrosEmpresa.map((c) => String(c._id));
    const centrosAsignados = (user.centrosTrabajoAsignados || []).map(String);
    const hasAccess = centrosAsignados.some((id) => idsEmpresa.includes(id));
    if (!hasAccess) {
      throw new ForbiddenException(
        'No tiene permiso para acceder a esta empresa',
      );
    }
  }

  async assertUserCanAccessDashboardExport(
    userId: string,
    empresaId: string,
    centroTrabajo: string,
  ): Promise<void> {
    if (centroTrabajo === 'Todos') {
      await this.assertUserCanAccessEmpresa(userId, empresaId);
      return;
    }

    const centro = await this.centroTrabajoModel
      .findOne({ idEmpresa: empresaId, nombreCentro: centroTrabajo })
      .exec();
    if (!centro) {
      throw new NotFoundException('Centro de trabajo no encontrado');
    }

    await this.assertUserCanAccessCentro(
      userId,
      empresaId,
      String(centro._id),
    );
  }

  async assertUserCanAccessTrabajador(
    userId: string,
    empresaId: string,
    trabajadorId: string,
  ): Promise<void> {
    const trabajador = await this.trabajadorModel.findById(trabajadorId).exec();
    if (!trabajador) {
      throw new NotFoundException('Trabajador no encontrado');
    }

    const centro = await this.centroTrabajoModel
      .findById(trabajador.idCentroTrabajo)
      .exec();
    if (!centro) {
      throw new ForbiddenException(
        'No tiene permiso para acceder a este recurso',
      );
    }

    if (String(centro.idEmpresa) !== String(empresaId)) {
      throw new ForbiddenException(
        'El trabajador no pertenece a la empresa indicada',
      );
    }

    const empresa = await this.empresaModel.findById(empresaId).exec();
    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new ForbiddenException('Usuario no encontrado');
    }

    this.assertUserCanAccessEmpresaCentro(
      user,
      empresa.idProveedorSalud,
      String(centro._id),
    );
  }

  /** Resuelve empresa/centro desde el trabajador y aplica el assert de acceso. */
  async assertUserCanAccessTrabajadorId(
    userId: string,
    trabajadorId: string,
  ): Promise<void> {
    const trabajador = await this.trabajadorModel.findById(trabajadorId).exec();
    if (!trabajador) {
      throw new NotFoundException('Trabajador no encontrado');
    }

    const centro = await this.centroTrabajoModel
      .findById(trabajador.idCentroTrabajo)
      .exec();
    if (!centro) {
      throw new ForbiddenException(
        'No tiene permiso para acceder a este recurso',
      );
    }

    await this.assertUserCanAccessTrabajador(
      userId,
      String(centro.idEmpresa),
      trabajadorId,
    );
  }

  async assertUserCanAccessClinicalPath(
    userId: string,
    relativePath: string,
  ): Promise<void> {
    let trabajadorId = this.extractTrabajadorIdFromClinicalPath(relativePath);

    if (!trabajadorId) {
      trabajadorId = await this.resolveTrabajadorIdFromLegacyClinicalPath(
        relativePath,
      );
    }

    if (!trabajadorId) {
      throw new ForbiddenException('Ruta de expediente no autorizada');
    }

    const trabajador = await this.trabajadorModel.findById(trabajadorId).exec();
    if (!trabajador) {
      throw new ForbiddenException('Ruta de expediente no autorizada');
    }

    const centro = await this.centroTrabajoModel
      .findById(trabajador.idCentroTrabajo)
      .exec();
    if (!centro) {
      throw new ForbiddenException('Ruta de expediente no autorizada');
    }

    try {
      await this.assertUserCanAccessTrabajador(
        userId,
        String(centro.idEmpresa),
        trabajadorId,
      );
      return;
    } catch (error) {
      if (!(error instanceof ForbiddenException)) {
        throw error;
      }
    }

    await this.assertDelegatedClinicalPathAccess(
      userId,
      trabajadorId,
      relativePath,
    );
  }

  extractTrabajadorIdFromClinicalPath(relativePath: string): string | null {
    const segments = this.normalizeClinicalPathSegments(relativePath);
    if (segments.length < 2) {
      return null;
    }

    const workerFolder = segments[segments.length - 2];
    const match = workerFolder.match(TRABAJADOR_ID_FROM_FOLDER);
    return match?.[1] ?? null;
  }

  private normalizeClinicalPathSegments(relativePath: string): string[] {
    const normalized = relativePath
      .replace(/^\/+/, '')
      .replace(/^expedientes-medicos\/?/, '');
    return normalized.split('/').filter(Boolean);
  }

  /** Rutas pre-v1.0.1: carpeta del trabajador solo con `nombre`, sin `_ObjectId`. */
  private async resolveTrabajadorIdFromLegacyClinicalPath(
    relativePath: string,
  ): Promise<string | null> {
    const segments = this.normalizeClinicalPathSegments(relativePath);
    if (segments.length < 3) {
      return null;
    }

    const workerFolder = segments[segments.length - 2];
    if (TRABAJADOR_ID_FROM_FOLDER.test(workerFolder)) {
      return null;
    }

    const empresaNombre = segments[0];
    const centroNombre = segments[1];
    const workerNombre = workerFolder;

    const empresa = await this.empresaModel
      .findOne({ nombreComercial: empresaNombre })
      .select('_id')
      .lean()
      .exec();
    if (!empresa) {
      return null;
    }

    const centro = await this.centroTrabajoModel
      .findOne({ idEmpresa: empresa._id, nombreCentro: centroNombre })
      .select('_id')
      .lean()
      .exec();
    if (!centro) {
      return null;
    }

    const trabajador = await this.trabajadorModel
      .findOne({ idCentroTrabajo: centro._id, nombre: workerNombre })
      .select('_id')
      .lean()
      .exec();

    return trabajador ? String(trabajador._id) : null;
  }

  private async assertDelegatedClinicalPathAccess(
    userId: string,
    trabajadorOrigenId: string,
    relativePath: string,
  ): Promise<void> {
    if (!this.expedienteColaboracionService) {
      throw new ForbiddenException(
        'No tiene permiso para acceder a recursos de otro proveedor de salud',
      );
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user?.idProveedorSalud) {
      throw new ForbiddenException(
        'No tiene permiso para acceder a este recurso',
      );
    }

    const delegation =
      await this.expedienteColaboracionService.resolveTrabajadorDestinoPorOrigen(
        trabajadorOrigenId,
        String(user.idProveedorSalud),
      );

    if (!delegation) {
      throw new ForbiddenException(
        'No tiene permiso para acceder a recursos de otro proveedor de salud',
      );
    }

    const trabajadorDestino = await this.trabajadorModel
      .findById(delegation.trabajadorDestinoId)
      .exec();
    if (!trabajadorDestino) {
      throw new ForbiddenException('Ruta de expediente no autorizada');
    }

    const centroDestino = await this.centroTrabajoModel
      .findById(trabajadorDestino.idCentroTrabajo)
      .exec();
    if (!centroDestino) {
      throw new ForbiddenException('Ruta de expediente no autorizada');
    }

    await this.assertUserCanAccessTrabajador(
      userId,
      String(centroDestino.idEmpresa),
      delegation.trabajadorDestinoId,
    );

    const hasDocument =
      await this.expedienteColaboracionService.hasDocumentAtPathForTrabajador(
        delegation.trabajadorDestinoId,
        relativePath,
      );

    if (!hasDocument) {
      throw new ForbiddenException('Ruta de expediente no autorizada');
    }
  }

  private assertUserCanAccessEmpresaCentro(
    user: User,
    idProveedorSalud: unknown,
    centroId: string,
  ): void {
    if (!user.idProveedorSalud) {
      throw new ForbiddenException(
        'No tiene permiso para acceder a este recurso',
      );
    }

    if (String(user.idProveedorSalud) !== String(idProveedorSalud)) {
      throw new ForbiddenException(
        'No tiene permiso para acceder a recursos de otro proveedor de salud',
      );
    }

    if (user.role === 'Principal') {
      return;
    }

    if (user.permisos?.accesoCompletoEmpresasCentros) {
      return;
    }

    const centrosAsignados = (user.centrosTrabajoAsignados || []).map(String);
    if (!centrosAsignados.includes(String(centroId))) {
      throw new ForbiddenException(
        'No tiene permiso para acceder a este centro de trabajo',
      );
    }
  }
}
