import {
  Controller,
  Get,
  Post,
  Body,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  Res,
  Req,
  NotFoundException,
  HttpCode,
  HttpStatus,
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
import { EmailsService } from '../emails/emails.service';
import { Public } from 'src/utils/decorators/public.decorator';
import { getUserIdFromRequest } from 'src/utils/auth-helpers';
import {
  AUTH_FORGOT_PASSWORD,
  AUTH_LOGIN,
  AUTH_REFRESH,
  AUTH_REGISTER,
  AUTH_TOKEN,
  AUTH_VERIFY_PASSWORD,
} from 'src/utils/throttle/throttle-limits';
import { DeletionPasswordGuard } from 'src/utils/guards/deletion-password.guard';

@Controller('auth/users')
@ApiTags('Usuarios')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly emailsService: EmailsService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  @Public()
  @Throttle(AUTH_REGISTER)
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto, @Res() res: Response) {
    const user =
      await this.usersService.registerOnboardingPrincipal(createUserDto);

    this.emailsService.sendEmailVerification({
      username: user.username,
      email: user.email,
      token: user.token,
    });

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
    await this.usersService.verifyAccountWithToken(token);
    return { msg: 'Usuario confirmado correctamente' };
  }

  @Public()
  @Throttle(AUTH_LOGIN)
  @Post('login')
  async login(
    @Body() loginData: { email: string; password: string },
    @Res() res: Response,
  ) {
    const { email, password } = loginData;
    // Revisar que si sea un email
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('El email ingresado no es válido');
    }

    // Revisar que el usuario exista
    const user: UserDocument | null =
      await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('El usuario no existe');
    }

    // Revisar si el usuario confirmo su cuenta
    if (!user.verified) {
      throw new UnauthorizedException(
        'Tu cuenta no ha sido confirmada aún, revisa tu email',
      );
    }

    // Revisar si la cuenta está activa
    if (!user.cuentaActiva) {
      throw new UnauthorizedException('Tu cuenta ha sido suspendida. Contacta al administrador.');
    }

    // Comprobar el password utilizando el método definido en el esquema
    const isPasswordValid = await user.checkPassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = await this.refreshTokenService.issue(
      user._id.toString(),
    );
    setAuthCookies(res, accessToken, refreshToken);
    res.json({ msg: 'Inicio de sesión exitoso' });
  }

  @Public()
  @Throttle(AUTH_REFRESH)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response) {
    const presentedRefresh = getRefreshTokenFromCookies(req.cookies);
    const { userId, newRefreshToken } =
      await this.refreshTokenService.rotate(presentedRefresh ?? '');

    const user = await this.usersService.findById(userId);
    if (!user || !user.verified || !user.cuentaActiva) {
      clearAuthCookies(res);
      throw new UnauthorizedException('Sesión inválida');
    }

    const accessToken = generateAccessToken(userId);
    setAuthCookies(res, accessToken, newRefreshToken);
    res.json({ msg: 'Sesión renovada' });
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
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
    await this.usersService.resetPasswordWithToken(token, body.password);
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
    res.json(users);
  }

  @Delete('delete-user/:email')
  @UseGuards(DeletionPasswordGuard)
  async removeUserByEmail(
    @Param('email') email: string,
    @Res() res: Response,
  ) {
    try {
      const user = await this.usersService.removeUserByEmail(email);
      res.json(user);
    } catch (error) {
      console.log(error);
      throw error;
    }
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

  // Área Privada - JWT validado por JwtAuthGuard global
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
      res.json(user);
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

    const user = await this.usersService.updateUserPermissions(
      userId,
      updatePermissionsDto,
    );
    if (!user) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }
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

    const user = await this.usersService.updateUserAssignments(
      userId,
      updateAssignmentsDto,
    );
    if (!user) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }
    res.json({ msg: 'Asignaciones actualizadas correctamente', user });
  }

  @Get('asignaciones/:userId/centros-trabajo')
  async getUserCentrosTrabajo(
    @Param('userId') userId: string,
    @Res() res: Response
  ) {
    try {
      const centrosTrabajo = await this.usersService.getUserCentrosTrabajo(userId);
      res.json(centrosTrabajo || []);
    } catch (error) {
      console.error('Error al obtener centros de trabajo del usuario:', error);
      res.status(500).json({ msg: 'Error interno del servidor' });
    }
  }

  @Get('asignaciones/:userId')
  async getUserAssignments(
    @Param('userId') userId: string,
    @Res() res: Response
  ) {
    try {
      const user = await this.usersService.getUserAssignments(userId);
      if (!user) {
        return res.status(404).json({ msg: 'Usuario no encontrado' });
      }
      res.json({
        empresasAsignadas: user.empresasAsignadas || [],
        centrosTrabajoAsignados: user.centrosTrabajoAsignados || []
      });
    } catch (error) {
      console.error('Error al obtener asignaciones:', error);
      res.status(500).json({ msg: 'Error interno del servidor' });
    }
  }
}
