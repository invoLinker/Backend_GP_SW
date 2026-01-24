import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';

export const Public = () => SetMetadata('isPublic', true);

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
  const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
    context.getHandler(),
    context.getClass(),
  ]);

  const req = context.switchToHttp().getRequest();
  console.log('=== JwtAuthGuard.canActivate ===');
  console.log('isPublic=', isPublic);
  console.log('has Authorization header=', !!req.headers['authorization']);
  console.log('method, url=', req.method, req.url);

  if (isPublic) return true;
  return super.canActivate(context);
}

}
