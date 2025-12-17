import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { User } from '../users/users.model';
import { Role } from '../roles/roles.model';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto } from 'src/users/CreatUserDto';
import * as nodemailer from 'nodemailer';
import { NotMatchException } from 'src/Exception/NotMatch';



@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  private resetCodesMap = new Map<string, string>();

  sign(payload: { sub: number; email: string; role: number | undefined; }, arg1: { expiresIn: string; }) {
    throw new Error('Method not implemented.');
  }
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
     private readonly config: ConfigService,
    
  ) {
    this.googleClient = new OAuth2Client(this.config.get<string>('GOOGLE_CLIENT_ID'));
  }



  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user['password_hash']!);
    if (isMatch) {
      const { password_hash, ...result } = user['dataValues'] || user;
      return result;
    }
    return null;
  }

  async login(email: string, password: string) {
    const user = await User.findOne({ 
      where: { email },
      include: [Role],
    });

    if (!user) throw new UnauthorizedException('Invalid email or password');

    if(user.status=== 'Inactive'){throw new UnauthorizedException('Invalid to login your account is inactive');}

    const isMatch = await bcrypt.compare(password, user.password_hash!);
    if (!isMatch) throw new UnauthorizedException('Invalid email or password');

    const payload = { 
      sub: user.user_id, 
      email: user.email, 
      role_name: user.role?.role_name 
    };

    return {
      message: 'Login successful',
      access_token: this.jwtService.sign(payload, { expiresIn: '1h' }), 
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }), 
      user: { 
        id: user.user_id, 
        email: user.email, 
        role_name: user.role?.role_name 
      },
    };
  }


  async refreshToken(token: string) {
  try {
    const payload = this.jwtService.verify(token, { 
      secret: process.env.JWT_SECRET || 'secretKey' 
    });

    const newAccessToken = this.jwtService.sign(
      {
        sub: payload.sub,
        email: payload.email,
        role_name: payload.role_name,
      },
      { expiresIn: '1h' }   
    );

    return {
      access_token: newAccessToken     
    };

  } catch (e) {
    throw new UnauthorizedException('Invalid refresh token');
  }
}



//////////////////////////////////////////////////// continue with google

async loginOrCreateWithGoogle(idToken: string, ID_image?: Express.Multer.File) {
  const ticket = await this.googleClient.verifyIdToken({
    idToken,
    audience: this.config.get<string>('GOOGLE_CLIENT_ID'),
  });

  const payload = ticket.getPayload();
  if (!payload) throw new UnauthorizedException('Invalid Google token');

  const email = payload.email!;
  const first_name = payload.given_name || '';
  const last_name = payload.family_name || '';

  let user = await User.findOne({ 
    where: { email },
    include: [Role],
  });

  if (!user) {
    const userDto: CreateUserDto = {
      first_name,
      last_name,
      email,
      password_hash: Math.random().toString(36).slice(-8),
      google_id: payload.sub,
      provider: 'google',
    };

    return this.usersService.create(userDto, ID_image);
  }

  const jwtPayload = { 
    sub: user.user_id, 
    email: user.email,
    role_name: user.role?.role_name 
  };
  
  const access_token = this.jwtService.sign(jwtPayload, { expiresIn: '1h' });
  const refresh_token = this.jwtService.sign(jwtPayload, { expiresIn: '7d' });

  return {
    message: 'Login or account created successfully',
    access_token,
    refresh_token,
    user: {
      id: user.user_id,
      email: user.email,
      role_name: user.role?.role_name,
    },
    isIDUploaded: !!user.ID_image,
  };
}


//////////////////////////////////////////////////// Forget Password

 async sendResetCode(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new BadRequestException('Email not found');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.resetCodesMap.set(email, code); 

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
      subject: 'Password Reset Code 🔑​',
      text: `Your password reset code is: ${code}`,
    });

    return { message: 'Reset code sent to email' };
  }

  async verifyResetCode(email: string, code: string) {
    const savedCode = this.resetCodesMap.get(email);
    if (!savedCode || savedCode !== code) {
      throw new NotMatchException('Invalid or expired code');
    }
    return { message: 'Code verified successfully' };
  }

  async resetPassword(email: string, newPassword: string) {
    const savedCode = this.resetCodesMap.get(email);
    if (!savedCode) throw new UnauthorizedException('You must verify the code first');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.usersService.forgetPassword(email, hashed);
    this.resetCodesMap.delete(email);

    return { message: 'Password reset successfully' };
  }

  clearResetCodes() {
    this.resetCodesMap.clear();
    console.log('✅ All reset codes cleared.');
  }


}