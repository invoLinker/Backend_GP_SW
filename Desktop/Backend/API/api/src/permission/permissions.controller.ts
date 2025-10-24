import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './CreatePermissionDto';
import { UpdatePermissionDto } from './UpdatePermissionDto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PermissionsGuard } from './PermissionsGuard';
import { PermissionName } from './permission.decorator';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @PermissionName("get_permission") 
//   @Roles('Admin') 
  async findAll() {
    return this.permissionsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @PermissionName("get_permission_by_id")  
//   @Roles('Admin')
  async findOne(@Param('id') id: number) {
    return this.permissionsService.findOne(id);
  }


 @Get('by-name/:name')
 @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
 @PermissionName("get_permission_by_name")
 async findByName(@Param('name') name: string) {
    return await this.permissionsService.findByName(name);
 }


  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @PermissionName("create_permission") 
//   @Roles('Admin')
  async create(@Body() dto: CreatePermissionDto) {
    return this.permissionsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
 @PermissionName("update_permission")
//   @Roles('Admin')
  async update( @Param('id') id: number, @Body() dto: UpdatePermissionDto) {
  return this.permissionsService.update(id, dto);
}
 

@Delete('id/:id')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@PermissionName("delete_permission_by_id")
// @Roles('Admin')
async deleteById(@Param('id') id: number) {
  return this.permissionsService.removeById(id);
}

@Delete('name/:name')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@PermissionName("delete_permission_by_name")
// @Roles('Admin')
async deleteByName(@Param('name') name: string) {
  return this.permissionsService.removeByName(name);
}

@Delete('all')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@PermissionName("delete_all_permission")
// @Roles('Admin')
async deleteAll() {
  return this.permissionsService.removeAll();
}

}
