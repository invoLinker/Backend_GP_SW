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
import { NotificationService } from 'src/Notification/notification.service';
import { NotificationCategory, NotificationChannel } from 'src/Notification/create-notification.dto';
import * as nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import { EditRequest } from 'src/edit_requests/edit_requests.model';



@Injectable()
export class UsersService {
  private resetTokensMap: Map<string, { email: string; newPassword: string }> = new Map();
constructor(
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(Role) private roleModel: typeof Role,
    private notificationService: NotificationService,
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


async create(createUserDto: CreateUserDto, ID_imageFile?: Express.Multer.File) {
  const {
    first_name,
    last_name,
    email,
    password_hash,
    role_name, 
    sendWelcomeEmail,
  } = createUserDto;

  let role: Role | null = null;
  if (role_name) {
    role = await this.roleModel.findOne({ where: { role_name } });
    if (!role) {
      throw new BadRequestException(`Invalid role_name: ${role_name}`);
    }
  } else {
    role = await this.roleModel.findOne({ where: { role_name: 'Viewer' } });
    if (!role) {
      throw new BadRequestException('Default Viewer role not found');
    }
  }

  const existing = await this.userModel.findOne({ where: { email } });
  if (existing) {
    throw new ConflictException('This email is already taken');
  }

  let hashedPassword :string| null= null;

    if (password_hash) {
      hashedPassword = await bcrypt.hash(password_hash, 10);
    }


  const user = new User();
  user.first_name = first_name;
  user.last_name = last_name;
  user.email = email;
  user.password_hash = hashedPassword;
  user.role_id = role.role_id;
  user.status = 'Active';

user.google_id = (createUserDto.google_id ?? null) as string | null;
user.provider = createUserDto.provider ?? 'local';

  if (ID_imageFile) {
    user.ID_image = `/uploads/${ID_imageFile.filename}`;
  }

  await user.save();

  if (role.role_name === 'Supplier') {
    await Supplier.create({ user_id: user.user_id } as any);
  }

  try {
    if (createUserDto.sendWelcomeEmail) {
  const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
  
      await transporter.sendMail({
        from: `"🖇InvoLinker" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Welcome to InvoLinker! 🎉​',
        text: `Hello ${user.first_name}, your account was created. 🔑Your temporary password is DefaultPassword123!. Please change it after login.`,
      });
  
    }
else{
    await this.notificationService.sendNotification({
      title: 'Welcome to InvoLinker! 🎉',
      message: `Hello ${user.first_name}, we are delighted to have you join our team, and we hope you enjoy working with us.`,
      userId: user.user_id,
      channel: NotificationChannel.EMAIL,
      userEmail: user.email,
    } as any);
  }
  } catch (err) {
    console.error('Failed to send welcome notification', err);
  }

  const payload = { sub: user.user_id, email: user.email, role: role.role_name };
  const access_token = this.jwtService.sign(payload, { expiresIn: '12h' });
  const refresh_token = this.jwtService.sign(payload, { expiresIn: '7d' });

  return {
    message: 'User created successfully',
    access_token,
    refresh_token,
    user: {
      id: user.user_id,
      email: user.email,
      role: role.role_name,
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




async updateRoleStatus(userId: number, updateDto: UpdateUserDto): Promise<any> {
  const user = await User.findByPk(userId);
  if (!user) throw new NotFoundException('User not found');

  let roleChanged = false;
  let statusChanged = false;

  const oldRole = await Role.findByPk(user.role_id);


  if (updateDto.status && updateDto.status !== user.status) {
    user.status = updateDto.status;
    statusChanged = true;

    if (updateDto.status === 'Inactive') {
      const deleteDate = new Date();
      deleteDate.setDate(deleteDate.getDate() + 30);
      user.deletedAt = deleteDate;

      const viewerRole = await Role.findOne({ where: { role_name: 'Viewer' } });
      if (viewerRole && user.role_id !== viewerRole.role_id) {
        user.role_id = viewerRole.role_id;
        roleChanged = true;
      }
    } else {
      user.deletedAt = null;
    }
  }


  if (updateDto.role_name && user.status !== 'Inactive') {
    const newRole = await Role.findOne({
      where: { role_name: updateDto.role_name },
    });

    if (!newRole) {
      throw new NotFoundException(
        `Role with name ${updateDto.role_name} not found`
      );
    }

    if (user.role_id !== newRole.role_id) {
      user.role_id = newRole.role_id;
      roleChanged = true;


      if (oldRole?.role_name === 'Supplier') {
        await Supplier.destroy({
          where: { user_id: user.user_id },
        });
      }

      if ( newRole.role_name === 'Supplier') {
        const exists = await Supplier.findOne({
          where: { user_id: user.user_id },
        });

        if (!exists) {
          await Supplier.create({
            user_id: user.user_id,
          } as any);
        }
      }


    }
  }

  await user.save();

  if (roleChanged || statusChanged) {
    let message = `Hello ${user.first_name}, your account has been updated by Admin.`;

    if (statusChanged) {
      message += ` Your status is now ${updateDto.status}.`;
    }

    if (user.status === 'Inactive') {
      message += ` Your role is now Viewer.`;
    } else if (roleChanged) {
      message += ` Your role is now ${updateDto.role_name}.`;
    }

    try {
      await this.notificationService.sendNotification({
        title: 'Account Update Notification',
        message,
        userId: user.user_id,
        channel: NotificationChannel.IN_APP,
        userEmail: user.email,
      } as any);
    } catch (err) {
      console.error('Failed to send role/status update notification', err);
    }
  }

  return { message: 'User updated successfully', user };
}



async updateStatus(userId: number, updateDto: UpdateUserDto): Promise<any> {
  const user = await User.findByPk(userId);
  if (!user) throw new NotFoundException('User not found');

  user.status = updateDto.status!;

  if (updateDto.status === 'Inactive') {
    const deleteDate = new Date();
    deleteDate.setDate(deleteDate.getDate() + 30);
    user.deletedAt = deleteDate;
  } else {
    user.deletedAt = null;
  }

  await user.save();

  const { password_hash, ...userWithoutPassword } = user.get({ plain: true });
   return { message: 'User status updated successfully' };
}


async updatePassword(id: number, updateDto: UpdateUserDto) {
    const user = await User.findByPk(id);
    if (!user) throw new BadRequestException('User not found');

    if (!updateDto.old_password || !updateDto.new_password) {
      throw new BadRequestException('Old password and new password are required');
    }

    const isMatch = await bcrypt.compare(updateDto.old_password, user.password_hash!);
    if (!isMatch) throw new BadRequestException('Old password is incorrect');

    const token = uuidv4();
    this.resetTokensMap.set(token, { email: user.email, newPassword: updateDto.new_password });

    const resetLink = `${process.env.BACKEND_URL}/public/reset-success.html?token=${token}`;


    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"🖇InvoLinker" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Reset Your Password 🔑',
      html: `
        <h3>Hello ${user.first_name},</h3>
        <p>Click the button below to reset your password:</p>
        <a href="${resetLink}" 
           style="display:inline-block;padding:10px 20px;font-size:16px;color:#fff;
                  background-color:#007bff;text-decoration:none;border-radius:5px;">
           Verify & Reset Password
        </a>
        <p>If you did not request this, ignore this email.</p>
      `,
    });

    return { message: 'Password reset email sent' };
  }

  async resetPassword(token: string) {
    const data = this.resetTokensMap.get(token);
    if (!data) throw new BadRequestException('Invalid or expired token');

    const user = await User.findOne({ where: { email: data.email } });
    if (!user) throw new NotFoundException('User not found');

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);
    user.password_hash = hashedPassword;
    await user.save();

    this.resetTokensMap.delete(token);

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


async deleteUsers(userIds: number[]): Promise<{ message: string }> {

  const users = await User.findAll({ where: { user_id: userIds } });

  if (users.length === 0) {
    throw new NotFoundException('No users found with the given IDs');
  }

  await EditRequest.destroy({
    where: { user_id: userIds }
  });

  await User.destroy({
    where: { user_id: userIds }
  });

  return { message: 'User/s deleted successfully' };
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



 async updateUser(id: number, updateUserDto: UpdateUserDto, file?: Express.Multer.File){
  const user = await this.userModel.findByPk(id);
  if (!user) {
    throw new NotFoundException('User not found');
  }

  if (file) {
    user.profile_image = `/uploads/${file.filename}`;
  }

  Object.assign(user, updateUserDto);
  await user.save();

  return {
    message: "Updated Successfully",
    profile_image: user.profile_image
  };
}

async forgetPassword(email: string, hashedPassword: string) {
  const user = await this.userModel.findOne({ where: { email } });
  if (!user) throw new BadRequestException('User not found');
  user.password_hash = hashedPassword;
  await user.save();
}

async deleteProfileImage(userId: number): Promise<{ message: string }> {
  const user = await this.userModel.findByPk(userId);
  if (!user) {
    throw new NotFoundException('User not found');
  }

  if (!user.profile_image) {
    throw new BadRequestException('This user does not have a profile image');
  }

  user.profile_image = null;
  await user.save();

  return { 
    message: 'Profile image deleted successfully',
   };
}

async getAllFullNames() {
  const users = await this.userModel.findAll({
    attributes: ['user_id', 'first_name', 'last_name'],
  });

  return users.map(u => ({
    id: u.user_id,
    full_name: `${u.first_name} ${u.last_name}`,
  }));
}


}
