// import { Injectable } from '@nestjs/common';
// import type { Express } from 'express';
// import { OpenAI } from 'openai';
// import * as fs from 'fs';

// @Injectable()
// export class imgService {
//   private client: OpenAI;

//   constructor() {
//     this.client = new OpenAI({
//       baseURL: 'https://openrouter.ai/api/v1',
//       apiKey: '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', // ضع مفتاحك هنا أو في .env
//     });
//   }

//   // تحويل صورة الملف إلى Base64
//   private toBase64(file: Express.Multer.File): string {
//     return file.buffer.toString('base64');
//   }

//   // استخراج النص من صورة
//   async extractText(file: Express.Multer.File): Promise<string> {
//     const base64Image = this.toBase64(file);

//     const prompt = `
//     Extract all text from the following image encoded in Base64:
//     ${base64Image}
//     Return only the text content.
//     `;


//     const response = await this.client.chat.completions.create({
//       model: 'anthropic/claude-sonnet-4.5', // أو أي موديل يدعم الصور
//       messages: [
//         {
//           role: 'user',
//           content: prompt,
//         },
//       ],
//     });

//     // استخراج النص من الرد
//    const text = response.choices?.[0]?.message?.content || '';
//     return text;
//   }
// }
