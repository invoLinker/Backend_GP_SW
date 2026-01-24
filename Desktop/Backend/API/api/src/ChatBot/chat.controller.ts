import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chatbot')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard) 
  async ask(@Body() body: any, @Request() req: any) {
    const question = body?.question;
    const userRole = req.user?.role_name || req.user?.role; 
    
    console.log('Chat request - User:', req.user);
    console.log('Chat request - Role:', userRole);

    if (!question) {
      return {
        success: false,
        error: 'السؤال مطلوب',
        message: 'يرجى إرسال سؤال في حقل "question"',
      };
    }

    if (typeof question !== 'string') {
      return {
        success: false,
        error: 'نوع البيانات غير صحيح',
        message: 'يجب أن يكون السؤال نصاً (string)',
      };
    }

    if (question.trim().length === 0) {
      return {
        success: false,
        error: 'السؤال فارغ',
        message: 'يرجى إدخال سؤال صحيح',
      };
    }

    const userId = req.user?.userId || req.user?.sub; 
    console.log('Chat request - UserId:', userId);
    console.log('Chat request - Full user object:', JSON.stringify(req.user, null, 2));
    return await this.chatService.ask(question.trim(), userRole, userId);
  }
}