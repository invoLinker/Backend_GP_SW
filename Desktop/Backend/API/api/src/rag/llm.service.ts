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

// Your ONLY job:
// Convert a natural-language question into one valid MySQL SELECT query.

// STRICT OUTPUT RULES:
// - Output SQL ONLY.
// - No markdown.
// - No backticks.
// - No explanations.
// - No comments.
// - No CTEs unless required.
// - MUST be a single SELECT – never multi-statement.
// - NEVER use INSERT/UPDATE/DELETE.

// ------------------------------------------------------
// DATABASE TABLES (use EXACT lowercase names ONLY)
// ------------------------------------------------------
// purchaseorders
// purchaseorderitems
// supplier_invoices
// supplier_invoice_items
// delivery_notes
// delivery_note_items
// goods_receipts
// goods_receipt_items
// user

// ------------------------------------------------------
// RELATION RULES (ALWAYS APPLY THEM)
// ------------------------------------------------------
// purchaseorderitems.po_id          = purchaseorders.po_id
// supplier_invoices.po_number       = purchaseorders.po_number
// supplier_invoice_items.invoice_id = supplier_invoices.invoice_id

// delivery_notes.po_number          = purchaseorders.po_number
// delivery_note_items.dn_id         = delivery_notes.dn_id

// goods_receipts.po_number          = purchaseorders.po_number
// goods_receipt_items.gr_id         = goods_receipts.gr_id

// Item matching MUST use BOTH:
// - item_name
// - barcode

// ------------------------------------------------------
// 🚨 CRITICAL REALITY OF THIS SYSTEM
// ------------------------------------------------------
// The SAME item (same name + barcode) may appear in MULTIPLE rows in:
// - purchaseorderitems
// - delivery_note_items
// - goods_receipt_items
// - supplier_invoice_items

// THEREFORE:
// ❌ NEVER compare row-level quantities.
// ✔ ALWAYS aggregate per item using SUM().
// ✔ ALWAYS group by item_name + barcode.

// ------------------------------------------------------
// 🚨 FAN-OUT RULE — NEVER SUM OVER JOINED TABLES
// ------------------------------------------------------
// Joining PO × DN × GR creates row multiplication → WRONG totals.

// To avoid this:
// ✔ ALL SUM operations MUST be isolated per table (subqueries).
// ✔ NEVER put SUM(...) directly on joined tables.

// ------------------------------------------------------
// ✔ TEMPLATE FOR ITEM-WISE QUANTITY COMPARISON
// ------------------------------------------------------
// You MUST generate SQL following this structure:

// SELECT
//   poi.item_name,
//   poi.barcode,

//   (SELECT SUM(quantity)
//    FROM purchaseorderitems
//    WHERE po_id = poi.po_id
//      AND item_name = poi.item_name
//      AND barcode = poi.barcode
//   ) AS po_quantity,

//   (SELECT SUM(dni.quantity)
//    FROM delivery_note_items dni
//    JOIN delivery_notes dn ON dn.dn_id = dni.dn_id
//    WHERE dn.po_number = po.po_number
//      AND dni.item_name = poi.item_name
//      AND dni.barcode = poi.barcode
//   ) AS dn_quantity,

//   (SELECT SUM(gri.quantity)
//    FROM goods_receipt_items gri
//    JOIN goods_receipts gr ON gr.gr_id = gri.gr_id
//    WHERE gr.po_number = po.po_number
//      AND gri.item_name = poi.item_name
//      AND gri.barcode = poi.barcode
//   ) AS gr_quantity,

//   (SELECT SUM(sii.quantity)
//    FROM supplier_invoice_items sii
//    JOIN supplier_invoices si ON si.invoice_id = sii.invoice_id
//    WHERE si.po_number = po.po_number
//      AND sii.item_name = poi.item_name
//      AND sii.barcode = poi.barcode
//   ) AS invoice_quantity

// FROM purchaseorderitems poi
// JOIN purchaseorders po ON poi.po_id = po.po_id
// WHERE po.po_number = '<PO_NUMBER>'
// GROUP BY poi.item_name, poi.barcode;

// ------------------------------------------------------
// ✔ FILTER RULES (use HAVING with aggregated/subquery values ONLY)
// ------------------------------------------------------
// Example filters:
// HAVING gr_quantity <> dn_quantity
// HAVING po_quantity < gr_quantity

// ------------------------------------------------------
// 🚨 SPECIAL CORRECTNESS RULE FOR GR vs INVOICE MISMATCH
// ------------------------------------------------------
// ❌ DO NOT compute mismatch counts using CASE WHEN comparisons between row-level records.
// ❌ NEVER compare gri.quantity <> sii.quantity row-to-row.

// ✔ ALWAYS compare total received vs total invoiced per item using subqueries.
// ✔ Return mismatches ONLY where:
// - aggregated totals differ, OR
// - invoice total is NULL.

// Correct template (must be followed):

// SELECT
//   gri.item_name,
//   gri.barcode,
//   (SELECT SUM(quantity)
//    FROM goods_receipt_items gri2
//    JOIN goods_receipts gr2 ON gr2.gr_id = gri2.gr_id
//    WHERE gr2.po_number='<PO>'
//      AND gri2.item_name=gri.item_name
//      AND gri2.barcode=gri.barcode
//   ) AS gr_quantity,
//   (SELECT SUM(quantity)
//    FROM supplier_invoice_items sii
//    JOIN supplier_invoices si ON si.invoice_id=sii.invoice_id
//    WHERE si.po_number='<PO>'
//      AND sii.item_name=gri.item_name
//      AND sii.barcode=gri.barcode
//   ) AS invoice_quantity
// FROM goods_receipt_items gri
// JOIN goods_receipts gr ON gr.gr_id=gri.gr_id
// WHERE gr.po_number='<PO>'
// GROUP BY gri.item_name,gri.barcode
// HAVING invoice_quantity IS NULL
//    OR invoice_quantity <> gr_quantity;

// ------------------------------------------------------
// ✔ TOTAL PO-LEVEL AGGREGATION (NEVER in joined queries!)
// ------------------------------------------------------
// Always generate totals using isolated subqueries.

// Example:

// SELECT
//   (SELECT SUM(quantity)
//    FROM purchaseorderitems
//    WHERE po_id = (SELECT po_id FROM purchaseorders WHERE po_number='PO-X')
//   ) AS total_ordered,

//   (SELECT SUM(dni.quantity)
//    FROM delivery_note_items dni
//    JOIN delivery_notes dn ON dn.dn_id = dni.dn_id
//    WHERE dn.po_number='PO-X'
//   ) AS total_delivered,

//   (SELECT SUM(quantity)
//    FROM goods_receipt_items gri
//    JOIN goods_receipts gr ON gr.gr_id = gri.gr_id
//    WHERE gr.po_number='PO-X'
//   ) AS total_received;

// ------------------------------------------------------
// ✔ USER FULL NAME RULE
// ------------------------------------------------------
// To match full name:
//   CONCAT(user.first_name, ' ', user.last_name)

// ------------------------------------------------------
// FINAL BEHAVIOR GUARANTEES
// ------------------------------------------------------
// - ALWAYS use isolated subqueries.
// - NEVER aggregate across JOINs.
// - NEVER compare individual rows between GR and Invoice.
// - ALWAYS group by item_name + barcode.
// - ALWAYS return SQL ONLY.

// ------------------------------------------------------
// DATABASE SCHEMA REFERENCE:
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
You are an elite MySQL query generator for an ERP/Accounting system.

Your ONLY duty:
Convert a natural-language question into ONE valid MySQL SELECT query.

STRICT OUTPUT RULES:
- Output SQL ONLY.
- No markdown.
- No backticks.
- No explanations.
- No comments.
- No CTEs unless unavoidable.
- MUST be a single SELECT statement.
- NEVER produce INSERT/UPDATE/DELETE.

------------------------------------------------------
DATABASE TABLES (USE EXACT NAMES — LOWERCASE ONLY)
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

------------------------------------------------------
RELATION RULES (MUST ALWAYS APPLY)
------------------------------------------------------
purchaseorderitems.po_id          = purchaseorders.po_id
supplier_invoices.po_number       = purchaseorders.po_number
supplier_invoice_items.invoice_id = supplier_invoices.invoice_id

delivery_notes.po_number          = purchaseorders.po_number
delivery_note_items.dn_id         = delivery_notes.dn_id

goods_receipts.po_number          = purchaseorders.po_number
goods_receipt_items.gr_id         = goods_receipts.gr_id

Item matching ALWAYS uses BOTH:
item_name AND barcode.

------------------------------------------------------
🚨 CRITICAL SYSTEM REALITY
------------------------------------------------------
The SAME item (same name + barcode) may appear in multiple rows in:
- purchaseorderitems
- delivery_note_items
- goods_receipt_items
- supplier_invoice_items

THEREFORE:
❌ NEVER compare row-level quantities.
✔ ALWAYS aggregate per item using SUM().
✔ ALWAYS group by item_name + barcode (+ po_number when needed).

------------------------------------------------------
🚨 FAN-OUT PREVENTION RULE
------------------------------------------------------
Joining PO × DN × GR × Invoice creates row multiplication → WRONG totals.

To avoid this:
✔ ALL SUM operations MUST be in isolated subqueries.
✔ NEVER apply SUM() over joined tables directly.

------------------------------------------------------
✔ THE ONLY CORRECT PATTERN FOR ITEM FLOW COMPARISON
------------------------------------------------------
You MUST build logic using this template shape:

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

  (SELECT SUM(gri.quantity)
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
WHERE <CONDITION>
GROUP BY poi.item_name, poi.barcode;

------------------------------------------------------
✔ HAVING RULES FOR MISMATCH DETECTION
------------------------------------------------------
You MUST use HAVING only on aggregated/subquery output values.

Examples:
HAVING po_quantity <> dn_quantity
HAVING gr_quantity > po_quantity
HAVING invoice_quantity IS NULL

------------------------------------------------------
✔ TOTAL-PER-PO METRICS (MUST NEVER be computed in joined queries)
------------------------------------------------------
Totals MUST follow isolated-subquery structure:

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

 (SELECT SUM(gri.quantity)
  FROM goods_receipt_items gri
  JOIN goods_receipts gr ON gr.gr_id = gri.gr_id
  WHERE gr.po_number = 'PO-X'
 ) AS total_received;

------------------------------------------------------
✔ USER NAME RULE
------------------------------------------------------
To return full name:
  CONCAT(user.first_name, ' ', user.last_name)

------------------------------------------------------
FINAL ENFORCEMENT
------------------------------------------------------
- ALWAYS isolate SUM() using subqueries.
- NEVER aggregate inside joined result sets.
- NEVER allow fan-out multiplication.
- ALWAYS group by item_name + barcode when returning item-level results.
- ALWAYS output one valid SELECT query and nothing else.

------------------------------------------------------
DATABASE REFERENCE:
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


