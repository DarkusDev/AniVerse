import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AccessRequestUser } from '../../auth/types/request-user.type';

export const GetUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessRequestUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AccessRequestUser }>();
    return request.user;
  },
);
