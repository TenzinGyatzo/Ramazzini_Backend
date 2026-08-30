import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
import { sanitizePermissionsForRole } from './constants/role-permission-policy';

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

  /**
   * Invalida el token de recuperación solo si sigue siendo el valor emitido
   * por esta solicitud (no toca un token posterior o de otro flujo).
   */
  async clearPasswordResetTokenIfMatches(
    userId: string,
    expectedToken: string,
  ): Promise<void> {
    if (!userId || !expectedToken) {
      return;
    }
    await this.userModel
      .updateOne(
        { _id: userId, token: expectedToken },
        { $set: { token: '', tokenExpiresAt: null } },
      )
      .exec();
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
   * Lectura mínima para AccountStatusGuard (existe / verified / cuentaActiva / watermark / tenant).
   * No cachear: una suspensión debe verse en el siguiente request.
   */
  async findAuthStatusById(userId: string): Promise<{
    cuentaActiva: boolean;
    verified: boolean;
    idProveedorSalud: string | null;
    tokensInvalidBefore: Date | null;
  } | null> {
    const doc = await this.userModel
      .findById(userId)
      .select('cuentaActiva verified idProveedorSalud tokensInvalidBefore')
      .lean()
      .exec();
    if (!doc) {
      return null;
    }
    const raw = doc as {
      cuentaActiva?: boolean;
      verified?: boolean;
      idProveedorSalud?: unknown;
      tokensInvalidBefore?: Date | null;
    };
    return {
      cuentaActiva: raw.cuentaActiva === true,
      verified: raw.verified === true,
      idProveedorSalud:
        raw.idProveedorSalud == null ? null : String(raw.idProveedorSalud),
      tokensInvalidBefore: raw.tokensInvalidBefore ?? null,
    };
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
    options?: {
      scope?: 'permissions' | 'assignments' | 'full';
      roles?: string[];
    },
  ): Promise<UserDocument[] | null> {
    const query: Record<string, unknown> = { idProveedorSalud };

    if (options?.roles?.length) {
      query.role = { $in: options.roles };
    }

    const scope = options?.scope ?? 'full';
    const selectByScope: Record<string, string> = {
      permissions: 'username email role permisos cuentaActiva',
      assignments:
        'username email role permisos empresasAsignadas centrosTrabajoAsignados cuentaActiva',
      full: 'username email phone role permisos empresasAsignadas centrosTrabajoAsignados cuentaActiva',
    };

    return this.userModel
      .find(query)
      .select(selectByScope[scope] ?? selectByScope.full)
      .exec();
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

  async assertActorCanReadTargetAssignments(
    actorUserId: string,
    targetUserId: string,
  ): Promise<void> {
    if (String(actorUserId) === String(targetUserId)) {
      return;
    }
    await this.assertActorCanManageTargetUser(actorUserId, targetUserId);
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

  sanitizeUserPermissions(user: UserDocument | null): UserDocument | null {
    if (!user?.permisos || !user.role) {
      return user;
    }

    const raw =
      (user.permisos as { toObject?: () => Record<string, boolean> }).toObject?.() ??
      user.permisos;

    user.set(
      'permisos',
      sanitizePermissionsForRole(user.role, raw as Record<string, boolean>),
    );
    return user;
  }

  sanitizeUsersList(users: UserDocument[] | null): UserDocument[] | null {
    if (!users) return users;
    return users.map((user) => this.sanitizeUserPermissions(user) as UserDocument);
  }

  async updateUserPermissions(
    userId: string,
    permisos: any,
  ): Promise<UserDocument | null> {
    const user = await this.userModel.findById(userId);
    if (!user) return null;

    const sanitized = sanitizePermissionsForRole(user.role, permisos);

    return this.userModel
      .findByIdAndUpdate(userId, { $set: { permisos: sanitized } }, { new: true })
      .exec();
  }

  async toggleAccountStatus(
    userId: string,
    cuentaActiva: boolean,
  ): Promise<UserDocument | null> {
    if (cuentaActiva) {
      return this.userModel
        .findByIdAndUpdate(
          userId,
          { $set: { cuentaActiva: true } },
          { new: true },
        )
        .exec();
    }

    return this.userModel
      .findByIdAndUpdate(
        userId,
        {
          $set: {
            cuentaActiva: false,
            tokensInvalidBefore: new Date(),
          },
        },
        { new: true },
      )
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
  private readonly reglasPuntajeDefault = {
    aptitudes: 3,
    historias: 1,
    exploraciones: 1,
    examenesVista: 1,
    audiometrias: 1,
    antidopings: 1,
    notas: 2,
    externos: 0,
  };

  private createEmptyProductivityStats() {
    return {
      totalAptitudes: 0,
      totalHistoriasClinicas: 0,
      totalExploracionesFisicas: 0,
      totalExamenesVista: 0,
      totalAudiometrias: 0,
      totalAntidopings: 0,
      totalNotasMedicas: 0,
      totalDocumentosExternos: 0,
      totalDocumentos: 0,
      ultimoInforme: null as Date | null,
    };
  }

  private async getReglasPuntajeForProveedor(idProveedorSalud: string) {
    const proveedor = await this.proveedorSaludModel
      .findById(idProveedorSalud)
      .select('reglasPuntaje')
      .exec();

    if (!proveedor?.reglasPuntaje) {
      return { ...this.reglasPuntajeDefault };
    }

    return proveedor.reglasPuntaje;
  }

  private async aggregateProductivityByCollection(
    model: Model<any>,
    userIds: string[],
    fechaInicio?: string,
    fechaFin?: string,
  ): Promise<Map<string, { count: number; ultimoInforme: Date | null }>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const filtroFecha = this.construirFiltroFecha(fechaInicio, fechaFin);
    const objectIds = userIds.map((id) => new Types.ObjectId(id));

    const results = await model
      .aggregate([
        {
          $match: {
            createdBy: { $in: objectIds },
            ...filtroFecha,
          },
        },
        {
          $group: {
            _id: '$createdBy',
            count: { $sum: 1 },
            ultimoInforme: { $max: '$createdAt' },
          },
        },
      ])
      .exec();

    const map = new Map<string, { count: number; ultimoInforme: Date | null }>();
    for (const row of results) {
      map.set(row._id.toString(), {
        count: row.count,
        ultimoInforme: row.ultimoInforme ?? null,
      });
    }

    return map;
  }

  private mergeCollectionStats(
    aptitudes: Map<string, { count: number; ultimoInforme: Date | null }>,
    historias: Map<string, { count: number; ultimoInforme: Date | null }>,
    exploraciones: Map<string, { count: number; ultimoInforme: Date | null }>,
    examenesVista: Map<string, { count: number; ultimoInforme: Date | null }>,
    audiometrias: Map<string, { count: number; ultimoInforme: Date | null }>,
    antidopings: Map<string, { count: number; ultimoInforme: Date | null }>,
    notas: Map<string, { count: number; ultimoInforme: Date | null }>,
    externos: Map<string, { count: number; ultimoInforme: Date | null }>,
    userId: string,
  ) {
    const getCount = (map: Map<string, { count: number; ultimoInforme: Date | null }>) =>
      map.get(userId)?.count ?? 0;

    const ultimos = [
      aptitudes.get(userId)?.ultimoInforme,
      historias.get(userId)?.ultimoInforme,
      exploraciones.get(userId)?.ultimoInforme,
      examenesVista.get(userId)?.ultimoInforme,
      audiometrias.get(userId)?.ultimoInforme,
      antidopings.get(userId)?.ultimoInforme,
      notas.get(userId)?.ultimoInforme,
      externos.get(userId)?.ultimoInforme,
    ].filter((fecha): fecha is Date => fecha instanceof Date);

    const totalAptitudes = getCount(aptitudes);
    const totalHistoriasClinicas = getCount(historias);
    const totalExploracionesFisicas = getCount(exploraciones);
    const totalExamenesVista = getCount(examenesVista);
    const totalAudiometrias = getCount(audiometrias);
    const totalAntidopings = getCount(antidopings);
    const totalNotasMedicas = getCount(notas);
    const totalDocumentosExternos = getCount(externos);

    return {
      totalAptitudes,
      totalHistoriasClinicas,
      totalExploracionesFisicas,
      totalExamenesVista,
      totalAudiometrias,
      totalAntidopings,
      totalNotasMedicas,
      totalDocumentosExternos,
      totalDocumentos:
        totalAptitudes +
        totalHistoriasClinicas +
        totalExploracionesFisicas +
        totalExamenesVista +
        totalAudiometrias +
        totalAntidopings +
        totalNotasMedicas +
        totalDocumentosExternos,
      ultimoInforme:
        ultimos.length > 0
          ? ultimos.reduce((masReciente, actual) =>
              actual > masReciente ? actual : masReciente,
            )
          : null,
    };
  }

  private async buildProductivityStatsForUsers(
    userIds: string[],
    fechaInicio?: string,
    fechaFin?: string,
  ) {
    if (userIds.length === 0) {
      return new Map<string, ReturnType<UsersService['createEmptyProductivityStats']>>();
    }

    const [
      aptitudes,
      historias,
      exploraciones,
      examenesVista,
      audiometrias,
      antidopings,
      notas,
      externos,
    ] = await Promise.all([
      this.aggregateProductivityByCollection(
        this.aptitudModel,
        userIds,
        fechaInicio,
        fechaFin,
      ),
      this.aggregateProductivityByCollection(
        this.historiaClinicaModel,
        userIds,
        fechaInicio,
        fechaFin,
      ),
      this.aggregateProductivityByCollection(
        this.exploracionFisicaModel,
        userIds,
        fechaInicio,
        fechaFin,
      ),
      this.aggregateProductivityByCollection(
        this.examenVistaModel,
        userIds,
        fechaInicio,
        fechaFin,
      ),
      this.aggregateProductivityByCollection(
        this.audiometriaModel,
        userIds,
        fechaInicio,
        fechaFin,
      ),
      this.aggregateProductivityByCollection(
        this.antidopingModel,
        userIds,
        fechaInicio,
        fechaFin,
      ),
      this.aggregateProductivityByCollection(
        this.notaMedicaModel,
        userIds,
        fechaInicio,
        fechaFin,
      ),
      this.aggregateProductivityByCollection(
        this.documentoExternoModel,
        userIds,
        fechaInicio,
        fechaFin,
      ),
    ]);

    const statsMap = new Map<
      string,
      ReturnType<UsersService['createEmptyProductivityStats']>
    >();

    for (const userId of userIds) {
      statsMap.set(
        userId,
        this.mergeCollectionStats(
          aptitudes,
          historias,
          exploraciones,
          examenesVista,
          audiometrias,
          antidopings,
          notas,
          externos,
          userId,
        ),
      );
    }

    return statsMap;
  }

  async getProductivityStatsByProveedor(
    idProveedorSalud: string,
    fechaInicio?: string,
    fechaFin?: string,
  ) {
    try {
      const [usuarios, reglasPuntaje] = await Promise.all([
        this.userModel.find({ idProveedorSalud }).exec(),
        this.getReglasPuntajeForProveedor(idProveedorSalud),
      ]);

      const userIds = usuarios.map((usuario) => usuario._id.toString());
      const statsMap = await this.buildProductivityStatsForUsers(
        userIds,
        fechaInicio,
        fechaFin,
      );

      const usuariosConEstadisticas = usuarios.map((usuario) => {
        const userId = usuario._id.toString();
        return {
          _id: usuario._id,
          username: usuario.username,
          email: usuario.email,
          role: usuario.role,
          productividad:
            statsMap.get(userId) ?? this.createEmptyProductivityStats(),
        };
      });

      return { usuarios: usuariosConEstadisticas, reglasPuntaje };
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
      const statsMap = await this.buildProductivityStatsForUsers(
        [userId],
        fechaInicio,
        fechaFin,
      );

      return statsMap.get(userId) ?? this.createEmptyProductivityStats();
    } catch (error) {
      console.error('Error al obtener estadísticas del usuario:', error);
      throw error;
    }
  }

  // Función auxiliar para construir el filtro de fecha
  private construirFiltroFecha(fechaInicio?: string, fechaFin?: string) {
    const filtro: any = {};

    if (fechaInicio && fechaFin) {
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);

      inicio.setHours(0, 0, 0, 0);
      fin.setHours(23, 59, 59, 999);

      filtro.createdAt = {
        $gte: inicio,
        $lte: fin,
      };
    } else if (fechaInicio) {
      const inicio = new Date(fechaInicio);
      inicio.setHours(0, 0, 0, 0);
      filtro.createdAt = { $gte: inicio };
    } else if (fechaFin) {
      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59, 999);
      filtro.createdAt = { $lte: fin };
    }

    return filtro;
  }

  async getAllProductivityStats(
    fechaInicio?: string,
    fechaFin?: string,
    idProveedorSaludActor?: string,
  ) {
    try {
      const usuarios = await this.userModel.find({}).exec();
      const userIds = usuarios.map((usuario) => usuario._id.toString());

      const [statsMap, proveedores, reglasPuntaje] = await Promise.all([
        this.buildProductivityStatsForUsers(userIds, fechaInicio, fechaFin),
        this.loadProveedorNombresMap(usuarios),
        idProveedorSaludActor
          ? this.getReglasPuntajeForProveedor(idProveedorSaludActor)
          : Promise.resolve(null),
      ]);

      const usuariosConEstadisticas = usuarios.map((usuario) => {
        const userId = usuario._id.toString();
        const proveedorKey = usuario.idProveedorSalud?.toString();

        return {
          _id: usuario._id,
          username: usuario.username,
          email: usuario.email,
          role: usuario.role,
          idProveedorSalud: usuario.idProveedorSalud,
          proveedorNombre: proveedorKey
            ? proveedores.get(proveedorKey) ?? 'Sin proveedor'
            : 'Sin proveedor',
          productividad:
            statsMap.get(userId) ?? this.createEmptyProductivityStats(),
        };
      });

      return {
        usuarios: usuariosConEstadisticas,
        ...(reglasPuntaje ? { reglasPuntaje } : {}),
      };
    } catch (error) {
      console.error(
        'Error al obtener estadísticas de productividad de todos los usuarios:',
        error,
      );
      throw error;
    }
  }

  private async loadProveedorNombresMap(usuarios: UserDocument[]) {
    const proveedorIds = [
      ...new Set(
        usuarios
          .map((usuario) => usuario.idProveedorSalud?.toString())
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    if (proveedorIds.length === 0) {
      return new Map<string, string>();
    }

    const proveedores = await this.proveedorSaludModel
      .find({ _id: { $in: proveedorIds } })
      .select('nombre')
      .exec();

    return new Map(
      proveedores.map((proveedor) => [
        proveedor._id.toString(),
        proveedor.nombre,
      ]),
    );
  }

  async getUserCentrosTrabajo(userId: string): Promise<any[]> {
    return this.centrosTrabajoService.findByUserAssignments(userId);
  }
}
