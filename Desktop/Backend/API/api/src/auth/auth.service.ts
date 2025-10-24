// auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { User } from '../users/users.model';
import { Role } from '../roles/roles.model';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

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
      role: user.role?.role_name 
    };

    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '12h' }), 
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }), 
      user: { 
        id: user.user_id, 
        email: user.email, 
        role: user.role?.role_name 
      },
    };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET || 'secretKey' });
      const newAccessToken = this.jwtService.sign(
        { sub: payload.sub, email: payload.email, role: payload.role },
        { expiresIn: '15m' }
      );
      return { access_token: newAccessToken };
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
