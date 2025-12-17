import Groq from "groq-sdk";
import axios from "axios";
import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { DeliveryNote } from '../DeliveryNote/delivery-note.model';
import { DeliveryNoteItem } from '../DeliveryNote/delivery-note-item.model';
import { GoodsReceipts } from '../GoodsReceipt/GoodsReceipt.model';
import { GoodsReceiptItem } from '../GoodsReceipt/GoodsReceiptItem.model';
import { PurchaseOrder } from 'src/PO/po.model';
import { SupplierInvoiceItem } from 'src/supplier-invoices/supplier-invoice-item.model';
import { SupplierInvoice } from 'src/supplier-invoices/supplier-invoice.model';
import { NotificationService } from "src/Notification/notification.service";
import { NotificationCategory, NotificationChannel } from "src/Notification/create-notification.dto";
import { User } from "src/users/users.model";
import { Role } from "src/roles/roles.model";
import OpenAI, { BadRequestError } from "openai";

@Injectable()
export class InvoiceService {
  private groq: Groq;
  private HF_API_TOKEN = process.env.HF_TOKEN2;
  private HF_MINIMAX_MODEL = 'MiniMaxAI/MiniMax-M2:novita';
  private client: OpenAI;

  constructor(
    @InjectModel(DeliveryNote) private dnModel: typeof DeliveryNote,
    @InjectModel(DeliveryNoteItem) private dnItemModel: typeof DeliveryNoteItem,
    @InjectModel(GoodsReceipts) private grModel: typeof GoodsReceipts,
    @InjectModel(GoodsReceiptItem) private grItemModel: typeof GoodsReceiptItem,
    @InjectModel(PurchaseOrder) private poModel: typeof PurchaseOrder,
    @InjectModel(SupplierInvoice) private invoiceModel: typeof SupplierInvoice,
    @InjectModel(SupplierInvoiceItem) private invoiceItemModel: typeof SupplierInvoiceItem,
    private readonly notificationService: NotificationService,

  ) {
    this.client = new OpenAI({
          baseURL: 'https://router.huggingface.co/v1',
          apiKey: process.env.HF_TOKEN2,
        });
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  // 🧠 Helper: use MiniMax model to decide if two items are the same product
  private async areItemsMatchingWithMiniMax(
    left: { name: string; barcode?: string | null },
    right: { name: string; barcode?: string | null },
  ): Promise<boolean> {
    const norm = (s?: string | null) => (s || '').trim().toLowerCase();

    const leftBarcode = norm(left.barcode || undefined);
    const rightBarcode = norm(right.barcode || undefined);
    const leftName = norm(left.name);
    const rightName = norm(right.name);

    // 🚨 HARD RULE: different barcodes → definitely not the same product
    if (leftBarcode && rightBarcode && leftBarcode !== rightBarcode) {
      return false;
    }

    // Quick local semantic/syntax check when barcodes match (or are empty)
    const areNamesClearlySame = () => {
      if (!leftName || !rightName) return false;
      if (leftName === rightName) return true;

      const synonymGroups: string[][] = [
        ['milk', 'حليب'],
        ['bread', 'خبز'],
        ['cheese', 'جبن', 'جبنة'],
        ['yogurt', 'لبن', 'زبادي', 'زبادى', 'laban'],
        ['egg', 'بيض'],
      ];

      return synonymGroups.some(group =>
        group.includes(leftName) && group.includes(rightName),
      );
    };

    // Local fallback matcher (used if HF token missing or API fails)
    const localFallback = () => {
      // If barcodes are equal and names are clearly same/synonyms → same product
      if (leftBarcode && rightBarcode && leftBarcode === rightBarcode) {
        if (areNamesClearlySame()) return true;
      }
      // Otherwise fall back to simple exact-name + barcode equality
      if (leftBarcode && rightBarcode && leftBarcode === rightBarcode) {
        return leftName === rightName;
      }
      return leftName === rightName;
    };

    // If no HF token configured, or barcodes equal and names clearly match locally → skip AI
    if (!this.HF_API_TOKEN) {
      return localFallback();
    }

    // Use AI only when barcodes match but names are ambiguous
    if (leftBarcode && rightBarcode && leftBarcode === rightBarcode && !areNamesClearlySame()) {
      const prompt = `
You are a product matching assistant.

Decide if these TWO items are the SAME REAL-WORLD PRODUCT.

RULES:
- Barcode is the primary identifier.
- Names may be Arabic or English.
- Ignore case differences (milk == Milk == MILK).
- Treat clear Arabic ↔ English translations as the SAME product, for example:
  - "milk"   == "حليب"
  - "bread"  == "خبز"
  - "cheese" == "جبن" or "جبنة"
  - "yogurt" == "لبن" or "زبادي"
  - "laban"  == "لبن"

- If BARCODE is the SAME AND names clearly refer to the SAME product (even with language/case differences) → SAME PRODUCT.
- If BARCODE is the SAME BUT names clearly refer to DIFFERENT products (e.g. egg vs milk, حليب vs جبن) → DIFFERENT PRODUCT.

Return ONLY one word: "true" if they are the SAME PRODUCT, or "false" if they are DIFFERENT PRODUCTS.

Item A:
- name: "${left.name}"
- barcode: "${(left.barcode || '').trim()}"

Item B:
- name: "${right.name}"
- barcode: "${(right.barcode || '').trim()}"
`.trim();

      try {
        const completion = await this.client.chat.completions.create({
          model: 'MiniMaxAI/MiniMax-M2:novita',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4,
          temperature: 0,
        });

        const raw = completion.choices[0]?.message?.content ?? '';
        const answer = raw.trim().toLowerCase();
        if (answer.startsWith('true')) return true;
        if (answer.startsWith('false')) return false;
        // If AI response is unclear, fall back to local logic
        return localFallback();
      } catch (err) {
        console.error('MiniMax matching failed, falling back to local logic:', err);
        return localFallback();
      }
    }

    // Default: rely on local logic
    return localFallback();
  }

  async compareInvoices(po_number: string): Promise<string> {

    const po = await this.poModel.findOne({ where: { po_number }, include: ['items', 'supplier'] });
    if (!po) throw new NotFoundException('Purchase Order not found');

    const blockedStatuses = [
    'Approved',
    'Pending',
    'Closed',
    'Rejected',
    'ReadyForPaid',
  ];

  if (blockedStatuses.includes(po.status)) {
    throw new BadRequestException(
      `Can't verify Purchase Order with status "${po.status}"`
    );
  }


    const invoices = await this.invoiceModel.findAll({ where: { po_number }, include: ['items'] });

    if (!invoices.length) {
      return 'No invoices linked to this PO';
    }

    // Helper function to normalize numeric values in an object
    const normalizeNumericValues = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (Array.isArray(obj)) {
        return obj.map(normalizeNumericValues);
      }
      if (typeof obj === 'object') {
        const normalized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          // Normalize common numeric fields - convert strings to numbers
          if (['quantity', 'unit_price', 'total_price', 'subtotal', 'vat', 'total_amount', 'discount', 'po_id', 'invoice_id', 'supplier_id', 'dn_id', 'gr_id'].includes(key)) {
            if (value !== null && value !== undefined && value !== '') {
              const numValue = Number(value);
              normalized[key] = isNaN(numValue) ? value : numValue;
            } else {
              normalized[key] = value;
            }
          } else if (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '') {
            // Also normalize any string that looks like a number
            const numValue = Number(value);
            if (!isNaN(numValue)) {
              normalized[key] = numValue;
            } else {
              normalized[key] = normalizeNumericValues(value);
            }
          } else {
            normalized[key] = normalizeNumericValues(value);
          }
        }
        return normalized;
      }
      // If it's a string that looks like a number, convert it
      if (typeof obj === 'string' && !isNaN(Number(obj)) && obj.trim() !== '') {
        return Number(obj);
      }
      return obj;
    };

    // Sort invoices and items consistently for deterministic results, then normalize numeric values
    const sortedInvoices = invoices
      .map(inv => {
        const invJson = inv.toJSON();
        return {
          ...invJson,
          items: inv.items ? [...inv.items].sort((a, b) => {
            const nameA = (a.item_name || '').toLowerCase();
            const nameB = (b.item_name || '').toLowerCase();
            if (nameA !== nameB) return nameA.localeCompare(nameB);
            return (a.barcode || '').localeCompare(b.barcode || '');
          }).map(item => normalizeNumericValues(item)) : []
        };
      })
      .map(inv => normalizeNumericValues(inv))
      .sort((a, b) => (a.invoice_id || 0) - (b.invoice_id || 0));

    const sortedPo = normalizeNumericValues({
      ...po.toJSON(),
      items: po.items ? [...po.items].sort((a, b) => {
        const nameA = (a.item_name || '').toLowerCase();
        const nameB = (b.item_name || '').toLowerCase();
        if (nameA !== nameB) return nameA.localeCompare(nameB);
        return (a.barcode || '').localeCompare(b.barcode || '');
      }).map(item => normalizeNumericValues(item)) : []
    });

    // 🔁 جهّز لستة من الأيتيمات من الـ PO والفواتير عشان نبعثها لموديل MiniMax
    const poItems = (po.items || []).map((item: any) => ({
      ref: item,
      name: item.item_name || '',
      barcode: (item.barcode || '').trim(),
      quantity: Number(item.quantity) || 0,
    }));

    const invoiceItems: Array<{
      ref: any;
      name: string;
      barcode: string;
      quantity: number;
    }> = [];

    invoices.forEach((inv: any) => {
      (inv.items || []).forEach((item: any) => {
        invoiceItems.push({
          ref: item,
          name: item.item_name || '',
          barcode: (item.barcode || '').trim(),
          quantity: Number(item.quantity) || 0,
        });
      });
    });

    const missingItems: string[] = [];
    const quantityMismatches: string[] = [];
    const extraItems: string[] = [];

    // 🧠 استخدم MiniMax لمطابقة الأيتيمات (PO ↔ Invoices)
    const invoiceItemsByBarcode = new Map<string, number[]>();

    invoiceItems.forEach((item, idx) => {
      if (!item.barcode) return;
      const arr = invoiceItemsByBarcode.get(item.barcode) || [];
      arr.push(idx);
      invoiceItemsByBarcode.set(item.barcode, arr);
    });

const matchedInvoiceIndices = new Set<number>();

    for (let i = 0; i < poItems.length; i++) {
      const poItem = poItems[i];
      let foundMatch = false;

      const indices = invoiceItemsByBarcode.get(poItem.barcode) || [];

      for (const j of indices) {
        if (matchedInvoiceIndices.has(j)) continue;

        const invItem = invoiceItems[j];

        // (1) لو الباركود نفسه والاسم نفسه نصياً (بعد trim + lowercase) → PASS بدون AI
        const poNameNorm = (poItem.name || '').trim().toLowerCase();
        const invNameNorm = (invItem.name || '').trim().toLowerCase();
        if (poItem.barcode && invItem.barcode &&
            poItem.barcode === invItem.barcode &&
            poNameNorm && invNameNorm && poNameNorm === invNameNorm) {
          matchedInvoiceIndices.add(j);
          foundMatch = true;

          if (Math.abs(poItem.quantity - invItem.quantity) > 0.01) {
            quantityMismatches.push(
              `${poItem.name}: PO has ${poItem.quantity}, Invoice has ${invItem.quantity}`,
            );
          }
          break;
        }

        // (2) غير ذلك، استخدم الـ AI (MiniMax) على الاسم + الباركود
        const sameProduct = await this.areItemsMatchingWithMiniMax(
          { name: poItem.name, barcode: poItem.barcode },
          { name: invItem.name, barcode: invItem.barcode },
        );

        if (sameProduct) {
          matchedInvoiceIndices.add(j);
          foundMatch = true;

          if (Math.abs(poItem.quantity - invItem.quantity) > 0.01) {
            quantityMismatches.push(
              `${poItem.name}: PO has ${poItem.quantity}, Invoice has ${invItem.quantity}`,
            );
          }

          break;
        }
      }

      if (!foundMatch) {
        const label = poItem.name || poItem.barcode || `PO item #${i + 1}`;
        missingItems.push(
          `${label}${poItem.barcode ? ` (barcode: ${poItem.barcode})` : ''}`,
        );
      }
    }

    // ✅ أي أيتيم في الفواتير ما اتطابق مع أي أيتيم من الـ PO → Extra
    for (const [barcode] of invoiceItemsByBarcode.entries()) {
  const existsInPO = poItems.some(po => po.barcode === barcode);
  if (!existsInPO) {
    extraItems.push(`barcode: ${barcode}`);
  }
}


    // Create maps for unit prices to check price mismatches (normalize to numbers)
    // Use barcode as primary key
    const poPriceMap = new Map<string, number>();
    po.items?.forEach(item => {
      const barcode = (item.barcode || '').trim();
      const key = barcode || `${(item.item_name || '').toLowerCase().trim()}`;
      // Store the unit_price normalized to number (convert string to number)
      if (!poPriceMap.has(key)) {
        poPriceMap.set(key, Number(item.unit_price) || 0);
      }
    });

    const invoicePriceMap = new Map<string, number>();
    invoices.forEach(inv => {
      inv.items?.forEach(item => {
        const barcode = (item.barcode || '').trim();
        const key = barcode || `${(item.item_name || '').toLowerCase().trim()}`;
        // Store the unit_price normalized to number (convert string to number)
        if (!invoicePriceMap.has(key)) {
          invoicePriceMap.set(key, Number(item.unit_price) || 0);
        }
      });
    });

    // Check for price mismatches (normalize numeric values first)
    const priceMismatches: string[] = [];
    for (const [key, poPrice] of poPriceMap.entries()) {
      if (invoicePriceMap.has(key)) {
        const invoicePrice = invoicePriceMap.get(key) || 0;
        // Normalize: convert both to numbers and compare
        const poPriceNum = Number(poPrice) || 0;
        const invoicePriceNum = Number(invoicePrice) || 0;
        if (Math.abs(poPriceNum - invoicePriceNum) > 0.01) { // Allow small floating point differences
          const [itemName, barcode] = key.split('_');
          priceMismatches.push(`${itemName}: PO price ${poPriceNum}, Invoice price ${invoicePriceNum}`);
        }
      }
    }

    // Calculate totals for comparison
    const poSubtotal = Number(po.subtotal) || 0;
    const poVat = Number(po.vat) || 0;
    const poTotal = Number(po.total_amount) || 0;
    
    let invoiceSubtotal = 0;
    let invoiceVat = 0;
    let invoiceTotal = 0;
    let invoiceDiscount = 0;
    
    invoices.forEach(inv => {
      invoiceSubtotal += Number(inv.subtotal) || 0;
      invoiceVat += Number(inv.vat) || 0;
      invoiceTotal += Number(inv.total_amount) || 0;
      invoiceDiscount += Number(inv.discount) || 0;
    });

    // Create total comparison message
    const totalComparison: string[] = [];
    if (Math.abs(poSubtotal - invoiceSubtotal) > 0.01) {
      totalComparison.push(`Subtotal: PO=${poSubtotal}, Invoice=${invoiceSubtotal}`);
    }
    if (Math.abs(poVat - invoiceVat) > 0.01) {
      totalComparison.push(`VAT: PO=${poVat}, Invoice=${invoiceVat}`);
    }
    // if (Math.abs(poTotal - invoiceTotal) > 0.01) {
    //   totalComparison.push(`Total: PO=${poTotal}, Invoice=${invoiceTotal}`);
    // }
    let calculatedInvoiceTotal = invoiceSubtotal;

  if (invoiceDiscount < 0 || invoiceDiscount > 100) {
    totalComparison.push(`Invalid discount percentage: ${invoiceDiscount}%`);
  } else if (invoiceDiscount > 0) {
    const discountAmount = (invoiceSubtotal * invoiceDiscount) / 100;
    calculatedInvoiceTotal = invoiceSubtotal - discountAmount;
  }

  // VAT after discount
  calculatedInvoiceTotal += invoiceVat;

  if (Math.abs(poTotal - calculatedInvoiceTotal) > 0.01) {
    totalComparison.push(
      `Total mismatch after discount: PO=${poTotal}, Invoice=${calculatedInvoiceTotal} (Discount ${invoiceDiscount}%)`
    );
  }
    if (invoiceDiscount > 0) {
      totalComparison.push(`Discount applied: ${invoiceDiscount}`);
    }
    
      const prompt = `
    // You're a smart invoice audit assistant.

🚨🚨🚨 CRITICAL: DATA HAS BEEN PRE-NORMALIZED 🚨🚨🚨
All numeric values (quantities, prices, amounts) have ALREADY been converted from strings to numbers BEFORE you see them.
In the JSON data below, ALL numeric fields (quantity, unit_price, subtotal, vat, total_amount, etc.) are NUMBERS, NOT STRINGS.
If you see "quantity": 4 in the data, it is a NUMBER 4, not a string "4".
If you report "PO quantity is numeric 4, invoice quantity is string \"4\"" you are WRONG - both are numbers 4.
DO NOT report "string vs number" mismatches - they don't exist in the normalized data.
ONLY report mismatches if the ACTUAL NUMERIC VALUES are different (e.g., 4 vs 5, not 4 vs 4).
NEVER mention data types (string/number) in your notes - only mention numeric value differences.
If you mention "string" or "numeric" in your notes, you are making an error.

📌 IMPORTANT NORMALIZATION RULES — READ BEFORE ANALYZING

Before comparing ANY values, always normalize them as follows:

🔹 NUMERIC NORMALIZATION (CRITICAL - APPLY THIS FIRST)
✔ Treat numeric strings and numeric values as EQUAL - they are the SAME
   Example:
   - "2" == 2 (they are EQUAL, NOT different)
   - "10.00" == 10 (they are EQUAL, NOT different)
   - "4" == 4 (they are EQUAL, NOT different)
   - 02 == "2" (they are EQUAL, NOT different)
✔ Ignore formatting differences (string vs number is just formatting)
✔ Compare numerically, not textually
✔ If you see "4" (string) vs 4 (number), they MUST be treated as EQUAL - do NOT report as mismatch
✔ If you see "10" (string) vs 10 (number), they MUST be treated as EQUAL - do NOT report as mismatch

🔹 TEXT NORMALIZATION  
✔ Trim whitespace  
✔ Compare case-insensitively  
   Example:
   - "Bread" == "bread" == " BREAD "  
✔ Minor spelling differences allowed if meaning is clear  
   Example:
   - "milk pack" ≈ "milk-pack"
✔ LANGUAGE DIFFERENCES: If barcode matches, item_name can be in different languages (Arabic/English) - they are THE SAME ITEM
   Example:
   - "حليب" (Arabic) with barcode "حل-6964" == "milk" (English) with barcode "حل-6964" → SAME ITEM
   - If barcode is the same, item_name language difference is just a translation - do NOT report as mismatch

   🔴 ITEM NAME SEMANTIC MATCHING (CRITICAL – FINAL RULE):

When comparing items in Stage 2, item_name comparison MUST be semantic, not literal.

✔ Treat item names as THE SAME ITEM if:
- They differ only by capitalization:
  - "Milk" == "milk" == "MILK"

✔ They have the SAME MEANING across languages (Arabic / English):
  - "milk" == "حليب"
  - "bread" == "خبز"
  - "egg" == "بيض"

✔ If barcode matches EXACTLY, item_name MAY differ in:
- Language (Arabic / English)
- Capitalization (upper / lower case)

❌ DO NOT fail Stage 2 because of:
- Capital vs small letters
- Arabic vs English naming
- Translation differences with the same meaning

❌ DO NOT require exact string match for item_name

🚨 ONLY consider items DIFFERENT if:
- barcode is different
AND
- item_name meaning is different

Use your semantic understanding to determine whether two item names refer to the SAME real-world product.


🔹 MONEY & TOTALS  
✔ Convert values before adding  
✔ If totals differ by rounding < 0.5%, still pass  
✔ Treat rounding differences as valid unless they materially impact totals.

🔹 EMPTY / NULL HANDLING  
✔ If value missing but computed equivalent exists, consider it valid.
✔ If unit is "box" in PO and null in Invoice (or vice versa), treat as equivalent - do NOT fail stage
✔ Missing unit label (e.g., "box" vs null) → treat null as equivalent data → do NOT fail stage

🚨 These normalization rules are MANDATORY AND AUTOMATIC.  
2 and "2" MUST NEVER be treated as mismatches - they are THE SAME VALUE.
The system has already normalized all numeric values (converted strings to numbers) before sending this data to you.
If you see a value in the data, it has already been normalized. Do NOT report "string vs number" - they are already equal.
ONLY report mismatches if the NUMERIC VALUES are different after normalization.


I have one purchase order (PO) and several related invoices.

I need you to check four stages in order and report the result for each stage (successful or unsuccessful) with any feedback:

Stage 1: Verify that all invoices have the same supplier and purchase order number.

Stage 2: Verify that the total for all items across all invoices exactly matches the items in the purchase order.

Stage 3: Verify that the subtotal + VAT + total on the invoices matches the purchase order values. Supplier may apply a discount — confirm validity.

🚨 CRITICAL FOR STAGE 3:
- Stage 3 is about MONEY/AMOUNTS (subtotal, VAT, total, discount) AND UNIT PRICES
- Stage 3 is NOT about missing items - that's Stage 2's job
- Compare: invoice subtotal + VAT - discount = invoice total
- Compare: invoice total should match PO total (allowing for valid discounts)
- CRITICAL: Compare unit_price for each item - if unit_price differs between PO and Invoice, Stage 3 MUST FAIL
- If unit_price is different, the total amounts will be wrong even if they seem to match
- If items are missing (from Stage 2), you can still check if the amounts on existing items are correct
- Do NOT mention "missing items" in Stage 3 notes - only mention amount/money/price mismatches
- Stage 3 notes should contain: unit_price mismatches, subtotal mismatches, VAT mismatches, total mismatches, or discount validity issues
- IMPORTANT: When reporting amount mismatches, ALWAYS show both values clearly: "PO total: X, Invoice total: Y" so the difference is obvious

Stage 4: Verify that the payment method and currency match between the purchase order and the invoices.

Return the result ONLY as valid JSON. DO NOT add any explanation, reasoning, or text after the JSON. Output ONLY the JSON object and nothing else:

{
"stage1": { "pass": true/false, "notes": ["..."] },
"stage2": { "pass": true/false, "notes": ["..."] },
"stage3": { "pass": true/false, "notes": ["..."] },
"stage4": { "pass": true/false, "notes": ["..."] },
"overall": "Passed" or "Failed at stage X"
}

CRITICAL: Output ONLY the JSON above. No explanations, no reasoning, no additional text. Just the JSON object.

RULES:
If you report mismatch because values look different but are numerically equal, you FAIL the task.
🔐 CRITICAL DECISION RULE
If a mismatch disappears after applying normalization rules,
then that mismatch MUST NOT be reported
and the related stage MUST be considered PASSED.

Examples:
- 4 vs "4" → must be treated as equal → do NOT fail stage
- 10 vs "10" → equal → do NOT fail stage
- missing unit label (e.g., "box" vs null) → treat null as equivalent data → do NOT fail stage

You must change stage decisions accordingly:
❗ If normalization resolves mismatches → override pass=true for that stage.
❗ You MUST NOT mark a stage failed if all mismatches resolve after normalization.
If you output "normalized values" inside notes,
you are REQUIRED to set stage.pass=true for that stage.

🚨 CRITICAL NORMALIZATION REMINDER (READ CAREFULLY):
- ALL numeric values in the data have ALREADY been normalized (strings converted to numbers) before you see them
- "4" (string) and 4 (number) are THE SAME VALUE - they have already been normalized to 4
- "10" (string) and 10 (number) are THE SAME VALUE - they have already been normalized to 10
- If you report a mismatch saying "numeric vs string" or "PO quantity is numeric 4, invoice quantity is string \"4\"", you are WRONG - they are EQUAL
- DO NOT mention data types (string/number) in your notes - only mention if the ACTUAL NUMERIC VALUES differ
- If the numeric value is the same (e.g., both are 4), they are EQUAL regardless of original data type
- Example: If PO has 4 and Invoice has "4", after normalization both are 4, so they MATCH - do NOT report mismatch
- Example: If PO has 10 and Invoice has "10", after normalization both are 10, so they MATCH - do NOT report mismatch

🚨 STAGE-SPECIFIC NOTES RULES (CRITICAL):
- Stage 1 notes: ONLY about supplier ID and PO number mismatches
- Stage 2 notes: ONLY about missing items, extra items, or quantity mismatches. NEVER report "string vs number" as mismatch - normalize first!
- Stage 3 notes: ONLY about amount/money/price mismatches (unit_price, subtotal, VAT, total, discount). NEVER mention "missing items" here - that's Stage 2's responsibility. NEVER report "string vs number" as mismatch - normalize first! If unit_price differs (after normalization), Stage 3 MUST FAIL. If items are missing, Stage 3 should check if the amounts on existing items are correct.
- Stage 4 notes: ONLY about payment method or currency mismatches
- DO NOT copy notes from one stage to another - each stage has its own specific purpose
- If Stage 2 fails due to missing items, Stage 3 can still pass if the amounts on existing items are correct
- If unit_price differs for any item (after normalization), Stage 3 MUST FAIL regardless of totals
- CRITICAL: Before reporting ANY numeric mismatch, convert both values to numbers first. "4" (string) and 4 (number) are EQUAL - do NOT report as mismatch!


Here is the data (ALL numeric values have been normalized to numbers - no strings):

Purchase Order:
${JSON.stringify(sortedPo, null, 2)}

Invoices:
${JSON.stringify(sortedInvoices, null, 2)}

NOTE: All numeric values (quantity, unit_price, etc.) in the data above are numbers, not strings. They have been normalized. 

EXAMPLE OF WHAT YOU WILL SEE:
{
  "item_name": "Egg",
  "quantity": 4,        ← This is a NUMBER 4, NOT a string "4"
  "unit_price": 10       ← This is a NUMBER 10, NOT a string "10"
}

If you see "quantity": 4 in the JSON, it is a NUMBER. Do NOT say "numeric 4" vs "string \"4\"" - both are the same number 4.
Do NOT report "string vs number" mismatches - they don't exist in this normalized data.
ONLY report mismatches if the actual numeric VALUES are different (e.g., 4 vs 5).

${missingItems.length > 0 || quantityMismatches.length > 0 || extraItems.length > 0 || priceMismatches.length > 0 || totalComparison.length > 0 ? `
⚠️ PRE-VALIDATION WARNINGS (ONLY REAL MISMATCHES - already normalized):
${missingItems.length > 0 ? `Stage 2 should FAIL - Missing items in invoices: ${missingItems.join(', ')}` : ''}
${quantityMismatches.length > 0 ? `Stage 2 should FAIL - Quantity mismatches (after normalization): ${quantityMismatches.join(', ')}` : ''}
${extraItems.length > 0 ? `Stage 2 should FAIL - Extra items in invoices (not in PO): ${extraItems.join(', ')}` : ''}
${priceMismatches.length > 0 ? `Stage 3 should FAIL - Unit price mismatches (after normalization): ${priceMismatches.join(', ')}` : ''}
${totalComparison.length > 0 ? `Stage 3 should FAIL - Amount mismatches: ${totalComparison.join(', ')}` : ''}

IMPORTANT: All values above have been normalized (strings converted to numbers). If a value is not listed here, it means it matches after normalization. Do NOT report "string vs number" mismatches - they have already been normalized and checked.
` : ''}

`;

    try {
      const chatCompletion = await this.groq.chat.completions.create({
     model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are a structured invoice auditing assistant. You MUST output ONLY valid JSON. Never add explanations or reasoning after the JSON. CRITICAL: All numeric values in the data have been normalized (strings converted to numbers). Do NOT report 'string vs number' mismatches - if numeric values are equal, they match. Never mention data types (string/number) in your notes." },
        { role: "user", content: prompt }
      ],
      temperature: 0, // Set to 0 for deterministic results
      max_tokens: 2000, // Limit response length to prevent infinite loops
    })


      let aiResponse = chatCompletion.choices[0].message.content ?? '';

      // Extract JSON more accurately - find the first complete JSON object
      const firstBrace = aiResponse.indexOf('{');
      if (firstBrace === -1) {
        throw new InternalServerErrorException('AI response is not valid JSON');
      }
      
      // Find the matching closing brace by counting braces
      let braceCount = 0;
      let lastBrace = -1;
      for (let i = firstBrace; i < aiResponse.length; i++) {
        if (aiResponse[i] === '{') braceCount++;
        if (aiResponse[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            lastBrace = i;
            break;
          }
        }
      }
      
      if (lastBrace === -1) {
        throw new InternalServerErrorException('AI response is not valid JSON');
      }
      
      aiResponse = aiResponse.slice(firstBrace, lastBrace + 1);

      // Parse and clean the result - remove false mismatches where values are actually equal
      let result = JSON.parse(aiResponse);
      
      // Clean notes: remove mismatches where values are actually equal
      const cleanNotes = (notes: string[]): string[] => {
        if (!Array.isArray(notes)) return notes;
        
        // First, check if we have both "missing item" and "extra item" with same barcode
        // This happens when item_name is different (Arabic/English) but barcode is same
        const missingItems: string[] = [];
        const extraItems: string[] = [];
        const barcodesInNotes = new Set<string>();
        
        notes.forEach(note => {
          if (!note || typeof note !== 'string') return;
          
          // Extract barcode from note
          const barcodeMatch = note.match(/barcode:\s*([^\s\)]+)/i);
          if (barcodeMatch) {
            const barcode = barcodeMatch[1].trim();
            barcodesInNotes.add(barcode);
            
            if (note.match(/missing.*item|missing.*invoice|missing.*delivery|missing.*note/i)) {
              missingItems.push(barcode);
            }
            if (note.match(/extra.*item|extra.*invoice|extra.*delivery|extra.*note/i)) {
              extraItems.push(barcode);
            }
          }
        });
        
        // If same barcode appears in both missing and extra, they cancel out (same item, different name language)
        const conflictingBarcodes = new Set(missingItems.filter(b => extraItems.includes(b)));
        
        return notes.filter(note => {
          if (!note || typeof note !== 'string') return true;
          
          // Special case: "number 10 vs string '10'" style messages where numeric values are equal
          // e.g. "Quantity mismatch: PO shows number 10, invoice shows string '10'"
          const numStrEqual = note.match(
            /number\s+(\d+(?:\.\d+)?)\b[^;]*string\s*'?\1'?/i,
          );
          if (numStrEqual) {
            return false;
          }

          // Remove notes about items with conflicting barcodes (same barcode in missing and extra)
          if (conflictingBarcodes.size > 0) {
            const barcodeMatch = note.match(/barcode:\s*([^\s\)]+)/i);
            if (barcodeMatch && conflictingBarcodes.has(barcodeMatch[1].trim())) {
              return false; // Same barcode in both missing and extra - cancel out
            }
          }
          
          // Pattern 1: Check for explicit "PO shows X, invoice shows X" or "4 (PO) vs 4 (DN)" patterns
          const explicitEqualMatch = note.match(/(?:PO|purchase order|DN|delivery note|invoice).*?(?:is|shows|has|vs)\s*(?:number\s+)?(\d+(?:\.\d+)?)\b.*?(?:PO|purchase order|DN|delivery note|invoice).*?(?:is|shows|has|vs)\s*(?:number\s+)?\1\b/gi);
          if (explicitEqualMatch) {
            return false; // Same value for PO and Invoice/DN - false positive
          }
          
          // Pattern 2: Check for "X (PO) vs X (DN)" or "X (PO) vs X (Invoice)" patterns
          const vsPatternMatch = note.match(/(\d+(?:\.\d+)?)\s*\([^)]+\)\s+vs\s+\1\s*\([^)]+\)/gi);
          if (vsPatternMatch) {
            return false; // Same value on both sides of "vs" - false positive
          }
          
          // Pattern 3: Check for multiple mismatches where all values are equal
          const allMatches = [...note.matchAll(/(?:PO|purchase order|DN|delivery note|invoice).*?(?:is|shows|has|vs)\s*(?:number\s+)?(\d+(?:\.\d+)?)\b/gi)];
          const values: string[] = [];
          for (const match of allMatches) {
            if (match[1]) values.push(match[1]);
          }
          if (values.length >= 2 && values.length % 2 === 0) {
            let allEqual = true;
            for (let i = 0; i < values.length; i += 2) {
              if (Math.abs(parseFloat(values[i]) - parseFloat(values[i + 1])) > 0.01) {
                allEqual = false;
                break;
              }
            }
            if (allEqual) {
              return false; // All comparisons show equal values - false positive
            }
          }
          
          // Pattern 4: Simple pattern "is X ... is X" or "shows X ... shows X" or "X vs X"
          const simpleEqualMatch = note.match(/(?:is|shows|vs)\s*(?:number\s+)?(\d+(?:\.\d+)?)\b.*?(?:is|shows|vs)\s*(?:number\s+)?\1\b/gi);
          if (simpleEqualMatch) {
            return false; // Same value mentioned twice - false positive
          }
          
          // Pattern 5: "quantity mismatch: X (PO) vs X (DN)" - same value
          const quantityMismatchMatch = note.match(/quantity.*mismatch.*?(\d+(?:\.\d+)?).*?vs.*?\1/gi);
          if (quantityMismatchMatch) {
            return false; // Same quantity on both sides - false positive
          }
          
          // Remove notes about unit being "box" vs null (they're equivalent)
          if (note.match(/unit.*"box".*null|unit.*null.*"box"|unit.*box.*null|unit.*null.*box/i)) {
            return false; // box and null are equivalent
          }
          
          // Remove notes about discount being 0 vs 0
          if (note.match(/discount.*0.*0|discount.*0.*invoice.*0|discount.*validity.*0.*0/i)) {
            return false; // 0 discount is valid
          }
          
          return true;
        });
      };

      // Clean all stage notes
      if (result.stage1?.notes) result.stage1.notes = cleanNotes(result.stage1.notes);
      if (result.stage2?.notes) result.stage2.notes = cleanNotes(result.stage2.notes);
      if (result.stage3?.notes) result.stage3.notes = cleanNotes(result.stage3.notes);
      if (result.stage4?.notes) result.stage4.notes = cleanNotes(result.stage4.notes);

      // Re-evaluate pass status based on cleaned notes
      if (result.stage2?.notes && result.stage2.notes.length === 0 && result.stage2.pass === false) {
        result.stage2.pass = true;
      }
      if (result.stage3?.notes && result.stage3.notes.length === 0 && result.stage3.pass === false) {
        result.stage3.pass = true;
      }

      // Update overall status
      const allPassed = result.stage1?.pass && result.stage2?.pass && result.stage3?.pass && result.stage4?.pass;
      result.overall = allPassed ? "Passed" : 
        !result.stage1?.pass ? "Failed at stage 1" :
        !result.stage2?.pass ? "Failed at stage 2" :
        !result.stage3?.pass ? "Failed at stage 3" :
        "Failed at stage 4";

      // const allPassed =
      //   result.stage1.pass &&
      //   result.stage2.pass &&
      //   result.stage3.pass &&
      //   result.stage4.pass;

      // for (const si of invoices) {
      //   si.is_verified = allPassed;
      //   si.status = allPassed ? 'Verified' : 'Rejected';
      //   await si.save();
      // }

      return JSON.stringify(result);


    } catch (err: any) {
      console.error(err.response?.data || err.message);
      throw new InternalServerErrorException('Invoice comparison failed');
    }
  }

  async compareDN(po_number: string): Promise<string> {
    try {
      const po = await this.poModel.findOne({ where: { po_number }, include: ['items', 'supplier'] });
      if (!po) throw new NotFoundException('Purchase Order not found');

      const deliveryNotes = await this.dnModel.findAll({ where: { po_number }, include: ['items'] });
      if (!deliveryNotes.length) {
        return 'No delivery notes linked to this PO';
      }

      // Sort delivery notes and items consistently for deterministic results
      const sortedDeliveryNotes = deliveryNotes
        .map(dn => ({
          ...dn.toJSON(),
          items: dn.items ? [...dn.items].sort((a, b) => {
            const nameA = (a.item_name || '').toLowerCase();
            const nameB = (b.item_name || '').toLowerCase();
            if (nameA !== nameB) return nameA.localeCompare(nameB);
            return (a.barcode || '').localeCompare(b.barcode || '');
          }) : []
        }))
        .sort((a, b) => (a.dn_id || 0) - (b.dn_id || 0));

      const sortedPo = {
        ...po.toJSON(),
        items: po.items ? [...po.items].sort((a, b) => {
          const nameA = (a.item_name || '').toLowerCase();
          const nameB = (b.item_name || '').toLowerCase();
          if (nameA !== nameB) return nameA.localeCompare(nameB);
          return (a.barcode || '').localeCompare(b.barcode || '');
        }) : []
      };

      // 🔁 جهّز لستة من الأيتيمات من الـ PO و Delivery Notes
      const poItems = (po.items || []).map((item: any) => ({
        ref: item,
        name: item.item_name || '',
        barcode: (item.barcode || '').trim(),
        quantity: Number(item.quantity) || 0,
      }));

      const dnItems: Array<{
        ref: any;
        name: string;
        barcode: string;
        quantity: number;
      }> = [];

      deliveryNotes.forEach((dn: any) => {
        (dn.items || []).forEach((item: any) => {
          dnItems.push({
            ref: item,
            name: item.item_name || '',
            barcode: (item.barcode || '').trim(),
            quantity: Number(item.quantity) || 0,
          });
        });
      });

      const missingItems: string[] = [];
      const quantityMismatches: string[] = [];
      const extraItems: string[] = [];

      // 1) مطابقة معتمدة على الباركود أولاً (تجميع كميات لكل باركود)
      const poByBarcode = new Map<
        string,
        { name: string; totalQty: number }
      >();
      const dnByBarcode = new Map<
        string,
        { name: string; totalQty: number }
      >();

      poItems.forEach((it) => {
        if (!it.barcode) return;
        const entry = poByBarcode.get(it.barcode) || {
          name: it.name,
          totalQty: 0,
        };
        entry.totalQty += it.quantity;
        poByBarcode.set(it.barcode, entry);
      });

      dnItems.forEach((it) => {
        if (!it.barcode) return;
        const entry = dnByBarcode.get(it.barcode) || {
          name: it.name,
          totalQty: 0,
        };
        entry.totalQty += it.quantity;
        dnByBarcode.set(it.barcode, entry);
      });

      // تحقق من المفقود والكمية حسب الباركود
      for (const [barcode, poInfo] of poByBarcode.entries()) {
        const dnInfo = dnByBarcode.get(barcode);
        if (!dnInfo) {
          missingItems.push(`${poInfo.name} (barcode: ${barcode})`);
        } else if (Math.abs(poInfo.totalQty - dnInfo.totalQty) > 0.01) {
          quantityMismatches.push(
            `${poInfo.name}: PO has ${poInfo.totalQty}, Delivery Notes have ${dnInfo.totalQty}`,
          );
        }
      }

      // عناصر زيادة في الـ DN حسب الباركود
      for (const [barcode, dnInfo] of dnByBarcode.entries()) {
        if (!poByBarcode.has(barcode)) {
          extraItems.push(`${dnInfo.name} (barcode: ${barcode})`);
        }
      }

      // 2) للأصناف بدون باركود، استخدم MiniMax كمطابقة احتياطية (اختياري)
      const poNoBarcode = poItems.filter((it) => !it.barcode);
      const dnNoBarcode = dnItems.filter((it) => !it.barcode);
      const matchedDnNoBarcode = new Set<number>();

      for (let i = 0; i < poNoBarcode.length; i++) {
        const poItem = poNoBarcode[i];
        let foundMatch = false;

        for (let j = 0; j < dnNoBarcode.length; j++) {
          if (matchedDnNoBarcode.has(j)) continue;
          const dnItem = dnNoBarcode[j];

          const sameProduct = await this.areItemsMatchingWithMiniMax(
            { name: poItem.name, barcode: poItem.barcode },
            { name: dnItem.name, barcode: dnItem.barcode },
          );

          if (sameProduct) {
            matchedDnNoBarcode.add(j);
            foundMatch = true;

            if (Math.abs(poItem.quantity - dnItem.quantity) > 0.01) {
              quantityMismatches.push(
                `${poItem.name}: PO has ${poItem.quantity}, Delivery Notes have ${dnItem.quantity}`,
              );
            }
            break;
          }
        }

        if (!foundMatch) {
          const label = poItem.name || `PO item (no barcode) #${i + 1}`;
          missingItems.push(label);
        }
      }

      dnNoBarcode.forEach((dnItem, idx) => {
        if (!matchedDnNoBarcode.has(idx)) {
          const label = dnItem.name || `DN item (no barcode) #${idx + 1}`;
          extraItems.push(label);
        }
      });

        const prompt = `
    // You're a smart delivery audit assistant.

I have one purchase order (PO) and several related delivery notes.

I need you to check the following stages in order and report the result for each stage:

Stage 1: Verify that all delivery notes have the same supplier and purchase order number as the PO.

Stage 2: Verify that the total for all items across all delivery notes exactly matches the items in the purchase order (same item names + same quantities).

🚨 CRITICAL FOR STAGE 2:
- EVERY item in the Purchase Order MUST exist in the delivery notes
- EVERY item in the delivery notes MUST exist in the Purchase Order
- The TOTAL quantity for each item (by item_name + barcode) across all delivery notes MUST exactly match the quantity in the Purchase Order
- If ANY item is missing or quantities don't match, Stage 2 MUST FAIL
- Do NOT pass Stage 2 if items are missing, even if totals seem close
- Do NOT treat "Bread" and "خبز" as different items

🚨🚨🚨 ABSOLUTELY FORBIDDEN - DO NOT REPORT THESE 🚨🚨🚨
- "Item 'Bread' in PO has quantity 50, but in DN has quantity 50" → FORBIDDEN! 50 = 50, they MATCH
- "Item 'egg' in PO has quantity 10, but in DN has quantity 10" → FORBIDDEN! 10 = 10, they MATCH
- "Item 'X' in PO has quantity Y, but in DN has quantity Y" → FORBIDDEN! Y = Y, they MATCH
- ANY note that says "has quantity X, but in DN has quantity X" → FORBIDDEN! X = X, they MATCH
- If the quantity is the SAME (50 = 50, 10 = 10), they MATCH → do NOT report mismatch
- DO NOT write "has quantity X, but in DN has quantity X" → if both are X, they MATCH
- Example WRONG: "Item 'Bread' in PO has quantity 50, but in DN has quantity 50" → WRONG! 50 = 50, they MATCH
- Example CORRECT: "Item 'Bread' in PO has quantity 50, but in DN has quantity 30" → CORRECT! 50 ≠ 30, they differ

📌 TEXT NORMALIZATION RULES (CRITICAL - READ CAREFULLY):
🔹 ITEM NAME MATCHING:
- Compare case-insensitively: "Egg" == "egg" == "EGG" → ALL ARE THE SAME ITEM
- Compare language-insensitively: "egg" == "بيض" → THEY ARE THE SAME ITEM
- "Egg" (PO) == "egg" (DN) → THEY ARE THE SAME ITEM (case-insensitive)
- "egg" (PO) == "بيض" (DN) → THEY ARE THE SAME ITEM (language-insensitive)
- "Egg" (PO) == "بيض" (DN) → THEY ARE THE SAME ITEM (case-insensitive + language-insensitive)
- "Bread" (PO) == "bread" (DN) → THEY ARE THE SAME ITEM (case-insensitive)
- "Bread" (PO) == "خبز" (DN) → THEY ARE THE SAME ITEM (language-insensitive)
- "bread" (PO) == "خبز" (DN) → THEY ARE THE SAME ITEM (language-insensitive)
- "milk" (PO) == "حليب" (DN) → THEY ARE THE SAME ITEM (language-insensitive)
- DO NOT report mismatch if item name differs only by:
  - Case (capital/small letters): "Egg" vs "egg" → SAME ITEM
  - Language (Arabic/English): "بيض" vs "egg" → SAME ITEM
  - Both case and language: "بيض" vs "Egg" → SAME ITEM
- Examples of MATCHING items (do NOT report as mismatch):
  - PO has "Egg" and DN has "egg" → THEY MATCH (same item, different case)
  - PO has "egg" and DN has "بيض" → THEY MATCH (same item, different language)
  - PO has "Egg" and DN has "بيض" → THEY MATCH (same item, different case + language)
  - PO has "Bread" and DN has "خبز" → THEY MATCH (same item, different language)
  - PO has "bread" and DN has "خبز" → THEY MATCH (same item, different language)
  - PO has "milk" and DN has "حليب" → THEY MATCH (same item, different language)


Report any missing items or discrepancies.

🔍 Return the result in the following format **only as valid JSON**. DO NOT add any explanation, reasoning, or text after the JSON. Output ONLY the JSON object:

{
"stage1": { "pass": true/false, "notes": ["..."] },
"stage2": { "pass": true/false, "notes": ["..."] },
"overall": "Passed" or "Failed at stage X"
}

CRITICAL: Output ONLY the JSON above. No explanations, no reasoning, no additional text. Just the JSON object.

/** 📌 IMPORTANT NORMALIZATION RULES — APPLY BEFORE ANALYZING
    🔹 NUMBERS: treat "2" == 2, ignore formatting, compare numerically.
    🔹 STRINGS: trim whitespace, compare case-insensitively.
    🔹 MONEY: allow rounding tolerance < 0.5%.
    🔹 MISSING VALUES: if value can be derived logically, treat valid.
    🚨 2 and "2" MUST NEVER be treated as mismatches.
    **/

   RULES:
If you report mismatch because values look different but are numerically equal, you FAIL the task.
🔐 CRITICAL DECISION RULE
If a mismatch disappears after applying normalization rules,
then that mismatch MUST NOT be reported
and the related stage MUST be considered PASSED.
If the unit is different it's doesn't matter


Examples:
- 4 vs "4" → must be treated as equal → do NOT fail stage
- 10 vs "10" → equal → do NOT fail stage
- "Item 'Bread' in PO has quantity 50, but in DN has quantity 50" → FORBIDDEN! 50 = 50, they MATCH → do NOT fail stage
- "Item 'egg' in PO has quantity 10, but in DN has quantity 10" → FORBIDDEN! 10 = 10, they MATCH → do NOT fail stage
- "Item 'X' in PO has quantity Y, but in DN has quantity Y" → FORBIDDEN! Y = Y, they MATCH → do NOT fail stage
- missing unit label (e.g., "box" vs null) → treat null as equivalent data → do NOT fail stage

You must change stage decisions accordingly:
❗ If normalization resolves mismatches → override pass=true for that stage.
❗ You MUST NOT mark a stage failed if all mismatches resolve after normalization.
❗ If you see "has quantity X, but in DN has quantity X" → X = X, they MATCH → set stage.pass=true
❗ If you see "Item 'X' in PO has quantity Y, but in DN has quantity Y" → Y = Y, they MATCH → set stage.pass=true
If you output "normalized values" inside notes,
you are REQUIRED to set stage.pass=true for that stage.
If you write "has quantity X, but in DN has quantity X" in notes, you MUST set stage.pass=true (X = X, they MATCH).

🔴 ITEM NAME SEMANTIC MATCHING (CRITICAL – FINAL RULE):

When comparing items in Stage 2, item_name comparison MUST be semantic, not literal.

✔ Treat item names as THE SAME ITEM if:
- They differ only by capitalization:
  - "Milk" == "milk" == "MILK"

✔ They have the SAME MEANING across languages (Arabic / English):
  - "milk" == "حليب"
  - "bread" == "خبز"
  - "egg" == "بيض"

✔ If barcode matches EXACTLY, item_name MAY differ in:
- Language (Arabic / English)
- Capitalization (upper / lower case)

❌ DO NOT fail Stage 2 because of:
- Capital vs small letters
- Arabic vs English naming
- Translation differences with the same meaning

❌ DO NOT require exact string match for item_name

🚨 ONLY consider items DIFFERENT if:
- barcode is different
AND
- item_name meaning is different

Use your semantic understanding to determine whether two item names refer to the SAME real-world product.



Here is the data:

Purchase Order:
${JSON.stringify(sortedPo, null, 2)}

Delivery Notes:
${JSON.stringify(sortedDeliveryNotes, null, 2)}

${missingItems.length > 0 || quantityMismatches.length > 0 || extraItems.length > 0 ? `
⚠️ PRE-VALIDATION WARNINGS (These should cause Stage 2 to FAIL):
${missingItems.length > 0 ? `Missing items in delivery notes: ${missingItems.join(', ')}` : ''}
${quantityMismatches.length > 0 ? `Quantity mismatches: ${quantityMismatches.join(', ')}` : ''}
${extraItems.length > 0 ? `Extra items in delivery notes (not in PO): ${extraItems.join(', ')}` : ''}
` : ''}
`;

      const chatCompletion = await this.groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are a smart logistics audit agent. You MUST output ONLY valid JSON. Never add explanations or reasoning after the JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0, // Set to 0 for deterministic results
        max_tokens: 1500, // Limit response length to prevent infinite loops
      });

      let aiResponse = chatCompletion.choices[0].message.content ?? '';

      // Extract JSON more accurately - find the first complete JSON object
      const firstBrace = aiResponse.indexOf('{');
      if (firstBrace === -1) {
        throw new InternalServerErrorException('AI response is not valid JSON');
      }
      
      // Find the matching closing brace by counting braces
      let braceCount = 0;
      let lastBrace = -1;
      for (let i = firstBrace; i < aiResponse.length; i++) {
        if (aiResponse[i] === '{') braceCount++;
        if (aiResponse[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            lastBrace = i;
            break;
          }
        }
      }
      
      if (lastBrace === -1) {
        throw new InternalServerErrorException('AI response is not valid JSON');
      }
      
      aiResponse = aiResponse.slice(firstBrace, lastBrace + 1);

      // Parse and clean the result - remove false mismatches where values are actually equal
      let result = JSON.parse(aiResponse);
      
      // Clean notes: remove mismatches where values are actually equal
      const cleanNotes = (notes: string[]): string[] => {
        if (!Array.isArray(notes)) return notes;
        return notes.filter(note => {
          if (!note || typeof note !== 'string') return true;
          
          // Remove notes that say values are equal (e.g., "PO quantity is 4, invoice quantity is 4")
          const equalValueMatch = note.match(/is\s+(\d+(?:\.\d+)?)\b.*?is\s+\1\b/i);
          if (equalValueMatch) {
            return false; // Same value mentioned twice - false positive
          }
          
          // Remove notes about unit being "box" vs null (they're equivalent)
          if (note.match(/unit.*"box".*null|unit.*null.*"box"|unit.*box.*null|unit.*null.*box/i)) {
            return false; // box and null are equivalent
          }
          // Remove quantity mismatch when expected == found
          if (
            note.match(/quantity mismatch/i) &&
            note.match(/expected\s+(\d+).*found\s+\1/i)
          ) {
            return false;
          }

          
          return true;
        });
      };

      // Clean all stage notes
      if (result.stage1?.notes) result.stage1.notes = cleanNotes(result.stage1.notes);
      if (result.stage2?.notes) result.stage2.notes = cleanNotes(result.stage2.notes);

      // Re-evaluate pass status based on cleaned notes
      if (result.stage2?.notes && result.stage2.notes.length === 0 && result.stage2.pass === false) {
        result.stage2.pass = true;
      }

      // Update overall status
      const allPassed = result.stage1?.pass && result.stage2?.pass;
      result.overall = allPassed ? "Passed" : 
        !result.stage1?.pass ? "Failed at stage 1" :
        "Failed at stage 2";

      // const allPassed = result.stage1.pass && result.stage2.pass;

      // for (const dn of deliveryNotes) {
      //   dn.is_verified = allPassed;
      //   dn.status = allPassed ? 'Verified' : 'Rejected';
      //   await dn.save();
      // }

      return JSON.stringify(result);


    } catch (err: any) {
      console.error(err.response?.data || err.message);
      throw new InternalServerErrorException('Delivery Notes comparison failed');
    }
  }


  async compareGR(po_number: string): Promise<string> {

    const po = await this.poModel.findOne({ where: { po_number }, include: ['items', 'supplier'] });
    if (!po) throw new NotFoundException('Purchase Order not found');

    const goodsReceipts = await this.grModel.findAll({ where: { po_number }, include: ['items'] });
    if (!goodsReceipts.length) {
      return 'No goods receipts linked to this PO';
    }

    // Sort goods receipts and items consistently for deterministic results
    const sortedGoodsReceipts = goodsReceipts
      .map(gr => ({
        ...gr.toJSON(),
        items: gr.items ? [...gr.items].sort((a, b) => {
          const nameA = (a.item_name || '').toLowerCase();
          const nameB = (b.item_name || '').toLowerCase();
          if (nameA !== nameB) return nameA.localeCompare(nameB);
          return (a.barcode || '').localeCompare(b.barcode || '');
        }) : []
      }))
      .sort((a, b) => (a.gr_id || 0) - (b.gr_id || 0));

    const sortedPo = {
      ...po.toJSON(),
      items: po.items ? [...po.items].sort((a, b) => {
        const nameA = (a.item_name || '').toLowerCase();
        const nameB = (b.item_name || '').toLowerCase();
        if (nameA !== nameB) return nameA.localeCompare(nameB);
        return (a.barcode || '').localeCompare(b.barcode || '');
      }) : []
    };

    // 🔁 جهّز لستة من الأيتيمات من الـ PO و Goods Receipts
    const poItems = (po.items || []).map((item: any) => ({
      ref: item,
      name: item.item_name || '',
      barcode: (item.barcode || '').trim(),
      quantity: Number(item.quantity) || 0,
    }));

    const grItems: Array<{
      ref: any;
      name: string;
      barcode: string;
      quantity: number;
    }> = [];

    goodsReceipts.forEach((gr: any) => {
      (gr.items || []).forEach((item: any) => {
        grItems.push({
          ref: item,
          name: item.item_name || '',
          barcode: (item.barcode || '').trim(),
          quantity: Number(item.quantity) || 0,
        });
      });
    });

    const missingItems: string[] = [];
    const quantityMismatches: string[] = [];
    const extraItems: string[] = [];
    
    // 1) مطابقة معتمدة على الباركود أولاً (تجميع كميات لكل باركود)
    const poByBarcode = new Map<
      string,
      { name: string; totalQty: number }
    >();
    const grByBarcode = new Map<
      string,
      { name: string; totalQty: number }
    >();

    poItems.forEach((it) => {
      if (!it.barcode) return;
      const entry = poByBarcode.get(it.barcode) || {
        name: it.name,
        totalQty: 0,
      };
      entry.totalQty += it.quantity;
      poByBarcode.set(it.barcode, entry);
    });

    grItems.forEach((it) => {
      if (!it.barcode) return;
      const entry = grByBarcode.get(it.barcode) || {
        name: it.name,
        totalQty: 0,
      };
      entry.totalQty += it.quantity;
      grByBarcode.set(it.barcode, entry);
    });

    // تحقق من المفقود والكمية حسب الباركود
    for (const [barcode, poInfo] of poByBarcode.entries()) {
      const grInfo = grByBarcode.get(barcode);
      if (!grInfo) {
        missingItems.push(`${poInfo.name} (barcode: ${barcode})`);
      } else if (Math.abs(poInfo.totalQty - grInfo.totalQty) > 0.01) {
        quantityMismatches.push(
          `${poInfo.name}: PO has ${poInfo.totalQty}, Goods Receipts have ${grInfo.totalQty}`,
        );
      }
    }

    // عناصر زيادة في الـ GR حسب الباركود
    for (const [barcode, grInfo] of grByBarcode.entries()) {
      if (!poByBarcode.has(barcode)) {
        extraItems.push(`${grInfo.name} (barcode: ${barcode})`);
      }
    }

    // 2) للأصناف بدون باركود، استخدم MiniMax كمطابقة احتياطية (اختياري)
    const poNoBarcode = poItems.filter((it) => !it.barcode);
    const grNoBarcode = grItems.filter((it) => !it.barcode);
    const matchedGrNoBarcode = new Set<number>();

    for (let i = 0; i < poNoBarcode.length; i++) {
      const poItem = poNoBarcode[i];
      let foundMatch = false;

      for (let j = 0; j < grNoBarcode.length; j++) {
        if (matchedGrNoBarcode.has(j)) continue;
        const grItem = grNoBarcode[j];

        const sameProduct = await this.areItemsMatchingWithMiniMax(
          { name: poItem.name, barcode: poItem.barcode },
          { name: grItem.name, barcode: grItem.barcode },
        );

        if (sameProduct) {
          matchedGrNoBarcode.add(j);
          foundMatch = true;

          if (Math.abs(poItem.quantity - grItem.quantity) > 0.01) {
            quantityMismatches.push(
              `${poItem.name}: PO has ${poItem.quantity}, Goods Receipts have ${grItem.quantity}`,
            );
          }
          break;
        }
      }

      if (!foundMatch) {
        const label = poItem.name || `PO item (no barcode) #${i + 1}`;
        missingItems.push(label);
      }
    }

    grNoBarcode.forEach((grItem, idx) => {
      if (!matchedGrNoBarcode.has(idx)) {
        const label = grItem.name || `GR item (no barcode) #${idx + 1}`;
        extraItems.push(label);
      }
    });

   const prompt = `
    // You're a smart goods receipt audit assistant.

I have one purchase order (PO) and several related goods receipts.

I need you to check the following stages in order and report the result for each stage:

Stage 1: Verify that all goods receipts have the same purchase order number as the PO.

Stage 2: Verify that the total for all items across all goods receipts exactly matches the items in the purchase order (same item  + same quantities).

🚨 CRITICAL FOR STAGE 2:
* EVERY item in the Purchase Order MUST exist in the goods receipts
* EVERY item in the goods receipts MUST exist in the Purchase Order
* The TOTAL quantity for each item (by item_name + barcode) across all goods receipts MUST exactly match the quantity in the Purchase Order
* If ANY item is missing or quantities don't match, Stage 2 MUST FAIL
* Do NOT pass Stage 2 if items are missing, even if totals seem close

🚨🚨🚨 ABSOLUTELY FORBIDDEN - DO NOT REPORT THESE 🚨🚨🚨
* "Missing item: egg (PO) vs Egg (GR)" → FORBIDDEN! "egg" == "Egg", they MATCH (case-insensitive)
* "Missing item: bread (PO) vs Bread (GR)" → FORBIDDEN! "bread" == "Bread", they MATCH (case-insensitive)
* "quantities don't match: 10 (PO) vs 10 (GR)" → FORBIDDEN! 10 = 10, they MATCH
* "quantities don't match: X (PO) vs X (GR)" → FORBIDDEN! X = X, they MATCH
* ANY note that says "egg (PO) vs Egg (GR)" → FORBIDDEN! "egg" == "Egg", they MATCH
* ANY note that says "quantities don't match: X (PO) vs X (GR)" → FORBIDDEN! X = X, they MATCH
* If item name differs only by case ("egg" vs "Egg") → THEY MATCH → do NOT report as missing
* If quantity is the SAME (10 = 10, 50 = 50) → THEY MATCH → do NOT report as mismatch
* Example WRONG: "Missing item: egg (PO) vs Egg (GR), quantities don't match: 10 (PO) vs 10 (GR)" → WRONG! "egg" == "Egg" and 10 = 10, they MATCH
* Example CORRECT: "Missing item: apple (PO) not found in GR" → CORRECT! apple is truly missing
* Example CORRECT: "quantities don't match: 10 (PO) vs 5 (GR)" → CORRECT! 10 ≠ 5, they differ

📌 TEXT NORMALIZATION RULES (CRITICAL - READ CAREFULLY):
🔹 ITEM NAME MATCHING:
* Compare case-insensitively: "Bread" == "bread" == "BREAD" → ALL ARE THE SAME ITEM
* Compare language-insensitively: "bread" == "خبز" → THEY ARE THE SAME ITEM
* "Bread" (PO) == "bread" (GR) → THEY ARE THE SAME ITEM (case-insensitive)
* "bread" (PO) == "خبز" (GR) → THEY ARE THE SAME ITEM (language-insensitive)
* "Bread" (PO) == "خبز" (GR) → THEY ARE THE SAME ITEM (case-insensitive + language-insensitive)
* "Egg" (PO) == "egg" (GR) → THEY ARE THE SAME ITEM (case-insensitive)
* "egg" (PO) == "بيض" (GR) → THEY ARE THE SAME ITEM (language-insensitive)
* "milk" (PO) == "حليب" (GR) → THEY ARE THE SAME ITEM (language-insensitive)
* DO NOT report mismatch if item name differs only by:
  - Case (capital/small letters): "Bread" vs "bread" → SAME ITEM
  - Language (Arabic/English): "خبز" vs "bread" → SAME ITEM
  - Both case and language: "خبز" vs "Bread" → SAME ITEM
* Examples of MATCHING items (do NOT report as mismatch):
  - PO has "Bread" and GR has "bread" → THEY MATCH (same item, different case)
  - PO has "bread" and GR has "خبز" → THEY MATCH (same item, different language)
  - PO has "Bread" and GR has "خبز" → THEY MATCH (same item, different case + language)
  - PO has "egg" and GR has "Egg" → THEY MATCH (same item, different case)
  - PO has "Egg" and GR has "egg" → THEY MATCH (same item, different case)
  - DO NOT write "Missing item: egg (PO) vs Egg (GR)" → "egg" == "Egg", they MATCH
  - DO NOT write "egg (PO) vs Egg (GR)" → they are THE SAME ITEM (case-insensitive)

📌 QUANTITY NORMALIZATION RULE (CRITICAL):
* If quantity is the SAME (10 = 10, 50 = 50) → THEY MATCH → do NOT report mismatch
* "quantities don't match: 10 (PO) vs 10 (GR)" → FORBIDDEN! 10 = 10, they MATCH
* "quantities don't match: X (PO) vs X (GR)" → FORBIDDEN! X = X, they MATCH
* DO NOT write "quantities don't match" if both quantities are the SAME
* Example WRONG: "quantities don't match: 10 (PO) vs 10 (GR)" → WRONG! 10 = 10, they MATCH
* Example CORRECT: "quantities don't match: 10 (PO) vs 5 (GR)" → CORRECT! 10 ≠ 5, they differ

📌 UNIT NORMALIZATION RULE (CRITICAL - IGNORE UNIT):
* Units are COMPLETELY IGNORED - do NOT check or compare units
* If unit differs (e.g., "box", "carton", null, empty, or any variation) → IGNORE IT
* Unit differences are IRRELEVANT - treat ALL units as equivalent
* DO NOT report mismatch based on unit differences - units are NOT checked
* Example: PO has "box" and GR has null → THEY MATCH (units are ignored)
* Example: PO has "carton" and GR has "box" → THEY MATCH (units are ignored)
* Only check: item_name, barcode, and quantity - IGNORE unit completely

Verify that the items were received correctly (check total quantities, allow for minor name differences, e.g., "Bread" vs "bread", "bread" vs "خبز").

Report any missing items or discrepancies.

🔍 Return the result in the following format **only as valid JSON**. DO NOT add any explanation, reasoning, or text after the JSON. Output ONLY the JSON object:

{
"stage1": { "pass": true/false, "notes": ["..."] },
"stage2": { "pass": true/false, "notes": ["..."] },
"overall": "Passed" or "Failed at stage X"
}

CRITICAL: Output ONLY the JSON above. No explanations, no reasoning, no additional text. Just the JSON object.

/** 📌 IMPORTANT NORMALIZATION RULES — APPLY BEFORE ANALYZING
    🔹 NUMBERS: treat "2" == 2, ignore formatting, compare numerically.
    🔹 STRINGS: trim whitespace, compare case-insensitively.
    🔹 MONEY: allow rounding tolerance < 0.5%.
    🔹 MISSING VALUES: if value can be derived logically, treat valid.
    🚨 2 and "2" MUST NEVER be treated as mismatches.
    **/

    🔴 ITEM NAME SEMANTIC MATCHING (CRITICAL – FINAL RULE):

When comparing items in Stage 2, item_name comparison MUST be semantic, not literal.

✔ Treat item names as THE SAME ITEM if:
- They differ only by capitalization:
  - "Milk" == "milk" == "MILK"

✔ They have the SAME MEANING across languages (Arabic / English):
  - "milk" == "حليب"
  - "bread" == "خبز"
  - "egg" == "بيض"

✔ If barcode matches EXACTLY, item_name MAY differ in:
- Language (Arabic / English)
- Capitalization (upper / lower case)

❌ DO NOT fail Stage 2 because of:
- Capital vs small letters
- Arabic vs English naming
- Translation differences with the same meaning

❌ DO NOT require exact string match for item_name

🚨 ONLY consider items DIFFERENT if:
- barcode is different
AND
- item_name meaning is different

Use your semantic understanding to determine whether two item names refer to the SAME real-world product.


   RULES:
If you report mismatch because values look different but are numerically equal, you FAIL the task.
🔐 CRITICAL DECISION RULE
If a mismatch disappears after applying normalization rules,
then that mismatch MUST NOT be reported
and the related stage MUST be considered PASSED.

Examples:
* 4 vs "4" → must be treated as equal → do NOT fail stage
* 10 vs "10" → equal → do NOT fail stage
* "Missing item: egg (PO) vs Egg (GR)" → FORBIDDEN! "egg" == "Egg", they MATCH → do NOT fail stage
* "quantities don't match: 10 (PO) vs 10 (GR)" → FORBIDDEN! 10 = 10, they MATCH → do NOT fail stage
* "Missing item: egg (PO) vs Egg (GR), quantities don't match: 10 (PO) vs 10 (GR)" → FORBIDDEN! "egg" == "Egg" and 10 = 10, they MATCH → do NOT fail stage
* missing unit label (e.g., "box" vs null) → treat null as equivalent data → do NOT fail stage

You must change stage decisions accordingly:
❗ If normalization resolves mismatches → override pass=true for that stage.
❗ You MUST NOT mark a stage failed if all mismatches resolve after normalization.
❗ If you see "egg (PO) vs Egg (GR)" → "egg" == "Egg", they MATCH → set stage.pass=true
❗ If you see "quantities don't match: X (PO) vs X (GR)" → X = X, they MATCH → set stage.pass=true
❗ If you see "Missing item: egg (PO) vs Egg (GR), quantities don't match: 10 (PO) vs 10 (GR)" → "egg" == "Egg" and 10 = 10, they MATCH → set stage.pass=true
If you output "normalized values" inside notes,
you are REQUIRED to set stage.pass=true for that stage.
If you write "egg (PO) vs Egg (GR)" or "quantities don't match: X (PO) vs X (GR)" in notes, you MUST set stage.pass=true (they MATCH).


Here is the data:

Purchase Order:
${JSON.stringify(sortedPo, null, 2)}

Goods Receipts:
${JSON.stringify(sortedGoodsReceipts, null, 2)}

${missingItems.length > 0 || quantityMismatches.length > 0 || extraItems.length > 0 ? `
⚠️ PRE-VALIDATION WARNINGS (These should cause Stage 2 to FAIL):
${missingItems.length > 0 ? `Missing items in goods receipts: ${missingItems.join(', ')}` : ''}
${quantityMismatches.length > 0 ? `Quantity mismatches: ${quantityMismatches.join(', ')}` : ''}
${extraItems.length > 0 ? `Extra items in goods receipts (not in PO): ${extraItems.join(', ')}` : ''}
` : ''}
    `;

    try {
      const chatCompletion = await this.groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are a smart goods receipt audit agent. You MUST output ONLY valid JSON. Never add explanations or reasoning after the JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0, // Set to 0 for deterministic results
        max_tokens: 1500, // Limit response length to prevent infinite loops
      });

      let aiResponse = chatCompletion.choices[0].message.content ?? '';

      // Extract JSON more accurately - find the first complete JSON object
      const firstBrace = aiResponse.indexOf('{');
      if (firstBrace === -1) {
        throw new InternalServerErrorException('AI response is not valid JSON');
      }
      
      // Find the matching closing brace by counting braces
      let braceCount = 0;
      let lastBrace = -1;
      for (let i = firstBrace; i < aiResponse.length; i++) {
        if (aiResponse[i] === '{') braceCount++;
        if (aiResponse[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            lastBrace = i;
            break;
          }
        }
      }
      
      if (lastBrace === -1) {
        throw new InternalServerErrorException('AI response is not valid JSON');
      }
      
      aiResponse = aiResponse.slice(firstBrace, lastBrace + 1);

      // Parse and clean the result - remove false mismatches where values are actually equal
      let result = JSON.parse(aiResponse);
      
      // Clean notes: remove mismatches where values are actually equal
      const cleanNotes = (notes: string[]): string[] => {
        if (!Array.isArray(notes)) return notes;
        return notes.filter(note => {
          if (!note || typeof note !== 'string') return true;
          
          // Remove notes that say values are equal (e.g., "PO quantity is 4, invoice quantity is 4")
          const equalValueMatch = note.match(/is\s+(\d+(?:\.\d+)?)\b.*?is\s+\1\b/i);
          if (equalValueMatch) {
            return false; // Same value mentioned twice - false positive
          }
          
          // Remove notes about unit being "box" vs null (they're equivalent)
          if (note.match(/unit.*"box".*null|unit.*null.*"box"|unit.*box.*null|unit.*null.*box/i)) {
            return false; // box and null are equivalent
          }
          
          return true;
        });
      };

      // Clean all stage notes
      if (result.stage1?.notes) result.stage1.notes = cleanNotes(result.stage1.notes);
      if (result.stage2?.notes) result.stage2.notes = cleanNotes(result.stage2.notes);

      // Re-evaluate pass status based on cleaned notes
      if (result.stage2?.notes && result.stage2.notes.length === 0 && result.stage2.pass === false) {
        result.stage2.pass = true;
      }

      // Update overall status
      const allPassed = result.stage1?.pass && result.stage2?.pass;
      result.overall = allPassed ? "Passed" : 
        !result.stage1?.pass ? "Failed at stage 1" :
        "Failed at stage 2";

        if (result.overall === "Passed") {
  try {
    const paymentRole = await Role.findOne({ where: { role_name: 'PaymentOfficer' } });

    if (paymentRole) {
      const paymentUsers = await User.findAll({ where: { role_id: paymentRole.role_id } });

      for (const user of paymentUsers) {
        await this.notificationService.sendNotification({
          title: "Purchase Order Ready for Payment 💰",
          message: `PO with #${po_number} verification is completed and ready for payment.`,
          userId: user.user_id.toString(),
          channel: NotificationChannel.IN_APP,
          category: NotificationCategory.SYSTEM,
          payload: { poNumber: po_number }
        });
      }
          }
        } catch (err) {
          console.error("⚠️ Failed to send Payment Officer notification:", err);
        }
      }

      return JSON.stringify(result);


    } catch (err: any) {
      console.error(err.response?.data || err.message);
      throw new InternalServerErrorException('Goods Receipts comparison failed');
    }
  }

  async updateWorkflowState(po_number: string, stage: 'SI' | 'DN' | 'GR', cont: boolean) {

  const invoices = await this.invoiceModel.findAll({ where: { po_number }});
  const deliveryNotes = await this.dnModel.findAll({ where: { po_number }});
  const goodsReceipts = await this.grModel.findAll({ where: { po_number }});
  const purchaseOrder = await this.poModel.findOne({ where: { po_number }});

  if (!purchaseOrder) return;

  if (stage === 'SI') {
    if (!cont) {
    for (const inv of invoices) await inv.update({ status: 'Incident' });
    await purchaseOrder.update({ status: 'Incident' });
    return;
  }
  else{
    for (const inv of invoices) await inv.update({ status: 'ReadyForPaid' });
    await purchaseOrder.update({ status: 'ReadyForPaid' });
  }
  }

  if (stage === 'DN') {
    if (!cont) {
    for (const inv of invoices) await inv.update({ status: 'Incident' });
    await purchaseOrder.update({ status: 'Incident' });
    for (const dn of deliveryNotes) await dn.update({ status: 'Incident' });
    }
    else{
    for (const inv of invoices) await inv.update({ status: 'ReadyForPaid' });
    await purchaseOrder.update({ status: 'ReadyForPaid' });
    for (const dn of deliveryNotes) await dn.update({ status: 'Verified' });
  }
  }

  if (stage === 'GR') {
    if (!cont) {
    for (const inv of invoices) await inv.update({ status: 'Incident' });
    for (const dn of deliveryNotes) await dn.update({ status: 'Incident' });
    for (const gr of goodsReceipts) await gr.update({ status: 'Incident' });
    await purchaseOrder.update({ status: 'Incident' });
    }
    else{
    for (const inv of invoices) await inv.update({ status: 'ReadyForPaid' });
    await purchaseOrder.update({ status: 'ReadyForPaid' });
    for (const dn of deliveryNotes) await dn.update({ status: 'Verified' });
    for (const gr of goodsReceipts) await gr.update({ status: 'Verified' });
   try {
        const paymentRole = await Role.findOne({ where: { role_name: 'PaymentOfficer' } });

        if (paymentRole) {
          const paymentUsers = await User.findAll({ where: { role_id: paymentRole.role_id } });

          for (const user of paymentUsers) {
            await this.notificationService.sendNotification({
              title: 'Purchase Order Ready for Payment 💰',
              message: `PO with #${po_number} is fully verified and ready for payment.`,
              userId: user.user_id.toString(),
              channel: NotificationChannel.IN_APP,
              category: NotificationCategory.SYSTEM,
              payload: {
                poNumber: po_number
              }
            });
          }

          purchaseOrder.ready_for_paid_notified_at = new Date();
          await purchaseOrder.save();
        }
      } catch (err) {
        console.error("❌ Failed to send payment notification", err);
      }
    }
  }
}
}