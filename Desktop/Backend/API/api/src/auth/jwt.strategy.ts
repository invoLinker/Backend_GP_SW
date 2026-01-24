
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(), // ← أولاً: من الهيدر
        (req) => {
          return req?.query?.token || null;      // ← ثانياً: من query
        },
      ]),
      secretOrKey: process.env.JWT_SECRET || 'secretKey',
    });
  }

  async validate(payload: any) {
  console.log('jwt.strategy validate called with payload:', payload);
  return { userId: payload.sub, email: payload.email, role: payload.role_name };
}


}
