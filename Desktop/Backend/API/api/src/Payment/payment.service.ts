import { Injectable, NotFoundException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { Payment } from './Payment.model';
import { SupplierInvoice } from '../supplier-invoices/supplier-invoice.model';
import { CreatePaymentDto } from './CreatePaymentDto';
import axios from 'axios';
import { Op } from 'sequelize';
import { GenerateTxtService } from '../GenerateTxt/GenerateTxt.Service';
import { PurchaseOrder } from 'src/PO/po.model';


@Injectable()
export class PaymentsService {
  constructor(private readonly hfService: GenerateTxtService) {}

async createPayment(po_id: number, dto: CreatePaymentDto): Promise<any[]> {
  // 1️⃣ جيب الـ PO
  const po = await PurchaseOrder.findByPk(po_id);
  if (!po) throw new NotFoundException(`Purchase Order not found`);

  // 2️⃣ جيب كل الفواتير التابعة له
  const invoices = await SupplierInvoice.findAll({ where: { po_number: po.po_number } });
  if (!invoices.length) throw new NotFoundException(`No invoices found for PO ${po.po_number}`);

  // 3️⃣ جيب كل الدفعات السابقة لهالفواتير
  const allPayments = await Payment.findAll({ where: { invoice_id: invoices.map(i => i.invoice_id) } });

  // ✅ إجمالي PO بعد الخصم والضريبة (موجود بالـ total_amount لكل فاتورة)
  const totalPOAmount = invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.installment_amount), 0);

  if (totalPaid >= totalPOAmount) {
    po.status = 'Closed';
    await po.save();
    throw new BadRequestException(`PO ${po.po_number} already fully paid`);
  }

  // 4️⃣ حضر بيانات التقسيط من الـ PO
  let installmentsData = po.installmentsData;
  if (!installmentsData) {
    const parsed = await this.hfService.parseInstallments(po.note!, totalPOAmount, po.createdAt);
    po.installmentsData = parsed;
    await po.save();
    installmentsData = parsed;
  }

  // 5️⃣ حدد الدفعة الجاية
  const paidInstallments = await Payment.findAll({
    where: { invoice_id: invoices.map(i => i.invoice_id) },
    attributes: ['payment_date'],
    group: ['payment_date'],
  });
  const paidCount = paidInstallments.length;
  const nextInstallment = installmentsData?.installments[paidCount];

  if (!nextInstallment) {
    po.status = 'Closed';
    await po.save();
    throw new BadRequestException(`All installments are already paid (total ${installmentsData?.total_installments})`);
  }

  const paymentDate = new Date(nextInstallment.due_date);
  let installmentAmount = nextInstallment.amount;

  // 🔥 إذا القسط الوحيد → ادفع كل PO
  if (installmentsData!.total_installments === 1) {
    installmentAmount = totalPOAmount;
  }

  // الدفع لسا ما موعده
  if (new Date() < paymentDate) {
    return [
      {
        message: `Next installment is due on ${paymentDate.toLocaleDateString()}`,
        status: 'Pending',
        nextInstallmentAmount: installmentAmount,
        nextInstallmentDate: paymentDate,
      },
    ];
  }

  // 6️⃣ وزع الدفعة على كل الفواتير
  const paymentsToCreate: Payment[] = [];

  for (const invoice of invoices) {
    let amountForInvoice: number;

    // إذا في قسط واحد → ادفع كل فاتورة بالكامل
    if (installmentsData!.total_installments === 1) {
      amountForInvoice = Number(invoice.total_amount);
    } else {
      const invoiceShare = Number(invoice.total_amount) / totalPOAmount;
      amountForInvoice = installmentAmount * invoiceShare;
    }

    const invoiceCurrency = invoice.currency;
    const payCurrency = dto.currency || invoiceCurrency;

    // احصل على سعر الصرف عند إنشاء الفاتورة وعند الدفع
    const rateAtInvoice = await this.getExchangeRate(invoiceCurrency, payCurrency, invoice.createdAt);
    const rateAtPayment = await this.getExchangeRate(invoiceCurrency, payCurrency, paymentDate);

    const amountPaid =
      invoiceCurrency === payCurrency
        ? amountForInvoice
        : this.convertCurrency(amountForInvoice, invoiceCurrency, payCurrency, rateAtPayment);

    const paidInInvoiceCurrency =
      invoiceCurrency === payCurrency
        ? amountPaid
        : this.convertCurrency(amountPaid, payCurrency, invoiceCurrency, 1 / rateAtInvoice);

    const currencyDifference = paidInInvoiceCurrency - amountForInvoice;

    // ✅ احسب كل الدفعات السابقة + الدفعة الحالية
    const previousPaid = allPayments
      .filter(p => p.invoice_id === invoice.invoice_id)
      .reduce((sum, p) => sum + Number(p.installment_amount), 0);

    const updatedTotalPaid = previousPaid + amountForInvoice;

    const remainingAmount = Math.max(Number(invoice.total_amount) - updatedTotalPaid, 0);

    const payment = await Payment.create({
      curruncy: invoiceCurrency,
      invoice_id: invoice.invoice_id,
      payment_date: paymentDate,
      installment_amount: amountForInvoice,
      amount_paid: amountPaid,
      currency_paid: payCurrency,
      remaining_amount: remainingAmount,
      payment_method: invoice.payment_method as any,
      notes: po.note,
      payment_details: dto.payment_details,
      status: 'Pending',
      currency_difference: currencyDifference,
    } as any);

    // ✅ حدّث حالة الفاتورة فوراً
    invoice.status = remainingAmount === 0 ? 'Paid' : 'Partial_paid';
    await invoice.save();

    paymentsToCreate.push(payment);
  }

  // 7️⃣ حدّث حالة الـ PO بعد كل الفواتير
  po.status = invoices.every(inv => inv.status === 'Paid') ? 'Closed' : 'ReadyForPaid';
  await po.save();

  return paymentsToCreate;
}


convertCurrency(amount: number, from: string, to: string, rate: number): number {
  if (from === to) return amount;

  return amount * rate;
}


async getExchangeRate(from: string, to: string, date: Date): Promise<number> {
  if(from === to)return 1;
  const formattedDate = date.toISOString().split('T')[0];
  const url = `https://api.exchangerate.host/convert?from=${from}&to=${to}&amount=1&date=${formattedDate}&access_key=a367fd47f3b2a2444739719f86c6bf4f`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.success || !data.info?.quote) {
    throw new BadRequestException('Currency conversion failed');
  }

  return data.info.quote;
}


 async updatePaymentStatus(payment_id: number, status: 'Completed' | 'Failed'):Promise<{ message: string }>  {
  const payment = await Payment.findByPk(payment_id);
  if (!payment) throw new NotFoundException(`Payment with id ${payment_id} not found`);

  if (payment.status === status) {
    throw new BadRequestException(`Payment is already ${status}`);
  }

  payment.status = status;
  await payment.save();

  if (status === 'Completed') {
    const invoice = await SupplierInvoice.findByPk(payment.invoice_id);
    if (!invoice) throw new NotFoundException(`Invoice with id ${payment.invoice_id} not found`);

    const payments = await Payment.findAll({ where: { invoice_id: invoice.invoice_id } });
    const totalConfirmed = payments
      .filter(p => p.status === 'Completed')
      .reduce((sum, p) => sum + Number(p.installment_amount), 0);

    if (totalConfirmed >= Number(invoice.total_amount)) {
      invoice.status = 'Paid';
    } else if (totalConfirmed > 0) {
      invoice.status = 'Partial_paid';
    } else {
      invoice.status = 'ReadyForPaid';
    }

    await invoice.save();
  }

  const message =
    status === 'Completed'
      ? '✅ Payment confirmed successfully.'
      : '⚠️ Payment marked as failed.';

  return { message };

}



async getInvoicePayments(invoice_id: number) {
    const payments = await Payment.findAll({ where: { invoice_id } });
    return payments.map(p => ({
      installment: p.installment_amount,
      status: p.status,
      date: p.payment_date,
      currency_paid: p.currency_paid,
    }));
  }

  async getPayment(payment_id: number) {
    const payment = await Payment.findByPk(payment_id);
    if (!payment) throw new NotFoundException('Payment not found');
    const inv_num= await SupplierInvoice.findByPk(payment.invoice_id);
    return {
      message: `Payment is currently ${payment.status}`,
      installment: payment.installment_amount,
      currency: payment.currency_paid,
      date: payment.payment_date,
      invoice:inv_num?.invoice_number
    };
  }

  async deletePayment(payment_id: number) {
    const payment = await Payment.findByPk(payment_id);
    if (!payment) throw new NotFoundException('Payment not found');
    if(payment.status === 'Completed'){
      throw new BadRequestException('❌​ You cant delete completed payment');
    }
    await payment.destroy();
    return { message: '🗑️ Payment deleted successfully.' };
  }

async updatePayment(payment_id: number, dto: {
  amount_paid?: number;
  currency_paid?: 'USD' | 'ILS' | 'JOD';
  payment_method?: 'Cash' | 'Bank Transfer' | 'PayPal' | 'Credit';
  payment_details?: any;
  notes?: string;
}) {
  const payment = await Payment.findByPk(payment_id);
  if (!payment) throw new NotFoundException('Payment not found');

  if (payment.status === 'Completed') {
    throw new BadRequestException('❌ You cannot update a completed payment');
  }

  const invoice = await SupplierInvoice.findByPk(payment.invoice_id);
  if (!invoice) throw new NotFoundException('Invoice not found');

  if (dto.payment_method) payment.payment_method = dto.payment_method;
  if (dto.payment_details) payment.payment_details = dto.payment_details;
  if (dto.notes) payment.notes = dto.notes;

  const invoiceCurrency = invoice.currency;
  const payCurrency = dto.currency_paid || payment.currency_paid || invoiceCurrency;

  if (invoiceCurrency === payCurrency) {
    payment.amount_paid = payment.installment_amount;
    payment.currency_difference = 0;
    payment.currency_paid = payCurrency;
  } else {
    const rateAtInvoice = await this.getExchangeRate(invoiceCurrency, payCurrency, invoice.createdAt);
    const rateAtUpdate = await this.getExchangeRate(invoiceCurrency, payCurrency, new Date());

    const amountPaidInCurrency =
      dto.amount_paid !== undefined
        ? dto.amount_paid
        : this.convertCurrency(Number(payment.installment_amount), invoiceCurrency, payCurrency, rateAtUpdate);

    payment.amount_paid = amountPaidInCurrency;
    payment.currency_paid = payCurrency;

    payment.currency_difference = this.convertCurrency(amountPaidInCurrency, payCurrency, invoiceCurrency, 1 / rateAtInvoice) - Number(payment.installment_amount);
  }

  await payment.save();

  const payments = await Payment.findAll({ where: { invoice_id: invoice.invoice_id } });
  const totalCompleted = payments
    .filter(p => p.status === 'Completed')
    .reduce((sum, p) => sum + Number(p.installment_amount), 0);

  if (totalCompleted >= Number(invoice.total_amount)) invoice.status = 'Paid';
  else if (totalCompleted > 0) invoice.status = 'Partial_paid';
  else invoice.status = 'ReadyForPaid';

  await invoice.save();

  return { message: '✅ Payment updated successfully with currency difference recalculated.' };
}




  async getInvoiceStatus(invoice_id: number) {
    const invoice = await SupplierInvoice.findByPk(invoice_id);
    if (!invoice) throw new NotFoundException('Invoice not found');

    const payments = await Payment.findAll({ where: { invoice_id } });
    const totalPaid = payments
      .filter(p => p.status === 'Completed')
      .reduce((sum, p) => sum + Number(p.installment_amount), 0);

    return {
      invoice_status: invoice.status,
      total_paid: totalPaid,
      remaining_amount: Number(invoice.total_amount) - totalPaid,
      installments: payments.map(p => ({ amount: p.installment_amount, status: p.status })),
    };
  }

async getPaymentsByStatus(status: 'Pending' | 'Completed' | 'Failed') {
  const payments = await Payment.findAll({
    where: { status },
    include: [
      {
        model: SupplierInvoice,
        as: 'invoice',
        attributes: ['invoice_number','total_amount','currency','status'],
      },
    ],
  });

  return payments.map(p => ({
    id: p.id,
    installment_amount: p.installment_amount,
    amount_paid: p.amount_paid,
    currency_paid: p.currency_paid,
    payment_method: p.payment_method,
    status: p.status,
    invoice_number: p.invoice?.invoice_number,
    invoice_status: p.invoice?.status,
    invoice_total: p.invoice?.total_amount,
    invoice_currency: p.invoice?.currency,
  }));
}


// async searchPayments(query: string): Promise<Payment[]> {
//  return Payment.findAll({
//     where: {
//       [Op.or]: [
//         { payment_method: { [Op.like]: `%${query}%` } },
//         { currency: { [Op.like]: `%${query}%` } },
//         { notes: { [Op.like]: `%${query}%` } },
//         { status: { [Op.like]: `%${query}%` } },
//         { payment_details: { [Op.like]: `%${query}%` } },
//       ],
//     },
//   });
// }

}

