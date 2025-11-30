import { Controller, Post, Body } from "@nestjs/common";
import { SqlAgentService } from "./sql-agent.service";

@Controller("ai-chat")
export class ChatBotController {
  constructor(private readonly ai: SqlAgentService) {}

  @Post()
  ask(@Body("question") question: string) {
    return this.ai.ask(question);
  }
}
