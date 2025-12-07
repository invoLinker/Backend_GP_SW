import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { LlmService } from './llm.service';
import { ChatController } from './chat.controller';
import { ChatPermissionService } from './chat-permission.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, LlmService, ChatPermissionService],
})
export class ChatbotModule {}
