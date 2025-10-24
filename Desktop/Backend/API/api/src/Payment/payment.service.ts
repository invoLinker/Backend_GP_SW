// payments.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Payment } from './Payment.model';
import { SupplierInvoice } from '../supplier-invoices/supplier-invoice.model';
import { HuggingFaceService } from '../AI/hugging.service'; // مثال على خدمة تحليل النصوص

@Injectable()
export class PaymentsService {
  constructor(private readonly HuggingFaceService: HuggingFaceService) {}

  async createPayment(invoice_id: number): Promise<Payment> {
    const invoice = await SupplierInvoice.findByPk(invoice_id);
    if (!invoice) throw new NotFoundException(`Invoice with id ${invoice_id} not found`);

    const payments = await Payment.findAll({ where: { invoice_id } });
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount_paid), 0);

    if (totalPaid >= Number(invoice.total_amount)) {
      throw new BadRequestException('Invoice already fully paid');
    }

    // -------------------------------
    // تحليل النص لاستخراج الأقساط
    // -------------------------------
    let installmentsData: any = null;
    if (invoice.notes) {
      installmentsData = await this.HuggingFaceService.extractInstallments(invoice.notes, Number(invoice.total_amount));
      // مثال للـ JSON المتوقع:
      // {
      //   total_installments: 3,
      //   installments: [
      //     { amount: null, due_date: '2025-10-18' },
      //     { amount: null, due_date: '2025-11-17' },
      //     { amount: null, due_date: '2025-12-17' }
      //   ]
      // }
    }

    let amountToPay = Number(invoice.total_amount) - totalPaid;

    if (installmentsData?.installments?.length) {
      const paidCount = payments.length; // عدد الأقساط المدفوعة
      const nextInstallment = installmentsData.installments[paidCount];

      if (nextInstallment) {
        // لو المبلغ موجود بالقسط استخدمه، إذا لا قسم المبلغ على الباقي من الأقساط
        const remainingInstallments = installmentsData.total_installments - paidCount;
        amountToPay = nextInstallment.amount
          ? Number(nextInstallment.amount)
          : (Number(invoice.total_amount) - totalPaid) / remainingInstallments;
      }
    }

    // -------------------------------
    // إنشاء دفعة جديدة
    // -------------------------------
    const payment = await Payment.create({
      invoice_id: invoice.invoice_id,
      payment_date: new Date(),
      amount_paid: amountToPay,
      remaining_amount: Number(invoice.total_amount) - (totalPaid + amountToPay),
      payment_method: invoice.payment_method as any,
      currency: invoice.currency || 'ILS',
      notes: invoice.notes,
    } as any);

    invoice.status = payment.remaining_amount === 0 ? 'Paid' : 'Partial';
    await invoice.save();

    return payment;
  }
}
