// src/ai/ai.module.ts
import { Module } from '@nestjs/common';
import { HuggingFaceService } from './hugging.service';

@Module({
  providers: [HuggingFaceService],
  exports: [HuggingFaceService], // مهم جداً
})
export class AiModule {}
