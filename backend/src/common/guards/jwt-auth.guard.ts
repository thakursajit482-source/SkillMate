import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '@common/decorators/public.decorator';
import { isObservable, firstValueFrom } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isPublic) {
      const result = super.canActivate(context);
      if (isObservable(result)) {
        return await firstValueFrom(result);
      }
      if (result instanceof Promise) {
        return await result;
      }
      return result as boolean;
    }

    try {
      const result = super.canActivate(context);
      if (isObservable(result)) {
        return await firstValueFrom(result);
      }
      if (result instanceof Promise) {
        return await result;
      }
      return result as boolean;
    } catch {
      return true;
    }
  }

  handleRequest(err: any, user: any, info: any, context?: ExecutionContext) {
    if (context) {
      const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (isPublic) {
        return user || null;
      }
    }
    if (err || !user) {
      throw new UnauthorizedException(
        info?.message ? `Unauthorized: ${info.message}` : 'Unauthorized: Valid token required',
      );
    }
    return user;
  }
}
