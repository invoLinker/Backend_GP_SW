import { Module, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Role } from './roles.model';
import { RolesService } from './roles.service';
import { RolesController} from './roles.controller';
import { UsersModule } from '../users/users.module';
import { User } from 'src/users/users.model';
import { RolePermissionModule } from '../RolePermission/RolePermission.module';
import { PermissionsModule } from 'src/permission/permission.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Role,User]),
    forwardRef(() => UsersModule),
    RolePermissionModule
  ],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}

