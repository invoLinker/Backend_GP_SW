import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Role } from './roles.model';
import { User } from '../users/users.model';
import { RoleDto } from './RoleDto';
import { BadRequestException,  ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';

const allowedRoles = [
  'Admin',
  'Manager',
  'HeadOfDepartment',
  'Accountant',
  'Supplier',
  'DeliveryAgent',
  'Viewer',
  'AI'
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

  //  1. check if role name valid
  if (!allowedRoles.includes(role_name)) {
    throw new BadRequestException(
      `Invalid role: ${role_name}. Allowed values: ${allowedRoles.join(', ')}`
    );
  }

  //  2. check if role already exists
  const existing = await Role.findOne({ where: { role_name } });
  if (existing) {
    throw new ConflictException(`Role ${role_name} already exists`);
  }

  // 3. try to save
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

  // 1. check if role exists
  const role = await Role.findByPk(id);
  if (!role) {
    throw new NotFoundException(`Role with id ${id} not found`);
  }

  // 2. validate role name
  if (!allowedRoles.includes(role_name)) {
    throw new BadRequestException(
      `Invalid role: ${role_name}. Allowed values: ${allowedRoles.join(', ')}`
    );
  }

  // 3. check if role name already taken by another role
  const existing = await Role.findOne({ where: { role_name } });
  if (existing && existing.role_id !== id) {
    throw new ConflictException(`Role ${role_name} already exists`);
  }

  // 4. try update
  try {
    role.role_name = role_name;
    await role.save();
    return role;
  } catch (error) {
    throw new InternalServerErrorException('Error updating role');
  }
}

async deleteAll(): Promise<{ message: string }> {
  // حذف كل اليوزر المرتبط بالرولز
  await this.userModel.destroy({ where: {} }); // يمسح كل اليوزر
  // حذف كل الرولز
  await this.roleModel.destroy({ where: {} });
  return { message: 'All roles and their users deleted successfully' };
}

async deleteById(id: number): Promise<{ message: string }> {
  const role = await this.roleModel.findByPk(id);
  if (!role) throw new NotFoundException(`Role with id ${id} not found`);

  // حذف كل الـ users المرتبطين بالرول
  await this.userModel.destroy({ where: { role_id: id } });

  // حذف الرول نفسه
  await role.destroy();

  return { message: `Role with id ${id} and all associated users deleted successfully` };
}



async deleteByRoleName(role_name: string): Promise<{ message: string }> {
  const role = await this.roleModel.findOne({ where: { role_name } });
  if (!role) throw new NotFoundException(`Role with name ${role_name} not found`);

  // حذف كل الـ users المرتبطين بالرول
  await this.userModel.destroy({ where: {  role_id: role.role_id  } });

  // حذف الرول نفسه
  await role.destroy();

  return { message: `Role with name ${role_name} and all associated users deleted successfully` };
}

}
