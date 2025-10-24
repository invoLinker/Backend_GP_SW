import { Controller, Post, Delete, Get, Param, UseGuards, Body } from '@nestjs/common';
import { RolePermissionService } from './RolePermission.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RolePermissionDto } from './RolePermissionDto';
import { PermissionsGuard } from '../permission/PermissionsGuard';
import { PermissionName } from 'src/permission/permission.decorator';

@Controller('role-permissions')
export class RolePermissionController {
  constructor(private readonly rolePermissionService: RolePermissionService) {}

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@PermissionName("add_relation")
//  @Roles('Admin')
 @Post()
  async add(@Body() dto: RolePermissionDto) {
    return this.rolePermissionService.addRolePermission(dto);
  }

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@PermissionName("delete_relation")
// @Roles('Admin')
@Delete()
async removeRelation(@Body() dto: RolePermissionDto) {
  return this.rolePermissionService.removeRelation(dto);
}


}
