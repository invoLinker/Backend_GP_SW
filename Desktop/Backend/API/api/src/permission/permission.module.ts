import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Permission } from './permission.model';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { RolePermissionModule } from 'src/RolePermission/RolePermission.module';

@Module({
  imports: [SequelizeModule.forFeature([Permission ]),
  RolePermissionModule
],
  providers: [PermissionsService],
  controllers: [PermissionsController],
  
})
export class PermissionsModule {}

