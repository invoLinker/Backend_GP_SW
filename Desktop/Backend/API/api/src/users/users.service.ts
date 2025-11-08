import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from './users.model';
import { Role } from '../roles/roles.model';
import { CreateUserDto } from './CreatUserDto';
import * as bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { BadRequestException,  ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from './UpdateUserDto';
import { Cron } from '@nestjs/schedule';
import { JwtService } from '@nestjs/jwt';
import { Supplier } from '../Suppliers/supplier.model';



@Injectable()
export class UsersService {
constructor(
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(Role) private roleModel: typeof Role,
    private jwtService: JwtService,
  ) {}

  async findAll(): Promise<User[] | { message: string }> {
  const users = await this.userModel.findAll({
      attributes: { exclude: ['password_hash'] }, 
      include: [Role],
      });
    if (users.length === 0) {
      return { message: 'No users found' };
    }
    return users; 
  }

  async findAll1(): Promise<User[]> {
  const users = await this.userModel.findAll();
  return users || []; 
}


async findByEmail1(email: string): Promise<User | null> {
  const user = await this.userModel.findOne({ where: { email } });
  return user || null; 
}

async updateIDImage(userId: number, ID_image: Express.Multer.File){
   const user = await this.userModel.findByPk(userId);
   if (!user){
    throw new NotFoundException("User not found");
   }

  user.ID_image = `/uploads/${ID_image.filename}`; 
   await user.save();
   return "​✔️​ The image was uploaded successfully."

}



async create(createUserDto: CreateUserDto, ID_imageFile?: Express.Multer.File){
  const {
    first_name,
    last_name,
    email,
    password_hash,
    role_id,
  } = createUserDto;

  let role: Role | null = null;
  if (role_id) {
     role = await this.roleModel.findByPk(role_id);
    if (!role) {
      throw new BadRequestException('Invalid role');
    }
  }

  const existing = await this.userModel.findOne({ where: { email } });
  if (existing) {
    throw new ConflictException('This email is already taken');
  }

  const hashedPassword = await bcrypt.hash(password_hash, 10);

  const user = new User();
  user.first_name = first_name;
  user.last_name = last_name;
  user.email = email;
  user.password_hash = hashedPassword;
  if (role_id !== undefined) user.role_id = role_id;
  user.status = 'Active';
  if(ID_imageFile)
    {
     user.ID_image = `/uploads/${ID_imageFile!.filename}`; 
    }

  await user.save();


  if(role?.role_name === 'Supplier'){
   await Supplier.create({user_id: user.user_id } as any);
  }


    const payload = { sub: user.user_id, email: user.email, role: user.role?.role_name };
    const access_token = this.jwtService.sign(payload, { expiresIn: '12h' });
    const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      message: 'User created successfully',
      access_token,
      refresh_token,
      user: { 
        id: user.user_id, 
        email: user.email, 
        role: user.role?.role_name 
      },
    };
  }


  
  async findOne(id: number): Promise<User> {
    const user = await this.userModel.findByPk(id, {
      include: [{ model: Role }],
      attributes: { exclude: ['password_hash'] },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByRole(roleId: number): Promise<User[]> {
    return this.userModel.findAll({
      where: { role_id: roleId },
      include: [{ model: Role }],
      attributes: { exclude: ['password_hash'] },
    });
  }

    async findByEmail(email: string): Promise<User> {
    const user = await this.userModel.findOne({ where: { email } ,
      attributes: { exclude: ['password_hash'] },
    });
    if (!user) {
      throw new NotFoundException('Email not found');
    }
    return user;
  }


  async findByRoleName(roleName: string): Promise<User[]> {
    return this.userModel.findAll({
      include: [
        {
          model: Role,
          where: { role_name: roleName }, 
        },
      ],
      attributes: { exclude: ['password_hash'] },
    });
  }

async searchUsers(query: string): Promise<User[]> {
  return this.userModel.findAll({
    where: {
      [Op.or]: [
        { first_name: { [Op.like]: `%${query}%` } },
        { last_name: { [Op.like]: `%${query}%` } },
        { email: { [Op.like]: `%${query}%` } },
        { status: { [Op.like]: `%${query}%` } },
        { phone_number: { [Op.like]: `%${query}%` } },
        { location: { [Op.like]: `%${query}%` } },
        { gender: { [Op.like]: `%${query}%` } },
      ]
    },
    include: [
      {
        model: this.roleModel,
        where: {
          role_name: { [Op.like]: `%${query}%` },
        },
        required: false,
      },
    ],
  });
}


async updateStatus(userId: number, updateDto: UpdateUserDto): Promise<any> {
  const user = await User.findByPk(userId);
  if (!user) throw new NotFoundException('User not found');

  user.status = updateDto.status!;

  if (updateDto.status === 'Inactive') {
    const deleteDate = new Date();
    deleteDate.setDate(deleteDate.getDate() + 7);
    user.deletedAt = deleteDate;
  } else {
    user.deletedAt = null;
  }

  await user.save();

  const { password_hash, ...userWithoutPassword } = user.get({ plain: true });
   return { message: 'User status updated successfully' };
}


  async updatePassword(userId: number, updateDto: UpdateUserDto): Promise<{ message: string }> {
    const user = await User.findByPk(userId);
    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(updateDto.old_password!, user.password_hash);
    if (!isMatch) throw new BadRequestException('Old password is incorrect');

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(updateDto.new_password, salt);
    await user.save();

    return { message: 'Password updated successfully' };
  }


  async updateName(userId: number, updateDto: UpdateUserDto): Promise<any> {
  const user = await User.findByPk(userId);
  if (!user) throw new NotFoundException('User not found');

  if (updateDto.first_name !== undefined) {
    user.first_name = updateDto.first_name;
  }
  if (updateDto.last_name !== undefined) {
    user.last_name = updateDto.last_name;
  }

  await user.save();

  const { password_hash, ...userWithoutPassword } = user.get({ plain: true });
   return { message: 'User name updated successfully' };
}


async deleteUser(userId: number, forceDelete = false): Promise<{ message: string }> {
  const user = await User.findByPk(userId);
  if (!user) throw new NotFoundException('User not foun');

  if (forceDelete || user.status === 'Inactive') {
    await user.destroy();
    return { message: 'User deleted successfully' };
  } else {
    const deleteDate = new Date();
    deleteDate.setDate(deleteDate.getDate() + 7); 
    user.deletedAt = deleteDate;

    await user.save();
    return { message: `User is Active. Marked for deletion at ${user.deletedAt}` };
  }
}


@Cron('0 0 * * *')
  async handleDeletion() {
    const users = await this.userModel.findAll({
      where: {
        deletedAt: { [Op.lt]: new Date() } 
      }
    });
    for (const user of users) {
      await user.destroy();
    }
  }

  async deleteAllUsers(): Promise<{ message: string }> {
  await this.userModel.destroy({ where: {}, truncate: true }); 

  return { message: 'All users deleted successfully' };
}

 async updateUserRole(id: number, roleName: string) {
    const user = await User.findByPk(id);
    if (!user) throw new NotFoundException('User not found');

    const role = await Role.findOne({ where: { role_name: roleName } });
    if (!role) throw new NotFoundException(`Role with name ${roleName} not found`);

    user.role_id = role.role_id;
    await user.save();

    return {
      message: `User role updated to ${roleName}`,
      user: {
        id: user.id,
        email: user.email,
        role: role.role_name, 
      }
    };
  }



 async updateUser(id: number, updateUserDto: UpdateUserDto, file?: Express.Multer.File): Promise<User> {
  const user = await this.userModel.findByPk(id);
  if (!user) {
    throw new NotFoundException('User not found');
  }

  if (file) {
    user.profile_image = `/uploads/${file.filename}`;
  }

  Object.assign(user, updateUserDto);
  await user.save();

  return user;
}

async forgetPassword(email: string, hashedPassword: string) {
  const user = await this.userModel.findOne({ where: { email } });
  if (!user) throw new BadRequestException('User not found');
  user.password_hash = hashedPassword;
  await user.save();
}


}
