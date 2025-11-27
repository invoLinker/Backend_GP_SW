import { Controller, Get, Post, Patch, Body, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RoleDto } from './RoleDto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionName } from 'src/permission/permission.decorator';
import { HistoryLogService } from 'src/History/history-log.service';
import { HistoryCategory, HistorySeverity } from 'src/History/create-history-log.dto';
import { UpdatDto } from './UpdateRoleDTO';

@Controller('roles')
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly historyLogService: HistoryLogService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Req() req: any) {
    try {
      const result = await this.rolesService.findAll();

      await this.historyLogService.createLog({
        action: 'View Roles',
        description: `User viewed all roles`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.SYSTEM,
        severity: HistorySeverity.SUCCESS,
        details: result,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'View Roles Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.SYSTEM,
        severity: HistorySeverity.ERROR,
        details: error,
      });
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @PermissionName("create_role")
  @Post()
  async create(@Body() createRoleDto: RoleDto, @Req() req: any) {
    try {
      const result = await this.rolesService.create(createRoleDto);

      await this.historyLogService.createLog({
        action: 'Create Role',
        description: `Role "${createRoleDto.role_name}" created`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.SYSTEM,
        severity: HistorySeverity.SUCCESS,
        details: result,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Create Role Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.SYSTEM,
        severity: HistorySeverity.ERROR,
        details: error,
      });
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @PermissionName("update_role")
  @Patch(':id')
  async update(@Param('id') id: number, @Body() roleDto: UpdatDto, @Req() req: any) {
    try {
      const result = await this.rolesService.update(id, roleDto);

      await this.historyLogService.createLog({
        action: 'Update Role',
        description: `Role with id=${id} updated`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.SYSTEM,
        severity: HistorySeverity.SUCCESS,
        details: result,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Update Role Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.SYSTEM,
        severity: HistorySeverity.ERROR,
        details: error,
      });
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @PermissionName("delete_all_role")
  @Delete()
  async deleteAll(@Req() req: any) {
    try {
      const result = await this.rolesService.deleteAll();

      await this.historyLogService.createLog({
        action: 'Delete All Roles',
        description: `All roles deleted`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.SYSTEM,
        severity: HistorySeverity.WARNING,
        details: result,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Delete All Roles Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.SYSTEM,
        severity: HistorySeverity.ERROR,
        details: error,
      });
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @PermissionName("delete_role_by_id")
  @Delete(':id')
  async deleteById(@Param('id') id: number, @Req() req: any) {
    try {
      const result = await this.rolesService.deleteById(id);

      await this.historyLogService.createLog({
        action: 'Delete Role',
        description: `Role with id=${id} deleted`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.SYSTEM,
        severity: HistorySeverity.WARNING,
        details: result,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Delete Role Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.SYSTEM,
        severity: HistorySeverity.ERROR,
        details: error,
      });
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @PermissionName("get_role_by_name")
  @Delete('by-name/:role_name')
  async deleteByRoleName(@Param('role_name') role_name: string, @Req() req: any) {
    try {
      const result = await this.rolesService.deleteByRoleName(role_name);

      await this.historyLogService.createLog({
        action: 'Delete Role By Name',
        description: `Role "${role_name}" deleted`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.SYSTEM,
        severity: HistorySeverity.WARNING,
        details: result,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Delete Role By Name Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.SYSTEM,
        severity: HistorySeverity.ERROR,
        details: error,
      });
      throw error;
    }
  }
}
