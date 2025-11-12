// // src/services/verification.service.ts
// import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
// import { InjectModel } from '@nestjs/sequelize';
// import { DeliveryNote } from '../DeliveryNote/delivery-note.model';
// import { DeliveryNoteItem } from '../DeliveryNote/delivery-note-item.model';
// import { GoodsReceipts } from '../GoodsReceipt/GoodsReceipt.model';
// import { GoodsReceiptItem } from '../GoodsReceipt/GoodsReceiptItem.model';
// import { PurchaseOrder } from 'src/PO/po.model';
// import { SupplierInvoiceItem } from 'src/supplier-invoices/supplier-invoice-item.model';
// import { SupplierInvoice } from 'src/supplier-invoices/supplier-invoice.model';

// @Injectable()
// export class VerificationService {
//   constructor(
//     @InjectModel(DeliveryNote) private dnModel: typeof DeliveryNote,
//     @InjectModel(DeliveryNoteItem) private dnItemModel: typeof DeliveryNoteItem,
//     @InjectModel(GoodsReceipts) private grModel: typeof GoodsReceipts,
//     @InjectModel(GoodsReceiptItem) private grItemModel: typeof GoodsReceiptItem,
//     @InjectModel(PurchaseOrder) private poModel: typeof PurchaseOrder,
//     @InjectModel(SupplierInvoice) private invoiceModel: typeof SupplierInvoice,
//     @InjectModel(SupplierInvoiceItem) private invoiceItemModel: typeof SupplierInvoiceItem,
//   ) {}


// async verifyPOInvoices(po_number: string, userId: number) {
//   const po = await this.poModel.findOne({ where: { po_number }, include: ['items', 'supplier'] });
//   if (!po) throw new NotFoundException('Purchase Order not found');

//   const invoices = await this.invoiceModel.findAll({ where: { po_number }, include: ['items'] });

//   if (!invoices.length) {
//     return { message: 'No invoices linked to this PO', po, allMatch: false, notes: [] };
//   }

//   let allMatch = true;
//   const notes: any[] = [];

//   // نجمع كل البنود حسب الباركود
//   const invoiceItemsMap: Record<string, { quantity: number; unit_price: number }> = {};
//   for (const invoice of invoices) {
//     for (const item of invoice.items) {
//       const barcode = item.barcode;
//       if (!invoiceItemsMap[barcode]) {
//         invoiceItemsMap[barcode] = { quantity: 0, unit_price: Number(item.unit_price) };
//       }
//       invoiceItemsMap[barcode].quantity += Number(item.quantity);
//       // إذا السعر مختلف عن اللي موجود، نعتبره خطأ
//       if (invoiceItemsMap[barcode].unit_price !== Number(item.unit_price)) {
//         notes.push({
//           invoice: invoice.invoice_number,
//           item: item.item_name,
//           issue: `Price mismatch among invoices: expected ${invoiceItemsMap[barcode].unit_price}, found ${item.unit_price}`
//         });
//         allMatch = false;
//       }
//     }

//     if (po.currency && invoice.currency !== po.currency) {
//       notes.push({
//         invoice: invoice.invoice_number,
//         issue: `Currency mismatch: PO=${po.currency}, Invoice=${invoice.currency}`
//       });
//       allMatch = false;
//     }

//     if (!invoice.payment_method || invoice.payment_method.trim() === '') {
//     notes.push({ invoice: invoice.invoice_number, issue: 'Payment method missing' });
//     allMatch = false;
//     } else if (po.payment_method && invoice.payment_method !== po.payment_method) {
//     notes.push({ invoice: invoice.invoice_number, issue: `Payment method mismatch: PO=${po.payment_method}, Invoice=${invoice.payment_method}` });
//     allMatch = false;
//     }

//   }
  

//   // مقارنة كل PO Item مع المجموع من الفواتير
//   for (const poItem of po.items) {
//     const barcode = poItem.barcode;
//     const invItem = invoiceItemsMap[barcode];
//     if (!invItem) {
//       notes.push({ item: poItem.item_name, issue: 'Missing in all invoices' });
//       allMatch = false;
//       continue;
//     }

//     if (Number(poItem.quantity) !== invItem.quantity) {
//       notes.push({
//         item: poItem.item_name,
//         issue: `Quantity mismatch: PO=${poItem.quantity}, Invoices total=${invItem.quantity}`
//       });
//       allMatch = false;
//     }

//     if (Number(poItem.unit_price) !== invItem.unit_price) {
//       notes.push({
//         item: poItem.item_name,
//         issue: `Price mismatch: PO=${poItem.unit_price}, Invoices=${invItem.unit_price}`
//       });
//       allMatch = false;
//     }
//   }

//   // تحقق من المورد
//   for (const invoice of invoices) {
//     if (invoice.supplier_email !== po.supplier.contact_email) {
//       notes.push({ invoice: invoice.invoice_number, issue: 'Supplier mismatch' });
//       allMatch = false;
//     }
//   }

//   // تحقق من الضريبة والمبلغ الكلي
//   const totalVAT = invoices.reduce((sum, i) => sum + Number(i.vat), 0);
//   const totalAmount = invoices.reduce((sum, i) => sum + Number(i.total_amount), 0);
//   if (totalVAT !== Number(po.vat)) {
//     notes.push({ issue: `VAT mismatch: PO=${po.vat}, Invoices total=${totalVAT}` });
//     allMatch = false;
//   }
//   if (totalAmount !== Number(po.total_amount)) {
//     notes.push({ issue: `Total amount mismatch: PO=${po.total_amount}, Invoices total=${totalAmount}` });
//     allMatch = false;
//   }

//   // تحديث الحالة
//   po.is_verified = allMatch;
//   po.status = allMatch ? 'Approved' : 'Incident';
//   po.note = `${po.note ?? ''}\n[Verification by user ${userId} at ${new Date().toLocaleString()}]`;
//   await po.save();

//   for (const invoice of invoices) {
//     invoice.is_verified = allMatch;
//     invoice.status = allMatch ? 'Verified' : 'Incident';
//     await invoice.save();
//   }

//   return {
//     message: 'PO ↔ Supplier Invoices verification completed',
//     po,
//     allMatch,
//     notes,
//     invoicesChecked: invoices.length,
//   };
// }

// async verifyPODeliveryNotes(po_number: string, userId: number) {
//   // جلب الـ PO مع البنود والمورد
//   const po = await this.poModel.findOne({ 
//     where: { po_number }, 
//     include: ['items', 'supplier'] 
//   });
//   if (!po) throw new NotFoundException('Purchase Order not found');

//   // جلب كل Delivery Notes المرتبطة بالـ PO
//   const dns = await this.dnModel.findAll({ 
//     where: { po_number }, 
//     include: ['items'] 
//   });

//   if (!dns.length) {
//     return { message: 'No Delivery Notes linked to this PO', po, allMatch: false, notes: [] };
//   }

//   let allMatch = true;
//   const notes: any[] = [];

//   // نجمع كل البنود من كل DN حسب الباركود
//   const dnItemsMap: Record<string, { quantity: number }> = {};
//   for (const dn of dns) {
//     for (const item of dn.items) {
//       const barcode = item.barcode;
//       if (!dnItemsMap[barcode]) {
//         dnItemsMap[barcode] = { quantity: 0 };
//       }
//       dnItemsMap[barcode].quantity += Number(item.quantity);
//     }
//   }

//   // مقارنة كل PO Item مع المجموع من DN Items
//   for (const poItem of po.items) {
//     const barcode = poItem.barcode;
//     const dnItem = dnItemsMap[barcode];

//     if (!dnItem) {
//       notes.push({ item: poItem.item_name, issue: 'Missing in all Delivery Notes' });
//       allMatch = false;
//       continue;
//     }

//     if (Number(poItem.quantity) !== dnItem.quantity) {
//       notes.push({
//         item: poItem.item_name,
//         issue: `Quantity mismatch: PO=${poItem.quantity}, DN total=${dnItem.quantity}`
//       });
//       allMatch = false;
//     }
//   }

//   // تحديث حالة PO بعد التدقيق
//   po.is_verified = allMatch;
//   po.status = allMatch ? 'Approved' : 'Incident';
//   po.note = `${po.note ?? ''}\n[Delivery Note verification by user ${userId} at ${new Date().toLocaleString()}]`;
//   await po.save();

//   // تحديث الـ DN
//   for (const dn of dns) {
//     dn.is_verified = allMatch;
//     dn.status = allMatch ? 'Verified' : 'Incident';
//     await dn.save();
//   }

//   return {
//     message: 'PO ↔ Delivery Notes verification completed',
//     po,
//     allMatch,
//     notes,
//     deliveryNotesChecked: dns.length,
//   };
// }


// async verifyDeliveryGoods(po_number: string, userId: number) {
//   // جلب الـ PO مع البنود والمورد
//   const po = await this.poModel.findOne({
//     where: { po_number },
//     include: ['items', 'supplier']
//   });
//   if (!po) throw new NotFoundException('Purchase Order not found');

//   // جلب كل Delivery Notes المرتبطة بالـ PO
//   const dns = await this.dnModel.findAll({
//     where: { po_number },
//     include: ['items']
//   });

//   if (!dns.length) {
//     return { message: 'No Delivery Notes linked to this PO', po, allMatch: false, notes: [] };
//   }

//   let allMatch = true;
//   const notes: any[] = [];

//   // خريطة لتجميع كميات DN لكل عنصر
//   const dnItemsMap: Record<string, { quantity: number }> = {};
//   for (const dn of dns) {
//     for (const item of dn.items) {
//       const barcode = item.barcode;
//       if (!dnItemsMap[barcode]) dnItemsMap[barcode] = { quantity: 0 };
//       dnItemsMap[barcode].quantity += Number(item.quantity);
//     }
//   }

//   // جلب كل Goods Receipts المرتبطة بكل DN
//   const grItemsMap: Record<string, { quantity: number }> = {};
//   for (const dn of dns) {
//     const grs = await this.grModel.findAll({
//       where: { dn_id: dn.dn_id },
//       include: ['items']
//     });

//     for (const gr of grs) {
//       for (const item of gr.items) {
//         const barcode = item.barcode;
//         if (!grItemsMap[barcode]) grItemsMap[barcode] = { quantity: 0 };
//         grItemsMap[barcode].quantity += Number(item.received_quantity);
//       }
//     }
//   }

//   // مقارنة كل PO Item مع المجموع من DN و GR
//   for (const poItem of po.items) {
//     const barcode = poItem.barcode;
//     const dnItem = dnItemsMap[barcode];
//     const grItem = grItemsMap[barcode];

//     if (!dnItem) {
//       notes.push({ item: poItem.item_name, issue: 'Missing in all Delivery Notes' });
//       allMatch = false;
//     } else if (Number(poItem.quantity) !== dnItem.quantity) {
//       notes.push({
//         item: poItem.item_name,
//         issue: `Quantity mismatch in DN: PO=${poItem.quantity}, DN total=${dnItem.quantity}`
//       });
//       allMatch = false;
//     }

//     if (!grItem) {
//       notes.push({ item: poItem.item_name, issue: 'Missing in all Goods Receipts' });
//       allMatch = false;
//     } else if (Number(poItem.quantity) !== grItem.quantity) {
//       notes.push({
//         item: poItem.item_name,
//         issue: `Quantity mismatch in GR: PO=${poItem.quantity}, GR total=${grItem.quantity}`
//       });
//       allMatch = false;
//     }
//   }

//   // تحديث حالة PO بعد التدقيق
//   po.is_verified = allMatch;
//   po.status = allMatch ? 'Approved' : 'Incident';
//   po.note = `${po.note ?? ''}\n[Full Delivery verification by user ${userId} at ${new Date().toLocaleString()}]`;
//   await po.save();

//   // تحديث حالة DN و GR
//   for (const dn of dns) {
//     dn.is_verified = allMatch;
//     dn.status = allMatch ? 'Verified' : 'Incident';
//     await dn.save();

//     const grs = await this.grModel.findAll({ where: { dn_id: dn.dn_id } });
//     for (const gr of grs) {
//       gr.is_verified = allMatch;
//       gr.status = allMatch ? 'Verified' : 'Incident';
//       await gr.save();
//     }
//   }

//   return {
//     message: 'PO ↔ Delivery Notes ↔ Goods Receipts verification completed',
//     po,
//     allMatch,
//     notes,
//     deliveryNotesChecked: dns.length
//   };
// }

// async verifyPOGoodsReceipts(po_number: string, userId: number) {
//   // جلب الطلب
//   const po = await this.poModel.findOne({ where: { po_number }, include: ['items', 'supplier'] });
//   if (!po) throw new NotFoundException('Purchase Order not found');

//   // جلب جميع الـ Goods Receipts التابعة لنفس الـ PO
//   const receipts = await this.grModel.findAll({ where: { po_number }, include: ['items'] });

//   if (!receipts.length) {
//     return { message: 'No Goods Receipts linked to this PO', po, allMatch: false, notes: [] };
//   }

//   let allMatch = true;
//   const notes: any[] = [];

//   // خريطة الكميات المجمعة من كل GR حسب الباركود
//   const grItemsMap: Record<string, number> = {};
//   for (const gr of receipts) {
//     for (const item of gr.items) {
//       const barcode = item.barcode;
//       if (!grItemsMap[barcode]) grItemsMap[barcode] = 0;
//       grItemsMap[barcode] += Number(item.received_quantity);
//     }
//   }

//   // مقارنة الكميات بين PO و GRs
//   for (const poItem of po.items) {
//     const barcode = poItem.barcode;
//     const receivedQty = grItemsMap[barcode] || 0;

//     if (receivedQty === 0) {
//       notes.push({ item: poItem.item_name, issue: 'Item missing in all Goods Receipts' });
//       allMatch = false;
//       continue;
//     }

//     if (receivedQty < poItem.quantity) {
//       notes.push({
//         item: poItem.item_name,
//         issue: `Under-delivered: PO=${poItem.quantity}, GR total=${receivedQty}`
//       });
//       allMatch = false;
//     } else if (receivedQty > poItem.quantity) {
//       notes.push({
//         item: poItem.item_name,
//         issue: `Over-delivered: PO=${poItem.quantity}, GR total=${receivedQty}`
//       });
//       allMatch = false;
//     }
//   }

//   // التحقق إذا في GR فيه بنود مش موجودة بالـ PO
//   for (const gr of receipts) {
//     for (const item of gr.items) {
//       const existsInPO = po.items.some(p => p.barcode === item.barcode);
//       if (!existsInPO) {
//         notes.push({
//           receipt: gr.gr_number,
//           item: item.product_name,
//           issue: 'Item exists in GR but not in PO'
//         });
//         allMatch = false;
//       }
//     }
//   }

//   // تحديث الحالة
//   po.is_verified = allMatch;
//   po.status = allMatch ?  'ReadyForPaid': 'Incident';
//   po.note = `${po.note ?? ''}\n[PO-GR Verification by user ${userId} at ${new Date().toLocaleString()}]`;
//   await po.save();

//   for (const gr of receipts) {
//     gr.is_verified = allMatch;
//     gr.status = allMatch ? 'Verified' : 'Incident';
//     await gr.save();
//   }

//   if (allMatch) {
//     const invoices = await this.invoiceModel.findAll({ where: { po_number }, include: ['items'] });
//     for (const invoice of invoices) {
//       invoice.status = 'ReadyForPaid';
//       invoice.is_verified = true;
//       await invoice.save();
//     }
//   }

//   return {
//     message: 'PO ↔ Goods Receipts verification completed',
//     po,
//     allMatch,
//     notes,
//     receiptsChecked: receipts.length,
//   };
// }


// }

import { OpenAI } from 'openai';
import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { DeliveryNote } from '../DeliveryNote/delivery-note.model';
import { DeliveryNoteItem } from '../DeliveryNote/delivery-note-item.model';
import { GoodsReceipts } from '../GoodsReceipt/GoodsReceipt.model';
import { GoodsReceiptItem } from '../GoodsReceipt/GoodsReceiptItem.model';
import { PurchaseOrder } from 'src/PO/po.model';
import { SupplierInvoiceItem } from 'src/supplier-invoices/supplier-invoice-item.model';
import { SupplierInvoice } from 'src/supplier-invoices/supplier-invoice.model';

@Injectable()
export class InvoiceService {
  private client: OpenAI;

  constructor(
    @InjectModel(DeliveryNote) private dnModel: typeof DeliveryNote,
    @InjectModel(DeliveryNoteItem) private dnItemModel: typeof DeliveryNoteItem,
    @InjectModel(GoodsReceipts) private grModel: typeof GoodsReceipts,
    @InjectModel(GoodsReceiptItem) private grItemModel: typeof GoodsReceiptItem,
    @InjectModel(PurchaseOrder) private poModel: typeof PurchaseOrder,
    @InjectModel(SupplierInvoice) private invoiceModel: typeof SupplierInvoice,
    @InjectModel(SupplierInvoiceItem) private invoiceItemModel: typeof SupplierInvoiceItem,
  ) {
    this.client = new OpenAI({
      baseURL: 'https://router.huggingface.co/v1',
      apiKey: process.env.HF_TOKEN,
    });
  }

  async compareInvoices(po_number: string): Promise<string> {

    const po = await this.poModel.findOne({ where: { po_number }, include: ['items', 'supplier'] });
  if (!po) throw new NotFoundException('Purchase Order not found');

  const invoices = await this.invoiceModel.findAll({ where: { po_number }, include: ['items'] });

  if (!invoices.length) {
    return 'No invoices linked to this PO' ;
  }


  const prompt = `
    // You're a smart invoice audit assistant.

I have one purchase order (PO) and several related invoices.

I need you to check four stages in order and report the result for each stage (successful or unsuccessful) with any feedback:

Stage 1: Verify that all invoices have the same supplier and purchase order number.

Stage 2: Verify that the total for all items across all invoices exactly matches the items in the purchase order (same item names + same quantities + same prices).

For example, if the PO orders "milk" and "bread," and the two invoices are distributed as follows: - Invoice 1 lists only milk.
- Invoice 2 lists bread.
This is considered correct as long as the final total matches.

Step 3: Verify that the subtotal + VAT + total on the invoices matches the purchase order values. The supplier may have applied a discount; confirm if the discount is correct.

Step 4: Verify that the payment method and currency match between the purchase order and the invoices.

🔍 Return the result in the following format **only as valid JSON** without any additional text or explanation outside the brackets:

{
"stage1": { "pass": true/false, "notes": ["..."] },

"stage2": { "pass": true/false, "notes": ["..."] },

"stage3": { "pass": true/false, "notes": ["..."] },

"stage4": { "pass": true/false, "notes": ["..."] },

"overall": "Passed" or "Failed at stage X"
}

Here is the data:

Purchase Order:
${JSON.stringify(po, null, 2)}

Invoices:
${JSON.stringify(invoices, null, 2)}
`;

  try {
    const chatCompletion = await this.client.chat.completions.create({
      model: 'MiniMaxAI/MiniMax-M2:novita',   //'MiniMaxAI/MiniMax-M2:novita',HuggingFaceH4/zephyr-7b-alpha:featherless-ai
      messages: [{ role: 'user', content: prompt }],
    });

//     return chatCompletion.choices[0].message.content ?? ''; //// هون برجع الثينكنج تبع الAI
//   } catch (err: any) {
//     console.error(err.response?.data || err.message);
//     throw new InternalServerErrorException('Invoice comparison failed');
//   }
// }
    let aiResponse = chatCompletion.choices[0].message.content ?? '';

    // 1️⃣ حل JSON من الـAI
    const firstBrace = aiResponse.indexOf('{');
    const lastBrace = aiResponse.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) {
      throw new InternalServerErrorException('AI response is not valid JSON');
    }
    aiResponse = aiResponse.slice(firstBrace, lastBrace + 1);

    // 🔹 تحويل الـ AI response إلى JSON
    const result = JSON.parse(aiResponse);
    

    // 2️⃣ تحديد هل كل المراحل نجحت
    const allPassed = result.stage1.pass && result.stage2.pass && result.stage3.pass && result.stage4.pass;

    // 3️⃣ تحديث العمود is_verified لكل الفواتير المرتبطة بالـPO
    for (const si of invoices) {
    si.is_verified = allPassed;
    si.status = allPassed? 'Verified': 'Rejected';
    await si.save();
  }

  // 4️⃣ ترجع نفس النتيجة للفرونت
    return aiResponse;

  } catch (err: any) {
    console.error(err.response?.data || err.message);
    throw new InternalServerErrorException('Invoice comparison failed');
  }
}

async compareDN(po_number: string): Promise<string> {
    try {

  const po = await this.poModel.findOne({ where: { po_number }, include: ['items', 'supplier'] });
  if (!po) throw new NotFoundException('Purchase Order not found');

//   await this.invoiceModel.update(
//   { is_verified: true, status: 'Verified' },
//   { where: { po_number } }
// );

const invoices = await this.invoiceModel.findAll({ where: { po_number: 'PO-12' } });
console.log('Found invoices:', invoices.length);




  const deliveryNotes = await this.dnModel.findAll({ where: { po_number }, include: ['items'] });
  if (!deliveryNotes.length) {
    return 'No delivery notes linked to this PO';
  }

  const prompt = `
    // You're a smart delivery audit assistant.

I have one purchase order (PO) and several related delivery notes.

I need you to check the following stages in order and report the result for each stage:

Stage 1: Verify that all delivery notes have the same supplier and purchase order number as the PO.

Stage 2: Verify that the total for all items across all delivery notes exactly matches the items in the purchase order (same item names + same quantities).

Report any missing items or discrepancies.

🔍 Return the result in the following format **only as valid JSON**:

{
"stage1": { "pass": true/false, "notes": ["..."] },
"stage2": { "pass": true/false, "notes": ["..."] },
"overall": "Passed" or "Failed at stage X"
}

Here is the data:

Purchase Order:
${JSON.stringify(po, null, 2)}

Delivery Notes:
${JSON.stringify(deliveryNotes, null, 2)}
`;

  
    const chatCompletion = await this.client.chat.completions.create({
      model: 'MiniMaxAI/MiniMax-M2:novita',
      messages: [{ role: 'user', content: prompt }],
    });

//     return chatCompletion.choices[0].message.content ?? '';
//   } catch (err: any) {
//     console.error(err.response?.data || err.message);
//     throw new InternalServerErrorException('Delivery Notes comparison failed');
//   }

 let aiResponse = chatCompletion.choices[0].message.content ?? '';

    // 1️⃣ حل JSON من الـAI
    const firstBrace = aiResponse.indexOf('{');
    const lastBrace = aiResponse.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) {
      throw new InternalServerErrorException('AI response is not valid JSON');
    }
    aiResponse = aiResponse.slice(firstBrace, lastBrace + 1);

    // 🔹 تحويل الـ AI response إلى JSON
    const result = JSON.parse(aiResponse);
    

    // 2️⃣ تحديد هل كل المراحل نجحت
    const allPassed = result.stage1.pass && result.stage2.pass;

    // 3️⃣ تحديث العمود is_verified لكل الفواتير المرتبطة بالـPO
    for (const dn of deliveryNotes) {
    dn.is_verified = allPassed;
    dn.status = allPassed? 'Verified': 'Rejected';
    await dn.save();
  }

  // 4️⃣ ترجع نفس النتيجة للفرونت
    return aiResponse;

  } catch (err: any) {
    console.error(err.response?.data || err.message);
    throw new InternalServerErrorException('Invoice comparison failed');
  }
}


async compareGR(po_number: string): Promise<string> {

  const po = await this.poModel.findOne({ where: { po_number }, include: ['items', 'supplier'] });
  if (!po) throw new NotFoundException('Purchase Order not found');

  const goodsReceipts = await this.grModel.findAll({ where: { po_number }, include: ['items'] });
  if (!goodsReceipts.length) {
    return 'No goods receipts linked to this PO';
  }

  const prompt = `
    // You're a smart goods receipt audit assistant.

I have one purchase order (PO) and several related goods receipts.

I need you to check the following stages in order and report the result for each stage:

Stage 1: Verify that all goods receipts have the same purchase order number as the PO.

Stage 2: Verify that the total for all items across all goods receipts exactly matches the items in the purchase order (same item  + same quantities).

Verify that the items were received correctly (check total quantities, allow for minor name differences, e.g., "Bread" vs "bread").

Report any missing items or discrepancies.

🔍 Return the result in the following format **only as valid JSON**:

{
"stage1": { "pass": true/false, "notes": ["..."] },
"stage2": { "pass": true/false, "notes": ["..."] },
"overall": "Passed" or "Failed at stage X"
}

Here is the data:

Purchase Order:
${JSON.stringify(po, null, 2)}

Goods Receipts:
${JSON.stringify(goodsReceipts, null, 2)}
`;

  try {
    const chatCompletion = await this.client.chat.completions.create({
      model: 'MiniMaxAI/MiniMax-M2:novita',
      messages: [{ role: 'user', content: prompt }],
    });

    return chatCompletion.choices[0].message.content ?? '';
  } catch (err: any) {
    console.error(err.response?.data || err.message);
    throw new InternalServerErrorException('Goods Receipts comparison failed');
  }
}


}
