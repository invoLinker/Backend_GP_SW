import { Injectable, NotFoundException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { Payment } from './Payment.model';
import { SupplierInvoice } from '../supplier-invoices/supplier-invoice.model';
import { CreatePaymentDto, PaymentMethod } from './CreatePaymentDto';
import axios from 'axios';
import { Op } from 'sequelize';
import { GenerateTxtService } from '../GenerateTxt/GenerateTxt.Service';
import { PurchaseOrder } from 'src/PO/po.model';
import { StripePaymentService } from './stripe-payment.service';
import { Supplier } from 'src/Suppliers/supplier.model';
import { User } from 'src/users/users.model';
import { NotificationService } from 'src/Notification/notification.service';
import { Role } from 'src/roles/roles.model';
import { NotificationCategory, NotificationChannel } from 'src/Notification/create-notification.dto';
import { Cron, CronExpression } from '@nestjs/schedule';


@Injectable()
export class PaymentsService {
  constructor(private readonly hfService: GenerateTxtService,
        private readonly stripePaymentService: StripePaymentService,
        private readonly notificationService: NotificationService,

  ) {}

async createPayment(po_id: number, dto: CreatePaymentDto) {
  const po = await PurchaseOrder.findByPk(po_id);
  if (!po) throw new NotFoundException(`Purchase Order not found`);

  const invoices = await SupplierInvoice.findAll({ where: { po_number: po.po_number } });
  if (!invoices.length) throw new NotFoundException(`No invoices found`);

  const allPayments = await Payment.findAll({
    where: { invoice_id: invoices.map(i => i.invoice_id) }
  });

  const totalPOAmount = invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.installment_amount), 0);

  if (totalPaid >= totalPOAmount) {
    po.status = 'Closed';
    await po.save();
    throw new BadRequestException(`PO already fully paid`);
  }

  let installmentsData = po.installmentsData;
  if (!installmentsData) {
    installmentsData = await this.hfService.parseInstallments(po.note!, totalPOAmount, po.createdAt);
    po.installmentsData = installmentsData;
    await po.save();
  }

  const paidInstallments = await Payment.findAll({
    where: { invoice_id: invoices.map(i => i.invoice_id) },
    attributes: ['payment_date'],
    group: ['payment_date']
  });

  const paidCount = paidInstallments.length;
  const nextInstallment = installmentsData!.installments[paidCount];

  if (!nextInstallment) {
    po.status = 'Closed';
    await po.save();
    throw new BadRequestException(`All installments paid`);
  }

  const paymentDate = new Date(nextInstallment.due_date);
  let installmentAmount = installmentsData!.total_installments === 1 ? totalPOAmount : nextInstallment.amount;

  if (new Date() < paymentDate) {
    return {
      message: `Next installment due on ${paymentDate.toLocaleDateString()}`,
      status: 'Pending'
    };
  }

  const invoiceCurrency = po.currency;
  const payCurrency = dto.currency || invoiceCurrency;
  const rateAtPayment = await this.getExchangeRate(invoiceCurrency, payCurrency, paymentDate);


  // ========= BANK HANDLING ============
  if(po.payment_method === 'Bank Transfer'){
      let savedBankInfo: {
      bank_name: string;
      account_holder: string | null;
      account_number: string | null;
      iban: string | null;
      swift: string | null;
    } | null = null;

    const supplier = await Supplier.findOne({ where: { supplier_id: po.supplier_id } });
    if (!supplier) throw new BadRequestException(`Supplier not found`);

    if (supplier.bank_name) {
      savedBankInfo = {
        bank_name: supplier.bank_name,
        account_holder: supplier.account_holder,
        account_number: supplier.account_number,
        iban: supplier.iban,
        swift: supplier.swift,
      };
    } else {
      const incoming = dto.payment_details;
      
    if (!incoming || !incoming.bank_name || !incoming.account_holder || !incoming.account_number || !incoming.iban || !incoming.swift) {
      throw new BadRequestException('Bank details required for first-time payment');
    }

      savedBankInfo = {
        bank_name: incoming!.bank_name!,
        account_holder: incoming!.account_holder!,
        account_number: incoming!.account_number!,
        iban: incoming!.iban!,
        swift: incoming!.swift!,
      };

      await Supplier.update(
        {
          bank_name: incoming!.bank_name,
          account_holder: incoming!.account_holder,
          account_number: incoming!.account_number,
          iban: incoming!.iban,
          swift: incoming!.swift,
        },
        { where: { supplier_id: supplier.supplier_id } }
      );
    }

    dto.payment_details = {
      bank_name: savedBankInfo.bank_name ?? supplier.bank_name!,
      account_holder: savedBankInfo.account_holder ?? supplier.account_holder!,
      account_number: savedBankInfo.account_number ?? supplier.account_number!,
      iban: savedBankInfo.iban ?? supplier.iban!,
      swift: savedBankInfo.swift ?? supplier.swift!,
      method: PaymentMethod.BANK_TRANSFER,
      reference_code: po.po_number, 
      rateAtPayment
    };
  
}

// ========= CASH HANDLING ==========
  if (po.payment_method === 'Cash') {
    dto.payment_details = {
      method: PaymentMethod.CASH,
      rateAtPayment
    };
  }

  let stripePayload: any = null;

  // ========= STRIPE HANDLING ==========
  if (po.payment_method === 'Stripe') {

  const payCurrency = dto.currency || po.currency;

  if(payCurrency === 'JOD'){
    throw new BadRequestException('You Can Only Pay In Stripe In ILS or USD.')
  }

  const stripePay = await this.stripePaymentService.createPaymentIntent(
    installmentAmount,
    payCurrency,
  );

  if (!stripePay.success) {
    throw new BadRequestException('Stripe payment failed');
  }

  dto.payment_details = {
  method: PaymentMethod.STRIPE,
  rateAtPayment,
  payment_intent_id: stripePay.payment_intent_id,
  client_secret: stripePay.client_secret!,
};

  stripePayload = stripePay;   

}



  // ========= CREDIT HANDLING ==========
  if (po.payment_method === 'Credit') {
    dto.payment_details = {
      method: PaymentMethod.CREDIT,
      rateAtPayment
    };
  }

  // ========= RESPONSE COLLECTOR ============
    const paymentsToReturn: {
    invoice_id: number;
    invoiceCurrency: string;
    payCurrency: string;
    installmentAmount: number;
    amountPaid: number;
    remainingAmount: number;
    rateAtInvoice: number;
    rateAtPayment: number;
    currencyDifference: number;
  }[] = [];


  for (const invoice of invoices) {
    const invoiceCurrency = invoice.currency;
    const payCurrency = dto.currency || invoiceCurrency;

    const ratio = Number(invoice.total_amount) / totalPOAmount;
    const amountForInvoice =
      installmentsData!.total_installments === 1
        ? Number(invoice.total_amount)
        : installmentAmount * ratio;

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

    const previousPaid = allPayments
      .filter(p => p.invoice_id === invoice.invoice_id)
      .reduce((s, p) => s + Number(p.installment_amount), 0);

    const remainingAmount = Math.max(Number(invoice.total_amount) - (previousPaid + amountForInvoice), 0);

    // ========= STORE PAYMENT ============
    await Payment.create({
      invoice_id: invoice.invoice_id,
      curruncy: invoiceCurrency,
      payment_date: paymentDate,
      installment_amount: amountForInvoice,
      amount_paid: amountPaid,
      currency_paid: payCurrency,
      remaining_amount: remainingAmount,
      payment_method: dto.payment_details?.method ?? invoice.payment_method,
      notes: po.note! ?? null,
      payment_details: JSON.stringify({
        ...dto.payment_details,
      }),
      status:
        dto.payment_details?.method === PaymentMethod.STRIPE
          ? 'Completed'
          : 'Pending',
      currency_difference: currencyDifference
    }as any);

    invoice.status = remainingAmount === 0 ? 'Paid' : 'Partial_paid';
    await invoice.save();

    paymentsToReturn.push({
      invoice_id: invoice.invoice_id,
      invoiceCurrency,
      payCurrency,
      installmentAmount,
      amountPaid,
      remainingAmount,
      rateAtInvoice,
      rateAtPayment,
      currencyDifference
    });
  }

  po.status = invoices.every(i => i.status === 'Paid') ? 'Closed' : 'ReadyForPaid';
  await po.save();

  await this.notifyRole(
    'Admin',
    'New Payment Created',
    `A new payment has been initiated for PO ${po.po_number}.`
  );


  return {
  message: 'Payment processed successfully',
  po_note: po.note,
  installmentsPlan: installmentsData,
  payments: paymentsToReturn,
  stripe_details: stripePayload 
};

}


convertCurrency(amount: number, from: string, to: string, rate: number): number {
  if (from === to) return amount;

  return amount * rate;
}

// async getExchangeRate(from: string, to: string, date: Date): Promise<number> {
//   if(from === to)return 1;
//   const formattedDate = date.toISOString().split('T')[0];
//   const url = `https://api.exchangerate.host/convert?from=${from}&to=${to}&amount=1&date=${formattedDate}&access_key=4e3ecc8736a617bf5db8aff010fe6eb9`;

//   const response = await fetch(url);
//   const data = await response.json();
// // console.log("EX RATE RESPONSE >>>", data);

//   if (!data.success || !data.info?.quote) {
//     throw new BadRequestException('Currency conversion failed');
//   }


//   return data.info.quote;
// }

async getExchangeRate(from: string, to: string, date: Date): Promise<number> {
  if (from === to) return 1;

  const formattedDate = date.toISOString().split('T')[0];
  const url = `https://api.frankfurter.app/${formattedDate}?from=${from}&to=${to}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data?.rates?.[to]) {
    throw new BadRequestException('Currency conversion failed');
  }

  return data.rates[to];
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
      ? 'Payment confirmed successfully.'
      : 'Payment marked as failed.';

      // 🔔 Notify Payment Officer
  await this.notifyRole(
    'PaymentOfficer',
    `Payment Status Updated`,
    `Payment #${payment_id} status is now "${status}".`
  );

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
  payment_method?: 'Cash' | 'Bank Transfer' | 'Stripe' | 'Credit';
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

  // if (dto.payment_method) payment.payment_method = dto.payment_method;
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


async getAllPaymentBySupplier(supplierId: number) {
  const user = await User.findByPk(supplierId);
  if(!user){ throw new NotFoundException('Supplier not found')};
    
  const supplier = await Supplier.findOne({where:{user_id: supplierId}});

  if(!supplier){ throw new NotFoundException('Supplier not found')};


  const invoices = await SupplierInvoice.findAll({
    where: { supplier_id: supplier.supplier_id },
    attributes: ['invoice_id'],
  });

  if (!invoices.length) {
    throw new NotFoundException('This supplier has no invoices');
  }

  const invoiceIds = invoices.map(inv => inv.invoice_id);

  const payments = await Payment.findAll({
    where: {
      invoice_id: invoiceIds,
    },
  });

  if (!payments.length) {
    throw new NotFoundException('There is no Payment for this supplier');
  }

  const enriched: any[] = [];

  for (const pay of payments) {
    const invoice = await SupplierInvoice.findByPk(pay.invoice_id);

    let supplierFullName: string | null = null;

    if (invoice?.supplier_email) {
      const user = await User.findOne({
        where: { email: invoice.supplier_email },
      });

      if (user) {
        supplierFullName = `${user.first_name} ${user.last_name}`;
      }
    }

    enriched.push({
      ...pay.toJSON(),
      supplier_full_name: supplierFullName,
      to_name: invoice?.to_name ?? null,
      invoice: {
      invoice_number: invoice?.invoice_number ?? null,
    },
    });
  }

  return enriched;
}


private async notifyRole(roleName: string, title: string, message: string) {
  const users = await User.findAll({
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

@Cron(CronExpression.EVERY_DAY_AT_NOON)
// @Cron('*/5 * * * * *')
async notifyPaymentOfficerForReadyAndInstallments() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // =========================
  // 1️⃣ ReadyForPaid POs
  // =========================
  // const readyPOs = await PurchaseOrder.findAll({
  //   where: {
  //     status: 'ReadyForPaid',
  //     ready_for_paid_notified_at: { [Op.is]: null },
  //   },
  // });

  // for (const po of readyPOs) {
  //   await this.notifyRole(
  //     'PaymentOfficer',
  //     '✅ PO Ready For Payment',
  //     `PO "${po.po_number}" is ready for payment.`
  //   );

  //   po.ready_for_paid_notified_at = new Date();
  //   await po.save();
  // }

  // =========================
  // 2️⃣ Installments check
  // =========================
  const partialInvoices = await SupplierInvoice.findAll({
    where: { status: 'Partial_paid' },
  });

  const UPCOMING_DAYS = 3;

  for (const invoice of partialInvoices) {

    // 2.1 جيبي الـ PO
    const po = await PurchaseOrder.findOne({
      where: { po_number: invoice.po_number! },
    });

    if (!po || !po.installmentsData) continue;

    // 2.2 installmentsData parsing
    let installmentsData: any = po.installmentsData;
    if (typeof installmentsData === 'string') {
      try {
        installmentsData = JSON.parse(installmentsData);
      } catch {
        continue;
      }
    }

    const installments = installmentsData.installments;
    if (!Array.isArray(installments)) continue;

    // 2.3 جيبي كل الفواتير لنفس PO
    const invoices = await SupplierInvoice.findAll({
      where: { po_number: po.po_number },
    });

    const payments = await Payment.findAll({
      where: {
        invoice_id: invoices.map(i => i.invoice_id),
        status: 'Completed',
      },
      attributes: ['payment_date'],
      raw: true,
    });

    // عدد الأقساط المدفوعة
    const paidInstallmentsCount = new Set(
      payments
        .filter(p => p.payment_date)
        .map(p => new Date(p.payment_date).toISOString().split('T')[0])
    ).size;

    // القسط القادم
    const nextInstallment = installments[paidInstallmentsCount];
    if (!nextInstallment?.due_date) continue;

    const dueDate = new Date(nextInstallment.due_date);
    dueDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    const dueKey = dueDate.toISOString().split('T')[0];

    // =========================
    // ⏰ OVERDUE
    // =========================
    if (diffDays < 0) {
      const alertKey = `OVERDUE:${dueKey}`;

      if (po.installment_alert_key !== alertKey) {
        await this.notifyRole(
          'PaymentOfficer',
          '⏰ Installment Overdue',
          `PO "${po.po_number}" installment overdue since ${dueKey}.`
        );

        po.installment_alert_key = alertKey;
        await po.save();
      }
      continue;
    }

    // =========================
    // 📌 UPCOMING
    // =========================
    if (diffDays <= UPCOMING_DAYS) {
      const alertKey = `UPCOMING:${dueKey}`;

      if (po.installment_alert_key !== alertKey) {
        await this.notifyRole(
          'PaymentOfficer',
          '📌 Upcoming Installment',
          `PO "${po.po_number}" installment due on ${dueKey} (in ${diffDays} day(s)).`
        );

        po.installment_alert_key = alertKey;
        await po.save();
      }
    }
  }
}

async paymentOfficier(){
  const payPending= await Payment.findAll({where:{status:'Pending'}});
  const payComp= await Payment.findAll({where:{status:'Completed'}});
  const totalPaid = await Payment.sum('amount_paid', {where: {status: 'Completed'} });

  return{
    payPending:payPending.length,
    payCompleted:payComp.length,
    totalPaid:totalPaid,
    PaymentMethod:4
  }

}

async getAllPayment() {
  return await Payment.findAll({
    // attributes: {
    //   // exclude: ['invoice_id'], // نخفي الـ id
    // },
    include: [
      {
        model: SupplierInvoice,
        attributes: ['invoice_number'], // بس الرقم
      },
    ],
  });
}




}

