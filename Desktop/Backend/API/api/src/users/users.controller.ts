import { 
  Controller, Get, Post, Body, Param, Query, Patch, Delete, UseGuards, Req , Request, UploadedFile,
  UseInterceptors, BadRequestException,
  ValidationPipe,
  UsePipes
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './CreatUserDto';
import { UpdateUserDto } from './UpdateUserDto';
import { ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PermissionName } from 'src/permission/permission.decorator';
import { PermissionsGuard } from '../permission/PermissionsGuard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Uploads } from 'openai/resources/index.js';
import { HistoryLogService } from '../History/history-log.service';
import { HistoryCategory, HistorySeverity } from '../History/create-history-log.dto';
import e from 'express';
import { Public } from '../auth/jwt-auth.guard'; 



@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService,
              private readonly historyLogService: HistoryLogService
  ) {}

  @Public()
  @Post('signup')
  @UseInterceptors(FileInterceptor('ID_image'))
  async create(
    @Body(new ValidationPipe({ transform: true })) createUserDto: CreateUserDto,
    @UploadedFile() ID_imageFile?: Express.Multer.File
  ) {
    if (!ID_imageFile) {
      throw new BadRequestException('ID_image is required');
    }

     try {
      const result = await this.usersService.create(createUserDto, ID_imageFile);

      await this.historyLogService.createLog({
        action: 'User Created',
        description: `User with email=${createUserDto.email} created`,
        user: result.user.email,
        userRole: result.user.role ?? 'Unknown',
        category: HistoryCategory.USER,
        severity: HistorySeverity.SUCCESS,
        details: result.message,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'User Creation Failed',
        description: error.message,
        user: createUserDto.email,
        userRole: 'Unknown',
        category: HistoryCategory.USER,
        severity: HistorySeverity.ERROR,
        details: error,
      });
      throw error;
    }
  }

  @Public()
  @Get('reset-password')
  async resetPasswordViaLink(@Query('token') token: string) {
    return this.usersService.resetPassword(token);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('profile')
  async getProfile(@Req() req) {
    return this.usersService.findOne(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Request() req) {
    return this.usersService.findAll(); 
  }

  

  @UseGuards(JwtAuthGuard)
  @PermissionName('search_users')
  @Get('search')
  @ApiOperation({ summary: 'Search users by query' })
  async searchUsers(@Query('q') query: string) {
    return this.usersService.searchUsers(query);
  }

  @UseGuards(JwtAuthGuard)
  @PermissionName('search_users')
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @PermissionName('search_users')
  @Get('by-role/:roleId')
  @ApiOperation({ summary: 'Get users by Role ID' })
  findByRole(@Param('roleId', ParseIntPipe) roleId: number) {
    return this.usersService.findByRole(roleId);
  }

  
  @UseGuards(JwtAuthGuard)
  @PermissionName('search_users')
  @Get('by-email/:email')
  @ApiOperation({ summary: 'Get user by email' })
  findByEmail(@Param('email') email: string) {
    return this.usersService.findByEmail(email);
  }

  @UseGuards(JwtAuthGuard)
  @PermissionName('search_users')
  @Get('by-role-name/:roleName')
  @ApiOperation({ summary: 'Get users by Role Name' })
  findByRoleName(@Param('roleName') roleName: string) {
    return this.usersService.findByRoleName(roleName);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @PermissionName('update_users_status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateUserDto,
    @Req() req
  ) {
    try {
      const result = await this.usersService.updateStatus(id, updateStatusDto);

      await this.historyLogService.createLog({
        action: 'User Status Updated',
        description: `User id=${id} status updated`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.USER,
        severity: HistorySeverity.SUCCESS,
        details: result,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'User Status Update Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.USER,
        severity: HistorySeverity.ERROR,
        details: error,
      });
      throw error;
    }
  }

    @Patch(':id/password')
    @UseGuards(JwtAuthGuard)
    async updatePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePasswordDto: UpdateUserDto,
    @Req() req
  ) {
    try {
      const result = await this.usersService.updatePassword(id, updatePasswordDto);

      await this.historyLogService.createLog({
        action: 'User Password Updated',
        description: `User id=${id} password changed`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.SECURITY,
        severity: HistorySeverity.SUCCESS,
        details: result.message,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'User Password Update Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.SECURITY,
        severity: HistorySeverity.ERROR,
        details: error,
      });
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @PermissionName('delete_users_by_id')
  @Delete()
  @ApiOperation({ summary: 'Delete users immediately' })
  async deleteUsers(
    @Request() req,
    @Body('userIds') userIds: number[]
  ) {
    if (!userIds || userIds.length === 0) {
      throw new BadRequestException('No user IDs provided');
    }

    try {
      await this.usersService.deleteUsers(userIds);

      await this.historyLogService.createLog({
        action: 'Users Deleted',
        description: `Users with IDs [${userIds.join(', ')}] deleted`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.USER,
        severity: HistorySeverity.WARNING,
        details: { userIds },
      });

      return { message: 'User/s deleted successfully' };

    } catch (error) {
      await this.historyLogService.createLog({
        action: 'User Deletion Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.USER,
        severity: HistorySeverity.ERROR,
        details: error,
      });
      throw error;
    }
  }



  
  @Patch(':id/statusRole')
  @UseGuards(JwtAuthGuard)
  @PermissionName('update_users_role')
  async updateRoleStatus(
    @Param('id') id: number,
    @Body() updateRoleDto: UpdateUserDto,
    @Req() req
  ) {
    try {
      const result = await this.usersService.updateRoleStatus(id, updateRoleDto);

      let changes: string[] = [];

      if (updateRoleDto.role_name) {
        changes.push(`role changed to ${updateRoleDto.role_name}`);
      }

      if (updateRoleDto.status) {
        changes.push(`status changed to ${updateRoleDto.status}`);
      }

      const description =
        changes.length > 0
          ? `User id=${id} ${changes.join(' and ')}`
          : `User id=${id} updated`;

      await this.historyLogService.createLog({
        action: 'User Role Status Updated',
        description: description,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.USER,
        severity: HistorySeverity.SUCCESS,
        details: result,
      });

      return result;

    } catch (error) {
      await this.historyLogService.createLog({
        action: 'User Role Status Update Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.USER,
        severity: HistorySeverity.ERROR,
        details: error,
      });
      throw error;
    }
  }


  @Patch(':id/role')
  @UseGuards(JwtAuthGuard)
  @PermissionName('update_users_role')
  async updateUserRole(
    @Param('id') id: number,
    @Body() updateRoleDto: UpdateUserDto,
    @Req() req
  ) {
    try {
      const result = await this.usersService.updateUserRole(id, updateRoleDto.role_name);

      await this.historyLogService.createLog({
        action: 'User Role Updated',
        description: `User id=${id} role changed to ${updateRoleDto.role_name}`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.USER,
        severity: HistorySeverity.SUCCESS,
        details: result,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'User Role Update Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.USER,
        severity: HistorySeverity.ERROR,
        details: error,
      });
      throw error;
    }
  }


  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('profile_image'))
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() profile_imageFile: Express.Multer.File,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req
  ) {
    try {
      const result = await this.usersService.updateUser(id, updateUserDto, profile_imageFile);

      await this.historyLogService.createLog({
        action: 'User Updated',
        description: `User id=${id} updated`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.USER,
        severity: HistorySeverity.SUCCESS,
        details: result,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'User Update Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.ERROR,
        details: error,
      });
      throw error;
    }
  }



}
 