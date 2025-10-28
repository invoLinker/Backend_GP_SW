import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { SupplierInvoice } from './supplier-invoice.model';
import { SupplierInvoiceItem } from './supplier-invoice-item.model';
import { Supplier } from '../Suppliers/supplier.model';
import { PurchaseOrder } from '../PO/po.model';
import { InvoiceIncident } from '../InvoiceIncident/InvoiceIncident.model';
import { InvoiceIncidentItem } from 'src/InvoiceIncident/InvoiceIncidentItem';
import { CreateSupplierInvoiceDto } from './SupplierInvoiceDto';
import { Op } from 'sequelize';

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
  ) {}

  async createInvoice(dto: CreateSupplierInvoiceDto, createdBy: number) {
  const transaction = await this.supplierInvoiceModel.sequelize!.transaction();
  const errors: string[] = [];

  try {
    let supplier: Supplier | null = null;
    if (dto.supplier_email) {
      supplier = await Supplier.findOne({ where: { contact_email: dto.supplier_email }, transaction });
      if (!supplier) errors.push('Supplier not found');
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

    if (!dto.invoice_number || dto.subtotal < 0 || dto.total_amount < 0) {
      errors.push('Invalid invoice data');
    }

    const validPayments = ['Cash', 'Bank Transfer', 'PayPal', 'Credit'];
    if (dto.payment_method && !validPayments.includes(dto.payment_method)) {
      errors.push('Invalid payment method');
    }

     const validCurrency = ['USD', 'ILS', 'JOD'];
    if (dto.currency && !validCurrency.includes(dto.currency)) {
      errors.push('Invalid currency ');
    }

    // إذا في أي مشكلة → إضافة الفاتورة والأيتيمز للـ Incident
    if (errors.length > 0) {
      const incident = await this.incidentModel.create({
        ...dto,
        created_by: createdBy,
        supplier_id: supplier?.supplier_id ?? null,
        po_number: po ? dto.po_number : null,
        status: 'Pending',
        incident_reason: errors.join('; '), // تجميع كل المشاكل مع بعض
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

    // كل شيء صحيح → إضافة الفاتورة و الايتيمز
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

}
