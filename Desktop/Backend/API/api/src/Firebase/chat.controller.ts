// import { Controller, Post, Body, UploadedFile, UseInterceptors } from '@nestjs/common';
// import { FileInterceptor } from '@nestjs/platform-express';
// import { ChatService } from './chat.service';

// @Controller('chat')
// export class ChatController {
//   constructor(private chatService: ChatService) {}

//   @Post('send')
//   @UseInterceptors(FileInterceptor('file')) 
//   async sendMessage(
//     @Body() body: { senderId: string; receiverId: string; message?: string },
//     @UploadedFile() file?: Express.Multer.File,
//   ) {
//     return this.chatService.sendMessage(body.senderId, body.receiverId, body.message, file);
//   }
// }

// import {
//   Controller,
//   Post,
//   Get,
//   Param,
//   Body,
//   UploadedFile,
//   UseInterceptors,
//   ParseIntPipe,
// } from '@nestjs/common';
// import { FileInterceptor } from '@nestjs/platform-express';
// import { ChatService } from './chat.service';

// @Controller('chat')
// export class ChatController {
//   constructor(private readonly chatService: ChatService) {}

//   // إرسال رسالة (نص + ملف بنفس الوقت)
//   @Post('send')
//   @UseInterceptors(FileInterceptor('file'))
//   async sendMessage(
//     @Body('senderId', ParseIntPipe) senderId: number,
//     @Body('receiverId', ParseIntPipe) receiverId: number,
//     @Body('content') content: string,
//     @UploadedFile() file?: Express.Multer.File,
//   ) {
//     return this.chatService.sendMessage(senderId, receiverId, content, file);
//   }

//   // جلب المحادثة بينك وبين شخص
//   @Get(':userId/conversation/:otherUserId')
//   async getConversation(
//     @Param('userId', ParseIntPipe) userId: number,
//     @Param('otherUserId', ParseIntPipe) otherUserId: number,
//   ) {
//     return this.chatService.getConversation(userId, otherUserId);
//   }
// }


import { Controller, Post, Get, Param, Body, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { ChatService } from './chat.service';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // إرسال رسالة نص + ملفات
  @Post('send')
  @UseInterceptors(FilesInterceptor('files'))
  async sendMessage(
    @Body('senderId') senderId: number,
    @Body('receiverId') receiverId: number,
    @Body('content') content: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.chatService.sendMessage(senderId, receiverId, content, files);
  }
  // جلب المحادثة بين شخصين
  @Get('conversation/:userA/:userB')
  async getConversation(
    @Param('userA') userA: number,
    @Param('userB') userB: number,
  ) {
    return this.chatService.getConversation(userA, userB);
  }

  //  @Post('send-to-all')
  // @UseInterceptors(FilesInterceptor('files'))
  // async sendMessageToAll(
  //   @Body('senderId') senderId: number,
  //   @Body('content') content: string,
  //   // @Body('receiverId') receiverId: string,
  //   @UploadedFiles() files?: Express.Multer.File[],
  // ) {
  //   return this.chatService.sendMessageToGroupChat(senderId,content, files);
  // }

  //   @Get('conversation/group_chat')
  // async getGroupMessages() {
  //   const messages = await this.chatService.getGroupConversation();
  //   return { success: true, data: messages };
  // }
}


