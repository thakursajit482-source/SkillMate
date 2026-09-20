import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UserPayload {
  id: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof UserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserPayload;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
