// import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
// import { Payment } from './Payment.model';
// import { SupplierInvoice } from '../supplier-invoices/supplier-invoice.model';
// import { PaymentParser } from './Regex&Parser';

// @Injectable()
// export class PaymentsService {
//   async createPayment(invoice_id: number): Promise<Payment> {
//     const invoice = await SupplierInvoice.findByPk(invoice_id);
//     if (!invoice) throw new NotFoundException(`Invoice with id ${invoice_id} not found`);

//     const payments = await Payment.findAll({ where: { invoice_id } });
//     const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount_paid), 0);

//     if (totalPaid >= Number(invoice.total_amount)) {
//       throw new BadRequestException('Invoice already fully paid');
//     }

//     // -------------------------------
//     // تحليل نص notes بالأقساط
//     // -------------------------------
//     let installmentsData: any = null;
//     if (invoice.notes) {
//       installmentsData = PaymentParser.parseInstallments(invoice.notes, Number(invoice.total_amount));
//       // expected installmentsData format:
//       // {
//       //   total_installments: 3,
//       //   installments: [
//       //     { amount: 50, due_in_days: 0 },
//       //     { amount: 50, due_in_days: 30 },
//       //     { amount: 50, due_in_days: 60 }
//       //   ]
//       // }
//     }

//     let amountToPay = Number(invoice.total_amount) - totalPaid;
//     let paymentDate = new Date(); // الافتراضي: اليوم

//     if (installmentsData?.installments?.length) {
//       const paidCount = payments.length;
//       const nextInstallment = installmentsData.installments[paidCount];

//       if (nextInstallment) {
//         amountToPay = nextInstallment.amount || amountToPay;

//         // تحديد تاريخ الدفع حسب الاتفاق
//         if (nextInstallment.due_in_days !== undefined) {
//           const lastPaymentDate = payments.length
//             ? new Date(payments[payments.length - 1].payment_date)
//             : new Date(); // لو مافي دفعات سابقة، استخدم اليوم
//           paymentDate = new Date(lastPaymentDate);
//           paymentDate.setDate(paymentDate.getDate() + nextInstallment.due_in_days);
//         } else if (nextInstallment.due_date) {
//           paymentDate = new Date(nextInstallment.due_date);
//         }
//       }
//     }

//     // -------------------------------
//     // إنشاء دفعة جديدة
//     // -------------------------------
//     let remaining_amount = Number(invoice.total_amount) - totalPaid - amountToPay;
//     if (remaining_amount <= 0) remaining_amount = 0.0;

//     const payment = await Payment.create({
//       invoice_id: invoice.invoice_id,
//       payment_date: paymentDate,
//       amount_paid: amountToPay,
//       remaining_amount: remaining_amount,
//       payment_method: invoice.payment_method as any,
//       currency: invoice.currency || 'ILS',
//       notes: invoice.notes,
//     } as any);

//     invoice.status = payment.remaining_amount === 0 ? 'Paid' : 'Partial_paid';
//     await invoice.save();

//     return payment;
//   }
// }


import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Payment } from './Payment.model';
import { SupplierInvoice } from '../supplier-invoices/supplier-invoice.model';
import { PaymentParser } from './Regex&Parser';

@Injectable()
export class PaymentsService {
  async createPayment(invoice_id: number): Promise<Payment> {
    const invoice = await SupplierInvoice.findByPk(invoice_id);
    if (!invoice) throw new NotFoundException(`Invoice with id ${invoice_id} not found`);

    const payments = await Payment.findAll({ where: { invoice_id } });
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount_paid), 0);

    if (totalPaid >= Number(invoice.total_amount)) {
      throw new BadRequestException('Invoice already fully paid');
    }

    // -------------------------------
    // تحليل نص notes بالأقساط
    // -------------------------------
    let installmentsData: any = null;
    if (invoice.notes) {
      installmentsData = PaymentParser.parseInstallments(invoice.notes, Number(invoice.total_amount));
    }

    let amountToPay = Number(invoice.total_amount) - totalPaid;
    let paymentDate = new Date();

    if (installmentsData?.installments?.length) {
      const paidCount = payments.length;
      const nextInstallment = installmentsData.installments[paidCount];

      if (!nextInstallment) {
        throw new BadRequestException('All installments are already paid');
      }

      const dueDate = new Date(nextInstallment.due_date);
      if (paymentDate < dueDate) {
        throw new BadRequestException(`Installment is due on ${dueDate.toLocaleDateString()}`);
      }

      amountToPay = nextInstallment.amount || (Number(invoice.total_amount) - totalPaid) / (installmentsData.total_installments - paidCount);
      paymentDate = dueDate;
    }

    // -------------------------------
    // إنشاء دفعة جديدة
    // -------------------------------
    let remaining_amount = Number(invoice.total_amount) - totalPaid - amountToPay;
    if (remaining_amount < 0) remaining_amount = 0;

    const payment = await Payment.create({
      invoice_id: invoice.invoice_id,
      payment_date: paymentDate,
      amount_paid: amountToPay,
      remaining_amount,
      payment_method: invoice.payment_method as any,
      currency: invoice.currency || 'ILS',
      notes: invoice.notes,
      status: 'Pending' // تبدأ بالـ Pending حتى يتم تأكيد الدفع
    } as any);

    // -------------------------------
    // تحديث حالة الفاتورة
    // -------------------------------
    invoice.status = remaining_amount === 0 ? 'Paid' : 'Partial_paid';
    await invoice.save();

    return payment;
  }

  async completePayment(payment_id: number, details: string): Promise<Payment> {
    const payment = await Payment.findByPk(payment_id);
    if (!payment) throw new NotFoundException(`Payment ${payment_id} not found`);

    if (payment.status === 'Completed') {
      throw new BadRequestException('Payment already completed');
    }

    payment.status = 'Completed';
    payment.payment_details = details;
    await payment.save();

    // تحديث حالة الفاتورة بعد إكمال الدفع
    const allPayments = await Payment.findAll({ where: { invoice_id: payment.invoice_id } });
    const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0);

    const invoice = await SupplierInvoice.findByPk(payment.invoice_id);
    invoice!.status = totalPaid >= Number(invoice?.total_amount) ? 'Paid' : 'Partial_paid';
    await invoice!.save();

    return payment;
  }





   parse(notes: string, totalAmount: number) {
    return PaymentParser.parseInstallments(notes, totalAmount);
  }
}
