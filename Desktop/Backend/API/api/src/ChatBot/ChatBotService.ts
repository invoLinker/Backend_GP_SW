// // import { Injectable, InternalServerErrorException } from '@nestjs/common';
// // import fetch from 'node-fetch'; // إذا Node 18+ تقدر تحذفه وتستخدم global fetch

// // @Injectable()
// // export class ChatbotService {
// //   private readonly baseUrl = 'http://localhost:11434/api/generate';
// //   private readonly model = 'qwen2.5:3b'; // عدّلي الاسم للموديل اللي نزلتيه

// //   async ask(message: string) {
// //     try {
// //       const payload = {
// //         model: this.model,
// //         prompt: message,
// //         stream: false
// //       };

// //       const res = await fetch(this.baseUrl, {
// //         method: 'POST',
// //         headers: { 'Content-Type': 'application/json' },
// //         body: JSON.stringify(payload),
// //       });

// //       if (!res.ok) {
// //         const text = await res.text();
// //         throw new Error(`Ollama error ${res.status}: ${text}`);
// //       }

// //       const data = await res.json();
// //       // بعض نسخ Ollama ترجع الشكل المختلف، جربي تفحصي الـ JSON وغيّري السطر التالي لو لزم
// //       // غالباً الجواب يكون تحت data.response أو data[0].generated_text أو outputs
// //       const answer = data.response ?? data.outputs?.[0]?.content ?? JSON.stringify(data);
// //       return answer;
// //     } catch (err) {
// //       console.error('ChatbotService error:', err);
// //       throw new InternalServerErrorException('Error talking to local AI');
// //     }
// //   }
// // }


// import { Injectable } from '@nestjs/common';
// import { Sequelize } from 'sequelize-typescript';
// import fetch from 'node-fetch';
// import { Order } from 'sequelize';

// @Injectable()
// export class ChatbotService {
//   constructor(private sequelize: Sequelize) {}

//   private readonly AI_URL = 'http://localhost:11434/api/generate';
//   private readonly MODEL = 'qwen2.5:3b';
//   private cache = new Map<string, any>();

//   // الدالة الرئيسية لمعالجة أي سؤال
//   async handleQuestion(
//     question: string,
//     page = 1,
//     pageSize = 50,
//     filters: Record<string, any> = {},
//     sort?: { column: string; order: 'ASC' | 'DESC' }
//   ) {
//     if (this.cache.has(question)) return this.cache.get(question);

//     const isDBQuestion = this.checkIfDBQuestion(question);
//     let response;

//     if (isDBQuestion) {
//       const queryData = await this.askAIForQuery(question);

//       if (!this.sequelize.models[queryData.table]) {
//         return { answer: `الجدول ${queryData.table} غير موجود في النظام.` };
//       }

//       // تحقق من الأعمدة الموجودة قبل تنفيذ الـ where
//       const model = this.sequelize.models[queryData.table];
//       const validWhere: Record<string, any> = {};
//       for (const key in { ...(queryData.where || {}), ...filters }) {
//         if (key in model.getAttributes()) {
//           validWhere[key] = (queryData.where || {})[key] ?? filters[key];
//         }
//       }

//       const offset = (page - 1) * pageSize;
//       const order: Order | undefined = sort ? [[sort.column, sort.order]] as Order : undefined;

//       let dbResult: any[] = [];
//       try {
//         dbResult = await model.findAll({
//           where: validWhere,
//           limit: pageSize,
//           offset,
//           order,
//         });
//       } catch (err) {
//         return { answer: `خطأ عند جلب البيانات: ${(err as Error).message}` };
//       }

//       const summary = this.getAggregationSummary(dbResult);
//       response = await this.askAIToFormatAnswer(question, dbResult, summary);
//     } else {
//       // سؤال عام
//       response = await this.askAIForGeneralAnswer(question);
//     }

//     this.cache.set(question, response);
//     return response;
//   }

//   // تحقق إذا السؤال عن DB أو عام
//   private checkIfDBQuestion(question: string): boolean {
//     const keywords = [
//       'invoice',
//       'payment',
//       'supplier',
//       'stock',
//       'task',
//       'purchase',
//       'role',
//       'goods',
//       'delivery',
//     ];
//     return keywords.some((k) => question.toLowerCase().includes(k));
//   }

//   // اطلب JSON query من AI
//   private async askAIForQuery(question: string) {
//     const schema = this.getSchemaDescription();
//     const prompt = `
// أنت مساعد ذكي يتعامل مع قاعدة بيانات.
// قاعدة البيانات تحتوي على الجداول التالية:
// ${schema}

// السؤال من الموظف: "${question}"

// أرجو أن تقترح اسم الجدول (table) والأعمدة المطلوبة وشرط where إن وجد.
// أرجع JSON فقط بالشكل التالي:
// {
//   "table": "اسم الجدول",
//   "where": { "عمود": "قيمة" }
// }
// `;
//     const res = await fetch(this.AI_URL, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ model: this.MODEL, prompt, stream: false }),
//     });
//     const data = await res.json();
//     return JSON.parse(data.response.trim());
//   }

//   // تلخيص + aggregation للأعمدة الرقمية
//   private getAggregationSummary(rows: any[]) {
//     if (!Array.isArray(rows) || rows.length === 0) return {};
//     const numericColumns = Object.keys(rows[0].toJSON()).filter(
//       (key) => typeof rows[0][key] === 'number'
//     );
//     const summary: Record<string, any> = {};
//     numericColumns.forEach((col) => {
//       const values = rows.map((r) => r[col]);
//       summary[col] = {
//         count: values.length,
//         sum: values.reduce((a, b) => a + b, 0),
//         avg: values.reduce((a, b) => a + b, 0) / values.length,
//         max: Math.max(...values),
//         min: Math.min(...values),
//       };
//     });
//     return summary;
//   }

//   // صياغة الرد النهائي للموظف
//   private async askAIToFormatAnswer(question: string, dbResult: any[], summary: any) {
//     const prompt = `
// السؤال: "${question}"
// نتائج قاعدة البيانات (عرض Page واحد فقط):
// ${JSON.stringify(dbResult)}
// التحليلات والملخصات (Aggregation):
// ${JSON.stringify(summary)}

// أرجو صياغة جواب واضح للموظف بالعربي أو الإنجليزي.
// `;
//     const res = await fetch(this.AI_URL, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ model: this.MODEL, prompt, stream: false }),
//     });
//     const data = await res.json();
//     return data.response;
//   }

//   // سؤال عام للـ AI
//   private async askAIForGeneralAnswer(question: string) {
//     const res = await fetch(this.AI_URL, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ model: this.MODEL, prompt: question, stream: false }),
//     });
//     const data = await res.json();
//     return data.response;
//   }

//   // توليد schema لكل الجداول
//   private getSchemaDescription(): string {
//     const tables = this.sequelize.models;
//     let schema = '';
//     for (const name in tables) {
//       const attrs = Object.keys(tables[name].getAttributes()).join(', ');
//       schema += `Table ${name}(${attrs})\n`;
//     }
//     return schema;
//   }
// }
