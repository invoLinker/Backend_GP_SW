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
      apiKey: process.env.HF_TOKEN2,
      baseURL: "https://router.huggingface.co/v1",
    });

    this.sqlModel = "meta-llama/Llama-3.1-8B-Instruct:novita";
    this.answerModel = "meta-llama/Llama-3.1-8B-Instruct:novita";
  }


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
suppliers
supplier_invoices
supplier_invoice_items
delivery_notes
delivery_note_items
goods_receipts
goods_receipt_items
payments
stock
user
roles
permissions
role_permissions
tasks
history_log
invoice_incidents
invoice_incident_items
edit_requests

------------------------------------------------------
🚨 CRITICAL: "suppliers" vs "user" - NEVER CONFUSE!
------------------------------------------------------
⚠️ "suppliers" table = Vendors/Suppliers (الموردين)
- Columns: supplier_id, supplier_name, email, phone, address
- Use for: Questions about suppliers, vendors, most used supplier
- Examples: "ما هو اكثر مورد", "most used supplier", "supplier count"

⚠️ "user" table = System Users/Employees (المستخدمين/الموظفين)
- Columns: user_id, first_name, last_name, email, role_id, status
- Use for: Questions about system users, employees, staff
- Examples: "كم عدد المستخدمين", "active users", "user count"

❌ NEVER use "user" table for supplier questions!
❌ NEVER use "suppliers" table for user/employee questions!

If question asks about "مورد" or "supplier" → USE "suppliers" table
If question asks about "مستخدم" or "user" → USE "user" table

------------------------------------------------------
🚨 STOCK TABLE INFORMATION
------------------------------------------------------
"stock" table contains ALL product/inventory information:
- Columns: stock_id, item_name, barcode, dn_id, quantity, unit, expiration_date, status
- ✅ HAS barcode column
- ✅ HAS expiration_date column
- ✅ HAS quantity column
- Use for: Current stock levels, expired products, available products, warehouse inventory, all product queries

RULES:
- Questions about "expired products" → USE "stock" table (has expiration_date)
- Questions about "available products" → USE "stock" table (has status='Available')
- Questions about "products in stock" → USE "stock" table
- Questions about "inventory" → USE "stock" table
- Questions about "warehouse" → USE "stock" table
- Questions about "items" or "products" → USE "stock" table
- ALL product/item queries → USE "stock" table

------------------------------------------------------
🚨 SUPPLIERS TABLE - CRITICAL
------------------------------------------------------
"suppliers" table contains supplier/vendor information:
- Columns: supplier_id, supplier_name, email, phone, address, createdAt, updatedAt
- Use for: Questions about suppliers, vendors, most used suppliers, supplier analysis
- ❌ NEVER use "user" table for supplier questions
- ❌ "user" table is for system users/employees, NOT suppliers

RULES:
- Questions about "suppliers" or "مورد" → USE "suppliers" table
- Questions about "most used supplier" → USE "suppliers" table with JOIN to purchaseorders
- Questions about "supplier count" → USE "suppliers" table
- Questions about "supplier analysis" → USE "suppliers" table
- NEVER confuse "suppliers" (vendors) with "user" (system users)

Example: "What is the most used supplier?"
✅ CORRECT:
SELECT s.supplier_name, COUNT(po.po_id) AS order_count
FROM suppliers s
LEFT JOIN purchaseorders po ON po.supplier_id = s.supplier_id
GROUP BY s.supplier_id, s.supplier_name
ORDER BY order_count DESC
LIMIT 1;

Example: "How many purchase orders does each supplier have?"
✅ CORRECT:
SELECT s.supplier_name, COUNT(po.po_id) AS order_count
FROM suppliers s
LEFT JOIN purchaseorders po ON po.supplier_id = s.supplier_id
GROUP BY s.supplier_id, s.supplier_name
ORDER BY order_count DESC;

Example: "What is the total amount for each supplier?"
✅ CORRECT:
SELECT s.supplier_name, SUM(po.total_amount) AS total_amount
FROM suppliers s
LEFT JOIN purchaseorders po ON po.supplier_id = s.supplier_id
GROUP BY s.supplier_id, s.supplier_name
ORDER BY total_amount DESC;

❌ WRONG (using user table):
SELECT * FROM user WHERE ... (WRONG - user is for employees, not suppliers)

🚨 CRITICAL: Questions with "each" or "per":
- "each supplier" = GROUP BY supplier (use LEFT JOIN to include all)
- "per supplier" = GROUP BY supplier
- "for each supplier" = GROUP BY supplier
- ALWAYS use LEFT JOIN when counting "per supplier" to show suppliers with 0 orders
- Example: "How many purchase orders does each supplier have?"
  ✅ CORRECT:
  SELECT s.supplier_name, COUNT(po.po_id) AS order_count 
  FROM suppliers s 
  LEFT JOIN purchaseorders po ON po.supplier_id = s.supplier_id 
  GROUP BY s.supplier_id, s.supplier_name 
  ORDER BY order_count DESC;
  
⚠️ IMPORTANT: 
- "each supplier" questions MUST return results even if some suppliers have 0 orders
- Use LEFT JOIN (not INNER JOIN) to include all suppliers
- COUNT(po.po_id) will return 0 for suppliers with no orders (this is correct!)
- NEVER use INNER JOIN for "each" questions - it will exclude suppliers with 0 orders
- ALWAYS include supplier_name in SELECT and GROUP BY
- ALWAYS use COUNT(po.po_id) not COUNT(*) to correctly count orders (NULLs from LEFT JOIN become 0)

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

suppliers.supplier_id             = purchaseorders.supplier_id
suppliers.supplier_id             = supplier_invoices.supplier_id
suppliers.supplier_id             = delivery_notes.supplier_id

Item matching in stock table:
- Use item_name for product/item names
- Use barcode for barcode matching
- Always match BOTH item_name AND barcode when comparing items

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
✔ STOCK/INVENTORY QUERIES EXAMPLES
------------------------------------------------------
Example 1: "What are expired products?"
✅ CORRECT:
SELECT item_name, barcode, quantity, unit, expiration_date, status
FROM stock
WHERE expiration_date < CURDATE() OR status = 'Expired';

Example 2: "What products are available in stock?"
✅ CORRECT:
SELECT item_name, barcode, quantity, unit, expiration_date
FROM stock
WHERE status = 'Available';

Example 3: "How many products are in stock?"
✅ CORRECT:
SELECT SUM(quantity) AS total_quantity
FROM stock
WHERE status = 'Available';

REMEMBER: Always use "stock" table for:
- Expired products (expiration_date)
- Available products (status)
- Inventory levels (quantity)
- Warehouse queries
- Product stock queries
------------------------------------------------------
🚨 AGGREGATION NAMING RULE:
Whenever using COUNT(), SUM(), AVG(), MAX(), MIN():

❗ MUST give explicit alias like:
COUNT(po.po_id) AS order_count
SUM(quantity) AS total_quantity

⚠ NEVER return unnamed expressions like:
COUNT(po.po_id)

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


  async formatAnswer(question: string, rows: any[]): Promise<string> {
    const cleanRows = this.sanitizeRows(rows);

    const isArabic = /[\u0600-\u06FF]/.test(question);

    const systemPrompt = isArabic
      ? `
أنت مساعد ذكي يشرح نتائج قاعدة البيانات لنظام إدارة المشتريات والفواتير.

القواعد الصارمة:
- أجب بالعربية فقط. لا تستخدم الإنجليزية أبداً.
- لا تخرج JSON.
- لا تظهر SQL.
- لا تخرج markdown.
- لا تخترع بيانات غير موجودة.
- إذا كانت هناك صفوف، أجب بناءً عليها 100%.
- إذا كانت الصفوف فارغة، قل بوضوح: "لا توجد بيانات مطابقة."
- إذا كان السؤال عن تحليل أو إحصائيات، قدم ملخصاً واضحاً بالعربية.
- استخدم أرقام واضحة عند ذكر المبالغ أو الكميات.
- استخدم مصطلحات عربية واضحة ومفهومة.
`
      : `
You explain database results for Purchase Orders, Supplier Invoices, Delivery Notes, and Goods Receipts.

STRICT RULES:
- Answer ONLY in English. Never use Arabic.
- NEVER output JSON.
- NEVER show SQL.
- NEVER output markdown.
- NEVER invent missing data.
- If rows exist, ALWAYS answer based 100% on them.
- If rows are empty, say clearly: "There is no matching data."
- If the question asks for analysis or statistics, provide a clear summary in English.
- Use clear numbers and formatting when mentioning amounts or quantities.
- Use clear and professional English terminology.
`;

    const userPrompt = isArabic
      ? `
السؤال:
${question}

البيانات (لا تخرج JSON):
${JSON.stringify(cleanRows)}

أجب بالعربية فقط بناءً على البيانات أعلاه.
`
      : `
Question:
${question}

Data (DO NOT output JSON):
${JSON.stringify(cleanRows)}

Answer in English only based on the data above.
`;

    const res = await this.client.chat.completions.create({
      model: this.answerModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt.trim() },
      ],
      temperature: 0.3,
    });

    const answer = res.choices[0].message?.content?.trim();
    
    if (!answer) {
      return isArabic ? "لا توجد إجابة متاحة." : "No answer available.";
    }

    return answer;
  }

  
  async formatAnalysisAnswer(question: string, rows: any[], statistics?: any): Promise<string> {
    const cleanRows = this.sanitizeRows(rows);
    const isArabic = /[\u0600-\u06FF]/.test(question);

    const systemPrompt = isArabic
      ? `
أنت محلل بيانات محترف. قم بتحليل البيانات التالية وتقديم رؤى واضحة.

القواعد الصارمة:
- قدم تحليلاً شاملاً بالعربية فقط. لا تستخدم الإنجليزية.
- اذكر الإحصائيات الرئيسية (المجموع، المتوسط، الأعلى، الأدنى).
- حدد الأنماط أو الاتجاهات المهمة.
- كن واضحاً ومختصراً.
- لا تخرج JSON أو SQL.
- استخدم مصطلحات عربية واضحة.
`
      : `
You are a professional data analyst. Analyze the following data and provide clear insights.

STRICT RULES:
- Provide comprehensive analysis in English ONLY. Never use Arabic.
- Mention key statistics (totals, averages, maximums, minimums).
- Identify important patterns or trends.
- Be clear and concise.
- Do NOT output JSON or SQL.
- Use clear and professional English terminology.
`;

    const statisticsText = statistics
      ? `\n\nStatistics:\n${JSON.stringify(statistics, null, 2)}`
      : '';

    const res = await this.client.chat.completions.create({
      model: this.answerModel,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `
Analysis question:
${question}

Data (first 20 rows):
${JSON.stringify(cleanRows.slice(0, 20), null, 2)}
${statisticsText}

Provide a comprehensive analysis based on this data.
          `.trim(),
        },
      ],
      temperature: 0.4, 
    });

    return res.choices[0].message?.content?.trim() ?? "Analysis unavailable.";
  }


  async generateAIInsights(data: any): Promise<any[]> {
    const prompt = `You are a professional data analyst for a procurement and invoice management system. Analyze the following data and create intelligent insights and actionable recommendations.

Statistical Data:
${JSON.stringify(data, null, 2)}

Required: Create a list of 4-8 insights in English. Each insight must contain:
- type: Must be one of: 'prediction', 'recommendation', 'pattern', 'risk'
- title: Clear title in English (short and useful)
- description: Detailed description in English (2-3 sentences)
- impact: 'high', 'medium', or 'low'
- confidence: Number between 70 and 95 (confidence level in the insight)
- action: Suggested action in English (optional, but preferred)

Rules:
1. Look for patterns in the data (e.g., seasonal price fluctuations, payment method preferences)
2. Provide predictions based on trends (e.g., expected revenue growth)
3. Identify potential risks (e.g., suppliers with payment delays)
4. Suggest practical, actionable recommendations
5. Be accurate and based on actual data
6. Use clear English terminology

Return the result in JSON array format only, without any additional text or markdown:

[
  {
    "type": "prediction",
    "title": "...",
    "description": "...",
    "impact": "high",
    "confidence": 85,
    "action": "..."
  },
  ...
]`;

    const res = await this.client.chat.completions.create({
      model: this.answerModel,
      messages: [
        {
          role: 'system',
          content: 'You are a professional data analyst. Analyze the data and return results in JSON array format only, without any additional text or markdown. Ensure the output is valid JSON. All content must be in English.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    let insightsText = res.choices[0].message?.content?.trim() || '[]';
    
    insightsText = insightsText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const insights = JSON.parse(insightsText);
      return Array.isArray(insights) ? insights : [];
    } catch (e) {
      const jsonMatch = insightsText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e2) {
          return [];
        }
      }
      return [];
    }
  }
}

