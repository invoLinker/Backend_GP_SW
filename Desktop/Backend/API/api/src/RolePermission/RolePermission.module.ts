import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { RolePermission } from './RolePermission.model';
import { Role } from '../roles/roles.model';
import { Permission } from '../permission/permission.model';
import { RolePermissionService } from './RolePermission.service';
import { RolePermissionController } from './RolePermission.controller';

@Module({
  imports: [SequelizeModule.forFeature([RolePermission, Role, Permission])],
  controllers: [RolePermissionController],
  providers: [RolePermissionService],
  exports: [RolePermissionService],
})
export class RolePermissionModule {}
