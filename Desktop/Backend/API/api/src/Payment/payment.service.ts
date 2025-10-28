import { Injectable, NotFoundException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { Payment } from './Payment.model';
import { SupplierInvoice } from '../supplier-invoices/supplier-invoice.model';
import { PaymentParser } from './Regex&Parser';
import { CreatePaymentDto } from './CreatePaymentDto';
import axios from 'axios';
import { Op } from 'sequelize';

@Injectable()
export class PaymentsService {

async createPayment(invoice_id: number, dto: CreatePaymentDto): Promise<Payment> {
  // 1️⃣ جلب الفاتورة
  const invoice = await SupplierInvoice.findByPk(invoice_id);
  if (!invoice) throw new NotFoundException(`Invoice with id ${invoice_id} not found`);

  if (invoice.status !== 'ReadyForPaid' && invoice.status !== 'Partial_paid') {
    throw new BadRequestException(`The invoice is not ready for payment, you must check it`);
  }


  // 2️⃣ جلب الدفعات السابقة
  const payments = await Payment.findAll({ where: { invoice_id } });
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.installment_amount), 0);

  if (totalPaid >= Number(invoice.total_amount)) {
    throw new BadRequestException('Invoice already fully paid');
  }

  // 3️⃣ تحليل الأقساط
  let installmentsData: { total_installments: number; installments: { amount: number; due_date: Date }[] } | null = null;
  if (invoice.notes) {
    installmentsData = PaymentParser.parseInstallments(invoice.notes, Number(invoice.total_amount));
  }

  // 4️⃣ تحديد الدفعة التالية
  let installmentAmount = Number(invoice.total_amount) - totalPaid;
  let paymentDate = new Date();

  if (installmentsData?.installments?.length) {
    const paidCount = payments.length;
    const nextInstallment = installmentsData.installments[paidCount];
    if (!nextInstallment) throw new BadRequestException('All installments are already paid');

    paymentDate = new Date(nextInstallment.due_date);

    if (new Date() < paymentDate) {
      throw new BadRequestException(`Next installment is due on ${paymentDate.toLocaleDateString()}`);
    }

    installmentAmount =
      nextInstallment.amount ||
      (Number(invoice.total_amount) - totalPaid) /
        (installmentsData.total_installments - paidCount);
  }

  // 5️⃣ حساب فرق العملة
  const invoiceCurrency = invoice.currency; // عملة الفاتورة الأصلية (مثلاً ILS)
  const payCurrency = dto.currency || invoiceCurrency;

  // سعر الصرف وقت الفاتورة
  const rateAtInvoice = await this.getExchangeRate(invoiceCurrency, payCurrency, invoice.createdAt);

  // سعر الصرف وقت الدفع
  const rateAtPayment = await this.getExchangeRate(invoiceCurrency, payCurrency, paymentDate);

  // 🔹 تحويل المبلغ حسب الاتجاه
  const amountPaid =
    invoiceCurrency === payCurrency
      ? installmentAmount
      : this.convertCurrency(installmentAmount, invoiceCurrency, payCurrency, rateAtPayment);

  // 🔹 نحسب المبلغ المعادل بعملة الفاتورة حتى نعرف الفرق
  const paidInInvoiceCurrency =
    invoiceCurrency === payCurrency
      ? amountPaid
      : this.convertCurrency(amountPaid, payCurrency, invoiceCurrency, 1 / rateAtInvoice);

  const currencyDifference = paidInInvoiceCurrency - installmentAmount;

  // 6️⃣ إنشاء الدفعة
  const remainingAmount = Math.max(Number(invoice.total_amount) - totalPaid - installmentAmount, 0);

  const payment = await Payment.create({
    curruncy:invoiceCurrency,
    invoice_id: invoice.invoice_id,
    payment_date: paymentDate,
    installment_amount: installmentAmount,
    amount_paid: amountPaid,
    currency_paid: payCurrency,
    remaining_amount: remainingAmount,
    payment_method: invoice.payment_method as any,
    notes: invoice.notes,
    payment_details: dto.payment_details,
    status: 'Pending',
    currency_difference: currencyDifference,
  } as any);

  // 7️⃣ تحديث حالة الفاتورة
  invoice.status = remainingAmount === 0 ? 'Paid' : 'Partial_paid';
  await invoice.save();

  return payment;
}

/**
 * 🔄 دالة ذكية لتحويل العملات (تقرر الضرب أو القسمة حسب الاتجاه)
 */
convertCurrency(amount: number, from: string, to: string, rate: number): number {
  if (from === to) return amount;
  // الـ API بيعطيك كم "to" مقابل 1 "from"
  // يعني دايمًا بنضرب
  return amount * rate;
}


/**
 * 🌍 جلب سعر الصرف من API لتاريخ معيّن
 */
async getExchangeRate(from: string, to: string, date: Date): Promise<number> {
  if(from === to)return 1;
  const formattedDate = date.toISOString().split('T')[0];
  const url = `https://api.exchangerate.host/convert?from=${from}&to=${to}&amount=1&date=${formattedDate}&access_key=a367fd47f3b2a2444739719f86c6bf4f`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.success || !data.info?.quote) {
    throw new BadRequestException('Currency conversion failed');
  }

  // ✅ نرجع السعر الحقيقي لعملة اليوم المحدد
  return data.info.quote;
}


 async updatePaymentStatus(payment_id: number, status: 'Completed' | 'Failed'):Promise<{ message: string }>  {
  const payment = await Payment.findByPk(payment_id);
  if (!payment) throw new NotFoundException(`Payment with id ${payment_id} not found`);

  if (payment.status === status) {
    throw new BadRequestException(`Payment is already ${status}`);
  }

  // 1️⃣ تغيير حالة الدفعة
  payment.status = status;
  await payment.save();

  // 2️⃣ تحديث حالة الفاتورة إذا كانت الدفعة Confirmed فقط
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

  // ✨ تحديث الحقول العامة
  if (dto.payment_method) payment.payment_method = dto.payment_method;
  if (dto.payment_details) payment.payment_details = dto.payment_details;
  if (dto.notes) payment.notes = dto.notes;

  // 🔄 التعامل مع العملة والمبلغ المدفوع
  const invoiceCurrency = invoice.currency;
  const payCurrency = dto.currency_paid || payment.currency_paid || invoiceCurrency;

  if (invoiceCurrency === payCurrency) {
    // نفس عملة الفاتورة → المبلغ = القسط، الفرق = 0
    payment.amount_paid = payment.installment_amount;
    payment.currency_difference = 0;
    payment.currency_paid = payCurrency;
  } else {
    // تحويل العملة
    const rateAtInvoice = await this.getExchangeRate(invoiceCurrency, payCurrency, invoice.createdAt);
    const rateAtUpdate = await this.getExchangeRate(invoiceCurrency, payCurrency, new Date());

    // المبلغ المدفوع بالعملة الجديدة
    const amountPaidInCurrency =
      dto.amount_paid !== undefined
        ? dto.amount_paid
        : this.convertCurrency(Number(payment.installment_amount), invoiceCurrency, payCurrency, rateAtUpdate);

    payment.amount_paid = amountPaidInCurrency;
    payment.currency_paid = payCurrency;

    // الفرق بين المبلغ المتوقع والقيمة المحوّلة
    payment.currency_difference = this.convertCurrency(amountPaidInCurrency, payCurrency, invoiceCurrency, 1 / rateAtInvoice) - Number(payment.installment_amount);
  }

  await payment.save();

  // 🔄 تحديث حالة الفاتورة بناءً على جميع الدفعات المكتملة
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

