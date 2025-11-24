import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { HistoryLogService } from 'src/History/history-log.service';
import { HistoryLog } from 'src/History/history-log.model';
import { SequelizeModule } from '@nestjs/sequelize';

@Module({
  imports: [HistoryLog,
    MulterModule.register({
          storage: diskStorage({
            destination: './uploads', 
            filename: (req, file, cb) => {
              const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
              cb(null, uniqueSuffix + extname(file.originalname));
            },
          }),
        }),
    SequelizeModule.forFeature([HistoryLog]),
    UsersModule,
    PassportModule,
    ConfigModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretKey',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy,HistoryLogService],
  exports: [AuthService],
})
export class AuthModule {}
