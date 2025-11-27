import { Controller, Post, Get, Param, Body, UploadedFiles, UseInterceptors, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('send')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files'))
  async sendMessage(
    @Body('senderId') senderId: number,
    @Body('receiverId') receiverId: number,
    @Body('content') content: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.chatService.sendMessage(senderId, receiverId, content, files);
  }
  @Get('conversation/:userA/:userB')
  @UseGuards(JwtAuthGuard)
  async getConversation(
    @Param('userA') userA: number,
    @Param('userB') userB: number,
  ) {
    return this.chatService.getConversation(userA, userB);
  }

}


