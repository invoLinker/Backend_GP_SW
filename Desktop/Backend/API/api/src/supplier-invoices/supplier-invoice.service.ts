import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { SupplierInvoice } from './supplier-invoice.model';
import { SupplierInvoiceItem } from './supplier-invoice-item.model';
import { Supplier } from '../Suppliers/supplier.model';
import { PurchaseOrder } from '../PO/po.model';
import { InvoiceIncident } from '../InvoiceIncident/InvoiceIncident.model';
import { InvoiceIncidentItem } from 'src/InvoiceIncident/InvoiceIncidentItem';
import { CreateSupplierInvoiceDto } from './SupplierInvoiceDto';
import { Op } from 'sequelize';
import { User } from 'src/users/users.model';
import * as fs from 'fs';
import * as path from 'path';
import { promises } from 'dns';
import { NotificationService } from 'src/Notification/notification.service';
import {NotificationCategory, NotificationChannel} from '../Notification/create-notification.dto'
import { Role } from 'src/roles/roles.model';
import { PurchaseOrderItem } from 'src/PO/PoItem.model';

@Injectable()
export class SupplierInvoiceService {
constructor(
    @InjectModel(SupplierInvoice)
    private supplierInvoiceModel: typeof SupplierInvoice,
    @InjectModel(SupplierInvoiceItem)
    private supplierInvoiceItemModel: typeof SupplierInvoiceItem,
    @InjectModel(InvoiceIncident)
    private incidentModel: typeof InvoiceIncident,
    @InjectModel(InvoiceIncidentItem)
    private incidentItemModel: typeof InvoiceIncidentItem,
    @InjectModel(User)
    private userModel: typeof User,
    @InjectModel(Supplier)
    private supplierModel: typeof Supplier,

    private readonly notificationService: NotificationService

) {}

    async saveInvoiceImage( filePath: string, invoice_number: string,){
    const si = await this.supplierInvoiceModel.findOne({ where: { invoice_number: invoice_number } });

  if (!si) {
    throw new NotFoundException(`Supplier Invoice with #${invoice_number} not found`);
  }

  const extension = filePath.split('.').pop()?.toLowerCase();

  if (!extension) {
    throw new BadRequestException('Cannot detect file type');
  }

  let response: any = { message: '' };

  if (extension === 'pdf') {
    si.pdfUrl = filePath;
    response = {
      message: 'PDF uploaded successfully',
      pathPdf: filePath,
    };
  }

  else if (extension === 'xlsx' || extension === 'xls') {
    si.excelUrl = filePath;
    response = {
      message: 'Excel uploaded successfully',
      pathExcel: filePath,
    };
  }

  else {
    throw new BadRequestException(
      `Unsupported file type ".${extension}". Only PDF or Excel are allowed.`
    );
  }

  await si.save();

  return response;

    }

  
async createInvoice(dto: CreateSupplierInvoiceDto, createdBy: number, file?: Express.Multer.File) {
  const transaction = await this.supplierInvoiceModel.sequelize!.transaction();
  const errors: string[] = [];

  // ===============================
  // 1) supplier & PO validation
  // ===============================
  let supplier: Supplier | null = null;

  if (dto.supplier_email) {
    const supplierUser = await this.userModel.findOne({
      where: { email: dto.supplier_email },
      transaction,
    });

    if (!supplierUser) {
      errors.push(`Supplier with email ${dto.supplier_email} not found`);
    } else {
      supplier = await this.supplierModel.findOne({
        where: { user_id: supplierUser.user_id },
        transaction,
      });

      if (!supplier) {
        errors.push(`Supplier record linked to user ${dto.supplier_email} not found`);
      }
    }
  } else {
    errors.push("Supplier email missing");
  }

  let po: PurchaseOrder | null = null;
  if (dto.po_number) {
    po = await PurchaseOrder.findOne({ where: { po_number: dto.po_number }, transaction });
    if (!po) errors.push("Purchase order not found");
  } else {
    errors.push("PO number missing");
  }

  // ===============================
  // 2) If errors → create incident
  // ===============================
  if (errors.length > 0) {
    const incident = await this.incidentModel.create({
      ...dto,
      created_by: createdBy,
      supplier_id: supplier?.supplier_id ?? null,
      po_number: po ? dto.po_number : null,
      status: "Pending",
      incident_reason: errors.join("; "),
    } as any, { transaction });

    for (const item of dto.items) {
      await this.incidentItemModel.create({
        ...item,
        incident_id: incident.incident_id,
      } as any, { transaction });
    }

    await transaction.commit();
    return { message: "Invoice added to incidents", errors };
  }

  // ===============================
  // 3) Ensure invoice number unique
  // ===============================
  const existingInvoice = await this.supplierInvoiceModel.findOne({
    where: { invoice_number: dto.invoice_number },
    transaction,
  });

  if (existingInvoice) {
    await transaction.rollback();
    throw new BadRequestException(
      `Invoice with number ${dto.invoice_number} already exists`
    );
  }

  // ===============================
  // 4) Detect file type & assign path
  // ===============================
  let pdfUrl: string | null = null;
  let invoice_image: string | null = null;
  let excelUrl: string | null = null;

  if (file) {
    const extRaw = file.originalname.split(".").pop();
    if (!extRaw) {
      throw new BadRequestException("Cannot detect file type");
    }

    const ext = extRaw.toLowerCase();
    const filePath = `/uploads/supplier-invoices/${file.filename}`;

    if (ext === "pdf") {
      pdfUrl = filePath;
    } else if (["jpg", "jpeg", "png"].includes(ext)) {
      invoice_image = filePath;
    } else if (["xls", "xlsx"].includes(ext)) {
      excelUrl = filePath;
    } else {
      await transaction.rollback();
      throw new BadRequestException(`Unsupported file type .${ext}`);
    }
  }

  // ===============================
  // 5) Create Invoice
  // ===============================
  const invoice = await this.supplierInvoiceModel.create({
    invoice_number: dto.invoice_number,
    invoice_date: dto.invoice_date,
    received_date: dto.received_date,
    subtotal: dto.subtotal,
    vat: dto.vat,
    discount: dto.discount,
    total_amount: dto.total_amount,
    payment_method: dto.payment_method,
    notes: dto.notes,

    supplier_id: supplier?.supplier_id ?? null,
    supplier_name: dto.supplier_name ?? null,
    supplier_email: dto.supplier_email ?? null,
    supplier_phone: dto.supplier_phone ?? null,
    supplier_address: dto.supplier_address ?? null,

    to_name: dto.to_name ?? null,
    to_email: dto.to_email ?? null,
    to_phone: dto.to_phone ?? null,
    to_address: dto.to_address ?? null,

    currency: dto.currency,
    po_number: dto.po_number,
    created_by: createdBy,
    status: "Pending",
    is_verified: false,

    pdfUrl,
    invoice_image,
    excelUrl,
  } as any, { transaction });

  // ===============================
  // 6) Add items
  // ===============================
  for (const item of dto.items) {
    await this.supplierInvoiceItemModel.create({
      ...item,
      invoice_id: invoice.invoice_id,
    } as any, { transaction });
  }

  await transaction.commit();

  return {
    invoice,
    path: pdfUrl || invoice_image || excelUrl || null
  };
}

async updateInvoice(
  id: number,
  updateDto: CreateSupplierInvoiceDto,
  userId: number,
  file?: Express.Multer.File
) {
  const invoice = await this.supplierInvoiceModel.findByPk(id, {
    include: [{ model: this.supplierInvoiceItemModel, as: 'items' }],
  });

  if (!invoice) throw new NotFoundException('Invoice not found');

  if (updateDto.po_number) {
    const poExists = await PurchaseOrder.findOne({
      where: { po_number: updateDto.po_number },
    });

    if (!poExists) {
      throw new ConflictException(
        `PO Number "${updateDto.po_number}" does not exist`
      );
    }
  }

  const fieldsToClear = [
    'invoice_number', 'invoice_date', 'received_date', 'subtotal',
    'vat', 'discount', 'total_amount', 'payment_method', 'notes',
    'supplier_name', 'supplier_email', 'supplier_phone', 'supplier_address',
    'to_name', 'to_email', 'to_phone', 'to_address'
  ];

  for (const field of fieldsToClear) {
    invoice[field] = null;
  }

  await this.supplierInvoiceItemModel.destroy({
    where: { invoice_id: id },
  });

  Object.assign(invoice, updateDto);

  invoice.created_by = userId;

  if (file) {

    this.deleteIfExists(invoice.pdfUrl);
    this.deleteIfExists(invoice.imgUrl);
    this.deleteIfExists(invoice.excelUrl);

    const ext = file.originalname.split(".").pop()?.toLowerCase();
    const filePath = `/uploads/supplier-invoices/${file.filename}`;

    if (!ext) {
      throw new BadRequestException("Cannot detect file type");
    }

    if (ext === "pdf") {
      invoice.pdfUrl = filePath;
    } else if (["jpg", "jpeg", "png"].includes(ext)) {
      invoice.imgUrl = filePath;
    } else if (["xls", "xlsx"].includes(ext)) {
      invoice.excelUrl = filePath;
    } else {
      throw new BadRequestException(`Unsupported file type .${ext}`);
    }
  }

  await invoice.save();

  if (updateDto.items?.length) {
    for (const item of updateDto.items) {
      await this.supplierInvoiceItemModel.create({
        ...item,
        invoice_id: invoice.invoice_id,
      } as any);
    }
  }

  const adminRole = await Role.findOne({ where: { role_name: 'Admin' } });
  const admins = await this.userModel.findAll({ where: { role_id: adminRole!.role_id } });

  const updatedByUser = await this.userModel.findByPk(userId);
  const recipients = [...admins, ...(updatedByUser ? [updatedByUser] : [])];

  for (const user of recipients) {
    await this.notificationService.sendNotification({
      title: 'Supplier Invoice Updated',
      message: `Invoice ${invoice.invoice_number} has been updated.`,
      userId: user.user_id.toString(),
      channel: NotificationChannel.IN_APP,
      category: NotificationCategory.SYSTEM,
      payload: {
        invoiceId: invoice.invoice_id,
        updatedFields: JSON.parse(JSON.stringify(updateDto)),
      },
    });
  }

  return { message: 'Invoice fully replaced' };
}

 deleteIfExists(filePath: string | null) {
  if (filePath) {
    const fullPath = path.join(__dirname, `../../..${filePath}`);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }
}


  async getAllInvoices(search?: string) {
    const where: any = {};

    if (search) {
      where[Op.or] = [
        { invoice_number: { [Op.like]: `%${search}%` } },
        { supplier_name: { [Op.like]: `%${search}%` } },
        { supplier_email: { [Op.like]: `%${search}%` } },
        { payment_method: { [Op.like]: `%${search}%` } },
        { currency:       { [Op.like]: `%${search}%` } },
        { notes: { [Op.like]: `%${search}%` } },
      ];
    }

    const invoices = await this.supplierInvoiceModel.findAll({
      where,
      include: [{ model: this.supplierInvoiceItemModel, as: 'items' }],
      order: [['createdAt', 'DESC']],
    });

    return invoices;
  }

  async getAllInvoicesOrderedByDate() {
    const invoices = await this.supplierInvoiceModel.findAll({
      include: [{ model: this.supplierInvoiceItemModel, as: 'items' }],
      order: [['invoice_date', 'DESC']], 
    });

    return invoices;
  }

  async updateStatus(id: number, status: string) {
  const validStatuses = ['Pending','Verified','Approved','Rejected','Paid', 'Cancelled',
         'Pending Verification','On Hold','Received','Incident', 'Partial_paid','ReadyForPaid'];

  if (!validStatuses.includes(status)) {
    throw new BadRequestException(
      `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    );
  }

  const invoice = await this.supplierInvoiceModel.findByPk(id);
  if (!invoice) {
    throw new NotFoundException('Invoice not found');
  }

  invoice.status = status;
  await invoice.save();

  return { message: `Invoice status updated to ${status}`};
}

async deleteInvoiceById(id: number) {
  const invoice = await this.supplierInvoiceModel.findByPk(id);
  if (!invoice) throw new NotFoundException('Invoice not found');

  await this.supplierInvoiceItemModel.destroy({
    where: { invoice_id: id },
  });

  await invoice.destroy();

  return { message: 'Invoice deleted successfully' };
}

async getFile(invoice_number: string, type: 'pdf' | 'excel' | 'img') {
  const si = await this.supplierInvoiceModel.findOne({
    where: { invoice_number: invoice_number },
  });

  if (!si) {
    throw new NotFoundException(`Supplier invoice with number ${invoice_number} not found`);
  }

  if (type === 'pdf') {
    if (!si.pdfUrl) {
      throw new NotFoundException(`PDF file not found for Supplier invoice ${invoice_number}`);
    }
    return { pathPdf: si.pdfUrl };
  }

  if (type === 'excel') {
    if (!si.excelUrl) {
      throw new NotFoundException(`Excel file not found for Supplier invoice ${invoice_number}`);
    }
    return { pathExcel: si.excelUrl };
  }

  if (type === 'img') {
    if (!si.imgUrl) {
      throw new NotFoundException(`Image not found for Supplier invoice ${invoice_number}`);
    }
    return { pathImg: si.imgUrl };
  }

  throw new BadRequestException('Invalid type. Must be "pdf" or "excel".');
}
}
