import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { LlmService } from './llm.service';
import { ChatController } from './chat.controller';

@Module({
  controllers: [ChatController],
  providers: [ChatService, LlmService],
})
export class ChatbotModule {}
