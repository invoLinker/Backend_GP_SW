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


@Injectable()
export class UsersService {
constructor(
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(Role) private roleModel: typeof Role,
  ) {}

  async findAll(): Promise<User[] | { message: string }> {
const users = await this.userModel.findAll({
    attributes: { exclude: ['password_hash'] }, // للامان ما اعرض الباسوورد
    include: [Role],
    });
  if (users.length === 0) {
    return { message: 'There are no roles' };
  }
  return users; 
 }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const {
      first_name,
      last_name,
      email,
      password_hash,
      role_id,
      phone_number,
      location,
      profile_image,
      gender,
      birth_date,
    } = createUserDto;

    // تحقق من وجود الدور إذا تم تمريره
    if (role_id) {
      const role = await this.roleModel.findByPk(role_id);
      if (!role) {
        throw new BadRequestException(`Role with id ${role_id} does not exist`);
      }
    }

    // تحقق من تكرار الإيميل
    const existing = await this.userModel.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException(`Email ${email} is already taken`);
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(password_hash, 10);

    // إنشاء المستخدم الجديد
    const user = new User();
    user.first_name = first_name;
    user.last_name = last_name;
    user.email = email;
    user.password_hash = hashedPassword;
    if (role_id !== undefined) user.role_id = role_id; // فقط إذا موجود
    user.status = 'Active';
    

    if (phone_number) user.phone_number = phone_number;
    if (location) user.location = location;
    if (profile_image) user.profile_image = profile_image;
    if (gender) user.gender = gender;
    if (birth_date) user.birth_date = birth_date;

    return await user.save();
  }


  
  async findOne(id: number): Promise<User> {
    const user = await this.userModel.findByPk(id, {
      include: [{ model: Role }],
      attributes: { exclude: ['password_hash'] },// للامان ما بتم ارجاع الباسوورد لانو فش داعي انو ينعرض
    });
    if (!user) throw new NotFoundException(`User with id ${id} not found`);
    return user;
  }

  // GET /users/by-role/:roleId
  async findByRole(roleId: number): Promise<User[]> {
    return this.userModel.findAll({
      where: { role_id: roleId },
      include: [{ model: Role }],// هاد عشان يظهر معاه الرول اي دي الاسم وهالامور
      attributes: { exclude: ['password_hash'] },
    });
  }

  // GET /users/by-email?email=
    async findByEmail(email: string): Promise<User> {
    const user = await this.userModel.findOne({ where: { email } ,
      attributes: { exclude: ['password_hash'] },
    });
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return user;
  }


  // GET /users/by-role-name?role_name=
  async findByRoleName(roleName: string): Promise<User[]> {
    return this.userModel.findAll({
      include: [
        {
          model: Role,
          where: { role_name: roleName }, // فلترة بالاسم بدل id
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
  if (!user) throw new NotFoundException(`User with id ${userId} not found`);

  // تحديث الحالة
  user.status = updateDto.status!;

  // إذا صار Inactive، نحدد موعد الحذف المؤجل
  if (updateDto.status === 'Inactive') {
    const deleteDate = new Date();
    deleteDate.setDate(deleteDate.getDate() + 7); // بعد 7 أيام ينحذف
    user.deletedAt = deleteDate;
  } else {
    // إذا المستخدم ظل Active، نلغي أي حذف مؤجل سابق
    user.deletedAt = null;
  }

  await user.save();

  // نسوي نسخة من الـ user بدون الباسوورد
  const { password_hash, ...userWithoutPassword } = user.get({ plain: true });
  return userWithoutPassword;
}


  async updatePassword(userId: number, updateDto: UpdateUserDto): Promise<{ message: string }> {
    const user = await User.findByPk(userId);
    if (!user) throw new NotFoundException(`User with id ${userId} not found`);

    const isMatch = await bcrypt.compare(updateDto.old_password!, user.password_hash);
    if (!isMatch) throw new BadRequestException('Old password is incorrect');

    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(updateDto.new_password, salt);
    await user.save();

    return { message: 'Password updated successfully' };
  }


  async updateName(userId: number, updateDto: UpdateUserDto): Promise<any> {
  const user = await User.findByPk(userId);
  if (!user) throw new NotFoundException(`User with id ${userId} not found`);

  if (updateDto.first_name !== undefined) {
    user.first_name = updateDto.first_name;
  }
  if (updateDto.last_name !== undefined) {
    user.last_name = updateDto.last_name;
  }

  await user.save();

  // ارجع اليوزر بدون كلمة السر
  const { password_hash, ...userWithoutPassword } = user.get({ plain: true });
  return userWithoutPassword;
}


async deleteUser(userId: number, forceDelete = false): Promise<{ message: string }> {
  const user = await User.findByPk(userId);
  if (!user) throw new NotFoundException(`User with id ${userId} not found`);

  if (forceDelete || user.status === 'Inactive') {
    // الحذف الفعلي
    await user.destroy();
    return { message: 'User deleted successfully' };
  } else {
    // الحذف المؤجل
    const deleteDate = new Date();
    deleteDate.setDate(deleteDate.getDate() + 7); // بعد 7 أيام
    user.deletedAt = deleteDate;

    await user.save();
    return { message: `User is Active. Marked for deletion at ${user.deletedAt}` };
  }
}


@Cron('0 0 * * *') // كل يوم منتصف الليل
  async handleDeletion() {
    const users = await this.userModel.findAll({
      where: {
        deletedAt: { [Op.lt]: new Date() } // أي تاريخ أقل من الآن
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
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

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


  async updateUser(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userModel.findByPk(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // تأكد إنه في بيانات للتحديث
    if (!Object.keys(updateUserDto).length) {
      throw new BadRequestException('No data provided for update');
    }

    // تحديث البيانات فقط إذا أُرسلت
    Object.assign(user, updateUserDto);
    await user.save();

    return user;
  }


}
