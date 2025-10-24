import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { RolePermission } from './RolePermission.model';
import { Role } from '../roles/roles.model';
import { Permission } from '../permission/permission.model';
import { RoleDto } from 'src/roles/RoleDto';
import { RolePermissionDto } from './RolePermissionDto';

@Injectable()
export class RolePermissionService {
  constructor(
    @InjectModel(RolePermission)
    private rolePermissionModel: typeof RolePermission,
    @InjectModel(Role)
    private roleModel: typeof Role,
    @InjectModel(Permission)
    private permissionModel: typeof Permission,
  ) {}

  async addRolePermission(dto: RolePermissionDto ): Promise<{ message: string }> {
    const { roleName, permissionName } = dto;

    // جلب الـRole
    const role = await this.roleModel.findOne({ where: { role_name: roleName } });
    if (!role) throw new NotFoundException(`Role "${roleName}" not found`);

    // جلب الـPermission
    const permission = await this.permissionModel.findOne({ where: { permission_name: permissionName } });
    if (!permission) throw new NotFoundException(`Permission "${permissionName}" not found`);

    // التحقق إذا موجود مسبقًا
    const existing = await this.rolePermissionModel.findOne({
      where: { roleId: role.role_id, permissionId: permission.permission_id },
    });
    if (existing) throw new BadRequestException('Permission already assigned to this role');

    // إنشاء سجل جديد
    const rp = new RolePermission();
    rp.roleId = role.role_id;
    rp.permissionId = permission.permission_id;

    await rp.save();

    return { message: `Permission "${permissionName}" added to role "${roleName}" successfully` };
  }


  async removeRelation(dto: RolePermissionDto) {
  try {
    if (!dto.roleName || !dto.permissionName) {
      throw new BadRequestException('roleName and permissionName are required');
    }

    const role = await this.roleModel.findOne({ where: { role_name: dto.roleName } });
    if (!role) throw new NotFoundException('Role not found');

    const permission = await this.permissionModel.findOne({ where: { permission_name: dto.permissionName } });
    if (!permission) throw new NotFoundException('Permission not found');

    const deleted = await this.rolePermissionModel.destroy({
   where: { roleId: role.role_id, permissionId: permission.permission_id },
   });


    if (!deleted) throw new NotFoundException('Relation not found');

    return { message: `Permission "${dto.permissionName}" removed from Role "${dto.roleName}"` };
  } catch (error) {
    console.error(error); // لتشوف السبب بالكونسول
    throw new InternalServerErrorException('Failed to remove role-permission relation');
  }
}

// RolePermission.service.ts
async getPermissionsForRole(roleName: string): Promise<string[]> {
  const role = await this.roleModel.findOne({ where: { role_name: roleName } });
  if (!role) return [];

  const rolePermissions = await this.rolePermissionModel.findAll({
    where: { roleId: role.role_id },
    include: [{ model: this.permissionModel }],
  });

  return rolePermissions.map(rp => rp.permission.permission_name);
}


}
