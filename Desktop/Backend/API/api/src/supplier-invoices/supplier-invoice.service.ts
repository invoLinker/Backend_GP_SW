import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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
) {}

    async createInvoice(dto: CreateSupplierInvoiceDto, createdBy: number) {
    const transaction = await this.supplierInvoiceModel.sequelize!.transaction();
    const errors: string[] = [];

    try {
        let supplier: Supplier | null = null;

        // ✅ الخطوة 1: نبحث عن اليوزر بالإيميل
        if (dto.supplier_email) {
        const supplierUser = await this.userModel.findOne({
            where: { email: dto.supplier_email },
            transaction,
        });

        if (!supplierUser) {
            errors.push(`Supplier with email ${dto.supplier_email} not found`);
        } else {
            // ✅ الخطوة 2: نجيب السّبلاير المرتبط بهذا اليوزر
            supplier = await this.supplierModel.findOne({
            where: { user_id: supplierUser.user_id },
            transaction,
            });

            if (!supplier) {
            errors.push(`Supplier record linked to user ${dto.supplier_email} not found`);
            }
        }
        } else {
        errors.push('Supplier email missing');
        }


        let po: PurchaseOrder | null = null;
        if (dto.po_number) {
        po = await PurchaseOrder.findOne({ where: { po_number: dto.po_number }, transaction });
        if (!po) errors.push('Purchase order not found');
        } else {
        errors.push('PO number missing');
        }

        if (errors.length > 0) {
        const incident = await this.incidentModel.create({
            ...dto,
            created_by: createdBy,
            supplier_id: supplier?.supplier_id ?? null,
            po_number: po ? dto.po_number : null,
            status: 'Pending',
            incident_reason: errors.join('; '), 
        } as any, { transaction });

        for (const item of dto.items) {
            await this.incidentItemModel.create({
            ...item,
            incident_id: incident.incident_id,
            }as any, { transaction });
        }

        await transaction.commit();
        return { message: 'Invoice added to incidents', errors };
        }

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
        supplier_name: dto.supplier_name, 
        supplier_email: dto.supplier_email,
        supplier_phone: dto.supplier_phone,
        supplier_address: dto.supplier_address,
        to_name: dto.to_name,
        to_email:dto.to_email,
        to_phone:dto.to_phone,
        to_address:dto.to_address,
        currency: dto.currency,
        po_number: dto.po_number,
        created_by: createdBy,
        status: 'Pending',
        is_verified: false,
        } as any, { transaction });

        for (const item of dto.items) {
        await this.supplierInvoiceItemModel.create({
            ...item,
            invoice_id: invoice.invoice_id,
        }as any, { transaction });
        }

        const invoiceWithItems = await this.supplierInvoiceModel.findOne({
        where: { invoice_id: invoice.invoice_id },
        include: [{ model: this.supplierInvoiceItemModel, as: 'items' }],
        transaction,
        });

        await transaction.commit();
        return invoiceWithItems;

    } catch (err) {
        await transaction.rollback();
        throw new InternalServerErrorException(err.message);
    }
    }

    async saveInvoiceImage( image: Express.Multer.File, Id: number,){
    const si = await this.supplierInvoiceModel.findByPk(Id);
    if (!si){
        throw new NotFoundException("Supplier invoice not found");
    }

    si.invoice_image = `/uploads/invoices/${image.filename}`; 
    await si.save();
    return "​✔️​ The image was uploaded successfully."

    }


async updateInvoice(
  id: number,
  updateDto: CreateSupplierInvoiceDto,
  userId: number
) {
  const invoice = await this.supplierInvoiceModel.findByPk(id, {
    include: [{ model: this.supplierInvoiceItemModel, as: 'items' }],
  });

  if (!invoice) throw new NotFoundException('Invoice not found');

  // 🟢 مسح كل القيم القديمة إذا ما أرسلت في DTO
  const fieldsToClear = [
    'invoice_number', 'invoice_date', 'received_date', 'subtotal',
    'vat', 'discount', 'total_amount', 'payment_method', 'notes',
    'supplier_name', 'supplier_email', 'supplier_phone', 'supplier_address',
    'to_name', 'to_email', 'to_phone', 'to_address', 'po_number'
  ];

  for (const field of fieldsToClear) {
    invoice[field] = null;
  }

  // 🟢 مسح الـ Items القديمة
  await this.supplierInvoiceItemModel.destroy({
    where: { invoice_id: id },
  });

  // 🟢 تعيين القيم الجديدة
  Object.assign(invoice, updateDto);

  // 🟢 تحديث الشخص اللي عدّل
  invoice.created_by = userId;

  await invoice.save();

  // 🟢 إنشاء الـ Items الجديدة
  if (updateDto.items && updateDto.items.length > 0) {
    for (const item of updateDto.items) {
      await this.supplierInvoiceItemModel.create({
        ...item,
        invoice_id: invoice.invoice_id,
      } as any);
    }
  }

  // 🟢 إعادة الفاتورة بعد التحديث
  const updatedInvoice = await this.supplierInvoiceModel.findByPk(id, {
    include: [{ model: this.supplierInvoiceItemModel, as: 'items' }],
  });

  return { message: 'Invoice fully replaced', invoice: updatedInvoice };
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

  async getInvoicesByStatus(status: string) {
    const invoices = await this.supplierInvoiceModel.findAll({
      where: { status },
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
  // نبحث عن الفاتورة أولاً
  const invoice = await this.supplierInvoiceModel.findByPk(id);
  if (!invoice) throw new NotFoundException('Invoice not found');

  // 🟢 حذف الـ Items المرتبطة بالفاتورة
  await this.supplierInvoiceItemModel.destroy({
    where: { invoice_id: id },
  });

  // 🟢 حذف الفاتورة نفسها
  await invoice.destroy();

  return { message: 'Invoice deleted successfully' };
}


}
