  import { Injectable } from '@nestjs/common';
  import { InjectModel } from '@nestjs/sequelize';
  import { SupplierInvoice } from '../../supplier-invoices/supplier-invoice.model';
  import { SupplierInvoiceItem } from '../../supplier-invoices/supplier-invoice-item.model';
  import { Payment } from '../../Payment/Payment.model';
  import { Op, fn, col, literal, where} from 'sequelize';
  import dayjs from "dayjs";
  import { PurchaseOrder } from 'src/PO/po.model';
  import { LlmService } from '../../ChatBot/llm.service';



  interface Installment { amount: number; due_date: string; paid?: boolean; }

  export interface AIInsight {
    id: string;
    type: 'prediction' | 'recommendation' | 'pattern' | 'risk';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    confidence: number;
    action?: string;
  }


  @Injectable()
  export class ReportsService {
    constructor(
      @InjectModel(SupplierInvoice)
      private invoiceModel: typeof SupplierInvoice,

      @InjectModel(SupplierInvoiceItem)
      private invoiceItemModel: typeof SupplierInvoiceItem,

      @InjectModel(Payment)
      private paymentModel: typeof Payment,

      @InjectModel(PurchaseOrder)
      private poModel: typeof PurchaseOrder,

      private readonly llmService: LlmService,
      
    ) {}

  
    async getSummary() {
      const totalInvoices = await this.invoiceModel.count();

      const paidInvoices = await this.invoiceModel.count({
        where: { status: 'Paid' },
      });

      const unpaidInvoices = await this.invoiceModel.count({
        where: {
          status:{ [Op.in]: ["ReadyForPaid", "Partial_paid"] },
        },
      });

      const overdueDaysThreshold = 30;
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - overdueDaysThreshold);

      const overdueAmountRaw = await this.invoiceModel.sum('total_amount', {
        where: {
          status:'ReadyForPaid',
          invoice_date: {
            [Op.lt]: thresholdDate,
          },
        },
      });

      const overdueAmount = overdueAmountRaw ?? 0;

      return {
        totalInvoices,
        paidInvoices,
        unpaidInvoices,
        overdueAmount,
      };
    }

    async getPaymentSummary(year: number) {
    const paidAmount = await this.paymentModel.sum("amount_paid", {
      where: where(fn("YEAR", col("createdAt")), year),
    });

    const unpaid_partial = await this.paymentModel.sum("remaining_amount", {
      where: where(fn("YEAR", col("createdAt")), year),
    });

    const unpaid = await SupplierInvoice.sum("total_amount", {
      where: {
        status: "ReadyForPaid",
        [Op.and]: where(fn("YEAR", col("createdAt")), year),
      },
    });

    const remainingAmount = (unpaid_partial || 0) + (unpaid || 0);

    const totalAmount = (paidAmount || 0) + (remainingAmount || 0);

    const paidPercentage =
      totalAmount > 0
        ? Number(((paidAmount || 0) / totalAmount * 100).toFixed(2))
        : 0;

    return {
      totalAmount,
      paidAmount: paidAmount || 0,
      unpaidAmount: remainingAmount || 0,
      paidPercentage,
    };
  }



    async getInvoicesPerMonth(year: number) {
      const monthlyCounts = Array(12).fill(0);

      type MonthAgg = { month: number; count: number };

      const results = await this.invoiceModel.findAll({
        attributes: [
          [fn("MONTH", col("createdAt")), "month"],
          [fn("COUNT", col("invoice_id")), "count"],
        ],
        where: where(fn("YEAR", col("createdAt")), year),
        group: [fn("MONTH", col("createdAt"))],
        raw: true,
      }) as unknown as MonthAgg[];

      results.forEach(row => {
        const monthIndex = row.month - 1;
        monthlyCounts[monthIndex] = row.count;
      });

      return monthlyCounts;
    }



    async getPaymentMethods(year: number) {
      const results = await this.paymentModel.findAll({
        attributes: [
          "payment_method",
          [fn("COUNT", col("payment_id")), "count"],
        ],
        where: where(fn("YEAR", col("createdAt")), year),
        group: ["payment_method"],
        raw: true,
      });

      const summary = {
        Cash: 0,
        Credit: 0,
        Stripe: 0,
        BankTransfer: 0,
      };

      results.forEach((row: any) => {
        const method = row.payment_method;

        switch (method) {
          case "Cash":
            summary.Cash = Number(row.count);
            break;

          case "Credit":
            summary.Credit = Number(row.count);
            break;

          case "Stripe":
            summary.Stripe = Number(row.count);
            break;

          case "BankTransfer": 
          case "Bank Transfer": 
            summary.BankTransfer = Number(row.count);
            break;
        }
      });

      return summary;
    }


  async getAgingBuckets() {
    const today = dayjs();

    const invoices = await this.invoiceModel.findAll({
      attributes: ["invoice_id", "status", "po_number", "invoice_date"],
      where: {
        status: { [Op.in]: ["ReadyForPaid", "Partial_paid"] },
      },
      raw: true,
    });

    const buckets = {
      "0-7": 0,
      "8-30": 0,
      "31-60": 0,
      "60+": 0,
    };

    for (const inv of invoices) {
      let diffDays: number | null = null;


      if (inv.status === "ReadyForPaid") {
        if (!inv.invoice_date) continue;

        const received = dayjs(inv.invoice_date);
        diffDays = today.diff(received, "day");
      }

      if (inv.status === "Partial_paid") {
        let po: PurchaseOrder | null= null;

        if (inv.po_number) {
          po = await this.poModel.findOne({
            attributes: ["installmentsData"],
            where: { po_number: inv.po_number as string },
            raw: true,
          });
        }

        const installments: Installment[] =
          po?.installmentsData?.installments ?? [];

        if (installments.length === 0) {
          if (!inv.invoice_date) continue;
          const received = dayjs(inv.invoice_date);
          diffDays = today.diff(received, "day");
        }

        const payments = await this.paymentModel.findAll({
          attributes: ["amount_paid"],
          where: { invoice_id: inv.invoice_id },
          raw: true,
        });

        const paidAmount = payments.reduce(
          (sum, p) => sum + Number(p.amount_paid),
          0
        );

        let remaining: Installment[] = [];
        let tempPaid = paidAmount;

        for (const inst of installments) {
          if (tempPaid >= inst.amount) tempPaid -= inst.amount;
          else remaining.push(inst);
        }

        if (!remaining.length) continue;

        const nextDue = remaining
          .map((i) => dayjs(i.due_date))
          .sort((a, b) => a.valueOf() - b.valueOf())[0];

        diffDays = today.diff(nextDue, "day");

        if (diffDays < 0) continue;
      }

      if (diffDays !== null) {
        if (diffDays <= 7) buckets["0-7"]++;
        else if (diffDays <= 30) buckets["8-30"]++;
        else if (diffDays <= 60) buckets["31-60"]++;
        else buckets["60+"]++;
      }
    }

    return buckets;
  }



  async getPaymentDelay(year: number) {
    const payments = await this.paymentModel.findAll({
      attributes: ["payment_id", "invoice_id", "payment_date", "amount_paid", "createdAt"],
      where: {
        status: "Completed",
        [Op.and]: where(fn("YEAR", col("createdAt")), year),
      },
      order: [["payment_date", "ASC"]],
      raw: true,
    });

    let delays: number[] = [];
    let monthlyMap: Record<number, number[]> = {};
    let processedInvoices = new Set<number>();

    for (let i = 0; i < 12; i++) monthlyMap[i] = [];

    for (const payment of payments as any[]) {
      if (!payment.payment_date || !payment.invoice_id) continue;

      let paymentDateValue: any = payment.payment_date;
      if (paymentDateValue instanceof Date) {
        paymentDateValue = paymentDateValue.toISOString().split("T")[0];
      }
      const payDate = dayjs(paymentDateValue);
      if (!payDate.isValid()) continue;

      const invoice = await this.invoiceModel.findOne({
        attributes: ["invoice_id", "invoice_date", "po_number", "createdAt"],
        where: {
          invoice_id: payment.invoice_id,
          [Op.and]: where(fn("YEAR", col("createdAt")), year),
        },
        raw: true,
      });

      if (!invoice || !invoice.invoice_date) continue;

      processedInvoices.add(invoice.invoice_id);

      let invoiceDateValue: any = invoice.invoice_date;
      if (invoiceDateValue instanceof Date) {
        invoiceDateValue = invoiceDateValue.toISOString().split("T")[0];
      }
      const invoiceDate = dayjs(invoiceDateValue);
      if (!invoiceDate.isValid()) continue;

      let installments: Installment[] = [];
      let hasInstallments = false;

      if (invoice.po_number) {
        const po = await this.poModel.findOne({
          attributes: ["installmentsData", "createdAt"],
          where: {
            po_number: invoice.po_number,
            [Op.and]: where(fn("YEAR", col("createdAt")), year),
          },
          raw: true,
        });

        if (po && po.installmentsData) {
          let data: any =
            typeof po.installmentsData === "string"
              ? JSON.parse(po.installmentsData)
              : po.installmentsData;

          if (Array.isArray(data?.installments) && data.installments.length > 0) {
            installments = data.installments;
            hasInstallments = true;
          }
        }
      }

      if (hasInstallments && installments.length === 1) {
        const instDueDate = dayjs(installments[0].due_date);

        if (instDueDate.isValid() && payDate.isSame(instDueDate, "day")) {
          const delay = payDate.diff(invoiceDate, "day");
          if (delay > 0) {
            delays.push(delay);
            monthlyMap[payDate.month()].push(delay);
          }
          continue;
        }
      }

      if (hasInstallments && installments.length > 1) {
        const sorted = [...installments].sort(
          (a, b) => dayjs(a.due_date).valueOf() - dayjs(b.due_date).valueOf()
        );

        const invoicePayments = await this.paymentModel.findAll({
          attributes: ["payment_id", "payment_date"],
          where: {
            invoice_id: invoice.invoice_id,
            status: "Completed",
            [Op.and]: where(fn("YEAR", col("createdAt")), year),
          },
          order: [["payment_date", "ASC"]],
          raw: true,
        });

        const paymentIndex = invoicePayments.findIndex(
          (p: any) => p.payment_id === payment.payment_id
        );

        if (paymentIndex >= 0 && paymentIndex < sorted.length) {
          const inst = sorted[paymentIndex];
          const due = dayjs(inst.due_date);

          if (due.isValid()) {
            const delay = payDate.diff(due, "day");
            if (delay > 0) {
              delays.push(delay);
              monthlyMap[payDate.month()].push(delay);
            }
          }
        }

        continue;
      }

      const delay = payDate.diff(invoiceDate, "day");
      if (delay > 0) {
        delays.push(delay);
        monthlyMap[payDate.month()].push(delay);
      }
    }

    const paidInvoicesCount = processedInvoices.size;

    const avgDelay =
      delays.length > 0
        ? Number((delays.reduce((a, b) => a + b) / delays.length).toFixed(2))
        : 0;

    const minDelay = delays.length ? Math.min(...delays) : 0;
    const maxDelay = delays.length ? Math.max(...delays) : 0;

    const monthlyAvg = Array(12)
      .fill(0)
      .map((_, i) => {
        const arr = monthlyMap[i];
        if (!arr.length) return 0;
        return Number((arr.reduce((a, b) => a + b) / arr.length).toFixed(2));
      });

    return {
      avgDelay,
      minDelay,
      maxDelay,
      monthlyAvg,
      paidInvoicesCount,
    };
  }


  async getMonthlyPayments(year: number) {

      async function getYearPayments(y: number) {
        const results = await Payment.findAll({
          attributes: [
            [fn('MONTH', col('payment_date')), 'month'],
            [fn('SUM', col('amount_paid')), 'total_paid'],
          ],
          where: {
            status: 'Completed',
            payment_date: {
              [Op.between]: [`${y}-01-01`, `${y}-12-31`],
            },
          },
          group: [fn('MONTH', col('payment_date'))],
          raw: true,
        });

        const months = Array(12).fill(0);

        results.forEach((r: any) => {
          const index = Number(r.month) - 1;
          months[index] = Number(r.total_paid);
        });

        return months;
      }

      const current = await getYearPayments(year);

      return {
        year,
        months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
        monthly: current,
        total: current.reduce((a, b) => a + b, 0),
      };
  }


    async getSupplierPriceAnalysis(year: number) {
    const items = await this.invoiceItemModel.findAll({
      attributes: [
        [fn('LOWER', col('SupplierInvoiceItem.item_name')), 'normalized_name'], 
        [col('invoice.supplier_email'), 'supplier_email'],
        [col('invoice.supplier_name'), 'supplier_name'],

        [fn('AVG', col('SupplierInvoiceItem.unit_price')), 'avgPrice'],
        [fn('MIN', col('SupplierInvoiceItem.unit_price')), 'minPrice'],
        [fn('MAX', col('SupplierInvoiceItem.unit_price')), 'maxPrice'],
        [
          fn('COUNT', fn('DISTINCT', col('SupplierInvoiceItem.invoice_id'))),
          'invoiceCount'
        ],
      ],

      include: [
        {
          model: this.invoiceModel,
          attributes: [],
          required: true,
          where: {
            status: {
              [Op.in]: ['ReadyForPaid', 'Paid', 'Partial_paid'], 
            },
            [Op.and]: where(fn("YEAR", col("invoice.invoice_date")), year) 
          }
        }
      ],

      group: [
        fn('LOWER', col('SupplierInvoiceItem.item_name')),
        col('invoice.supplier_email'),
        col('invoice.supplier_name'),
      ],

      raw: true,
    });

    return items.map((i: any) => ({
      name: i.normalized_name,
      supplier_email: i.supplier_email,
      supplier_name: i.supplier_name, 
      avgPrice: Number(i.avgPrice || 0),
      minPrice: Number(i.minPrice || 0),
      maxPrice: Number(i.maxPrice || 0),
      invoiceCount: Number(i.invoiceCount || 0),
    }));
  }

  async getProductPriceHistory(product: string) {
    
    const today = dayjs();
    const months: dayjs.Dayjs[] = [];

    for (let i = 5; i >= 0; i--) {
      months.push(today.subtract(i, "month"));
    }

    const monthLabels = months.map((m) =>
      m.format("MMM") 
    );

    const sixMonthsAgo = today.subtract(6, "month").startOf("month");

    const items = await this.invoiceItemModel.findAll({
      attributes: [
        "item_name",
        [col("invoice.supplier_email"), "supplier_email"],
        [col("invoice.supplier_name"), "supplier_name"],
        [col("invoice.invoice_date"), "invoice_date"],
        "unit_price"
      ],
      where: {
        [Op.and]: [
          literal(
            `LOWER(SupplierInvoiceItem.item_name) = LOWER('${product.replace(/'/g, "''")}')`
          )
        ]
      },
      include: [
        {
          model: this.invoiceModel,
          attributes: [],
          required: true,
          where: {
            status: {
              [Op.in]: ["Paid", "Partial_paid", "ReadyForPaid"]
            },
            invoice_date: {
              [Op.gte]: sixMonthsAgo.toDate()
            }
          }
        }
      ],
      raw: true
    });


    const perSupplier: Record<string, {
      supplier_name: string;
      prices: number[][];
    }> = {};

    for (const row of items as any[]) {
      const supplierEmail = row["supplier_email"];
      const supplierName = row["supplier_name"];
      const invoiceDate = row["invoice_date"];
      const price = Number(row["unit_price"] || 0);

      if (!supplierEmail || !invoiceDate || !price) continue;

      let invoiceDateValue: any = invoiceDate;
      if (invoiceDateValue && typeof invoiceDateValue === 'object' && invoiceDateValue instanceof Date) {
        invoiceDateValue = invoiceDateValue.toISOString().split('T')[0];
      }
      const date = dayjs(invoiceDateValue);
      if (!date.isValid()) continue;

      if (!perSupplier[supplierEmail]) {
        perSupplier[supplierEmail] = {
          supplier_name: supplierName || supplierEmail,
          prices: Array.from({ length: 6 }, () => [])
        };
      }

      const monthIndex = months.findIndex((m) =>
        m.isSame(date, "month")
      );

      if (monthIndex === -1) continue;

      perSupplier[supplierEmail].prices[monthIndex].push(price);
    }

    const suppliers = Object.keys(perSupplier).map((supplierEmail) => {
      const supplierData = perSupplier[supplierEmail];
      const prices = supplierData.prices.map((monthArray) => {
        return monthArray.length > 0
          ? Number((monthArray.reduce((a, b) => a + b, 0) / monthArray.length).toFixed(2))
          : null;
      });

      return {
        supplier: supplierEmail,
        supplier_name: supplierData.supplier_name,
        prices
      };
    });

    return {
      product,
      months: monthLabels,
      suppliers
    };
  }

  async getPaymentMethodStats(year) {
    const invoices = await this.invoiceModel.findAll({
      attributes: ["payment_method", "status"],
      where: {
        payment_method: { [Op.in]: ["Cash", "Bank Transfer", "Stripe", "Credit"] },
        status :{ [Op.in] : ["ReadyForPaid" , "Partial_paid", "Paid"]},
        [Op.and]: where(fn("YEAR", col("invoice_date")), year),
      },
      raw: true
    });

    return invoices.map(inv => ({
      paymentMethod: inv.payment_method,
      status:
        inv.status === "Paid"
          ? "Paid"
          : "Unpaid" 
    }));
  }

  private async collectAnalyticsData() {
    const today = dayjs();
    const last3Months = today.subtract(3, 'month');
    const last6Months = today.subtract(6, 'month');

    const totalInvoices = await this.invoiceModel.count();
    const paidInvoices = await this.invoiceModel.count({ where: { status: 'Paid' } });
    const unpaidInvoices = await this.invoiceModel.count({ where: { status: 'ReadyForPaid' } });
    
    const totalPaidAmount = await this.paymentModel.sum('amount_paid', {
      where: { status: 'Completed' }
    }) || 0;

    const monthlyPayments = await this.paymentModel.findAll({
      attributes: [
        [fn('MONTH', col('payment_date')), 'month'],
        [fn('SUM', col('amount_paid')), 'total'],
      ],
      where: {
        status: 'Completed',
        payment_date: {
          [Op.gte]: last6Months.toDate()
        }
      },
      group: [fn('MONTH', col('payment_date'))],
      raw: true,
    });


    const paymentDelayData = await this.getPaymentDelay(today.year());

    const supplierPrices = await this.invoiceItemModel.findAll({
      attributes: [
        [col('invoice.supplier_name'), 'supplier_name'],
        [fn('AVG', col('SupplierInvoiceItem.unit_price')), 'avgPrice'],
        [fn('MIN', col('SupplierInvoiceItem.unit_price')), 'minPrice'],
        [fn('MAX', col('SupplierInvoiceItem.unit_price')), 'maxPrice'],
      ],
      include: [
        {
          model: this.invoiceModel,
          attributes: [],
          required: true,
          where: {
            invoice_date: {
              [Op.gte]: last6Months.toDate()
            },
            status: {
              [Op.in]: ['Paid', 'Partial_paid', 'ReadyForPaid']
            }
          }
        }
      ],
      group: [col('invoice.supplier_name')],
      raw: true,
      limit: 20,
    });

    const paymentMethods = await this.paymentModel.findAll({
      attributes: [
        'payment_method',
        [fn('COUNT', col('payment_id')), 'count'],
        [fn('SUM', col('amount_paid')), 'total'],
      ],
      where: {
        status: 'Completed',
        payment_date: {
          [Op.gte]: last3Months.toDate()
        }
      },
      group: ['payment_method'],
      raw: true,
    });

    const overdueInvoices = await this.invoiceModel.count({
      where: {
        status: 'ReadyForPaid',
        invoice_date: {
          [Op.lt]: today.subtract(30, 'day').toDate()
        }
      }
    });

    return {
      summary: {
        totalInvoices,
        paidInvoices,
        unpaidInvoices,
        totalPaidAmount: Number(totalPaidAmount),
        overdueInvoices,
      },
      monthlyPayments: monthlyPayments.map((m: any) => ({
        month: Number(m.month),
        total: Number(m.total || 0),
      })),
      paymentDelay: paymentDelayData,
      supplierPrices: supplierPrices.map((sp: any) => ({
        supplier_name: sp.supplier_name,
        avgPrice: Number(sp.avgPrice || 0),
        minPrice: Number(sp.minPrice || 0),
        maxPrice: Number(sp.maxPrice || 0),
      })),
      paymentMethods: paymentMethods.map((pm: any) => ({
        method: pm.payment_method,
        count: Number(pm.count || 0),
        total: Number(pm.total || 0),
      })),
      period: {
        last3Months: last3Months.format('YYYY-MM-DD'),
        last6Months: last6Months.format('YYYY-MM-DD'),
        currentDate: today.format('YYYY-MM-DD'),
      },
    };
  }


  async getAIInsights(): Promise<AIInsight[]> {
    try {
      const analyticsData = await this.collectAnalyticsData();

      let insights: any[] = [];
      try {
        insights = await this.llmService.generateAIInsights(analyticsData);
      } catch (error) {
        console.error('Error calling LLM for insights:', error);
        insights = [];
      }

      insights = insights.map((insight, index) => ({
        ...insight,
        id: `insight-${index + 1}`,
        confidence: Math.max(70, Math.min(95, Number(insight.confidence) || 80)),
      }));

      if (insights.length < 4) {
        const defaults = this.getDefaultInsights(analyticsData);
        insights = [...insights, ...defaults.slice(insights.length)];
      }

      return insights.slice(0, 8); 
    } catch (error) {
      console.error('Error generating AI insights:', error);
      const analyticsData = await this.collectAnalyticsData();
      return this.getDefaultInsights(analyticsData);
    }
  }


  private getDefaultInsights(analyticsData: any): AIInsight[] {
    const insights: AIInsight[] = [];
    let id = 1;

    if (analyticsData.monthlyPayments.length >= 2) {
      const recentGrowth = this.calculateGrowth(analyticsData.monthlyPayments);
      if (recentGrowth > 0) {
        insights.push({
          id: `insight-${id++}`,
          type: 'prediction',
          title: 'Revenue Growth Forecast',
          description: `Based on historical data analysis, revenue is expected to increase by ${Math.round(recentGrowth)}% in the upcoming period due to positive trends in payments.`,
          impact: recentGrowth > 15 ? 'high' : 'medium',
          confidence: 85,
          action: 'Increase inventory in preparation for expected demand'
        });
      }
    }

    if (analyticsData.supplierPrices.length > 0) {
      const priceVariations = analyticsData.supplierPrices.filter((sp: any) => 
        sp.maxPrice - sp.minPrice > sp.avgPrice * 0.1
      );
      if (priceVariations.length > 0) {
        insights.push({
          id: `insight-${id++}`,
          type: 'pattern',
          title: 'Pattern Detected: Supplier Price Fluctuations',
          description: `Price variations have been detected for ${priceVariations.length} suppliers. Prices fluctuate by up to 10% or more.`,
          impact: 'medium',
          confidence: 88,
          action: 'Negotiate long-term contracts to stabilize prices'
        });
      }
    }

    if (analyticsData.paymentDelay.avgDelay > 0 && analyticsData.summary.overdueInvoices > 0) {
      insights.push({
        id: `insight-${id++}`,
        type: 'risk',
        title: 'Warning: Payment Delay Risks',
        description: `There are ${analyticsData.summary.overdueInvoices} overdue invoices, and the average payment delay is ${Math.round(analyticsData.paymentDelay.avgDelay)} days. This may affect the supply chain.`,
        impact: 'high',
        confidence: 82,
        action: 'Review payment terms with affected suppliers'
      });
    }

    if (analyticsData.monthlyPayments.length > 0) {
      insights.push({
        id: `insight-${id++}`,
        type: 'recommendation',
        title: 'Recommendation: Optimize Purchase Timing',
        description: 'Data analysis shows that there are specific times during the month when purchases are more cost-effective.',
        impact: 'medium',
        confidence: 80,
        action: 'Schedule large purchases at specific times of the month'
      });
    }

    if (analyticsData.paymentMethods.length > 0) {
      const totalMethodAmount = analyticsData.paymentMethods.reduce((sum: number, pm: any) => sum + pm.total, 0);
      const preferredMethod = analyticsData.paymentMethods.reduce((max: any, pm: any) => 
        pm.total > max.total ? pm : max
      );
      const percentage = Math.round((preferredMethod.total / totalMethodAmount) * 100);
      
      if (percentage > 50) {
        insights.push({
          id: `insight-${id++}`,
          type: 'pattern',
          title: 'Pattern Detected: Payment Method Preferences',
          description: `Customers prefer paying via ${preferredMethod.method} at ${percentage}% compared to other payment methods.`,
          impact: 'low',
          confidence: 90,
          action: `Enhance payment experience for ${preferredMethod.method}`
        });
      }
    }

    if (analyticsData.paymentDelay.avgDelay < 10) {
      insights.push({
        id: `insight-${id++}`,
        type: 'prediction',
        title: 'Prediction: Improved Cost Management',
        description: 'With improved payment rates and low average delays, administrative costs associated with invoice management are expected to decrease.',
        impact: 'medium',
        confidence: 75,
        action: 'Maintain current payment rates'
      });
    }

    return insights;
  }


  private calculateGrowth(monthlyData: any[]): number {
    if (monthlyData.length < 2) return 0;
    
    const sorted = [...monthlyData].sort((a, b) => a.month - b.month);
    const recent = sorted.slice(-2);
    
    if (recent[0].total === 0) return 0;
    
    return ((recent[1].total - recent[0].total) / recent[0].total) * 100;
  }

  }
