import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { AccountStatusGuard } from './account-status.guard';
import { SessionInactivityGuard } from './session-inactivity.guard';
import { UsersService } from '../../modules/users/users.service';
import { SessionActivityService } from '../../modules/users/session-activity.service';
import { UserActivitySession } from '../../modules/users/schemas/user-activity-session.schema';
import { RegulatoryPolicyService } from '../regulatory-policy.service';
import {
  ACCOUNT_INACTIVE_ERROR_CODE,
  ACCOUNT_INACTIVE_MESSAGE,
} from '../account-status.constants';
import { SESSION_IDLE_ERROR_CODE } from '../session-inactivity.constants';

jest.mock('../auth-helpers', () => ({
  getSidFromRequest: jest.fn(),
}));

import { getSidFromRequest } from '../auth-helpers';

const SIRES_POLICY = {
  regime: 'SIRES_NOM024',
  features: { sessionTimeoutEnabled: true },
};

const SIN_REGIMEN_POLICY = {
  regime: 'SIN_REGIMEN',
  features: { sessionTimeoutEnabled: false },
};

describe('H: AccountStatusGuard antes de inactividad (SIRES / SIN_REGIMEN)', () => {
  let accountStatusGuard: AccountStatusGuard;
  let sessionInactivityGuard: SessionInactivityGuard;
  let usersService: { findAuthStatusById: jest.Mock };
  let regulatoryPolicyService: { getRegulatoryPolicy: jest.Mock };
  let sessionModel: { findOne: jest.Mock };

  const proveedorId = '507f1f77bcf86cd799439012';
  const issuedAtSec = 1_700_000_000;
  const userId = 'user-1';

  const activeStatus = {
    cuentaActiva: true,
    verified: true,
    idProveedorSalud: proveedorId,
    tokensInvalidBefore: null as Date | null,
  };

  const createContext = (): ExecutionContext => {
    const request: Record<string, unknown> = {
      userId,
      jwtIat: issuedAtSec,
      method: 'GET',
      path: '/api/trabajadores',
    };
    return {
      getHandler: () => jest.fn(),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  async function runPipeline(ctx: ExecutionContext): Promise<void> {
    await accountStatusGuard.canActivate(ctx);
    await sessionInactivityGuard.canActivate(ctx);
  }

  beforeEach(async () => {
    usersService = {
      findAuthStatusById: jest.fn().mockResolvedValue(activeStatus),
    };
    regulatoryPolicyService = {
      getRegulatoryPolicy: jest.fn().mockResolvedValue(SIRES_POLICY),
    };
    sessionModel = {
      findOne: jest.fn(),
    };
    (getSidFromRequest as jest.Mock).mockReturnValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountStatusGuard,
        SessionInactivityGuard,
        SessionActivityService,
        Reflector,
        { provide: UsersService, useValue: usersService },
        {
          provide: RegulatoryPolicyService,
          useValue: regulatoryPolicyService,
        },
        {
          provide: getModelToken(UserActivitySession.name),
          useValue: sessionModel,
        },
      ],
    }).compile();

    accountStatusGuard = module.get(AccountStatusGuard);
    sessionInactivityGuard = module.get(SessionInactivityGuard);
  });

  it('control: usuario activo + SIRES sin sid → inactividad sí se ejecuta (SESSION_IDLE)', async () => {
    regulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(SIRES_POLICY);
    try {
      await runPipeline(createContext());
      throw new Error('expected SESSION_IDLE');
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).getResponse()).toEqual(
        expect.objectContaining({ code: SESSION_IDLE_ERROR_CODE }),
      );
    }
    expect(regulatoryPolicyService.getRegulatoryPolicy).toHaveBeenCalled();
  });

  it('control: usuario activo + SIN_REGIMEN sin sid → inactividad no bloquea', async () => {
    regulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(
      SIN_REGIMEN_POLICY,
    );
    await expect(runPipeline(createContext())).resolves.toBeUndefined();
    expect(regulatoryPolicyService.getRegulatoryPolicy).toHaveBeenCalled();
  });

  it.each([
    ['SIRES_NOM024', SIRES_POLICY],
    ['SIN_REGIMEN', SIN_REGIMEN_POLICY],
  ])(
    'H: cuenta suspendida se rechaza con ACCOUNT_INACTIVE en %s antes de inactividad',
    async (_label, policy) => {
      regulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(policy);
      usersService.findAuthStatusById.mockResolvedValue({
        ...activeStatus,
        cuentaActiva: false,
      });

      try {
        await runPipeline(createContext());
        throw new Error('expected ACCOUNT_INACTIVE');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect((error as UnauthorizedException).getResponse()).toEqual(
          expect.objectContaining({
            code: ACCOUNT_INACTIVE_ERROR_CODE,
            message: ACCOUNT_INACTIVE_MESSAGE,
          }),
        );
      }
      expect(regulatoryPolicyService.getRegulatoryPolicy).not.toHaveBeenCalled();
      expect(sessionModel.findOne).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['SIRES_NOM024', SIRES_POLICY],
    ['SIN_REGIMEN', SIN_REGIMEN_POLICY],
  ])(
    'H: watermark inválido con cuenta activa se rechaza en %s antes de inactividad',
    async (_label, policy) => {
      regulatoryPolicyService.getRegulatoryPolicy.mockResolvedValue(policy);
      usersService.findAuthStatusById.mockResolvedValue({
        cuentaActiva: true,
        verified: true,
        idProveedorSalud: proveedorId,
        tokensInvalidBefore: new Date((issuedAtSec + 10) * 1000),
      });

      try {
        await runPipeline(createContext());
        throw new Error('expected ACCOUNT_INACTIVE');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect((error as UnauthorizedException).getResponse()).toEqual(
          expect.objectContaining({ code: ACCOUNT_INACTIVE_ERROR_CODE }),
        );
      }
      expect(regulatoryPolicyService.getRegulatoryPolicy).not.toHaveBeenCalled();
    },
  );
});
