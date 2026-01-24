import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Permission } from './permission.model';
import { CreatePermissionDto } from './CreatePermissionDto';
import { UpdatePermissionDto } from './UpdatePermissionDto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectModel(Permission)
    private permissionModel: typeof Permission,
  ) {}

  async findAll(): Promise<Permission[]> {
    const permissions = await this.permissionModel.findAll();
    if (permissions.length === 0) {
      throw new NotFoundException('There are no permissions');
    }
    return permissions;
  }

  async findOne(id: number): Promise<Permission> {
    const permission = await this.permissionModel.findByPk(id);
    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }
    return permission;
  }

  async findByName(permission_name: string): Promise<Permission> {
    const permission = await this.permissionModel.findOne({ where: { permission_name: permission_name } });
    if (!permission) {
      throw new NotFoundException(`Permission with name "${permission_name}" not found`);
    }
    return permission;
  }

 async create(dto: CreatePermissionDto): Promise<Permission> {
  const existing = await this.permissionModel.findOne({ where: { permission_name: dto.permission_name } });
  if (existing) {
    throw new BadRequestException(`Permission with name "${dto.permission_name}" already exists`);
  }

  const permission = new Permission();
  permission.permission_name = dto.permission_name;
  permission.description = dto.description;
  return await permission.save();
}


  async update(id: number, dto: UpdatePermissionDto): Promise<Permission> {
  const permission = await this.findOne(id);

  try {
    if (dto.permission_name) {
      if (dto.permission_name === permission.permission_name) {
        throw new BadRequestException(`Permission name is the same as the current one`);
      }

      const existing = await this.permissionModel.findOne({ 
        where: { permission_name: dto.permission_name } 
      });

      if (existing && existing.permission_id !== id) {
        throw new BadRequestException(`Permission name "${dto.permission_name}" already exists`);
      }

      permission.permission_name = dto.permission_name;
    }

    if (dto.description) {
      permission.description = dto.description;
    }

    return await permission.save();
  } catch (error) {
    console.error(error);
    throw new BadRequestException(error.message || 'Error updating permission');
  }
}


  async removeById(id: number): Promise<{ message: string }> {
    const permission = await this.findOne(id); 
    await permission.destroy();
    return { message: `Permission with ID ${id} deleted successfully` };
  }

  async removeByName(name: string): Promise<{ message: string }> {
    const permission = await this.permissionModel.findOne({ where: { permission_name: name } });
    if (!permission) throw new NotFoundException(`Permission with name "${name}" not found`);
    await permission.destroy();
    return { message: `Permission "${name}" deleted successfully` };
  }

  async removeAll(): Promise<{ message: string }> {
    const count = await this.permissionModel.destroy({ where: {} });
    return { message: `${count} permissions deleted successfully` };
  }
}
