import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Role } from './roles.model';
import { User } from '../users/users.model';
import { RoleDto } from './RoleDto';
import { BadRequestException,  ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';

const allowedRoles = [
  'Admin',
  'Accountant',
  'Warehouse',
  'Supplier',
  'Payment Officer',
  'Viewer',
];

@Injectable()
export class RolesService {
  

  constructor(
    @InjectModel(Role) private roleModel: typeof Role,
    @InjectModel(User) private userModel: typeof User,
) {}

  async findAll(): Promise<Role[] | { message: string }> {
  const roles = await this.roleModel.findAll();
  if (roles.length === 0) {
    return { message: 'There are no roles' };
  }
  return roles;
}

async create(roleDto: RoleDto): Promise<Role> {
  const { role_name } = roleDto;

  if (!allowedRoles.includes(role_name)) {
    throw new BadRequestException(
      `Invalid role: ${role_name}. Allowed values: ${allowedRoles.join(', ')}`
    );
  }

  const existing = await Role.findOne({ where: { role_name } });
  if (existing) {
    throw new ConflictException(`Role ${role_name} already exists`);
  }

  try {
    const role = new Role();
    role.role_name = role_name;
    return await role.save();
  } catch (error) {
    throw new InternalServerErrorException('Error creating role');
  }
}

async update(id: number, roleDto: RoleDto): Promise<Role> {
  const { role_name } = roleDto;

  const role = await Role.findByPk(id);
  if (!role) {
    throw new NotFoundException(`This role not found`);
  }

  if (!allowedRoles.includes(role_name)) {
    throw new BadRequestException(
      `Invalid role: ${role_name}. Allowed values: ${allowedRoles.join(', ')}`
    );
  }

  const existing = await Role.findOne({ where: { role_name } });
  if (existing && existing.role_id !== id) {
    throw new ConflictException(`Role ${role_name} already exists`);
  }

  try {
    role.role_name = role_name;
    await role.save();
    return role;
  } catch (error) {
    throw new InternalServerErrorException('Error updating role');
  }
}

async deleteAll(): Promise<{ message: string }> {
  await this.userModel.destroy({ where: {} }); 
  await this.roleModel.destroy({ where: {} });
  return { message: 'All roles and their users deleted successfully' };
}

async deleteById(id: number): Promise<{ message: string }> {
  const role = await this.roleModel.findByPk(id);
  if (!role) throw new NotFoundException(`This role not found`);

  await this.userModel.destroy({ where: { role_id: id } });

  await role.destroy();

  return { message: `Role with name ${role.role_name} and all associated users deleted successfully` };
}



async deleteByRoleName(role_name: string): Promise<{ message: string }> {
  const role = await this.roleModel.findOne({ where: { role_name } });
  if (!role) throw new NotFoundException(`Role with name ${role_name} not found`);

  await this.userModel.destroy({ where: {  role_id: role.role_id  } });

  await role.destroy();

  return { message: `Role with name ${role_name} and all associated users deleted successfully` };
}

}
