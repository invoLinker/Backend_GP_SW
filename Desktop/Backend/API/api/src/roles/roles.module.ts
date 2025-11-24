import { Module, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Role } from './roles.model';
import { RolesService } from './roles.service';
import { RolesController} from './roles.controller';
import { UsersModule } from '../users/users.module';
import { User } from 'src/users/users.model';
import { RolePermissionModule } from '../RolePermission/RolePermission.module';
import { PermissionsModule } from 'src/permission/permission.module';
import { HistoryLog } from 'src/History/history-log.model';
import { HistoryLogService } from 'src/History/history-log.service';

@Module({
  imports: [
    SequelizeModule.forFeature([Role,User, HistoryLog]),
    forwardRef(() => UsersModule),
    RolePermissionModule
  ],
  controllers: [RolesController],
  providers: [RolesService, HistoryLogService],
  exports: [RolesService],
})
export class RolesModule {}

