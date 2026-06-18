import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (data: 'id' | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { userId?: string }>();
    if (data === 'id') {
      return request.userId;
    }
    return request.userId;
  },
);
