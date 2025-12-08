import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('chatbot')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Endpoint رئيسي للـ Chatbot
   * POST /chatbot
   * 
   * Body: { "question": "سؤالك هنا" }
   * 
   * Response: {
   *   "success": true,
   *   "answer": "الإجابة...",
   *   "rows": [...],
   *   "metadata": { ... }
   * }
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard) // فقط authentication، الـ permissions بناءً على role
  async ask(@Body() body: any, @Request() req: any) {
    const question = body?.question;
    // Role من JWT token - جرب role_name أو role
    const userRole = req.user?.role_name || req.user?.role; // Role من JWT token (مثل: Admin, Accountant, Finance, Viewer)
    
    // Logging للـ debugging
    console.log('Chat request - User:', req.user);
    console.log('Chat request - Role:', userRole);

    // التحقق الأساسي
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

    // معالجة السؤال مع الـ role والـ userId للتحقق من permissions
    const userId = req.user?.userId || req.user?.sub; // User ID from JWT token
    console.log('Chat request - UserId:', userId);
    console.log('Chat request - Full user object:', JSON.stringify(req.user, null, 2));
    return await this.chatService.ask(question.trim(), userRole, userId);
  }
}