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
