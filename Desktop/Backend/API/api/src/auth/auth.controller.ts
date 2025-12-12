import { Controller, Post, Body, UnauthorizedException, UploadedFile, Request,UseInterceptors, Get, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './LoginDto';
import { FileInterceptor } from '@nestjs/platform-express';
import { privateDecrypt } from 'crypto';
import { UsersService } from 'src/users/users.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { User } from 'src/users/users.model';
import { HistoryLogService } from '../History/history-log.service';
import { HistoryCategory, HistorySeverity } from '../History/create-history-log.dto';
import { Public } from '../auth/jwt-auth.guard'; 




@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private historyLogService: HistoryLogService
  ) {}

  @Public()
  @Post('login')
  async login(@Body() body: { email: string; password: string }, @Request() req) {
  try {
      const result = await this.authService.login(body.email, body.password);
      await this.historyLogService.createLog({
        action: 'User logged in',
        description: `User with id=${result.user.id} logged in successfully`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.AUTH,
        severity: HistorySeverity.SUCCESS,
        details: result.message,
      });

      return result;

    } catch (error) {
      await this.historyLogService.createLog({
        action: 'User logged Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.AUTH,
        severity: HistorySeverity.ERROR,
        details: error,
      });

      throw error;
    }
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() body: { refresh_token: string }) {
    return this.authService.refreshToken(body.refresh_token);
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
      if (!email) throw new BadRequestException('Email is required');
      return this.authService.sendResetCode(email);
  }

  @Public()
  @Post('verify-code')
  async verifyCode(@Body() body: { email: string; code: string }) {
      if (!body.email || !body.code) throw new BadRequestException('Email and code are required');
      return this.authService.verifyResetCode(body.email, body.code);

  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() body: { email: string; newPassword: string }) {
    try {
      if (!body.email || !body.newPassword) throw new BadRequestException('Email and new password are required');
      const result = await this.authService.resetPassword(body.email, body.newPassword);

      await this.historyLogService.createLog({
        action: 'Reset password',
        description: `Password reset for email=${body.email}`,
        user: body.email,
        userRole: 'Unknown',
        category: HistoryCategory.SECURITY,
        severity: HistorySeverity.SUCCESS,
        details: result.message,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Reset password',
        description: error.message,
        user: body.email,
        userRole: 'Unknown',
        category: HistoryCategory.SECURITY,
        severity: HistorySeverity.ERROR,
        details: error,
      });
      throw error;
    }
  }
  
///////////////////////////////////////////////////

  @Public()
  @Post('google')
  @UseInterceptors(FileInterceptor('ID_image'))
  async googleCreateOrLogin(
    @Request() req,
    @Body('id_token') id_token: string,
    @UploadedFile() ID_image?: Express.Multer.File,
    
  ) {
    if (!id_token) {
      throw new BadRequestException('id_token is required');
    }

    try {
      const result = await this.authService.loginOrCreateWithGoogle(id_token, ID_image);

      await this.historyLogService.createLog({
        action: 'User Sign-in/up',
        description: `User with email${result.user.email} logged successfully`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.AUTH,
        severity: HistorySeverity.SUCCESS,
        details: result.message,
      })

      return result;

    } catch (error) {
      await this.historyLogService.createLog({
        action: 'User logged Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.AUTH,
        severity: HistorySeverity.ERROR,
        details: error,
      });

      throw error;
    }
  }


  
  @Post('upload-id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('ID_image'))
  async uploadID(
    @UploadedFile() ID_imageFile: Express.Multer.File,
    @Req() req: any
  ) {
    const userId = req.user.userId; 
      if (!ID_imageFile) {
        throw new BadRequestException('ID_image is required');
      }  
      
      return this.usersService.updateIDImage(userId, ID_imageFile);
  }




}
