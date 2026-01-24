import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Payment } from '../../Payment/Payment.model';
import { Op, fn, col, literal } from 'sequelize';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(isoWeek);


const MONTH_MAP: Record<string, number> = {
  January: 1,
  February: 2,
  March: 3,
  April: 4,
  May: 5,
  June: 6,
  July: 7,
  August: 8,
  September: 9,
  October: 10,
  November: 11,
  December: 12,
};


function parseWeek(weekStr: string): number {
  return Number(weekStr.replace("Week ", ""));
}

@Injectable()
export class ReportsPaymentService {
  constructor(
    @InjectModel(Payment)
    private paymentModel: typeof Payment
  ) {}


  async getTransactionVolume(
    periodType: 'weekly' | 'monthly' | 'yearly',
    year: number,
    month?: string,
    week?: string
  ) {
    let period: 'year' | 'month' | 'week';

    if (periodType === 'yearly') period = 'year';
    else if (periodType === 'monthly') period = 'month';
    else if (periodType === 'weekly') period = 'week';
    else throw new BadRequestException('Invalid periodType');

    if (period === 'year') {
      return this.getYearData(year);
    }

    if (period === 'month') {
      if (!month) throw new BadRequestException('month is required');
      const monthNumber = MONTH_MAP[month];
      if (!monthNumber) throw new BadRequestException(`Invalid month string: ${month}`);
      return this.getMonthData(year, monthNumber);
    }

    if (period === 'week') {
      if (!week) throw new BadRequestException('week is required');
      const weekNumber = parseWeek(week);
      return this.getWeekData(year, weekNumber);
    }
  }


  private async getYearData(year: number) {
  const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const results = await this.paymentModel.findAll({
      attributes: [
        [fn('MONTH', col('payment_date')), 'month'],
        'currency_paid',
        [fn('SUM', col('amount_paid')), 'total']
      ],
      where: {
        payment_date: {
          [Op.between]: [
            new Date(`${year}-01-01`),
            new Date(`${year}-12-31`)
          ]
        },
        status: 'Completed'
      },
      group: ['month', 'currency_paid'],
      raw: true
    });

    return this.formatAggregatedResults(labels, results, 'month');
  }


  private async getMonthData(year: number, month: number) {
    const start = dayjs(`${year}-${month}-01`).startOf('month');
    const end = start.endOf('month');

    const startWeek = start.isoWeek();
    let endWeek = end.isoWeek();

    if (endWeek < startWeek) {
      endWeek = dayjs(`${year}-12-31`).isoWeek() + 1;
    }

    const weekCount = endWeek - startWeek + 1;

    const labels = Array.from({ length: weekCount }, (_, i) => `Week ${i + 1}`);

    const payments = await this.paymentModel.findAll({
      attributes: ['amount_paid', 'currency_paid', 'payment_date'],
      where: {
        payment_date: {
          [Op.between]: [start.toDate(), end.toDate()]
        },
        status: 'Completed'
      },
      raw: true
    });

    const currencies = ['USD', 'JOD', 'ILS'];

    const dataMap: Record<string, number[]> = {
      USD: Array(weekCount).fill(0),
      JOD: Array(weekCount).fill(0),
      ILS: Array(weekCount).fill(0),
    };

    payments.forEach((p: any) => {
      const date = dayjs(p.payment_date);
      let weekNum = date.isoWeek();

      if (weekNum < startWeek) {
        weekNum = endWeek;
      }

      const weekIndex = weekNum - startWeek;

      if (weekIndex >= 0 && weekIndex < weekCount) {
        dataMap[p.currency_paid][weekIndex] += parseFloat(p.amount_paid);
      }
    });

    const datasets = currencies.map((c, i) => ({
      label: c,
      data: dataMap[c],
    }));

    return { labels, datasets };
  }


  private async getWeekData(year: number, week: number) {
    const start = dayjs().year(year).isoWeek(week).startOf('week');
    const end = dayjs().year(year).isoWeek(week).endOf('week');

    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const results = await this.paymentModel.findAll({
      attributes: [
        [fn('DAYOFWEEK', col('payment_date')), 'day'],
        'currency_paid',
        [fn('SUM', col('amount_paid')), 'total']
      ],
      where: {
        payment_date: {
          [Op.between]: [start.toDate(), end.toDate()]
        },
        status: 'Completed'
      },
      group: ['day', 'currency_paid'],
      raw: true
    });

    const currencies = ['USD', 'JOD', 'ILS'];

    const dataMap: Record<string, number[]> = {
      USD: Array(7).fill(0),
      JOD: Array(7).fill(0),
      ILS: Array(7).fill(0),
    };

    results.forEach((r: any) => {
      const dayNum = Number(r.day); 
      const index = (dayNum + 5) % 7;

      dataMap[r.currency_paid][index] = parseFloat(r.total);
    });

    const datasets = currencies.map((c, i) => ({
      label: c,
      data: dataMap[c],
    }));

    return { labels, datasets };
  }


  private formatAggregatedResults(labels: string[], rows: any[], field: 'month' | 'week' | 'day') {
    const currencies = ['USD', 'JOD', 'ILS'];

    const dataMap: Record<string, number[]> = {
      USD: Array(labels.length).fill(0),
      JOD: Array(labels.length).fill(0),
      ILS: Array(labels.length).fill(0),
    };

    rows.forEach(r => {
      const index = Number(r[field]) - 1;
      if (index >= 0 && index < labels.length) {
        dataMap[r.currency_paid][index] = parseFloat(r.total);
      }
    });

    const datasets = currencies.map((c, i) => ({
      label: c,
      data: dataMap[c],
    }));

    return { labels, datasets };
  }

 
 

   async getDailyTrends(
    periodType: 'weekly' | 'monthly',
    year: number,
    month?: string,
    week?: string
  ) {
    if (!year) throw new BadRequestException('year is required');

    if (periodType === 'monthly') {
      if (!month) throw new BadRequestException('month is required');
      const monthNum = MONTH_MAP[month];
      if (!monthNum) throw new BadRequestException(`Invalid month string: ${month}`);
      return this.getMonthlyTrends(year, monthNum);
    }

    if (periodType === 'weekly') {
      if (!week) throw new BadRequestException('week is required');
      const weekNum = parseWeek(week);
      return this.getWeeklyTrends(year, weekNum);
    }

    throw new BadRequestException('Invalid periodType');
  }


  private async getMonthlyTrends(year: number, monthNum: number) {
    const start = dayjs(`${year}-${monthNum}-01`);
    const end = start.endOf('month');

    const daysCount = end.date(); 
    const labels = Array.from({ length: daysCount }, (_, i) => `Day ${i + 1}`);

    const results = await this.paymentModel.findAll({
      attributes: [
        [fn('DAY', col('payment_date')), 'day'],
        'status',
        [fn('COUNT', col('payment_id')), 'count'],
      ],
      where: {
        payment_date: { [Op.between]: [start.toDate(), end.toDate()] },
      },
      group: ['day', 'status'],
      raw: true,
    });

    const successful = Array(daysCount).fill(0);
    const failed = Array(daysCount).fill(0);

    results.forEach((r: any) => {
      const dayIndex = Number(r.day) - 1;
      const count = Number(r.count);

      if (r.status === 'Completed') successful[dayIndex] = count;
      if (r.status === 'Failed') failed[dayIndex] = count;
    });

    return {
      labels,
      datasets: [
        { label: 'Successful', data: successful },
        { label: 'Failed', data: failed },
      ],
    };
  }


  private async getWeeklyTrends(year: number, weekNum: number) {
    const start = dayjs().year(year).isoWeek(weekNum).startOf('week');
    const end = dayjs().year(year).isoWeek(weekNum).endOf('week');

    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const results = await this.paymentModel.findAll({
      attributes: [
        [fn('DAYOFWEEK', col('payment_date')), 'day'], 
        'status',
        [fn('COUNT', col('payment_id')), 'count'],
      ],
      where: {
        payment_date: { [Op.between]: [start.toDate(), end.toDate()] },
      },
      group: ['day', 'status'],
      raw: true,
    });

    const successful = Array(7).fill(0);
    const failed = Array(7).fill(0);

    results.forEach((r: any) => {
      const dayNum = Number(r.day);
      const index = (dayNum + 5) % 7; 

      const count = Number(r.count);

      if (r.status === 'Completed') successful[index] = count;
      if (r.status === 'Failed') failed[index] = count;
    });

    return {
      labels,
      datasets: [
        { label: 'Successful', data: successful },
        { label: 'Failed', data: failed },
      ],
    };
  }


  async getPaymentComparison(
    periodType: 'weekly' | 'monthly',
    year: number,
    month?: string,
    week?: string
  ) {
    if (!year) throw new BadRequestException('year is required');

    if (periodType === 'monthly') {
      if (!month) throw new BadRequestException('month is required');
      const monthNum = MONTH_MAP[month];
      if (!monthNum) throw new BadRequestException(`Invalid month: ${month}`);
      return this.getMonthlyComparison(year, monthNum);
    }

    if (periodType === 'weekly') {
      if (!week) throw new BadRequestException('week is required');
      const weekNum = parseWeek(week);
      return this.getWeeklyComparison(year, weekNum);
    }
  }


  private async getMonthlyComparison(year: number, monthNum: number) {
    const start = dayjs(`${year}-${monthNum}-01`).startOf('month');
    const end = start.endOf('month');

    const startWeek = start.isoWeek();
    let endWeek = end.isoWeek();

    if (endWeek < startWeek) {
      endWeek = dayjs(`${year}-12-31`).isoWeek() + 1;
    }

    const weekCount = endWeek - startWeek + 1;
    const labels = Array.from({ length: weekCount }, (_, i) => `Week ${i + 1}`);

    const payments = await this.paymentModel.findAll({
      attributes: ['amount_paid', 'status', 'payment_date'],
      where: {
        payment_date: { [Op.between]: [start.toDate(), end.toDate()] },
      },
      raw: true,
    });

    const totalAmount = Array(weekCount).fill(0);
    const transactionCount = Array(weekCount).fill(0);

    payments.forEach((p: any) => {
      const date = dayjs(p.payment_date);
      let weekNum = date.isoWeek();

      if (weekNum < startWeek) weekNum = endWeek;

      const idx = weekNum - startWeek;

      if (p.status === 'Completed') {
        totalAmount[idx] += Number(p.amount_paid);
        transactionCount[idx] += 1;
      }
    });

    return {
      labels,
      datasets: [
        { label: 'Total Amount ($)', data: totalAmount },
        { label: 'Transaction Count', data: transactionCount },
      ],
    };
  }


  private async getWeeklyComparison(year: number, weekNum: number) {
    const start = dayjs().year(year).isoWeek(weekNum).startOf('week');
    const end = dayjs().year(year).isoWeek(weekNum).endOf('week');

    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const results = await this.paymentModel.findAll({
  attributes: [
    'payment_method',
    'status',
    [literal('TIMESTAMPDIFF(SECOND, createdAt, updatedAt)'), 'processing_time']
  ],
  raw: true,
});


    const amountArr = Array(7).fill(0);
    const countArr = Array(7).fill(0);

    results.forEach((r: any) => {
      const dayNum = Number(r.day);
      const index = (dayNum + 5) % 7; 

      amountArr[index] = Number(r.amount);
      countArr[index] = Number(r.count);
    });

    return {
      labels,
      datasets: [
        { label: 'Total Amount ($)', data: amountArr },
        { label: 'Transaction Count', data: countArr },
      ],
    };
  }


  async getPerformance() {
  const methods = ['Stripe', 'Bank Transfer', 'Credit', 'Cash'];

  const results = await this.paymentModel.findAll({
    attributes: ['payment_method', 'status'],
    raw: true,
  });

  const successRate: Record<string, number> = {};
  const methodTotals: Record<string, number> = {};

  methods.forEach(m => {
    successRate[m] = 0;
    methodTotals[m] = 0;
  });

  results.forEach((r: any) => {
    const method = r.payment_method;
    if (!methods.includes(method)) return;

    methodTotals[method]++;

    if (r.status === 'Completed') {
      successRate[method]++;
    }
  });

  const successRateArr: number[] = [];

  methods.forEach(method => {
    const total = methodTotals[method];
    const success = successRate[method];

    const successPercent =
      total > 0 ? Number(((success / total) * 100).toFixed(2)) : 0;

    successRateArr.push(successPercent);
  });

  return {
    labels: methods,
    datasets: [
      {
        label: 'Success Rate (%)',
        data: successRateArr,
      },
    ],
  };
}


async getSuccessRate(year: number) {
    const payments = await this.paymentModel.findAll({
      attributes: ['status', 'payment_date'],
      where: {
        payment_date: {
          [Op.between]: [
            new Date(`${year}-01-01`),
            new Date(`${year}-12-31`)
          ]
        }
      },
      raw: true
    });

    const total = payments.length;

    if (total === 0) {
      return {
        successRate: 0,
        totalTransactions: 0,
        successful: 0,
        failed: 0,
      };
    }

    const successful = payments.filter(p => p.status === 'Completed').length;
    const failed = total - successful;

    const successRate = Number(((successful / total) * 100).toFixed(2));

    return {
      successRate,
      totalTransactions: total,
      successful,
      failed,
    };
  }


  async getExchangeImpact(
  periodType: 'weekly' | 'monthly' | 'yearly',
  year: number,
  month?: string,
  week?: string
) {
  let start: Date = new Date();
  let end: Date = new Date();


  if (periodType === 'yearly') {
    start = new Date(`${year}-01-01`);
    end = new Date(`${year}-12-31`);
  }


  else if (periodType === 'monthly') {
    if (!month) throw new BadRequestException("Month is required");

    const monthNum = MONTH_MAP[month];
    const d = dayjs(`${year}-${monthNum}-01`);

    start = d.startOf('month').toDate();
    end = d.endOf('month').toDate();
  }


  else if (periodType === 'weekly') {
    if (!week) throw new BadRequestException("Week is required");

    const weekNum = Number(week.replace("Week ", ""));
    const d = dayjs().year(year).isoWeek(weekNum);

    start = d.startOf('week').toDate();
    end = d.endOf('week').toDate();
  }


  const rows = await this.paymentModel.findAll({
    attributes: [
      'currency',       
      'currency_paid',  
      [fn('SUM', col('currency_difference')), 'impact']
    ],
    where: {
      payment_date: { [Op.between]: [start, end] },
      status: 'Completed'
    },
    group: ['currency', 'currency_paid'],
    raw: true,
  });

  const labels: string[] = [];
  const values: number[] = [];

  (rows as any[]).forEach(r => {
    const label = `${r.currency} → ${r.currency_paid}`;
    labels.push(label);
    values.push(Number(r.impact));  
  });

  return {
    labels,
    datasets: [
      {
        label: "Profit",
        data: values
      }
    ]
  };
}

async getPaymentSummary() {
  const payments = await this.paymentModel.findAll({
    attributes: ['status', 'amount_paid'],
    raw: true,
  });

  const totalProcessed = payments.length;

  const successfulPayments = payments.filter(
    p => p.status?.toString().toLowerCase() === 'completed'
  );

  const failedPayments = payments.filter(
    p => p.status?.toString().toLowerCase() === 'failed'
  );

  const pendingPayments = payments.filter(
    p => p.status?.toString().toLowerCase() === 'pending'
  );

  const totalAmount = successfulPayments.reduce(
    (sum, p) => sum + Number(p.amount_paid || 0),
    0
  );

  const completedOrFailed = successfulPayments.length + failedPayments.length;

  const successRate =
    completedOrFailed > 0
      ? Number(((successfulPayments.length / completedOrFailed) * 100).toFixed(2))
      : 0;

  return {
    totalProcessed,                 
    successfulPayments: successfulPayments.length,
    failedPayments: failedPayments.length,
    pendingPayments: pendingPayments.length,
    totalAmount,           
    successRate,
  };
}



}

