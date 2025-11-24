// import { Controller, Post, Body, Query } from '@nestjs/common';
// import { ChatbotService } from './ChatBotService';
// import { Public } from 'src/auth/jwt-auth.guard';

// @Controller('chatbot')
// export class ChatbotController {
//   constructor(private readonly chatbotService: ChatbotService) {}

//   @Public()
//   @Post('ask')
//   async ask(
//     @Body('question') question: string,
//     @Query('page') page: number = 1,
//     @Query('pageSize') pageSize: number = 50,
//     @Query('sortColumn') sortColumn?: string,
//     @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'ASC'
//   ) {
//     const sort = sortColumn ? { column: sortColumn, order: sortOrder } : undefined;

//     const answer = await this.chatbotService.handleQuestion(
//       question,
//       page,
//       pageSize,
//       {}, // filters فارغة حاليًا، ممكن تضيفها لاحقًا
//       sort
//     );

//     return { answer };
//   }
// }
