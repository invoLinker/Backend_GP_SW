import { Module } from '@nestjs/common';
import { HuggingFaceController } from './HuggingFaceController';
import { HuggingFaceService } from './AiService';

@Module({
  controllers: [HuggingFaceController],
  providers: [HuggingFaceService],
})
export class AiModule {}
