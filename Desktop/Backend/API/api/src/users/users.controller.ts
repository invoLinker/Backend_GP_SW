import { 
  Controller, Get, Post, Body, Param, Query, Patch, Delete, UseGuards, Req 
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

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('profile')
  async getProfile(@Req() req) {
    return this.usersService.findOne(req.user.userId); // بدل req.user.sub
  }


  @UseGuards(JwtAuthGuard)
  // @Roles('Admin','HeadOfDepartment')
  @PermissionName('view_users')
  @Get()
  findAll() {
    return this.usersService.findAll();
  }


  // @Roles('Admin','Manager')
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @PermissionName('search_users')
  // @Roles('Admin','Manager','HeadOfDepartment')
  @Get('search')
  @ApiOperation({ summary: 'Search users by query' })
  async searchUsers(@Query('q') query: string) {
    return this.usersService.searchUsers(query);
  }

  @UseGuards(JwtAuthGuard)
  // @Roles('Admin')
  @PermissionName('search_users')
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  // @Roles('Admin','Manager','HeadOfDepartment')
  @PermissionName('search_users')
  @Get('by-role/:roleId')
  @ApiOperation({ summary: 'Get users by Role ID' })
  findByRole(@Param('roleId', ParseIntPipe) roleId: number) {
    return this.usersService.findByRole(roleId);
  }

  
  @UseGuards(JwtAuthGuard)
  // @Roles('Admin','Manager','HeadOfDepartment')
  @PermissionName('search_users')
  @Get('by-email/:email')
  @ApiOperation({ summary: 'Get user by email' })
  findByEmail(@Param('email') email: string) {
    return this.usersService.findByEmail(email);
  }

  @UseGuards(JwtAuthGuard)
  // @Roles('Admin','Manager','HeadOfDepartment')
  @PermissionName('search_users')
  @Get('by-role-name/:roleName')
  @ApiOperation({ summary: 'Get users by Role Name' })
  findByRoleName(@Param('roleName') roleName: string) {
    return this.usersService.findByRoleName(roleName);
  }

  @UseGuards(JwtAuthGuard)
  // @Roles('Admin','Manager','HeadOfDepartment')
  @PermissionName('update_users_status')
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update user status (Active/Inactive)' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateUserDto
  ) {
    return this.usersService.updateStatus(id, updateStatusDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/password')
  @ApiOperation({ summary: 'Update user password (requires old password)' })
  async updatePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePasswordDto: UpdateUserDto
  ) {
    return this.usersService.updatePassword(id, updatePasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/name')
  @ApiOperation({ summary: 'Update user name' })
  updateName(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateUserDto
  ) {
    return this.usersService.updateName(id, updateDto);
  }

  @UseGuards(JwtAuthGuard)
  // @Roles('Admin','Manager')
  @PermissionName('delete_users_by_id')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete user (force=true for hard delete)' })
  async deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @Query('force') force?: boolean,
  ) {
    return this.usersService.deleteUser(id, force);
  }

  @UseGuards(JwtAuthGuard)
  // @Roles('Admin','Manager')
  @PermissionName('delete_all_users')
  @Delete('all')
  @ApiOperation({ summary: 'Delete all users (Admin only)' })
  deleteAll() {
    return this.usersService.deleteAllUsers();
  }

 @UseGuards(JwtAuthGuard)
  // @Roles('Admin','Manager')
  @PermissionName('update_users_role')
  @Patch(':id/role')
  async updateUserRole(
    @Param('id') id: number,
    @Body() updateRoleDto: UpdateUserDto,
  ) {
    return this.usersService.updateUserRole(id, updateRoleDto.roleName);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('update_users_general')
  @ApiOperation({ summary: 'Update user general information' })
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, updateUserDto);
  }

}
