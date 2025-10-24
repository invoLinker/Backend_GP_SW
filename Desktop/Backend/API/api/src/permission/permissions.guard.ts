// permissions.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolePermissionService } from '../RolePermission/RolePermission.service'; // عدلي المسار

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rolePermissionService: RolePermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>(
      'permission',
      context.getHandler(),
    );

    if (!requiredPermission) return true; // إذا مافي permission محدد

    const request = context.switchToHttp().getRequest();
    const user = request.user; // لازم JWT guard يكون مفعل قبل هذا guard

    if (!user || !user.role) throw new ForbiddenException('No role found');

    // جلب Permissions الخاصة بالرول من الـ DB
    const permissions = await this.rolePermissionService.getPermissionsForRole(user.role);

    if (permissions.includes(requiredPermission)) return true;

    throw new ForbiddenException('You do not have permission');
  }
}
