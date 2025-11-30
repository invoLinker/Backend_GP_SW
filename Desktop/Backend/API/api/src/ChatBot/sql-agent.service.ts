// import { Injectable, BadRequestException } from '@nestjs/common';
// import { HfLlamaService } from './ChatBotService';
// import { MysqlService } from './mysql.service';

// @Injectable()
// export class SqlAgentService {

//   constructor(
//     private readonly llama: HfLlamaService,
//     private readonly db: MysqlService,
//   ) {}

//   // ⭐ 1) تحديد الجدول المناسب
//   async detectTable(question: string): Promise<string> {

//     const prompt = `
// حدد اسم الجدول المناسب للإجابة على سؤال المستخدم.
// استخدم فقط أحد الأسماء التالية حرفيًا:

// supplier_invoices
// purchaseorders
// delivery_notes
// goods_receipts
// payments
// stock
// supplier_invoice_items
// delivery_note_items
// goods_receipt_items
// purchaseorderitems
// users

// السؤال:
// "${question}"

// ارجع فقط اسم الجدول بدون أي شرح.
//     `.trim();

//     const table = (await this.llama.ask(prompt)).trim();
//     return table;
//   }

//   // ⭐ 2) الرد على سؤال باستخدام البيانات
//   async ask(question: string) {
//     // -------------------------
//     // 1) تحديد الجدول
//     // -------------------------
//     const table = await this.detectTable(question);

//     if (!table) {
//       throw new BadRequestException("لم أتمكن من تحديد الجدول المناسب");
//     }

//     // -------------------------
//     // 2) جلب البيانات
//     // -------------------------
//     let rows: any[] = [];
//     try {
//       rows = await this.db.query(`SELECT * FROM ${table}`);
//     } catch (e: any) {
//       throw new BadRequestException("Database Error: " + e.message);
//     }

//     // -------------------------
//     // 3) تحليل البيانات والإجابة
//     // -------------------------
//     const analysisPrompt = `
//     قم بتحليل البيانات التالية والرد على سؤال المستخدم.

//     البيانات (ROWS):
//     ${JSON.stringify(rows)}

//     السؤال:
//     "${question}"

//     إذا كان السؤال عن المشاعر، التحية، النصائح، الحياة اليومية، أو أي شيء غير متعلق بالجداول → أجب فقط: general

//     إذا كان السؤال فيه:
//     فاتورة – دفعات – مخزون – مورد – GR – DN – PO – عدد – مجموع – مبلغ – سعر
//     أو أي شيء متعلق بالبيانات → أجب فقط: database


//     قواعد الإجابة:

//     1) إذا كان السؤال يطلب "أعلى"، "أكبر"، "أعلى مبلغ"، "أعلى فاتورة"، 
//       فاعرض فقط أعلى سجل واحد وليس كل السجلات.

//     2) إذا تطلّب الرد عرض بيانات في جدول، استخدم جدول ASCII بالشكل التالي:
//       Column1      | Column2
//       -------------|-------------
//       value1       | value2

//     3) إذا كانت النتيجة عبارة عن قيمة واحدة فقط، اعرضها مباشرة بدون جدول.

//     4) إجابة عربية واضحة وسهلة.

//     ابدأ الإجابة مباشرة.
//     `.trim();

//     const answer = await this.llama.ask(analysisPrompt);

//     return {
//       table_used: table,
//       count_of_rows: rows.length,
//       answer,
//     };
//   }
// }



// src/ChatBot/sql-agent.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { HfLlamaService } from './ChatBotService';
import { MysqlService } from './mysql.service';
import { DB_SCHEMA } from './schema';

@Injectable()
export class SqlAgentService {
  constructor(
    private readonly llama: HfLlamaService,
    private readonly db: MysqlService,
  ) {}

  // Detect language: Arabic or English (بدون موديل)
  private detectLanguage(question: string): 'ar' | 'en' {
    // إذا في حروف عربية
    const hasArabic = /[\u0600-\u06FF]/.test(question);
    return hasArabic ? 'ar' : 'en';
  }

  // Simple rule: هل السؤال عن الداتابيس ولا عام/تحية؟
  private isDbQuestion(question: string): boolean {
    const q = question.toLowerCase();

    const keywords = [
      'po',
      'purchase order',
      'invoice',
      'supplier',
      'dn',
      'delivery note',
      'gr',
      'goods receipt',
      'payment',
      'stock',
      'item',
      'amount',
      'total',
      'installment',
      'فاتورة',
      'مورد',
      'دفعات',
      'دفعة',
      'مخزون',
      'طلب شراء',
      'سند',
      'ايصال',
      'كم',
      'عدد',
      'اجمالي',
      'إجمالي',
    ];

    return keywords.some(k => q.includes(k));
  }

  // Clean SQL text from ``` إلخ
  private cleanSql(text: string): string {
    return text
      .replace(/```sql/gi, '')
      .replace(/```/g, '')
      .replace(/^`+|`+$/g, '')
      .trim()
      .replace(/;+\s*$/g, '');
  }

  // Block dangerous SQL (غير SELECT)
  private isDangerous(sql: string): boolean {
    const s = sql.trim().toLowerCase();
    if (!s.startsWith('select')) return true;

    const forbidden = [' drop ', ' truncate ', ' delete ', ' update ', ' insert ', ' alter '];
    return forbidden.some(word => s.includes(word));
  }

  // 1) Generate SQL from natural language
  private async generateSql(question: string): Promise<string> {
    const prompt = `
You are a MySQL expert.
Your ONLY job is to convert the user question into ONE valid MySQL SELECT statement.

Rules:
- Use ONLY tables and columns that exist in this schema:
${DB_SCHEMA}

- Never invent tables or columns.
- Do NOT use a "users" table if it doesn't exist physically.
- If the question mentions:
  * "فاتورة مورد" or "فواتير الموردين" → supplier_invoices
  * "PO" or "Purchase Order" or "طلب شراء" → PurchaseOrders
  * "DN" or "Delivery Note" → delivery_notes
  * "GR" or "Goods Receipt" → goods_receipts
  * "دفعات" or "payments" → payments
- If the user asks for the PO with the greatest total amount:
  use ORDER BY total_amount DESC LIMIT 1

User question:
"${question}"

Return ONLY a valid SELECT SQL query.
No explanation.
No comments.
No markdown.
    `.trim();

    let sqlRaw = await this.llama.ask(prompt);
    const sql = this.cleanSql(sqlRaw);

    if (this.isDangerous(sql)) {
      throw new BadRequestException('Unsafe SQL generated: ' + sql);
    }

    if (!sql.toLowerCase().startsWith('select')) {
      throw new BadRequestException('Model did not return a SELECT statement: ' + sql);
    }

    return sql;
  }

  // 2) Execute SQL on MySQL
  private async executeSql(sql: string): Promise<any[]> {
    try {
      const rows = await this.db.query(sql);
      return Array.isArray(rows) ? rows : [];
    } catch (e: any) {
      throw new BadRequestException('SQL Execution Error: ' + e.message);
    }
  }

  // 3) Explain results shortly (Arabic or English)
  private async explainResult(
    question: string,
    sql: string,
    rows: any[],
    lang: 'ar' | 'en',
  ): Promise<string> {
    // عشان ما نكب كل الداتابيس عالموديل
    const limitedRows = rows.slice(0, 20);

    const prompt =
      lang === 'ar'
        ? `
السؤال: ${question}

هذه أول 20 صف من نتائج الاستعلام:
${JSON.stringify(limitedRows)}

بناءً على النتائج فقط، أعطني إجابة عربية قصيرة وواضحة:

- إذا كانت النتيجة صفاً واحداً، اذكر أهم الحقول فقط (مثل رقم الـ PO أو رقم الفاتورة والمبلغ).
- إذا كانت النتيجة رقماً واحداً (COUNT أو SUM)، اذكر الرقم مع جملة قصيرة تشرح معناه.
- إذا كانت عدة صفوف، يمكن ذكر أهم 3–5 صفوف في جملة بسيطة (بدون جداول معقدة).
- لا تذكر SQL في الإجابة النهائية.
        `.trim()
        : `
Question: ${question}

Here are the first 20 rows of the SQL result:
${JSON.stringify(limitedRows)}

Based on these results only, give a short and clear English answer:

- If there is a single row, mention only the key fields (like PO number or invoice number and the amount).
- If the result is a single number (COUNT or SUM), say the number and a short explanation.
- If there are multiple rows, you may summarize the top 3–5 rows in a simple sentence (no complex tables).
- Do NOT mention the SQL in the final answer.
        `.trim();

    const answer = await this.llama.ask(prompt);
    return answer.trim();
  }

  // 4) Public method used by the controller
  async ask(question: string) {
    const lang = this.detectLanguage(question);

    // لو السؤال عام (كيف حالك, نصيحة, الخ) → نجاوب مباشرة
    if (!this.isDbQuestion(question)) {
      const smallTalkPrompt =
        lang === 'ar'
          ? `المستخدم كتب بالعربية: "${question}". رد بإجابة عربية لطيفة وقصيرة.`
          : `User wrote: "${question}". Reply in short, friendly English.`;

      const answer = await this.llama.ask(smallTalkPrompt);

      return {
        mode: 'general',
        language: lang,
        sql: null,
        rows: [],
        answer: answer.trim(),
      };
    }

    // غير هيك → سؤال داتابيس
    const sql = await this.generateSql(question);
    const rows = await this.executeSql(sql);
    const answer = await this.explainResult(question, sql, rows, lang);

    return {
      mode: 'database',
      language: lang,
      sql,
      rows,
      answer,
    };
  }
}

