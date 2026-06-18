import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDocument } from '../users/schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateAssignmentsDto } from './dto/update-assignments.dto';
import { CentrosTrabajoService } from '../centros-trabajo/centros-trabajo.service';
import { isInvitableRole } from './constants/invitable-roles';
import { canManageTenantUsers, isPlatformAdministrador } from 'src/utils/user-role-helpers';
import {
  assertTokenValid,
  clearUserToken,
  issueUserToken,
} from 'src/utils/user-token';
import { validatePasswordPolicy } from 'src/utils/validate-password-policy';

const MIN_USERNAME_LENGTH = 5;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel('User') private userModel: Model<UserDocument>,
    @InjectModel('HistoriaClinica') private historiaClinicaModel: Model<any>,
    @InjectModel('AptitudPuesto') private aptitudModel: Model<any>,
    @InjectModel('ExploracionFisica')
    private exploracionFisicaModel: Model<any>,
    @InjectModel('ExamenVista') private examenVistaModel: Model<any>,
    @InjectModel('Audiometria') private audiometriaModel: Model<any>,
    @InjectModel('Antidoping') private antidopingModel: Model<any>,
    @InjectModel('NotaMedica') private notaMedicaModel: Model<any>,
    @InjectModel('DocumentoExterno') private documentoExternoModel: Model<any>,
    @InjectModel('ProveedorSalud') private proveedorSaludModel: Model<any>,
    private centrosTrabajoService: CentrosTrabajoService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const user = new this.userModel(createUserDto);
    issueUserToken(user, 'verify');
    return await user.save();
  }

  async registerOnboardingPrincipal(
    createUserDto: CreateUserDto,
  ): Promise<UserDocument> {
    if (createUserDto.role !== 'Principal') {
      throw new ForbiddenException(
        'El registro público solo permite crear el usuario Principal inicial del proveedor. Use el endpoint de invitación para otros roles.',
      );
    }

    await this.validateRegistrationFields(createUserDto);

    const proveedor = await this.proveedorSaludModel
      .findById(createUserDto.idProveedorSalud)
      .exec();
    if (!proveedor) {
      throw new NotFoundException('El proveedor de salud no existe');
    }

    const existingUsers = await this.userModel
      .countDocuments({ idProveedorSalud: createUserDto.idProveedorSalud })
      .exec();
    if (existingUsers > 0) {
      throw new ConflictException(
        'Este proveedor de salud ya tiene usuarios registrados',
      );
    }

    return this.register(createUserDto);
  }

  async inviteUser(
    actorUserId: string,
    inviteUserDto: InviteUserDto,
  ): Promise<UserDocument> {
    const actor = await this.findById(actorUserId);
    if (!actor) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!canManageTenantUsers(actor.role)) {
      throw new ForbiddenException(
        'No tienes permisos para invitar usuarios a este proveedor de salud',
      );
    }

    if (inviteUserDto.role === 'Principal') {
      throw new BadRequestException(
        'No se puede invitar un usuario con rol Principal',
      );
    }

    if (!isInvitableRole(inviteUserDto.role)) {
      throw new BadRequestException('El rol indicado no es válido para invitación');
    }

    await this.validateRegistrationFields(inviteUserDto);

    const createUserDto: CreateUserDto = {
      ...inviteUserDto,
      idProveedorSalud: String(actor.idProveedorSalud),
    };

    return this.register(createUserDto);
  }

  private async validateRegistrationFields(dto: {
    username: string;
    email: string;
    password: string;
  }): Promise<void> {
    if (dto.username.trim().length < MIN_USERNAME_LENGTH) {
      throw new BadRequestException(
        `El username debe tener al menos ${MIN_USERNAME_LENGTH} caracteres`,
      );
    }

    const userExists = await this.findByEmail(dto.email);
    if (userExists) {
      throw new ConflictException(`${dto.email} ya está registrado en Ramazzini`);
    }

    validatePasswordPolicy(dto.password);
  }

  async findByTokenAndValidate(token: string): Promise<UserDocument> {
    const user = await this.findByToken(token);
    assertTokenValid(user);
    return user!;
  }

  async verifyAccountWithToken(token: string): Promise<UserDocument> {
    const user = await this.findByTokenAndValidate(token);
    user.verified = true;
    clearUserToken(user);
    return user.save();
  }

  async issuePasswordResetToken(email: string): Promise<UserDocument> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new NotFoundException({ msg: 'El usuario no existe' });
    }

    issueUserToken(user, 'reset');
    return user.save();
  }

  async resetPasswordWithToken(
    token: string,
    password: string,
  ): Promise<UserDocument> {
    const user = await this.findByTokenAndValidate(token);
    validatePasswordPolicy(password);
    user.password = password;
    clearUserToken(user);
    return user.save();
  }

  async validatePasswordResetToken(token: string): Promise<UserDocument> {
    return this.findByTokenAndValidate(token);
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByToken(token: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ token }).exec();
  }

  async findById(
    id: string,
    selectFields: string = '',
  ): Promise<UserDocument | null> {
    return this.userModel.findById(id).select(selectFields).exec();
  }

  /**
   * Devuelve solo el idProveedorSalud del usuario (para auditoría/proveedor).
   * Usa lean() para obtener el valor crudo de la BD.
   */
  async getIdProveedorSaludByUserId(userId: string): Promise<string | null> {
    const doc = await this.userModel
      .findById(userId)
      .select('idProveedorSalud')
      .lean()
      .exec();
    if (!doc || (doc as any).idProveedorSalud == null) return null;
    return String((doc as any).idProveedorSalud);
  }

  /**
   * Devuelve username, email y role del usuario para snapshot de auditoría.
   * Una sola lectura con select mínimo.
   */
  async getAuditActorSnapshot(
    userId: string,
  ): Promise<{ username: string; email: string; role: string } | null> {
    const doc = await this.userModel
      .findById(userId)
      .select('username email role')
      .lean()
      .exec();
    if (!doc) return null;
    const d = doc as { username?: string; email?: string; role?: string };
    return {
      username: d.username ?? '',
      email: d.email ?? '',
      role: d.role ?? '',
    };
  }

  async findByProveedorSaludId(
    idProveedorSalud: string,
  ): Promise<UserDocument[] | null> {
    return this.userModel.find({ idProveedorSalud }).exec();
  }

  async assertActorCanManageTargetUser(
    actorUserId: string,
    targetUserId: string,
  ): Promise<{ actor: UserDocument; target: UserDocument }> {
    const actor = await this.findById(actorUserId);
    if (!actor) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!canManageTenantUsers(actor.role)) {
      throw new ForbiddenException(
        'No tienes permisos para gestionar usuarios de este proveedor de salud',
      );
    }

    const target = await this.findById(targetUserId);
    if (!target) {
      throw new NotFoundException('Usuario objetivo no encontrado');
    }

    if (String(actor.idProveedorSalud) !== String(target.idProveedorSalud)) {
      throw new ForbiddenException(
        'No puedes modificar usuarios de otro proveedor de salud',
      );
    }

    return { actor, target };
  }

  async assertActorCanAccessProveedor(
    actorUserId: string,
    idProveedorSalud: string,
  ): Promise<UserDocument> {
    const actor = await this.findById(actorUserId);
    if (!actor) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!canManageTenantUsers(actor.role)) {
      throw new ForbiddenException(
        'No tienes permisos para consultar usuarios de este proveedor de salud',
      );
    }

    if (
      actor.role !== 'Administrador' &&
      String(actor.idProveedorSalud) !== String(idProveedorSalud)
    ) {
      throw new ForbiddenException(
        'No puedes consultar datos de otro proveedor de salud',
      );
    }

    return actor;
  }

  async assertActorIsPlatformAdministrador(
    actorUserId: string,
  ): Promise<UserDocument> {
    const actor = await this.findById(actorUserId);
    if (!actor) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!isPlatformAdministrador(actor.role)) {
      throw new ForbiddenException(
        'No tienes permisos para consultar productividad global',
      );
    }

    return actor;
  }

  async removeUserByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOneAndDelete({ email }).exec();
  }

  async updateUserPermissions(
    userId: string,
    permisos: any,
  ): Promise<UserDocument | null> {
    const user = await this.userModel.findById(userId);
    if (!user) return null;

    // Si el usuario es Administrativo, forzar permisos de documentos a false
    if (user.role === 'Administrativo') {
      permisos.gestionarDocumentosDiagnostico = false;
      permisos.gestionarDocumentosEvaluacion = false;
      permisos.gestionarDocumentosExternos = false;
      permisos.gestionarOtrosDocumentos = false;
    }
    // Si el usuario es Técnico Evaluador, no puede tener gestionarDocumentosDiagnostico
    if (user.role === 'Técnico Evaluador') {
      permisos.gestionarDocumentosDiagnostico = false;
    }

    return this.userModel
      .findByIdAndUpdate(userId, { $set: { permisos } }, { new: true })
      .exec();
  }

  async toggleAccountStatus(
    userId: string,
    cuentaActiva: boolean,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(userId, { $set: { cuentaActiva } }, { new: true })
      .exec();
  }

  async updateUserAssignments(
    userId: string,
    assignmentsDto: UpdateAssignmentsDto,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(userId, { $set: assignmentsDto }, { new: true })
      .exec();
  }

  async getUserAssignments(userId: string): Promise<UserDocument | null> {
    return this.userModel
      .findById(userId)
      .select('empresasAsignadas centrosTrabajoAsignados')
      .exec();
  }

  // Métodos para estadísticas de productividad
  async getProductivityStatsByProveedor(
    idProveedorSalud: string,
    fechaInicio?: string,
    fechaFin?: string,
  ) {
    try {
      // Obtener todos los usuarios del proveedor
      const usuarios = await this.userModel.find({ idProveedorSalud }).exec();

      const usuariosConEstadisticas = await Promise.all(
        usuarios.map(async (usuario) => {
          const estadisticas = await this.getUserDetailedStats(
            usuario._id.toString(),
            fechaInicio,
            fechaFin,
          );
          return {
            _id: usuario._id,
            username: usuario.username,
            email: usuario.email,
            role: usuario.role,
            productividad: estadisticas,
          };
        }),
      );

      return usuariosConEstadisticas;
    } catch (error) {
      console.error('Error al obtener estadísticas de productividad:', error);
      throw error;
    }
  }

  async getUserDetailedStats(
    userId: string,
    fechaInicio?: string,
    fechaFin?: string,
  ) {
    try {
      // Construir filtro de fecha si se proporcionan fechas
      const filtroFecha = this.construirFiltroFecha(fechaInicio, fechaFin);

      // Contar documentos por tipo para el usuario con filtro de fecha
      const [
        totalAptitudes,
        totalHistoriasClinicas,
        totalExploracionesFisicas,
        totalExamenesVista,
        totalAudiometrias,
        totalAntidopings,
        totalNotasMedicas,
        totalDocumentosExternos,
        ultimoDocumento,
      ] = await Promise.all([
        this.aptitudModel
          .countDocuments({ createdBy: userId, ...filtroFecha })
          .exec(),
        this.historiaClinicaModel
          .countDocuments({ createdBy: userId, ...filtroFecha })
          .exec(),
        this.exploracionFisicaModel
          .countDocuments({ createdBy: userId, ...filtroFecha })
          .exec(),
        this.examenVistaModel
          .countDocuments({ createdBy: userId, ...filtroFecha })
          .exec(),
        this.audiometriaModel
          .countDocuments({ createdBy: userId, ...filtroFecha })
          .exec(),
        this.antidopingModel
          .countDocuments({ createdBy: userId, ...filtroFecha })
          .exec(),
        this.notaMedicaModel
          .countDocuments({ createdBy: userId, ...filtroFecha })
          .exec(),
        this.documentoExternoModel
          .countDocuments({ createdBy: userId, ...filtroFecha })
          .exec(),
        this.getUltimoDocumentoUsuario(userId, fechaInicio, fechaFin),
      ]);

      const totalDocumentos =
        totalAptitudes +
        totalHistoriasClinicas +
        totalExploracionesFisicas +
        totalExamenesVista +
        totalAudiometrias +
        totalAntidopings +
        totalNotasMedicas +
        totalDocumentosExternos;

      return {
        totalAptitudes,
        totalHistoriasClinicas,
        totalExploracionesFisicas,
        totalExamenesVista,
        totalAudiometrias,
        totalAntidopings,
        totalNotasMedicas,
        totalDocumentosExternos,
        totalDocumentos,
        ultimoInforme: ultimoDocumento ? ultimoDocumento.createdAt : null,
      };
    } catch (error) {
      console.error('Error al obtener estadísticas del usuario:', error);
      throw error;
    }
  }

  private async getUltimoDocumentoUsuario(
    userId: string,
    fechaInicio?: string,
    fechaFin?: string,
  ) {
    try {
      // Construir filtro de fecha si se proporcionan fechas
      const filtroFecha = this.construirFiltroFecha(fechaInicio, fechaFin);

      // Buscar el documento más reciente creado por el usuario
      const modelos = [
        this.aptitudModel,
        this.historiaClinicaModel,
        this.exploracionFisicaModel,
        this.examenVistaModel,
        this.audiometriaModel,
        this.antidopingModel,
        this.notaMedicaModel,
        this.documentoExternoModel,
      ];

      const ultimosDocumentos = await Promise.all(
        modelos.map((modelo) =>
          modelo
            .findOne({ createdBy: userId, ...filtroFecha })
            .sort({ createdAt: -1 })
            .select('createdAt')
            .exec(),
        ),
      );

      // Encontrar el más reciente
      const documentosConFecha = ultimosDocumentos.filter(
        (doc) => doc !== null,
      );
      if (documentosConFecha.length === 0) return null;

      return documentosConFecha.reduce((masReciente, actual) =>
        new Date(actual.createdAt) > new Date(masReciente.createdAt)
          ? actual
          : masReciente,
      );
    } catch (error) {
      console.error('Error al obtener último documento:', error);
      return null;
    }
  }

  // Función auxiliar para construir el filtro de fecha
  private construirFiltroFecha(fechaInicio?: string, fechaFin?: string) {
    const filtro: any = {};

    if (fechaInicio && fechaFin) {
      // Convertir fechas a objetos Date
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);

      // Establecer hora de inicio al comienzo del día
      inicio.setHours(0, 0, 0, 0);

      // Establecer hora de fin al final del día
      fin.setHours(23, 59, 59, 999);

      filtro.createdAt = {
        $gte: inicio,
        $lte: fin,
      };
    } else if (fechaInicio) {
      // Solo fecha de inicio
      const inicio = new Date(fechaInicio);
      inicio.setHours(0, 0, 0, 0);
      filtro.createdAt = { $gte: inicio };
    } else if (fechaFin) {
      // Solo fecha de fin
      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59, 999);
      filtro.createdAt = { $lte: fin };
    }

    return filtro;
  }

  // Método para obtener estadísticas de todos los usuarios del sistema (solo para administradores)
  async getAllProductivityStats(fechaInicio?: string, fechaFin?: string) {
    try {
      // Obtener todos los usuarios del sistema
      const usuarios = await this.userModel.find({}).exec();

      const usuariosConEstadisticas = await Promise.all(
        usuarios.map(async (usuario) => {
          const estadisticas = await this.getUserDetailedStats(
            usuario._id.toString(),
            fechaInicio,
            fechaFin,
          );

          // Obtener información del proveedor de salud
          let proveedorNombre = 'Sin proveedor';
          if (usuario.idProveedorSalud) {
            try {
              const proveedor = await this.proveedorSaludModel
                .findById(usuario.idProveedorSalud)
                .select('nombre')
                .exec();
              if (proveedor) {
                proveedorNombre = proveedor.nombre;
              }
            } catch (error) {
              console.error('Error al obtener nombre del proveedor:', error);
            }
          }

          return {
            _id: usuario._id,
            username: usuario.username,
            email: usuario.email,
            role: usuario.role,
            idProveedorSalud: usuario.idProveedorSalud,
            proveedorNombre,
            productividad: estadisticas,
          };
        }),
      );

      return usuariosConEstadisticas;
    } catch (error) {
      console.error(
        'Error al obtener estadísticas de productividad de todos los usuarios:',
        error,
      );
      throw error;
    }
  }

  async getUserCentrosTrabajo(userId: string): Promise<any[]> {
    return this.centrosTrabajoService.findByUserAssignments(userId);
  }
}
