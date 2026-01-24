import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolePermissionService } from '../RolePermission/RolePermission.service'; 

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

    if (!requiredPermission) return true; 

    const request = context.switchToHttp().getRequest();
    const user = request.user; 

    if (!user || !user.role) throw new ForbiddenException('No role found');

    const permissions = await this.rolePermissionService.getPermissionsForRole(user.role);

    if (permissions.includes(requiredPermission)) return true;

    throw new ForbiddenException('You do not have permission');
  }
}
