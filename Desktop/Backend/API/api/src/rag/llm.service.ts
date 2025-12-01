// import { Injectable } from "@nestjs/common";
// import OpenAI from "openai";
// import { DB_SCHEMA } from "./db-schema";

// @Injectable()
// export class LlmService {
//   private client: OpenAI;
//   private readonly sqlModel: string;
//   private readonly answerModel: string;

//   constructor() {
//     this.client = new OpenAI({
//       apiKey: process.env.HF_TOKEN,
//       baseURL: "https://router.huggingface.co/v1",
//     });

//     this.sqlModel = "meta-llama/Llama-3.1-8B-Instruct:novita";
//     this.answerModel = "meta-llama/Llama-3.1-8B-Instruct:novita";
//   }

//   /**
//    * Generate SQL from natural language
//    */
//   async generateSQL(question: string): Promise<string> {
//     const systemPrompt = `
// You are an expert MySQL SQL generator for a financial/accounting system.

// Your ONLY task:
// Convert natural-language questions (Arabic or English) into a VALID MySQL SELECT query.

// STRICT OUTPUT RULES:
// - Return SQL ONLY.
// - NO markdown.
// - NO backticks.
// - NO explanations.
// - NO comments.
// - ONLY a valid SELECT query.
// - NEVER generate UPDATE, INSERT, DELETE.

// ---------------------------------------
// VALID TABLE NAMES (USE EXACTLY THESE):
// ---------------------------------------
// purchaseorders
// purchaseorderitems
// supplier_invoices
// supplier_invoice_items
// delivery_notes
// delivery_note_items
// goods_receipts
// goods_receipt_items
// user

// IMPORTANT TABLE RULES:
// - ALL table names MUST be lowercase.
// - NEVER use PascalCase or camelCase versions.
// - NEVER invent table names.
// - NEVER use "users" (plural). Correct table name is: user

// RELATION RULES:
// - purchaseorderitems.po_id = purchaseorders.po_id
// - supplier_invoices.po_number = purchaseorders.po_number
// - supplier_invoice_items.invoice_id = supplier_invoices.invoice_id
// - delivery_notes.po_number = purchaseorders.po_number
// - delivery_note_items.dn_id = delivery_notes.dn_id
// - goods_receipts.po_number = purchaseorders.po_number
// - goods_receipt_items.gr_id = goods_receipts.gr_id
// - For comparing items: item_name/item_name and barcode must match.

// ------------------------------------------
// AGGREGATION SAFETY RULES (VERY IMPORTANT):
// ------------------------------------------
// To avoid multiplying rows:

// 1) When summing PO quantities:
//    Use:
//       SUM(poi.quantity)
//    NEVER join PO → GR items directly without grouping.

// 2) When summing GR quantities:
//    Use:
//       SUM(gri.received_quantity)
//    Join:
//       goods_receipts gr ON gr.po_number = po.po_number
//       goods_receipt_items gri ON gri.gr_id = gr.gr_id

// 3) When summing Invoice quantities:
//    Use:
//       SUM(sii.quantity)
//    Join:
//       supplier_invoice_items sii ON sii.invoice_id = si.invoice_id

// 4) NEVER let JOINs between PO × GR × Invoice multiply rows.
//    ALWAYS aggregate per item or use separate subquery aggregations.

// --------------------------------------
// FULL SAFE JOIN TEMPLATE (USE THIS):
// --------------------------------------
// SELECT
//   poi.item_name,
//   poi.quantity AS po_quantity,
//   dni.quantity AS dn_quantity,
//   gri.received_quantity AS gr_quantity,
//   sii.quantity AS invoice_quantity,
//   po.po_number,
//   dn.dn_number,
//   gr.gr_number,
//   si.invoice_number
// FROM purchaseorderitems poi
// JOIN purchaseorders po ON poi.po_id = po.po_id
// LEFT JOIN delivery_notes dn ON dn.po_number = po.po_number
// LEFT JOIN delivery_note_items dni
//   ON dni.dn_id = dn.dn_id
//   AND dni.item_name = poi.item_name
//   AND dni.barcode = poi.barcode
// LEFT JOIN supplier_invoices si ON si.po_number = po.po_number
// LEFT JOIN supplier_invoice_items sii
//   ON sii.invoice_id = si.invoice_id
//   AND sii.item_name = poi.item_name
//   AND sii.barcode = poi.barcode
// LEFT JOIN goods_receipts gr ON gr.po_number = po.po_number
// LEFT JOIN goods_receipt_items gri
//   ON gri.gr_id = gr.gr_id
//   AND gri.item_name = poi.item_name
//   AND gri.barcode = poi.barcode
// WHERE <condition>;

// ============================================================
// ### 🚨 CRITICAL NEW RULE — PREVENT WRONG TOTALS
// ============================================================
// When calculating totals (ordered vs received vs delivered), ALWAYS use SEPARATE aggregated subqueries.

// NEVER join purchaseorderitems with goods_receipt_items or delivery_note_items directly when using SUM, because it causes row-duplication and incorrect totals.

// Correct pattern:

// SELECT
//   (SELECT SUM(quantity)
//    FROM purchaseorderitems
//    WHERE po_id = (SELECT po_id FROM purchaseorders WHERE po_number = 'PO-X')
//   ) AS total_ordered,

//   (SELECT SUM(gri.received_quantity)
//    FROM goods_receipts gr
//    JOIN goods_receipt_items gri ON gri.gr_id = gr.gr_id
//    WHERE gr.po_number = 'PO-X'
//   ) AS total_received;

// This is the ONLY correct way to compute totals.
// --------------------------------------
// USER NAME RULE:
// --------------------------------------
// To match full name:
//   CONCAT(user.first_name, ' ', user.last_name)

// --------------------------------------
// DATABASE SCHEMA:
// --------------------------------------
// ${DB_SCHEMA}
// `;

//     const res = await this.client.chat.completions.create({
//       model: this.sqlModel,
//       messages: [
//         { role: "system", content: systemPrompt },
//         { role: "user", content: question },
//       ],
//       temperature: 0,
//     });

//     let sql = (res.choices[0].message?.content ?? "").trim();

//     sql = sql
//       .replace(/```sql/gi, "")
//       .replace(/```/g, "")
//       .replace(/`/g, "")
//       .trim();

//     const semicolonIndex = sql.indexOf(";");
//     if (semicolonIndex !== -1) {
//       sql = sql.slice(0, semicolonIndex + 1);
//     }

//     if (!sql.toLowerCase().includes("select")) {
//       throw new Error("Generated SQL is not a SELECT query");
//     }

//     return sql;
//   }

//   /**
//    * Clean rows before sending to LLM
//    */
//   private sanitizeRows(rows: any[]): any[] {
//     const MAX_ROWS = 10;
//     const MAX_STRING_LENGTH = 500;

//     const limited = Array.isArray(rows) ? rows.slice(0, MAX_ROWS) : rows;

//     return limited.map((row) => {
//       const {
//         po_id,
//         invoice_id,
//         dn_id,
//         id,
//         supplier_id,
//         created_by,
//         verified_by,
//         createdAt,
//         updatedAt,
//         verified_at,
//         supplier_email,
//         supplier_phone,
//         supplier_address,
//         company_email,
//         company_phone,
//         company_address,
//         to_email,
//         to_phone,
//         to_address,
//         bank_account,
//         bank_name,
//         pdfUrl,
//         excelUrl,
//         invoice_image,
//         installmentsData,
//         ...safe
//       } = row;

//       const trimmed: Record<string, any> = {};

//       Object.entries(safe).forEach(([key, value]) => {
//         if (typeof value === "string") {
//           trimmed[key] =
//             value.length > MAX_STRING_LENGTH
//               ? value.slice(0, MAX_STRING_LENGTH) + " ...[truncated]"
//               : value;
//         } else {
//           trimmed[key] = value;
//         }
//       });

//       return trimmed;
//     });
//   }

//   /**
//    * Final answer formatter
//    */
//   async formatAnswer(question: string, rows: any[]): Promise<string> {
//     const cleanRows = this.sanitizeRows(rows);

//     const systemPrompt = `
// You explain database results for Purchase Orders, Supplier Invoices, Delivery Notes, and Goods Receipts.

// RULES:
// - Answer in clean, understandable English.
// - NEVER output JSON.
// - NEVER show SQL.
// - NEVER output markdown.
// - NEVER invent missing data.
// - If rows exist, ALWAYS answer based 100% on them.
// - If rows are empty, say clearly: "There is no matching data."
// `;

//     const res = await this.client.chat.completions.create({
//       model: this.answerModel,
//       messages: [
//         { role: "system", content: systemPrompt },
//         {
//           role: "user",
//           content: `
// User question:
// ${question}

// Cleaned rows (DO NOT output JSON):
// ${JSON.stringify(cleanRows)}
//           `.trim(),
//         },
//       ],
//       temperature: 0,
//     });

//     return res.choices[0].message?.content?.trim() ?? "No answer.";
//   }
// }

import { Injectable } from "@nestjs/common";
import OpenAI from "openai";
import { DB_SCHEMA } from "./db-schema";

@Injectable()
export class LlmService {
  private client: OpenAI;
  private readonly sqlModel: string;
  private readonly answerModel: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.HF_TOKEN,
      baseURL: "https://router.huggingface.co/v1",
    });

    this.sqlModel = "meta-llama/Llama-3.1-8B-Instruct:novita";
    this.answerModel = "meta-llama/Llama-3.1-8B-Instruct:novita";
  }

  /**
   * Generate SQL from natural language
   */
  async generateSQL(question: string): Promise<string> {
    const systemPrompt = `
You are an expert MySQL SQL generator for a financial/accounting system.

Your ONLY task:
Convert natural-language questions (Arabic or English) into a VALID MySQL SELECT query.

STRICT OUTPUT RULES:
- Output SQL ONLY.
- No markdown.
- No comments.
- No explanations.
- No backticks.
- A single SELECT query only.
- NEVER generate UPDATE, INSERT, DELETE, or multiple statements.

------------------------------------------------------
VALID TABLE NAMES (USE EXACTLY THESE — LOWERCASE ONLY)
------------------------------------------------------
purchaseorders
purchaseorderitems
supplier_invoices
supplier_invoice_items
delivery_notes
delivery_note_items
goods_receipts
goods_receipt_items
user

IMPORTANT NAMING RULES:
- All table names MUST be lowercase.
- NEVER use PascalCase or camelCase.
- NEVER invent new table names.
- The users table is EXACTLY: user (NOT users).

------------------------------------------------------
RELATION RULES (MUST ALWAYS FOLLOW THESE)
------------------------------------------------------
purchaseorderitems.po_id          = purchaseorders.po_id
supplier_invoices.po_number       = purchaseorders.po_number
supplier_invoice_items.invoice_id = supplier_invoices.invoice_id

delivery_notes.po_number          = purchaseorders.po_number
delivery_note_items.dn_id         = delivery_notes.dn_id

goods_receipts.po_number          = purchaseorders.po_number
goods_receipt_items.gr_id         = goods_receipts.gr_id

Item matching rules:
purchaseorderitems.item_name = delivery_note_items.item_name
purchaseorderitems.item_name = goods_receipt_items.item_name
purchaseorderitems.item_name = supplier_invoice_items.item_name
barcode MUST match across all tables.

------------------------------------------------------
### 🚨 CRITICAL RULE — ITEMS MAY APPEAR IN MULTIPLE ROWS
------------------------------------------------------
An item (same item_name + barcode) may appear multiple times in:
- purchaseorderitems
- delivery_note_items
- goods_receipt_items
- supplier_invoice_items

THEREFORE:
- NEVER compare row-level quantities.
- ALWAYS aggregate using SUM().
- ALWAYS group per item_name + barcode.

------------------------------------------------------
### 🚨 ABSOLUTE RULE — NEVER SUM OVER JOINED TABLES
------------------------------------------------------
JOINING PO × DN × GR × Invoice multiplies rows (Fan-out problem):
This leads to wrong totals (e.g., 50 × 2 = 100).

To avoid WRONG TOTALS:
ALL AGGREGATIONS MUST BE DONE USING **SEPARATE SUBQUERIES ONLY**.

DO NOT place SUM() on joined tables directly.
DO NOT aggregate inside a multi-table JOIN.

------------------------------------------------------
### 🚨 TEMPLATE FOR CORRECT PER-ITEM COMPARISON
------------------------------------------------------
When comparing PO vs DN vs GR vs Invoice quantities,
you MUST generate SQL using **subqueries per item**, like this:

SELECT
  poi.item_name,
  poi.barcode,

  (SELECT SUM(quantity)
   FROM purchaseorderitems
   WHERE po_id = poi.po_id
     AND item_name = poi.item_name
     AND barcode = poi.barcode
  ) AS po_quantity,

  (SELECT SUM(dni.quantity)
   FROM delivery_note_items dni
   JOIN delivery_notes dn ON dn.dn_id = dni.dn_id
   WHERE dn.po_number = po.po_number
     AND dni.item_name = poi.item_name
     AND dni.barcode = poi.barcode
  ) AS dn_quantity,

  (SELECT SUM(gri.received_quantity)
   FROM goods_receipt_items gri
   JOIN goods_receipts gr ON gr.gr_id = gri.gr_id
   WHERE gr.po_number = po.po_number
     AND gri.item_name = poi.item_name
     AND gri.barcode = poi.barcode
  ) AS gr_quantity,

  (SELECT SUM(sii.quantity)
   FROM supplier_invoice_items sii
   JOIN supplier_invoices si ON si.invoice_id = sii.invoice_id
   WHERE si.po_number = po.po_number
     AND sii.item_name = poi.item_name
     AND sii.barcode = poi.barcode
  ) AS invoice_quantity

FROM purchaseorderitems poi
JOIN purchaseorders po ON poi.po_id = po.po_id
WHERE po.po_number = '<PO_NUMBER>'
GROUP BY poi.item_name, poi.barcode;

------------------------------------------------------
### 🚨 ALWAYS GROUP BY ITEM_NAME AND BARCODE
------------------------------------------------------
When subqueries are used per item:
  GROUP BY poi.item_name, poi.barcode

------------------------------------------------------
### 🚨 ITEM-LEVEL FILTER RULE
------------------------------------------------------
When filtering based on quantity differences:
ALWAYS use HAVING with aggregated values, like:

HAVING gr_quantity <> dn_quantity
HAVING po_quantity < gr_quantity

------------------------------------------------------
### 🚨 TOTAL PO VALUES MUST USE SUBQUERIES
------------------------------------------------------
For entire PO totals (not per item) ALWAYS generate:

SELECT
 (SELECT SUM(quantity)
  FROM purchaseorderitems
  WHERE po_id = (SELECT po_id FROM purchaseorders WHERE po_number = 'PO-X')
 ) AS total_ordered,

 (SELECT SUM(dni.quantity)
  FROM delivery_note_items dni
  JOIN delivery_notes dn ON dn.dn_id = dni.dn_id
  WHERE dn.po_number = 'PO-X'
 ) AS total_delivered,

 (SELECT SUM(gri.received_quantity)
  FROM goods_receipt_items gri
  JOIN goods_receipts gr ON gr.gr_id = gri.gr_id
  WHERE gr.po_number = 'PO-X'
 ) AS total_received;

------------------------------------------------------
USER FULL NAME RULE
------------------------------------------------------
To match full name:
CONCAT(user.first_name, ' ', user.last_name)

------------------------------------------------------
FINAL RULES SUMMARY:
------------------------------------------------------
- ALWAYS aggregate using isolated subqueries.
- NEVER sum directly across JOINs.
- NEVER allow PO × DN × GR × Invoice fan-out.
- ALWAYS group by item_name + barcode for item comparison.
- ALWAYS return SQL ONLY.
- NEVER invent table names or fields.


------------------------------------------------------
DATABASE SCHEMA:
${DB_SCHEMA}


`;

    const res = await this.client.chat.completions.create({
      model: this.sqlModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      temperature: 0,
    });

    let sql = (res.choices[0].message?.content ?? "").trim();

    sql = sql
      .replace(/```sql/gi, "")
      .replace(/```/g, "")
      .replace(/`/g, "")
      .trim();

    const semicolonIndex = sql.indexOf(";");
    if (semicolonIndex !== -1) {
      sql = sql.slice(0, semicolonIndex + 1);
    }

    if (!sql.toLowerCase().includes("select")) {
      throw new Error("Generated SQL is not a SELECT query");
    }

    return sql;
  }

  /**
   * Clean rows before sending to LLM
   */
  private sanitizeRows(rows: any[]): any[] {
    const MAX_ROWS = 10;
    const MAX_STRING_LENGTH = 500;

    const limited = Array.isArray(rows) ? rows.slice(0, MAX_ROWS) : rows;

    return limited.map((row) => {
      const {
        po_id,
        invoice_id,
        dn_id,
        id,
        supplier_id,
        created_by,
        verified_by,
        createdAt,
        updatedAt,
        verified_at,
        supplier_email,
        supplier_phone,
        supplier_address,
        company_email,
        company_phone,
        company_address,
        to_email,
        to_phone,
        to_address,
        bank_account,
        bank_name,
        pdfUrl,
        excelUrl,
        invoice_image,
        installmentsData,
        ...safe
      } = row;

      const trimmed: Record<string, any> = {};

      Object.entries(safe).forEach(([key, value]) => {
        if (typeof value === "string") {
          trimmed[key] =
            value.length > MAX_STRING_LENGTH
              ? value.slice(0, MAX_STRING_LENGTH) + " ...[truncated]"
              : value;
        } else {
          trimmed[key] = value;
        }
      });

      return trimmed;
    });
  }

  /**
   * Final answer formatter
   */
  async formatAnswer(question: string, rows: any[]): Promise<string> {
    const cleanRows = this.sanitizeRows(rows);

    const systemPrompt = `
You explain database results for Purchase Orders, Supplier Invoices, Delivery Notes, and Goods Receipts.

RULES:
- Answer in clean, understandable English.
- NEVER output JSON.
- NEVER show SQL.
- NEVER output markdown.
- NEVER invent missing data.
- If rows exist, ALWAYS answer based 100% on them.
- If rows are empty, say clearly: "There is no matching data."
`;

    const res = await this.client.chat.completions.create({
      model: this.answerModel,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `
User question:
${question}

Cleaned rows (DO NOT output JSON):
${JSON.stringify(cleanRows)}
          `.trim(),
        },
      ],
      temperature: 0,
    });

    return res.choices[0].message?.content?.trim() ?? "No answer.";
  }
}

