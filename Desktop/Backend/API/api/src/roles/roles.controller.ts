import { Controller, Get, Post, Patch, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RoleDto } from './RoleDto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PermissionsGuard } from '../permission/PermissionsGuard';
import { PermissionName } from 'src/permission/permission.decorator';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @PermissionName("create_role")
  @Post()
  create(@Body() createRoleDto: RoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @UseGuards(JwtAuthGuard)
  @PermissionName("update_role")
  @Patch(':id')
  update( @Param('id') id: number, @Body() roleDto: RoleDto) {
    return this.rolesService.update(id, roleDto);
  }

  @UseGuards(JwtAuthGuard)
  @PermissionName("delete_all_role")
  @Delete()
  deleteAll() {
    return this.rolesService.deleteAll();
  }

  @UseGuards(JwtAuthGuard)
  @PermissionName("delete_role_by_id")
  deleteById(@Param('id') id: number) {
    return this.rolesService.deleteById( id);
  }

  @UseGuards(JwtAuthGuard)
  @PermissionName("get_role_by_name")
  @Delete('by-name/:role_name')
  async deleteByRoleName(@Param('role_name') role_name: string) {
    return await this.rolesService.deleteByRoleName(role_name);
  }

  
  
}

