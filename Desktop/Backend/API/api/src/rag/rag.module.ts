import { Module } from "@nestjs/common";
import { RagService } from "./rag.service";
import { EmbeddingService } from "./embedding.service";
import { RagController } from "./rag.controller";

@Module({
  controllers: [RagController],
  providers: [RagService, EmbeddingService],
  exports: [RagService]
})
export class RagModule {}
