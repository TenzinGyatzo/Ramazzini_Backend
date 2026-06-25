import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppThrottlerGuard } from './app-throttler.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('AppThrottlerGuard', () => {
  const storageService = {
    increment: jest.fn(),
  };
  const options = { throttlers: [{ name: 'default', ttl: 60_000, limit: 150 }] };

  function createGuard(isPublic: boolean) {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === IS_PUBLIC_KEY) return isPublic;
        return undefined;
      }),
    } as unknown as Reflector;

    return new AppThrottlerGuard(options, storageService as any, reflector);
  }

  function createContext(): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  }

  it('omite throttling en rutas autenticadas (no @Public)', async () => {
    const guard = createGuard(false);
    const shouldSkip = await (guard as any).shouldSkip(createContext());
    expect(shouldSkip).toBe(true);
  });

  it('aplica throttling en rutas @Public', async () => {
    const guard = createGuard(true);
    const shouldSkip = await (guard as any).shouldSkip(createContext());
    expect(shouldSkip).toBe(false);
  });
});
