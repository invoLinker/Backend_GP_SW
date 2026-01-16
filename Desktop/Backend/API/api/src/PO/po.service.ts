import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { PurchaseOrder } from './po.model';
import { PurchaseOrderItem } from './PoItem.model';
import { CreatePurchaseOrderDto } from './CreatePurchaseOrderDto';
import { CreatePurchaseOrderItemDto } from './CreatePurchaseOrderItemDto';
import { Item } from 'src/Item/item.model';
import { Supplier } from 'src/Suppliers/supplier.model';
import { Op, where } from 'sequelize';
import { EditRequest } from 'src/edit_requests/edit_requests.model';
import { PaymentMethod } from 'src/supplier-invoices/SupplierInvoiceDto';
import { NotificationService } from 'src/Notification/notification.service';
import {NotificationCategory, NotificationChannel} from '../Notification/create-notification.dto'
import { User } from 'src/users/users.model'
import { Role } from 'src/roles/roles.model';
import { text } from 'stream/consumers';
import { EditRequestService } from 'src/edit_requests/edit-request.service';
import * as nodemailer from 'nodemailer';
import { SupplierInvoice } from 'src/supplier-invoices/supplier-invoice.model';
import { DeliveryNote } from 'src/DeliveryNote/delivery-note.model';
import { GoodsReceipts } from 'src/GoodsReceipt/GoodsReceipt.model';
import { SupplierInvoiceItem } from 'src/supplier-invoices/supplier-invoice-item.model';
import { GoodsReceiptItem } from 'src/GoodsReceipt/GoodsReceiptItem.model';
import { DeliveryNoteItem } from 'src/DeliveryNote/delivery-note-item.model';
import { Task } from 'src/Task/task.model';

@Injectable()
export class PurchaseOrderService {
  constructor(
    @InjectModel(PurchaseOrder)
    private readonly poModel: typeof PurchaseOrder,

    @InjectModel(PurchaseOrderItem)
    private readonly itemModel: typeof PurchaseOrderItem,

    @InjectModel(EditRequest)
    private readonly editRequestModel: typeof EditRequest,

    @InjectModel(User)
    private readonly userModel: typeof User,

    @InjectModel(Supplier)
    private readonly supplierModel: typeof Supplier,

    private readonly editRequestService: EditRequestService,
    
    private readonly notificationService: NotificationService
  ) {}

async create(createPoDto: CreatePurchaseOrderDto, createdBy: number): Promise<PurchaseOrder> {
  const transaction = await this.poModel.sequelize!.transaction();

  let po: PurchaseOrder;

    if (!createPoDto.supplier_email) {
    throw new BadRequestException('Supplier email is required');
    }

   console.log('Supplier email from DTO:', createPoDto.supplier_email);

  const supplierUser = await this.userModel.findOne({
    where: { email: createPoDto.supplier_email },
  });

  console.log('Found supplier user:', supplierUser);

  if (!supplierUser) {
    throw new BadRequestException(`Supplier with email "${createPoDto.supplier_email}" does not exist.`);
  }

    const supplier = await this.supplierModel.findOne({
      where: { user_id: supplierUser.user_id },
    });

    if (!supplier) {
      throw new BadRequestException(`No supplier record linked to user "${createPoDto.supplier_email}"`);
    }

    const subtotal = createPoDto.subtotal;
    const vat = createPoDto.vat;
    const total_amount = createPoDto.total_amount;


    const lastPo = await this.poModel.findOne({
      order: [['po_id', 'DESC']],
      transaction,
    });

    const lastNumber = lastPo ? parseInt(lastPo.po_number.split('-')[1]) : 0;
    const po_number = `PO-${lastNumber + 1}`;

    po = await this.poModel.create(
      {
        text:createPoDto.text,
        supplier_id: supplier.supplier_id,
        order_date: createPoDto.order_date ? new Date(createPoDto.order_date) : new Date(),
        subtotal,
        vat,
        note: createPoDto.note,
        total_amount,
        status: createPoDto.status || 'Pending',
        currency: createPoDto.currency,
        payment_method: createPoDto.payment_method,
        po_number,
        company_name: createPoDto.company_name,
        company_email: createPoDto.company_email,
        company_phone: createPoDto.company_phone,
        company_address: createPoDto.company_address,
        supplier_email: createPoDto.supplier_email,
        supplier_phone: createPoDto.supplier_phone,
        supplier_address: createPoDto.supplier_address,
        created_by: createdBy
      } as any,
      { transaction },
    );

    for (const itemDto of createPoDto.items || []) {
      const isArabic = /[\u0600-\u06FF]/.test(itemDto.item_name);

const prefix = isArabic
  ? 'AR'
  : itemDto.item_name.substring(0, 2).toUpperCase();

    
      await this.itemModel.create(
        {
          po_id: po.po_id,
          item_name: itemDto.item_name,
          // barcode: `${itemDto.item_name.substring(0,2).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
          barcode: `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`,
          quantity: itemDto.quantity,
          unit: itemDto.unit,
          unit_price: itemDto.unit_price,
        } as any,
        { transaction },
      );
    }

    await transaction.commit(); 

    try {   

    const creator = await this.userModel.findByPk(createdBy, { include: [Role] });
    let recipients: User[] = [];

    if (creator && creator.role.role_name === 'Admin') {
      const accountantRole = await Role.findOne({ where: { role_name: 'Accountant' } });
      recipients = await this.userModel.findAll({ where: { role_id: accountantRole!.role_id } });
    } else {
      const roles = await Role.findAll({ where: { role_name: 'Admin' } });
      const roleIds = roles.map(r => r.role_id); 
      recipients = await this.userModel.findAll({ where: { role_id: roleIds } });
    }

    const x= await this.userModel.findByPk(createdBy);
    for (const admin of recipients) {
      await this.notificationService.sendNotification({
        title: 'New Purchase Order Created',
        message: `PO with #${po.po_number} has been created by ${x?.first_name} ${x?.last_name}.`,
        userId: admin.user_id.toString(),
        channel: NotificationChannel.IN_APP,
        category: NotificationCategory.SYSTEM,
        payload: {},
      });

      // await this.notificationService.sendNotification({
      //   title: 'New Purchase Order Created',
      //   message: `PO ${po.po_number} has been created by ${po.company_name}.`,
      //   userId: admin.user_id.toString(),
      //   channel: NotificationChannel.PUSH,
      //   category: NotificationCategory.SYSTEM,
      //   payload: {},
      // });
    }

  } catch (notifErr) {
    console.error("Notification error:", notifErr);
  }

  const savedPo = await this.poModel.findByPk(po.po_id, {
    include: [{ model: PurchaseOrderItem, as: 'items' }],
  });

  return savedPo!;
}


async findAll(): Promise<PurchaseOrder[]> {
    return this.poModel.findAll({
      include: [{ model: PurchaseOrderItem, as: 'items' }],
      order: [['po_id', 'DESC']], 
    });
  }

  async findOne(id: number): Promise<PurchaseOrder> {
      console.log("🔥 findOne() received ID:", id);

    const po = await this.poModel.findByPk(id, {
      include: [{ model: PurchaseOrderItem, as: 'items' }],
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with not found`);
    }

    return po;
  }

  async findByPONumber(id: string): Promise<PurchaseOrder> {
    const po = await this.poModel.findOne({
    where: { po_number: id },
    include: [
      {
        model: PurchaseOrderItem,
        as: "items",
      },
    ],
  });

    if (!po) {
      throw new NotFoundException(`Purchase Order with PO-Number ${id} not found`);
    }

    return po;
  }


  async findBySupplier(supplierId: number): Promise<PurchaseOrder[]> {
    const pos = await this.poModel.findAll({
      where: { supplier_id: supplierId },
      include: [{ model: PurchaseOrderItem, as: 'items' }],
    });

    if (!pos || pos.length === 0) {
      throw new NotFoundException(`No Purchase Orders found for supplier ${supplierId}`);
    }

    return pos;
  }

  async findByStatus(status: 'Pending'| 'Closed'| 'Rejected' | 'Approved'| 'Sent' |'Incident'|'ReadyForPaid'): Promise<PurchaseOrder[]> {
    const pos = await this.poModel.findAll({
      where: { status },
      include: [{ model: PurchaseOrderItem, as: 'items' }],
    });

    if (!pos || pos.length === 0) {
      throw new NotFoundException(`No Purchase Orders found with status ${status}`);
    }

    return pos;
  }

  async update(
    po_number: string,
    updateDto: Partial<CreatePurchaseOrderDto>,
    userId: number,
    userRole: string
  ) {
  const transaction = await this.poModel.sequelize!.transaction();

    const po = await this.poModel.findOne({
    where: { po_number },
    transaction,
    include: [{ model: PurchaseOrderItem, as: 'items' }],
    });


    if (!po) throw new NotFoundException(`Purchase Order with #${po_number} not found`);

    const blockedStatuses = ['Sent', 'Closed', 'Rejected' , 'Incident', 'ReadyForPaid'];
    if (blockedStatuses.includes(po.status)) {
      throw new BadRequestException(`Cannot modify Purchase Order in status "${po.status}".`);
    }

    const isAdmin = userRole === 'Admin';

    const adminRole = await Role.findOne({ where: { role_name: 'Admin' } });
    const admins = await this.userModel.findAll({ where: { role_id: adminRole!.role_id } });

    // ============================================================
    // 1) إذا المستخدم ليس أدمن → إنشاء Edit Request فقط
    // ============================================================
    if (!isAdmin) {
      await this.editRequestModel.create({
        invoice_id: po.po_id,
        user_id: userId,
        message: `User requests to update PO fields: ${JSON.stringify(updateDto)}`,
        status: 'pending',
        is_edit: false
      } as any, { transaction });

      for (const admin of admins) {
        await this.notificationService.sendNotification({
          title: 'Edit Request Submitted',
          message: `A PO update request was submitted for PO ${po.po_number}.`,
          userId: admin.user_id.toString(),
          channel: NotificationChannel.IN_APP,
          category: NotificationCategory.SYSTEM,
          payload: { poId: po.po_id }
        });
      }

      await transaction.commit();
      return { message: 'Edit request submitted to admin' };
    }

    // ============================================================
    // 2) إذا المستخدم Admin → طبّق التعديلات مباشرة
    // ============================================================
    await this.applyPoUpdate(po, updateDto, transaction);

    await transaction.commit();
    return await this.poModel.findByPk(po.po_id, {
      include: [{ model: PurchaseOrderItem, as: 'items' }],
    });

}



// public async applyPoUpdate(
//   po: PurchaseOrder,
//   updateDto: Partial<CreatePurchaseOrderDto>,
//   transaction: any
// ) {
//   if (updateDto.supplier_email) {
//     const supplierUser = await User.findOne({
//       where: { email: updateDto.supplier_email },
//       // transaction,
//     });
//     if (!supplierUser) {
//       throw new BadRequestException(`Supplier with email "${updateDto.supplier_email}" does not exist.`);
//     }

//     const supplier = await Supplier.findOne({
//       where: { user_id: supplierUser.user_id },
//       // transaction,
//     });
//     if (!supplier) {
//       throw new BadRequestException(`This Supplier with email ${updateDto.supplier_email} not found`);
//     }

//     po.supplier_id = supplier.supplier_id;
//     po.supplier_email = updateDto.supplier_email;
//   }

//   Object.assign(po, {
//     supplier_phone: updateDto.supplier_phone ?? po.supplier_phone,
//     supplier_address: updateDto.supplier_address ?? po.supplier_address,
//     text: updateDto.text ?? po.text,
//     company_name: updateDto.company_name ?? po.company_name,
//     company_email: updateDto.company_email ?? po.company_email,
//     company_phone: updateDto.company_phone ?? po.company_phone,
//     company_address: updateDto.company_address ?? po.company_address,
//     currency: updateDto.currency ?? po.currency,
//     status: updateDto.status ?? po.status,
//     payment_method: updateDto.payment_method ?? po.payment_method,
//   });

//   if (updateDto.order_date) {
//     po.order_date = new Date(updateDto.order_date);
//   }

//   // items
//   if (updateDto.items) {
//     await PurchaseOrderItem.destroy({ where: { po_id: po.po_id } });

//     for (const item of updateDto.items) {
//       await PurchaseOrderItem.create(
//         {
//           po_id: po.po_id,
//           item_name: item.item_name,
//           barcode: item.barcode,
//           quantity: item.quantity,
//           unit: item.unit,
//           unit_price: item.unit_price,
//         } as any,
//         // { transaction }
//       );
//     }
//   }

//   // recalc
//   const items = updateDto.items ?? po.items;
//   po.subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
//   po.vat = po.subtotal * 0.16;
//   po.total_amount = po.subtotal + po.vat;

//   await po.save({ transaction });
  
// }

public async applyPoUpdate(
  po: PurchaseOrder,
  updateDto: Partial<CreatePurchaseOrderDto>,
  transaction: any
) {
  /* ================= SUPPLIER ================= */
  if (updateDto.supplier_email) {
    const supplierUser = await User.findOne({
      where: { email: updateDto.supplier_email },
    });

    if (!supplierUser) {
      throw new BadRequestException(
        `Supplier with email "${updateDto.supplier_email}" does not exist.`
      );
    }

    const supplier = await Supplier.findOne({
      where: { user_id: supplierUser.user_id },
    });

    if (!supplier) {
      throw new BadRequestException(
        `This Supplier with email ${updateDto.supplier_email} not found`
      );
    }

    po.supplier_id = supplier.supplier_id;
    po.supplier_email = updateDto.supplier_email;
  }

  /* ================= BASIC FIELDS ================= */
  Object.assign(po, {
    supplier_phone: updateDto.supplier_phone ?? po.supplier_phone,
    supplier_address: updateDto.supplier_address ?? po.supplier_address,
    text: updateDto.text ?? po.text,
    company_name: updateDto.company_name ?? po.company_name,
    company_email: updateDto.company_email ?? po.company_email,
    company_phone: updateDto.company_phone ?? po.company_phone,
    company_address: updateDto.company_address ?? po.company_address,
    currency: updateDto.currency ?? po.currency,
    status: updateDto.status ?? po.status,
    payment_method: updateDto.payment_method ?? po.payment_method,
  });

  if (updateDto.order_date) {
    po.order_date = new Date(updateDto.order_date);
  }

  /* ================= ITEMS ================= */
  let itemsForTotals: Array<{ quantity: number; unit_price: number }> | null = null;

  if (Array.isArray(updateDto.items)) {
    // حذف العناصر القديمة
    await PurchaseOrderItem.destroy({
      where: { po_id: po.po_id },
      transaction,
    });

    // إضافة العناصر الجديدة
    for (const item of updateDto.items) {
      await PurchaseOrderItem.create(
        {
          po_id: po.po_id,
          item_name: item.item_name,
          barcode: item.barcode,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
        } as any,
        { transaction }
      );
    }

    itemsForTotals = updateDto.items;
  }

  /* ================= TOTALS ================= */
  if (itemsForTotals) {
    po.subtotal = itemsForTotals.reduce(
      (sum, i) => sum + i.quantity * i.unit_price,
      0
    );

    po.vat = po.subtotal * 0.16;
    po.total_amount = po.subtotal + po.vat;
  }

  await po.save({ transaction });
}




async deleteById(poNumber: string): Promise<{ message: string }> {
  const transaction = await this.poModel.sequelize!.transaction();

  try {
    // 1) احضار الفاتورة
    const po = await this.poModel.findOne({
      where: { po_number: poNumber },
      transaction
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with #${poNumber} not found`);
    }

    // 2) منع الحذف في حالات معينة
    const blockedStatuses = ['Sent', 'Closed', 'Approved', 'ReadyForPaid'];
    if (blockedStatuses.includes(po.status)) {
      throw new BadRequestException(
        `Cannot delete Purchase Order with status "${po.status}".`
      );
    }

    // 3) حذف Items (لا يعمل Cascade عادة)
    await this.itemModel.destroy({
      where: { po_id: po.po_id },
      transaction
    });

    // 4) حذف الـ PO
    //    وهنا MySQL سوف يحذف Edit Requests تلقائياً بسبب ON DELETE CASCADE
    await po.destroy({ transaction });

    await transaction.commit();
    return { message: `Purchase Order with #${poNumber} deleted successfully` };

  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting Purchase Order:', error);

    if (error instanceof BadRequestException || error instanceof NotFoundException) {
      throw error;
    }

    throw new InternalServerErrorException('Failed to delete Purchase Order');
  }
}



async deleteAll(): Promise<{ message: string }> {
  const transaction = await this.poModel.sequelize!.transaction();

  try {
    const allPOs = await this.poModel.findAll({ transaction });

    if (!allPOs.length) {
      await transaction.rollback();
      return { message: 'No Purchase Orders found' };
    }

    const blockedStatuses = ['Sent', 'Closed', 'Rejected', 'Approved', 'Paid'];

    await Promise.all(
      allPOs.map(async (po) => {
        if (!blockedStatuses.includes(po.status)) {
          await this.itemModel.destroy({ where: { po_id: po.po_id }, transaction });
          await po.destroy({ transaction });
        }
      })
    );

    await transaction.commit();
    return { message: 'Allowed Purchase Orders deleted successfully' };
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting all Purchase Orders:', error);
    throw new InternalServerErrorException('Failed to delete all Purchase Orders');
  }
}

async deleteBySupplierId(supplierId: number): Promise<{ message: string }> {
  const transaction = await this.poModel.sequelize!.transaction();
  try {
    const pos = await this.poModel.findAll({ where: { supplier_id: supplierId }, transaction });
    if (!pos.length) return { message: `No Purchase Orders found for Supplier ID ${supplierId}` };

    const blockedStatuses = ['Sent', 'Closed', 'Approved'];

    await Promise.all(
      pos.map(async (po) => {
        if (!blockedStatuses.includes(po.status)) {
          await this.itemModel.destroy({ where: { po_id: po.po_id }, transaction });
          await po.destroy({ transaction });
        }
      })
    );

    await transaction.commit();
    return { message: `Allowed Purchase Orders for Supplier ID ${supplierId} deleted successfully` };
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting Purchase Orders by supplier:', error);
    throw new InternalServerErrorException('Failed to delete Purchase Orders by supplier');
  }
}

async deleteByStatus(status: string): Promise<{ message: string }> {
  const transaction = await this.poModel.sequelize!.transaction();
  try {
    const pos = await this.poModel.findAll({ where: { status }, transaction });
    if (!pos.length) return { message: `No Purchase Orders found with status "${status}"` };

    const blockedStatuses = ['Sent', 'Closed', 'Approved'];

    await Promise.all(
      pos.map(async (po) => {
        if (!blockedStatuses.includes(po.status)) {
          await this.itemModel.destroy({ where: { po_id: po.po_id }, transaction });
          await po.destroy({ transaction });
        }
      })
    );

    await transaction.commit();
    return { message: `Allowed Purchase Orders with status "${status}" deleted successfully` };
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting Purchase Orders by status:', error);
    throw new InternalServerErrorException('Failed to delete Purchase Orders by status');
  }
}

async saveFilePath(po_number: string, filePath: string) {
  const po = await this.poModel.findOne({ where: { po_number } });

  if (!po) {
    throw new NotFoundException(`Purchase Order ${po_number} not found`);
  }

  const extension = filePath.split('.').pop()?.toLowerCase();

  if (!extension) {
    throw new BadRequestException('Cannot detect file type');
  }

  let response: any = { message: '' };

  if (extension === 'pdf') {
    po.pdfUrl = filePath;
    response = {
      message: 'PDF uploaded successfully',
      pathPdf: filePath,
    };
  }

  else if (extension === 'xlsx' || extension === 'xls') {
    po.excelUrl = filePath;
    response = {
      message: 'Excel uploaded successfully',
      pathExcel: filePath,
    };
  }

  else if (extension === 'csv' ) {
    po.csvUrl = filePath;
    response = {
      message: 'CSV uploaded successfully',
      pathCsv: filePath,
    };
  }

  else {
    throw new BadRequestException(
      `Unsupported file type ".${extension}". Only PDF, Excel or CSV are allowed.`
    );
  }


  await po.save();

  const creator = await this.userModel.findByPk(po.created_by, {
    include: [Role],
  });

  if (creator?.role?.role_name === 'Admin') {

    await this.sendPoEmailToSupplier(po);

    po.status = 'Sent';
    await po.save();

    await this.notificationService.sendNotification({
      title: '📤 PO Sent',
      message: `Purchase Order ${po.po_number} has been sent to the supplier.`,
      userId: po.created_by.toString(),
      channel: NotificationChannel.IN_APP,
      category: NotificationCategory.SYSTEM,
      payload: { po_number: po.po_number },
    });
  }

  return response;
}



async getFile(po_number: string, type: 'pdf' | 'excel' | 'csv') {
  const po = await this.poModel.findOne({
    where: { po_number },
  });

  if (!po) {
    throw new NotFoundException(`Purchase Order with number ${po_number} not found`);
  }

  if (type === 'pdf') {
    if (!po.pdfUrl) {
      throw new NotFoundException(`PDF file not found for PO ${po_number}`);
    }
    return { pathPdf: po.pdfUrl };
  }

  if (type === 'csv') {
    if (!po.csvUrl) {
      throw new NotFoundException(`CSV file not found for PO ${po_number}`);
    }
    return { pathCsv: po.csvUrl };
  }

  if (type === 'excel') {
    if (!po.excelUrl) {
      throw new NotFoundException(`Excel file not found for PO ${po_number}`);
    }
    return { pathExcel: po.excelUrl };
  }

  throw new BadRequestException('Invalid type. Must be "pdf", "excel" or "csv" ');
}



async getPendingApprovals() {
  const accountantRole = await Role.findOne({
    where: { role_name: 'Accountant' }
  });

  if (!accountantRole) {
    throw new Error('Accountant role not found');
  }

  const accountants = await this.userModel.findAll({
    where: { role_id: accountantRole.role_id }
  });

  const accountantIds = accountants.map(acc => acc.user_id);

  const accountantPOs = await this.poModel.findAll({
    where: {
      created_by: accountantIds,
      status: 'Pending'
    },
    include: [{ model: PurchaseOrderItem, as: 'items' }]
  });

  const mappedPOs = await Promise.all(
  accountantPOs.map(async (po) => {
    let pdfPath: string | null = null;
    let excelPath: string | null = null;
    let csvPath: string | null = null;

    try {
      const pdf = await this.getFile(po.po_number, 'pdf');
      pdfPath = pdf.pathPdf || null;
    } catch {}

    try {
      const excel = await this.getFile(po.po_number, 'excel');
      excelPath = excel.pathExcel || null;
    } catch {}

    try {
      const csv = await this.getFile(po.po_number, 'csv');
      csvPath = csv.pathCsv || null;
    } catch {}

    return {
      id: po.po_id,
      orderNo: po.po_number,
      date: po.order_date,
      status: po.status,
      type: 'Order',
      created_by: po.created_by,
      message: {
        file: {
          pathPdf: pdfPath,
          pathExcel: excelPath,
          pathCsv: csvPath,
        }
      }
    };
  })
);


  const editRequests = await this.editRequestModel.findAll({
    where: {
      status: 'pending',
      is_edit: false
    },
    include: [
      {
        model: this.poModel,
        as: 'invoice',
        attributes: ['po_number', 'order_date', 'status', 'po_id']
      }
    ]
  });

  const mappedEdits = editRequests.map(req => {
    let parsedMessage: any = {};

    try {
      const start = req.message.indexOf('{');
      if (start !== -1) {
        const jsonPart = req.message.slice(start);
        parsedMessage = JSON.parse(jsonPart);
      }
    } catch {
      parsedMessage = { raw: req.message };
    }

    return {
      id: req.id,
      orderNo: req.invoice?.po_number ?? 'Unknown',
      date: req.invoice?.order_date ?? req.createdAt,
      status: req.status,
      type: 'Edit Request',
      created_by: req.user_id,
      message: {
        "User wants to change": parsedMessage
      }
    };
  });

  return [...mappedPOs, ...mappedEdits];
}



async approveOrReject(body: { type: 'Order' | 'Edit Request', id: number, status: 'Approved' | 'Rejected' }) {

  const { type, id, status } = body;

  if (type === 'Order') {
  const po = await this.poModel.findByPk(id);
  if (!po) throw new NotFoundException(`PO with id ${id} not found`);

  if (status === 'Approved') {
    po.status = 'Approved';
    await po.save();

    // 📧 إرسال الإيميل فورًا
    await this.sendPoEmailToSupplier(po);

    // ⏱ بعد 5 دقائق: حوّلي الحالة + نوتيفيكيشن
    setTimeout(async () => {
      po.status = 'Sent';
      await po.save();

      const roles = ['Admin', 'Accountant'];
      for (const role of roles) {
        await this.notifyRole(
          role,
          '📤 PO Sent',
          `PO ${po.po_number} has been sent to the supplier.`
        );
      }
    }); 
  }

  if (status === 'Rejected') {
    po.status = 'Rejected';
    await po.save();
  }

  return {
    message: `Purchase Order ${status}`,
    status: po.status,
  };
}


  if (type === 'Edit Request') {
  const req = await this.editRequestModel.findByPk(id);
  if (!req) throw new NotFoundException(`Edit Request with id ${id} not found`);

  const updated = await this.editRequestService.update(id, {status});

  return { message: `Edit Request ${status}`, status: req.status };
}


  throw new BadRequestException('Invalid type');
}



async getItemBarName(poNumber: string, requestUser: number) {
  const po = await this.poModel.findOne({
    where: { po_number: poNumber },
    include: [
      {
        model: PurchaseOrderItem,
        as: 'items',
        attributes: ['item_name', 'barcode', 'quantity', 'unit_price', 'unit'],
      },
    ],
  });

  if (!po) {
    throw new NotFoundException(
      `Purchase Order with #${poNumber} not found`
    );
  }

  // 🔍 جيب اليوزر المرتبط بالـ supplier_email الموجود بالـ PO
  const supplierUser = await this.userModel.findOne({
    where: { email: po.supplier_email },
  });

  if (!supplierUser) {
    throw new BadRequestException(
      'Supplier linked to this Purchase Order does not exist'
    );
  }

  // 🔐 التحقق: اليوزر اللي عامل الريكويست لازم يكون نفس supplier
  if (supplierUser.user_id !== requestUser) {
    throw new BadRequestException(
      'You are not allowed to view items of this Purchase Order'
    );
  }

  return po.items.map(item => ({
    item_name: item.item_name,
    barcode: item.barcode,
    quantity: item.quantity,
    unit_price: item.unit_price,
    unit: item.unit,
  }));
}




 async getReadyForPaidInvoices() {
  const pos = await this.poModel.findAll({
    where: { status: ['ReadyForPaid', 'Partial_paid'] },
    include: [{ model: PurchaseOrderItem, as: 'items' }],
    order: [['createdAt', 'DESC']],
  });

  const enriched: any[] = []; // حل الخطأ

  for (const po of pos) {
    let supplierFullName: string | null = null;

    if (po.supplier_email) {
      const user = await this.userModel.findOne({
        where: { email: po.supplier_email },
        attributes: ['first_name', 'last_name'],
      });

      if (user) {
        supplierFullName = `${user.first_name} ${user.last_name}`;
      }
    }

    enriched.push({
      ...po.toJSON(),
      supplier_name: supplierFullName,
    });
  }

  return enriched;
}

async Ai() {
  return await this.poModel.findAll({
    where: { status: ['ReadyForPaid', 'Partial_paid', 'Closed'] },
    order: [['createdAt', 'DESC']],
  });

}


async getPurchaseOrderInv(po_number: string) {
  const po = await this.poModel.findOne({ where: { po_number } });

  if (!po) {
    throw new NotFoundException("PO Not Found");
  }

  // -------------------- Supplier Invoice + Items --------------------
  const si = await SupplierInvoice.findAll({
    where: { po_number },
    include: [
      {
        model: SupplierInvoiceItem,
        as: "items",
      },
    ],
  });

  // if (!si || si.length === 0) {
  //   throw new NotFoundException(`The PO with #${po_number} doesn't have a Supplier Invoice`);
  // }

  // -------------------- Delivery Note + Items --------------------
  const dn = await DeliveryNote.findAll({
    where: { po_number },
    include: [
      {
        model: DeliveryNoteItem,
        as: "items",
      },
    ],
  });

  // if (!dn || dn.length === 0) {
  //   throw new NotFoundException(`The PO with #${po_number} doesn't have a Delivery Note`);
  // }

  // -------------------- Goods Receipt + Items --------------------
  const gr = await GoodsReceipts.findAll({
    where: { po_number },
    include: [
      {
        model: GoodsReceiptItem,
        as: "items",
      },
    ],
  });

  // if (!gr || gr.length === 0) {
  //   throw new NotFoundException(`The PO with #${po_number} doesn't have a Goods Receipt`);
  // }

  return {
    supplier_invoices: si,
    delivery_notes: dn,
    good_receipts: gr,
  };
}


private async sendPoEmailToSupplier(po: PurchaseOrder) {
  if (!po.supplier_email) return;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const filePath = po.pdfUrl || po.excelUrl;
  if (!filePath) return;

  const message = `
Hello,

A Purchase Order (${po.po_number}) has been approved and sent to you.

Please find the attached document.

Regards,
InvoLinker Team
`;

  await transporter.sendMail({
    from: `"InvoLinker" <${process.env.EMAIL_USER}>`,
    to: po.supplier_email,
    subject: `Purchase Order ${po.po_number}`,
    text: message,
    attachments: [
      {
        filename: filePath.split('/').pop(),
        path: filePath,
      },
    ],
  });
}

private async notifyRole(roleName: string, title: string, message: string) {
  const users = await this.userModel.findAll({
    include: [{ model: Role, where: { role_name: roleName } }],
  });

  for (const user of users) {
    await this.notificationService.sendNotification({
      title,
      message,
      userId: user.user_id.toString(),
      channel: NotificationChannel.IN_APP,
      category: NotificationCategory.SYSTEM,
      payload: {},
    });
  }
}

async getStatusPo(full_name: string){
  const cleanName = full_name.trim();

  const poPend = await this.poModel.findAll({where: {status: 'Pending'}});
  
  const poVer = await this.poModel.findAll({where: {status: 'ReadyForPaid'}});

  const poInc = await this.poModel.findAll({where: {status: 'Incident'}});

  const task = await Task.findAll({where: {status: 'Completed',assignedTo: cleanName}});

  return{
    poPending:poPend.length,
    poVerified:poVer.length,
    poIncident:poInc.length,
    taskCompleted:task.length
  }

  
}


}