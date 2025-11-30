import { Module } from '@nestjs/common';
import { ChatBotController } from './ChatBotController';
import { SqlAgentService } from './sql-agent.service';
import { HfLlamaService } from './ChatBotService';
import { MysqlService } from './mysql.service';

@Module({
  controllers: [ChatBotController],
  providers: [
    SqlAgentService,
    HfLlamaService,   // ❤️ لازم يكون هون
    MysqlService
  ],
  exports: [
    SqlAgentService
  ]
})
export class AiModule {}
