import { Module } from '@nestjs/common';
import { GenerateTxtController } from './GenerateTxt.Controller';
import { GenerateTxtService } from './GenerateTxt.Service';

@Module({
  controllers: [GenerateTxtController],
  providers: [GenerateTxtService],
})
export class GenerateTxt {}
