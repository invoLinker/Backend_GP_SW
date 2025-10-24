import { Module, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from './users.model';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RolesModule } from '../roles/roles.module';
import { Role } from 'src/roles/roles.model';
import { RolePermissionModule } from 'src/RolePermission/RolePermission.module';

@Module({
  imports: [
    SequelizeModule.forFeature([User,Role]),
    forwardRef(() => RolesModule),RolePermissionModule
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
