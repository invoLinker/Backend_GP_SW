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

    const isMatch = await bcrypt.compare(password, user['password_hash']);
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

    const isMatch = await bcrypt.compare(password, user.password_hash);
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

  // async refreshToken(token: string) {
  //   try {
  //     const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET || 'secretKey' });
  //     const newAccessToken = this.jwtService.sign(
  //       { sub: payload.sub, email: payload.email, role: payload.role_name },
  //       { expiresIn: '15m' }
  //     );
  //     return { access_token: newAccessToken };
  //   } catch (e) {
  //     throw new UnauthorizedException('Invalid refresh token');
  //   }
  // }

  async refreshToken(token: string) {
  try {
    const payload = this.jwtService.verify(token, { 
      secret: process.env.JWT_SECRET || 'secretKey' 
    });

    // Generate NEW **Access Token**, short-lived
    const newAccessToken = this.jwtService.sign(
      {
        sub: payload.sub,
        email: payload.email,
        role_name: payload.role_name,
      },
      { expiresIn: '1h' }   // Same as login (or more, your choice)
    );

    return {
      access_token: newAccessToken      // ✔ Correct field
    };

  } catch (e) {
    throw new UnauthorizedException('Invalid refresh token');
  }
}



//////////////////////////////////////////////////// continue with google

async loginOrCreateWithGoogle(idToken: string, ID_image: Express.Multer.File) {
  const ticket = await this.googleClient.verifyIdToken({
    idToken,
    audience: this.config.get<string>('GOOGLE_CLIENT_ID'),
  });

  const payload = ticket.getPayload();
  if (!payload) throw new UnauthorizedException('Invalid Google token');

  const email = payload.email!;
  const first_name = payload.given_name || '';
  const last_name = payload.family_name || '';

  // 2️⃣ دور على المستخدم
  let user = await this.usersService.findByEmail(email);

  // 3️⃣ إذا غير موجود، create مع الصورة مباشرة
  if (!user) {
    const userDto: CreateUserDto = {
      first_name,
      last_name,
      email,
      password_hash: Math.random().toString(36).slice(-8), // كلمة مرور عشوائية
    };

    return this.usersService.create(userDto, ID_image);
  }

  // 4️⃣ اصنع JWT
  const jwt = this.jwtService.sign({ sub: user.user_id, email: user.email });

  return {
    message: 'Login or account created successfully',
    access_token: jwt,
    user_id: user.user_id,
    isIDUploaded: !!user.ID_image,
  };
}

//////////////////////////////////////////////////// GitHub

async loginOrCreateWithGitHub(code: string) {
  if (!code) throw new BadRequestException('GitHub code not provided');

  const tokenResponse = await axios.post(
    'https://github.com/login/oauth/access_token',
    {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    },
    { headers: { Accept: 'application/json' } },
  );

  const access_token = tokenResponse.data.access_token;
  if (!access_token) throw new UnauthorizedException('Invalid GitHub code');

  const userResponse = await axios.get('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  const emailResponse = await axios.get('https://api.github.com/user/emails', {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  const emailObj = emailResponse.data.find((e: any) => e.primary) || emailResponse.data[0];
  if (!emailObj || !emailObj.email) {
    throw new BadRequestException('GitHub account has no public email');
  }

  const email = emailObj.email;
  console.log('📧 GitHub Email:', email);

  let user = await this.usersService.findByEmail1(email);
  console.log('🔍 Found user in DB:', user ? '✅ Yes' : '❌ No');

 if (!user) {
  const fullName = userResponse.data.name || 'GitHub User';
  const nameParts = fullName.split(' ');
  const first_name = nameParts[0]; 
  const last_name = nameParts.slice(1).join(' '); 

  const userDto: CreateUserDto = {
    first_name,
    last_name,
    email,
    password_hash: Math.random().toString(36).slice(-8), 
  };

  return await this.usersService.create(userDto);
}


  const payload = { sub: user.user_id, email: user.email, role: user.role_id };
  const accessToken = this.jwtService.sign(payload, { expiresIn: '12h' });
  const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

  console.log('✅ GitHub Login Done for:', user.email);

  return {
    message: 'Login or account created successfully',
    access_token: accessToken,
    refresh_token: refreshToken,
    user_id: user.user_id,
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