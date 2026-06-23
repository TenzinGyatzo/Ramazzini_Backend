import {
  Controller,
  Get,
  Post,
  Body,
  BadRequestException,
  UnauthorizedException,
  Res,
  Req,
  NotFoundException,
  HttpCode,
  HttpStatus,
  HttpException,
  Param,
  Delete,
  Query,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';
import { UpdateAssignmentsDto } from './dto/update-assignments.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyPasswordDto } from './dto/verify-password.dto';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { UserDocument } from './schemas/user.schema';
import { generateAccessToken } from 'src/utils/jwt';
import {
  setAuthCookies,
  clearAuthCookies,
  getRefreshTokenFromCookies,
} from 'src/utils/auth-cookies';
import { RefreshTokenService } from './refresh-token.service';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { EmailsService } from '../emails/emails.service';
import { Public } from 'src/utils/decorators/public.decorator';
import { getUserIdFromRequest, getSidFromRequest } from 'src/utils/auth-helpers';
import {
  AUTH_FORGOT_PASSWORD,
  AUTH_LOGIN,
  AUTH_REFRESH,
  AUTH_REGISTER,
  AUTH_TOKEN,
  AUTH_VERIFY_PASSWORD,
} from 'src/utils/throttle/throttle-limits';
import { DeletionPasswordGuard } from 'src/utils/guards/deletion-password.guard';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '../audit/constants/audit-action-type';
import { AuditEventClass } from '../audit/constants/audit-event-class';
import { LoginLockoutService } from './login-lockout.service';
import { SessionActivityService } from './session-activity.service';

const LOGIN_FAIL_REASON = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_NOT_VERIFIED: 'USER_NOT_VERIFIED',
  USER_LOCKED: 'USER_LOCKED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  LOCKOUT: 'LOCKOUT',
  UNKNOWN: 'UNKNOWN',
} as const;

type LoginFailReason =
  (typeof LOGIN_FAIL_REASON)[keyof typeof LOGIN_FAIL_REASON];
const RESOURCE_TYPE_USER = 'USER';

type LoginContext = 'PRIMARY_LOGIN' | 'SESSION_UNLOCK' | 'TOKEN_REFRESH';

@Controller('auth/users')
@ApiTags('Usuarios')
export class UsersController {
  private normalizeIds(values?: string[] | null): string[] {
    if (!values) return [];
    return Array.from(new Set(values.map(String))).sort();
  }

  private diffPermissionChanges(
    before: Record<string, boolean> = {},
    after: Record<string, boolean> = {},
  ) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    const addedPermissions: string[] = [];
    const removedPermissions: string[] = [];
    for (const key of keys) {
      const beforeVal = Boolean(before[key]);
      const afterVal = Boolean(after[key]);
      if (!beforeVal && afterVal) addedPermissions.push(key);
      if (beforeVal && !afterVal) removedPermissions.push(key);
    }
    return { addedPermissions, removedPermissions };
  }

  private diffAssignments(beforeIds: string[], afterIds: string[]) {
    const beforeSet = new Set(beforeIds);
    const afterSet = new Set(afterIds);
    const added: string[] = [];
    const removed: string[] = [];
    for (const id of afterSet) {
      if (!beforeSet.has(id)) added.push(id);
    }
    for (const id of beforeSet) {
      if (!afterSet.has(id)) removed.push(id);
    }
    return { added, removed };
  }

  constructor(
    private readonly usersService: UsersService,
    private readonly emailsService: EmailsService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly auditService: AuditService,
    private readonly loginLockoutService: LoginLockoutService,
    private readonly sessionActivityService: SessionActivityService,
  ) {}

  private getRequestContext(req: Request) {
    return {
      ip: req?.ip ?? null,
      userAgent: req?.get?.('user-agent') ?? null,
    };
  }

  private buildLoginFailPayload(
    usernameAttempted: string,
    reason: LoginFailReason,
    req: Request,
    context: {
      loginContext: LoginContext;
      sid?: string | null;
      inactivityTimeoutMinutes?: number;
      lockedAt?: string;
      unlockedAt?: string;
    },
  ) {
    const { ip, userAgent } = this.getRequestContext(req);
    return {
      usernameAttempted,
      reason,
      loginContext: context.loginContext,
      ...(context.sid ? { sid: context.sid } : {}),
      ...(context.inactivityTimeoutMinutes != null
        ? { inactivityTimeoutMinutes: context.inactivityTimeoutMinutes }
        : {}),
      ...(context.lockedAt ? { lockedAt: context.lockedAt } : {}),
      ...(context.unlockedAt ? { unlockedAt: context.unlockedAt } : {}),
      ip,
      userAgent,
    };
  }

  private buildLoginSuccessPayload(
    req: Request,
    context: {
      loginContext: LoginContext;
      sid?: string | null;
      inactivityTimeoutMinutes?: number;
      lockedAt?: string;
      unlockedAt?: string;
    },
  ) {
    const { ip, userAgent } = this.getRequestContext(req);
    return {
      authMethod: 'password',
      loginContext: context.loginContext,
      ...(context.sid ? { sid: context.sid } : {}),
      ...(context.inactivityTimeoutMinutes != null
        ? { inactivityTimeoutMinutes: context.inactivityTimeoutMinutes }
        : {}),
      ...(context.lockedAt ? { lockedAt: context.lockedAt } : {}),
      ...(context.unlockedAt ? { unlockedAt: context.unlockedAt } : {}),
      ip,
      userAgent,
    };
  }

  private async recordUserInvitationAudit(
    user: UserDocument,
    actorId: string | null,
  ) {
    const proveedorSaludId =
      (user as any).idProveedorSalud?.toString?.() ?? null;
    await this.auditService.record({
      proveedorSaludId,
      actorId,
      actionType: AuditActionType.USER_INVITATION_SENT,
      resourceType: RESOURCE_TYPE_USER,
      resourceId: (user as any)._id?.toString?.() ?? null,
      payload: {
        email: user.email,
        username: user.username,
        role: (user as any).role ?? null,
      },
      eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
    });
  }

  @Public()
  @Throttle(AUTH_REGISTER)
  @Post('register')
  async register(
    @Body() createUserDto: CreateUserDto,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const user =
      await this.usersService.registerOnboardingPrincipal(createUserDto);

    this.emailsService.sendEmailVerification({
      username: user.username,
      email: user.email,
      token: user.token,
    });

    let actorId: string | null = (user as any)._id?.toString?.() ?? null;
    try {
      actorId = getUserIdFromRequest(req);
    } catch {
      // Sin JWT = autoregistro; actorId ya es el usuario creado
    }
    await this.recordUserInvitationAudit(user, actorId);

    res.json({
      msg: 'El usuario se creó correctamente, revisa el email',
      user: {
        username: user.username,
        email: user.email,
      },
    });

    return user;
  }

  @Post('invite')
  async inviteUser(
    @Body() inviteUserDto: InviteUserDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const actorUserId = getUserIdFromRequest(req);
    const user = await this.usersService.inviteUser(actorUserId, inviteUserDto);

    this.emailsService.sendEmailVerification({
      username: user.username,
      email: user.email,
      token: user.token,
    });

    await this.recordUserInvitationAudit(user, actorUserId);

    res.json({
      msg: 'El usuario se creó correctamente, revisa el email',
      user: {
        username: user.username,
        email: user.email,
      },
    });

    return user;
  }

  @Public()
  @Throttle(AUTH_TOKEN)
  @HttpCode(HttpStatus.OK)
  @Get('verify/:token')
  async verifyAccount(@Param('token') token: string) {
    const user = await this.usersService.verifyAccountWithToken(token);
    const proveedorSaludId =
      (user as any).idProveedorSalud?.toString?.() ?? null;
    const userIdStr = (user as any)._id?.toString?.() ?? null;
    await this.auditService.record({
      proveedorSaludId,
      actorId: userIdStr,
      actionType: AuditActionType.USER_ACTIVATED,
      resourceType: RESOURCE_TYPE_USER,
      resourceId: userIdStr,
      payload: {
        email: user.email,
        username: user.username,
        role: (user as any).role ?? null,
      },
      eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
    });
    return { msg: 'Usuario confirmado correctamente' };
  }

  @Public()
  @Throttle(AUTH_LOGIN)
  @Post('login')
  async login(
    @Body()
    loginData: {
      email: string;
      password: string;
      loginContext?: LoginContext;
      sid?: string;
      inactivityTimeoutMinutes?: number;
      lockedAt?: string;
      unlockedAt?: string;
    },
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const {
      email,
      password,
      loginContext,
      sid,
      inactivityTimeoutMinutes,
      lockedAt,
      unlockedAt,
    } = loginData;
    const resolvedContext: LoginContext = loginContext ?? 'PRIMARY_LOGIN';
    const isSessionUnlock = resolvedContext === 'SESSION_UNLOCK';
    const actionTypeFail = isSessionUnlock
      ? AuditActionType.SESSION_UNLOCK_FAIL
      : AuditActionType.LOGIN_FAIL;
    const actionTypeSuccess = isSessionUnlock
      ? AuditActionType.SESSION_UNLOCK_SUCCESS
      : AuditActionType.LOGIN_SUCCESS;

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('El email ingresado no es válido');
    }

    const lockoutStatus =
      await this.loginLockoutService.getLockoutStatus(email);
    if (lockoutStatus.locked && lockoutStatus.retryAfterSeconds != null) {
      const minutes = Math.ceil(lockoutStatus.retryAfterSeconds / 60);
      const userForAudit = await this.usersService.findByEmail(email);
      const proveedorSaludIdForAudit = userForAudit
        ? await this.usersService.getIdProveedorSaludByUserId(
            String((userForAudit as any)._id),
          )
        : null;
      const actorIdForAudit = userForAudit
        ? (userForAudit as any)._id.toString()
        : 'ANONYMOUS';
      await this.auditService
        .record({
          proveedorSaludId: proveedorSaludIdForAudit,
          actorId: actorIdForAudit,
          actionType: AuditActionType.LOGIN_BLOCKED,
          resourceType: 'AUTH',
          resourceId: userForAudit
            ? (userForAudit as any)._id.toString()
            : null,
          payload: this.buildLoginFailPayload(
            email,
            LOGIN_FAIL_REASON.LOCKOUT,
            req,
            {
              loginContext: resolvedContext,
              sid: sid ?? null,
              inactivityTimeoutMinutes,
              lockedAt,
              unlockedAt,
            },
          ),
          eventClass: AuditEventClass.CLASS_2_SOFT_FAIL,
        })
        .catch(() => {});
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Demasiados intentos fallidos. Intente de nuevo en ${minutes} minuto${minutes !== 1 ? 's' : ''}.`,
          retryAfterSeconds: lockoutStatus.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user: UserDocument | null =
      await this.usersService.findByEmail(email);
    if (!user) {
      await this.loginLockoutService.recordFailedAttempt(email);
      await this.auditService
        .record({
          proveedorSaludId: null,
          actorId: null,
          actionType: actionTypeFail,
          resourceType: 'AUTH',
          resourceId: null,
          payload: this.buildLoginFailPayload(
            email,
            LOGIN_FAIL_REASON.USER_NOT_FOUND,
            req,
            {
              loginContext: resolvedContext,
              sid: sid ?? null,
              inactivityTimeoutMinutes,
              lockedAt,
              unlockedAt,
            },
          ),
          eventClass: AuditEventClass.CLASS_2_SOFT_FAIL,
        })
        .catch(() => {});
      throw new UnauthorizedException('El usuario no existe');
    }

    const proveedorSaludId =
      await this.usersService.getIdProveedorSaludByUserId(
        String((user as any)._id),
      );

    if (!user.verified) {
      await this.loginLockoutService.recordFailedAttempt(email);
      await this.auditService
        .record({
          proveedorSaludId,
          actorId: user._id.toString(),
          actionType: actionTypeFail,
          resourceType: 'AUTH',
          resourceId: user._id.toString(),
          payload: this.buildLoginFailPayload(
            email,
            LOGIN_FAIL_REASON.USER_NOT_VERIFIED,
            req,
            {
              loginContext: resolvedContext,
              sid: sid ?? null,
              inactivityTimeoutMinutes,
              lockedAt,
              unlockedAt,
            },
          ),
          eventClass: AuditEventClass.CLASS_2_SOFT_FAIL,
        })
        .catch(() => {});
      throw new UnauthorizedException(
        'Tu cuenta no ha sido confirmada aún, revisa tu email',
      );
    }

    if (!user.cuentaActiva) {
      await this.loginLockoutService.recordFailedAttempt(email);
      await this.auditService
        .record({
          proveedorSaludId,
          actorId: user._id.toString(),
          actionType: actionTypeFail,
          resourceType: 'AUTH',
          resourceId: user._id.toString(),
          payload: this.buildLoginFailPayload(
            email,
            LOGIN_FAIL_REASON.USER_LOCKED,
            req,
            {
              loginContext: resolvedContext,
              sid: sid ?? null,
              inactivityTimeoutMinutes,
              lockedAt,
              unlockedAt,
            },
          ),
          eventClass: AuditEventClass.CLASS_2_SOFT_FAIL,
        })
        .catch(() => {});
      throw new UnauthorizedException(
        'Tu cuenta ha sido suspendida. Contacta al administrador.',
      );
    }

    const isPasswordValid = await user.checkPassword(password);
    if (!isPasswordValid) {
      await this.loginLockoutService.recordFailedAttempt(email);
      await this.auditService
        .record({
          proveedorSaludId,
          actorId: user._id.toString(),
          actionType: actionTypeFail,
          resourceType: 'AUTH',
          resourceId: user._id.toString(),
          payload: this.buildLoginFailPayload(
            email,
            LOGIN_FAIL_REASON.INVALID_CREDENTIALS,
            req,
            {
              loginContext: resolvedContext,
              sid: sid ?? null,
              inactivityTimeoutMinutes,
              lockedAt,
              unlockedAt,
            },
          ),
          eventClass: AuditEventClass.CLASS_2_SOFT_FAIL,
        })
        .catch(() => {});
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    await this.loginLockoutService.clearLockout(email);

    const sidToReturn =
      resolvedContext === 'PRIMARY_LOGIN' ? randomUUID() : (sid ?? null);

    if (resolvedContext === 'PRIMARY_LOGIN' && sidToReturn) {
      await this.sessionActivityService.createSession(
        user._id.toString(),
        sidToReturn,
      );
    } else if (isSessionUnlock && sidToReturn) {
      await this.sessionActivityService.validateSessionOwnership(
        sidToReturn,
        user._id.toString(),
      );
      await this.sessionActivityService.touchSession(
        sidToReturn,
        user._id.toString(),
      );
    }

    const accessToken = generateAccessToken(
      user._id.toString(),
      sidToReturn ?? undefined,
    );
    const refreshToken = await this.refreshTokenService.issue(
      user._id.toString(),
    );
    setAuthCookies(res, accessToken, refreshToken);

    await this.auditService
      .record({
        proveedorSaludId,
        actorId: user._id.toString(),
        actionType: actionTypeSuccess,
        resourceType: 'AUTH',
        resourceId: user._id.toString(),
        payload: this.buildLoginSuccessPayload(req, {
          loginContext: resolvedContext,
          sid: sidToReturn,
          inactivityTimeoutMinutes,
          lockedAt,
          unlockedAt,
        }),
        eventClass: AuditEventClass.CLASS_2_SOFT_FAIL,
      })
      .catch(() => {});

    res.json({
      msg: 'Inicio de sesión exitoso',
      ...(sidToReturn ? { sid: sidToReturn } : {}),
    });
  }

  @Public()
  @Throttle(AUTH_REFRESH)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response) {
    const sid = getSidFromRequest(req);
    const presentedRefresh = getRefreshTokenFromCookies(req.cookies);
    const { userId, newRefreshToken } =
      await this.refreshTokenService.rotate(presentedRefresh ?? '');

    const user = await this.usersService.findById(userId);
    if (!user || !user.verified || !user.cuentaActiva) {
      clearAuthCookies(res);
      throw new UnauthorizedException('Sesión inválida');
    }

    const proveedorSaludId =
      await this.usersService.getIdProveedorSaludByUserId(userId);
    await this.sessionActivityService.assertAndTouchSession(
      sid,
      userId,
      proveedorSaludId,
    );

    const accessToken = generateAccessToken(userId, sid);
    setAuthCookies(res, accessToken, newRefreshToken);
    res.json({ msg: 'Sesión renovada' });
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    const sid = getSidFromRequest(req);
    await this.sessionActivityService.revokeSession(sid);
    const presentedRefresh = getRefreshTokenFromCookies(req.cookies);
    await this.refreshTokenService.revoke(presentedRefresh ?? '');
    clearAuthCookies(res);
    res.json({ msg: 'Sesión cerrada' });
  }

  @Public()
  @Throttle(AUTH_FORGOT_PASSWORD)
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    const { email } = body;
    const result = await this.usersService.issuePasswordResetToken(email);

    this.emailsService.sendEmailPasswordReset({
      username: result.username,
      email: result.email,
      token: result.token,
    });

    return { msg: 'Hemos enviado un email con las instrucciones' };
  }

  @Public()
  @Throttle(AUTH_TOKEN)
  @HttpCode(HttpStatus.OK)
  @Get('forgot-password/:token')
  async verifyPasswordResetToken(@Param('token') token: string) {
    await this.usersService.validatePasswordResetToken(token);
    return { msg: 'Token válido' };
  }

  @Public()
  @Throttle(AUTH_TOKEN)
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password/:token')
  async updatePassword(
    @Param('token') token: string,
    @Body() body: ResetPasswordDto,
  ) {
    const user = await this.usersService.resetPasswordWithToken(
      token,
      body.password,
    );
    const proveedorSaludId =
      (user as any).idProveedorSalud?.toString?.() ?? null;
    const userIdStr = (user as any)._id?.toString?.() ?? null;
    await this.auditService.record({
      proveedorSaludId,
      actorId: userIdStr,
      actionType: AuditActionType.USER_PASSWORD_CHANGED,
      resourceType: RESOURCE_TYPE_USER,
      resourceId: userIdStr,
      payload: { userId: userIdStr },
      eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
    });
    return { msg: 'Contraseña actualizada correctamente' };
  }

  @Get('get-users/:idProveedorSalud')
  async getUsersByProveedorId(
    @Param('idProveedorSalud') idProveedorSalud: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const actorUserId = getUserIdFromRequest(req);
    await this.usersService.assertActorCanAccessProveedor(
      actorUserId,
      idProveedorSalud,
    );

    const users =
      await this.usersService.findByProveedorSaludId(idProveedorSalud);
    res.json(this.usersService.sanitizeUsersList(users));
  }

  @Delete('delete-user/:email')
  @UseGuards(DeletionPasswordGuard)
  async removeUserByEmail(
    @Param('email') email: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const existingUser = await this.usersService.findByEmail(email);
    if (!existingUser) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const snapshot = {
      email: existingUser.email,
      username: existingUser.username,
      role: (existingUser as any).role ?? null,
    };
    const resourceId = (existingUser as any)._id?.toString?.() ?? null;

    const user = await this.usersService.removeUserByEmail(email);
    const actorId = getUserIdFromRequest(req);
    const actorProveedorSaludId =
      await this.usersService.getIdProveedorSaludByUserId(actorId);
    await this.auditService.record({
      proveedorSaludId: actorProveedorSaludId ?? null,
      actorId,
      actionType: AuditActionType.USER_DELETED,
      resourceType: RESOURCE_TYPE_USER,
      resourceId,
      payload: snapshot,
      eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
    });
    res.json(user);
  }

  @Post('verify-password')
  @Throttle(AUTH_VERIFY_PASSWORD)
  @HttpCode(HttpStatus.OK)
  async verifyPassword(
    @Req() req: Request,
    @Body() body: VerifyPasswordDto,
  ) {
    const userId = getUserIdFromRequest(req);
    const user = await this.usersService.findById(userId);

    if (!user || !(await user.checkPassword(body.password))) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    return { ok: true };
  }

  @Get('productividad/todos')
  async getAllProductivityStats(
    @Req() req: Request,
    @Res() res: Response,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    const actorUserId = getUserIdFromRequest(req);
    await this.usersService.assertActorIsPlatformAdministrador(actorUserId);

    const stats = await this.usersService.getAllProductivityStats(
      fechaInicio,
      fechaFin,
    );
    res.json(stats);
  }

  @Get('productividad/:idProveedorSalud')
  async getProductivityStatsByProveedor(
    @Param('idProveedorSalud') idProveedorSalud: string,
    @Req() req: Request,
    @Res() res: Response,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    const actorUserId = getUserIdFromRequest(req);
    await this.usersService.assertActorCanAccessProveedor(
      actorUserId,
      idProveedorSalud,
    );

    const stats = await this.usersService.getProductivityStatsByProveedor(
      idProveedorSalud,
      fechaInicio,
      fechaFin,
    );
    res.json(stats);
  }

  @Get('estadisticas/:userId')
  async getUserDetailedStats(
    @Param('userId') userId: string,
    @Req() req: Request,
    @Res() res: Response,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    const actorUserId = getUserIdFromRequest(req);
    await this.usersService.assertActorCanManageTargetUser(actorUserId, userId);

    const stats = await this.usersService.getUserDetailedStats(
      userId,
      fechaInicio,
      fechaFin,
    );
    res.json(stats);
  }

  @Get('user')
  async authMiddleware(@Req() req: Request, @Res() res: Response) {
    try {
      const userId = getUserIdFromRequest(req);
      const user = await this.usersService.findById(
        userId,
        '-password -token -__v',
      );
      if (!user) {
        throw new Error('Usuario no encontrado');
      }
      res.json(this.usersService.sanitizeUserPermissions(user));
    } catch (error) {
      res.status(401).json({ msg: error.message });
    }
  }

  @Patch('permisos/:userId')
  async updateUserPermissions(
    @Param('userId') userId: string,
    @Body() updatePermissionsDto: UpdatePermissionsDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const actorUserId = getUserIdFromRequest(req);
    await this.usersService.assertActorCanManageTargetUser(actorUserId, userId);

    const targetUser = await this.usersService.findById(
      userId,
      'idProveedorSalud role permisos',
    );
    if (!targetUser) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }

    const user = await this.usersService.updateUserPermissions(
      userId,
      updatePermissionsDto,
    );
    if (!user) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }

    const actorProveedorSaludId =
      await this.usersService.getIdProveedorSaludByUserId(actorUserId);
    const beforePerms =
      (targetUser as any).permisos?.toObject?.() ??
      (targetUser as any).permisos ??
      {};
    const afterPerms =
      (user as any).permisos?.toObject?.() ?? (user as any).permisos ?? {};
    const { addedPermissions, removedPermissions } =
      this.diffPermissionChanges(beforePerms, afterPerms);

    await this.auditService.record({
      proveedorSaludId: actorProveedorSaludId ?? null,
      actorId: actorUserId,
      actionType: AuditActionType.ADMIN_ROLES_PERMISSIONS,
      resourceType: RESOURCE_TYPE_USER,
      resourceId: userId,
      payload: {
        actionScope: 'PERMISSIONS',
        targetUserId: userId,
        addedPermissions,
        removedPermissions,
        targetRole: (user as any).role ?? (targetUser as any).role ?? null,
      },
      eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
    });

    res.json({ msg: 'Permisos actualizados correctamente', user });
  }

  @Patch('estado-cuenta/:userId')
  async toggleAccountStatus(
    @Param('userId') userId: string,
    @Body() body: { cuentaActiva: boolean },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const actorUserId = getUserIdFromRequest(req);
    await this.usersService.assertActorCanManageTargetUser(actorUserId, userId);

    const user = await this.usersService.toggleAccountStatus(
      userId,
      body.cuentaActiva,
    );
    if (!user) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }

    const actorProveedorSaludId =
      await this.usersService.getIdProveedorSaludByUserId(actorUserId);
    const actionType = body.cuentaActiva
      ? AuditActionType.USER_REACTIVATED
      : AuditActionType.USER_SUSPENDED;
    await this.auditService.record({
      proveedorSaludId: actorProveedorSaludId ?? null,
      actorId: actorUserId,
      actionType,
      resourceType: RESOURCE_TYPE_USER,
      resourceId: userId,
      payload: {
        email: user.email,
        username: user.username,
        role: (user as any).role ?? null,
      },
      eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
    });

    const estado = body.cuentaActiva ? 'reactivada' : 'suspendida';
    res.json({ msg: `Cuenta ${estado} correctamente`, user });
  }

  @Patch('asignaciones/:userId')
  async updateUserAssignments(
    @Param('userId') userId: string,
    @Body() updateAssignmentsDto: UpdateAssignmentsDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const actorUserId = getUserIdFromRequest(req);
    await this.usersService.assertActorCanManageTargetUser(actorUserId, userId);

    const targetUser = await this.usersService.findById(
      userId,
      'idProveedorSalud empresasAsignadas centrosTrabajoAsignados',
    );
    if (!targetUser) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }

    const beforeEmpresas = this.normalizeIds(
      (targetUser as any).empresasAsignadas ?? [],
    );
    const beforeCentros = this.normalizeIds(
      (targetUser as any).centrosTrabajoAsignados ?? [],
    );

    const user = await this.usersService.updateUserAssignments(
      userId,
      updateAssignmentsDto,
    );
    if (!user) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }

    const afterEmpresas = this.normalizeIds(
      (user as any).empresasAsignadas ?? [],
    );
    const afterCentros = this.normalizeIds(
      (user as any).centrosTrabajoAsignados ?? [],
    );

    const empresasDiff = this.diffAssignments(beforeEmpresas, afterEmpresas);
    const centrosDiff = this.diffAssignments(beforeCentros, afterCentros);
    const empresasChanged =
      empresasDiff.added.length > 0 || empresasDiff.removed.length > 0;
    const centrosChanged =
      centrosDiff.added.length > 0 || centrosDiff.removed.length > 0;
    const changed = empresasChanged || centrosChanged;

    const actorProveedorSaludId =
      await this.usersService.getIdProveedorSaludByUserId(actorUserId);
    await this.auditService.record({
      proveedorSaludId: actorProveedorSaludId ?? null,
      actorId: actorUserId,
      actionType: AuditActionType.ADMIN_USER_ASSIGNMENTS,
      resourceType: RESOURCE_TYPE_USER,
      resourceId: userId,
      payload: {
        actionScope: 'ASSIGNMENTS',
        targetUserId: userId,
        changed,
        empresasChanged,
        centrosChanged,
        empresasCountBefore: beforeEmpresas.length,
        empresasCountAfter: afterEmpresas.length,
        centrosCountBefore: beforeCentros.length,
        centrosCountAfter: afterCentros.length,
        empresasIdsAdded: empresasDiff.added,
        empresasIdsRemoved: empresasDiff.removed,
        centrosIdsAdded: centrosDiff.added,
        centrosIdsRemoved: centrosDiff.removed,
      },
      eventClass: AuditEventClass.CLASS_1_HARD_FAIL,
    });

    res.json({ msg: 'Asignaciones actualizadas correctamente', user });
  }

  @Get('asignaciones/:userId/centros-trabajo')
  async getUserCentrosTrabajo(
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    try {
      const centrosTrabajo =
        await this.usersService.getUserCentrosTrabajo(userId);
      res.json(centrosTrabajo || []);
    } catch (error) {
      console.error('Error al obtener centros de trabajo del usuario:', error);
      res.status(500).json({ msg: 'Error interno del servidor' });
    }
  }

  @Get('asignaciones/:userId')
  async getUserAssignments(
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    try {
      const user = await this.usersService.getUserAssignments(userId);
      if (!user) {
        return res.status(404).json({ msg: 'Usuario no encontrado' });
      }
      res.json({
        empresasAsignadas: user.empresasAsignadas || [],
        centrosTrabajoAsignados: user.centrosTrabajoAsignados || [],
      });
    } catch (error) {
      console.error('Error al obtener asignaciones:', error);
      res.status(500).json({ msg: 'Error interno del servidor' });
    }
  }
}
