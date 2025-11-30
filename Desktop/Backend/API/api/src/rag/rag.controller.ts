import { Controller, Post, Body } from "@nestjs/common";
import { RagService } from "./rag.service";

@Controller("rag")
export class RagController {
  constructor(private ragService: RagService) {}

  @Post("add")
  add(@Body() body: { id: string; text: string }) {
    return this.ragService.addDocument(body.id, body.text);
  }

  @Post("ask")
  ask(@Body() body: { question: string }) {
    return this.ragService.ask(body.question);
  }
}
