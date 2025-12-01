import { Controller, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private chat: ChatService) {}

  @Post('ask')
  ask(@Body() body: { question: string }) {
    return this.chat.ask(body.question);
  }
}
