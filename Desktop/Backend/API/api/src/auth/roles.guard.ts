import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // جلب الرولز المطلوبة من الـ decorator
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true; // إذا ما حددنا رول، كل المستخدمين مسموح

    const request = context.switchToHttp().getRequest();
    const user = request.user; // هنا الـ user جاي من JwtStrategy

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Forbidden resource');
    }

    return true;
  }
}
