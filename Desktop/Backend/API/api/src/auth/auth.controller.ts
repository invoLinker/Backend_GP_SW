import { Controller, Post, Body, UnauthorizedException, UploadedFile, UseInterceptors, Get, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './LoginDto';
import { FileInterceptor } from '@nestjs/platform-express';
import { privateDecrypt } from 'crypto';
import { UsersService } from 'src/users/users.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { User } from 'src/users/users.model';


// class GoogleAuthDto {
//   id_token: string;
// }


@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService
  ) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('refresh')
  async refresh(@Body() body: { refresh_token: string }) {
    return this.authService.refreshToken(body.refresh_token);
  }

  @Post('google')
  @UseInterceptors(FileInterceptor('ID_image'))
  async googleCreateOrLogin(
    @Body('id_token') id_token: string,
    @UploadedFile() ID_image: Express.Multer.File,
  ) {
    return this.authService.loginOrCreateWithGoogle(id_token, ID_image);
  }

  // @Post('github/callback')
  // @UseInterceptors(FileInterceptor('ID_image'))
  // async githubCreateOrLogin(
  //   @Body('code') code: string,
  //   @UploadedFile() ID_image: Express.Multer.File,
  // ) {
  //   return this.authService.loginOrCreateWithGithub(code, ID_image);
  // }

  @Post('github/callback')
  async githubCallback(@Body('code') code: string) {
    return this.authService.loginOrCreateWithGitHub(code);
  }
  

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.sendResetCode(email);
  }

  @Post('verify-code')
  async verifyCode(@Body() body: { email: string; code: string }) {
    return this.authService.verifyResetCode(body.email, body.code);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { email: string; newPassword: string }) {
    return this.authService.resetPassword(body.email, body.newPassword);
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
