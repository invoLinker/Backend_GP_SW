  import { Injectable } from '@nestjs/common';
  import { InjectModel } from '@nestjs/sequelize';
  import { SupplierInvoice } from 'src/supplier-invoices/supplier-invoice.model';
  import { DeliveryNote } from 'src/DeliveryNote/delivery-note.model';
  import { GoodsReceipts } from 'src/GoodsReceipt/GoodsReceipt.model';
  import { Op, fn, col, where } from 'sequelize';
  import { Task } from 'src/Task/task.model';

  @Injectable()
  export class AccountingReportsService {
    constructor(
      @InjectModel(SupplierInvoice) private invoiceModel: typeof SupplierInvoice,
      @InjectModel(DeliveryNote) private dnModel: typeof DeliveryNote,
      @InjectModel(GoodsReceipts) private grModel: typeof GoodsReceipts,
      @InjectModel(Task) private taskModel: typeof Task,
    ) {}


    async getAuditStats(year: number) {
      const invoiceVerifiedStatuses = ['ReadyForPaid', 'Partial_paid', 'Paid'];

      const verified = await this.countStatuses({
        dn: 'Verified',
        gr: 'Verified',
        inv: invoiceVerifiedStatuses,
        year,  
      });

      const pending = await this.countStatuses({
        dn: 'Pending',
        gr: 'Pending',
        inv: 'Pending',
        year,  
      });

      const incidentDN = await this.dnModel.count({
        where: {
          status: 'Incident',
          [Op.and]: where(fn("YEAR", col("createdAt")), year)   
        }
      });

      const incidentGR = await this.grModel.count({
        where: {
          status: 'Incident',
          [Op.and]: where(fn("YEAR", col("createdAt")), year)
        }
      });

      const incidentINV = await this.invoiceModel.count({
        where: {
          status: 'Incident',
          [Op.and]: where(fn("YEAR", col("createdAt")), year)
        }
      });

      const incident = incidentDN + incidentGR + incidentINV;

      return {
        total: verified + pending + incident,
        verified,
        pending,
        incident,
      };
    }


      private async countStatuses(statusMap: {
    dn: string | string[];
    gr: string | string[];
    inv: string | string[];
    year: number;                       
  }) {
    const { year } = statusMap;

    const [dn, gr, inv] = await Promise.all([
      this.dnModel.count({
        where: {
          status: Array.isArray(statusMap.dn)
            ? { [Op.in]: statusMap.dn }
            : statusMap.dn,
          [Op.and]: where(fn("YEAR", col("createdAt")), year),
        },
      }),

      this.grModel.count({
        where: {
          status: Array.isArray(statusMap.gr)
            ? { [Op.in]: statusMap.gr }
            : statusMap.gr,
          [Op.and]: where(fn("YEAR", col("createdAt")), year), 
        },
      }),

      this.invoiceModel.count({
        where: {
          status: Array.isArray(statusMap.inv)
            ? { [Op.in]: statusMap.inv }
            : statusMap.inv,
          [Op.and]: where(fn("YEAR", col("createdAt")), year),
        },
      }),
    ]);

    return dn + gr + inv;
  }


  async getVerificationByType(year: number) {
    const invoiceVerified = ['ReadyForPaid', 'Partial_paid', 'Paid'];

    const data: {
      labels: string[];
      verified: number[];
      pending: number[];
      incident: number[];
    } = {
      labels: ['Supplier Invoice', 'Delivery Note', 'Goods Receipt'],
      verified: [],
      pending: [],
      incident: [],
    };

    data.verified.push(
      await this.invoiceModel.count({
        where: {
          status: { [Op.in]: invoiceVerified },
          [Op.and]: where(fn("YEAR", col("createdAt")), year)
        }
      })
    );

    data.pending.push(
      await this.invoiceModel.count({
        where: {
          status: 'Pending',
          [Op.and]: where(fn("YEAR", col("createdAt")), year)
        }
      })
    );

    data.incident.push(
      await this.invoiceModel.count({
        where: {
          status: 'Incident',
          [Op.and]: where(fn("YEAR", col("createdAt")), year)
        }
      })
    );

    data.verified.push(
      await this.dnModel.count({
        where: {
          status: 'Verified',
          [Op.and]: where(fn("YEAR", col("createdAt")), year)
        }
      })
    );

    data.pending.push(
      await this.dnModel.count({
        where: {
          status: 'Pending',
          [Op.and]: where(fn("YEAR", col("createdAt")), year)
        }
      })
    );

    data.incident.push(
      await this.dnModel.count({
        where: {
          status: 'Incident',
          [Op.and]: where(fn("YEAR", col("createdAt")), year)
        }
      })
    );

    data.verified.push(
      await this.grModel.count({
        where: {
          status: 'Verified',
          [Op.and]: where(fn("YEAR", col("createdAt")), year)
        }
      })
    );

    data.pending.push(
      await this.grModel.count({
        where: {
          status: 'Pending',
          [Op.and]: where(fn("YEAR", col("createdAt")), year)
        }
      })
    );

    data.incident.push(
      await this.grModel.count({
        where: {
          status: 'Incident',
          [Op.and]: where(fn("YEAR", col("createdAt")), year)
        }
      })
    );

    return data;
  }



  async getMonthlyTrend(year: number) {
    const invoiceVerified = ['ReadyForPaid', 'Partial_paid', 'Paid'];

    const monthly = {
      verified: [] as number[],
      pending: [] as number[],
      incident: [] as number[],
      labels: [] as string[],
    };

    const baseDate = new Date(year, 11, 1); 

    for (let i = 11; i >= 0; i--) {
      const start = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
      const end = new Date(baseDate.getFullYear(), baseDate.getMonth() - i + 1, 1);

      const label = start.toLocaleString('en-US', { month: 'short' });

      const verified = await Promise.all([
        this.dnModel.count({
          where: { status: 'Verified', updatedAt: { [Op.between]: [start, end] } },
        }),

        this.grModel.count({
          where: { status: 'Verified', updatedAt: { [Op.between]: [start, end] } },
        }),

        this.invoiceModel.count({
          where: {
            status: { [Op.in]: invoiceVerified },
            updatedAt: { [Op.between]: [start, end] },
          },
        }),
      ]);

      const verifiedTotal = verified.reduce((a, b) => a + b, 0);

      const pending = await Promise.all([
        this.dnModel.count({
          where: { status: 'Pending', updatedAt: { [Op.between]: [start, end] } },
        }),
        this.grModel.count({
          where: { status: 'Pending', updatedAt: { [Op.between]: [start, end] } },
        }),
        this.invoiceModel.count({
          where: { status: 'Pending', updatedAt: { [Op.between]: [start, end] } },
        }),
      ]);

      const pendingTotal = pending.reduce((a, b) => a + b, 0);

      const incident = await Promise.all([
        this.dnModel.count({
          where: { status: 'Incident', updatedAt: { [Op.between]: [start, end] } },
        }),
        this.grModel.count({
          where: { status: 'Incident', updatedAt: { [Op.between]: [start, end] } },
        }),
        this.invoiceModel.count({
          where: { status: 'Incident', updatedAt: { [Op.between]: [start, end] } },
        }),
      ]);

      const incidentTotal = incident.reduce((a, b) => a + b, 0);

      monthly.labels.push(label);
      monthly.verified.push(verifiedTotal);
      monthly.pending.push(pendingTotal);
      monthly.incident.push(incidentTotal);
    }

    return monthly;
  }



    async getTaskPerformance(full_name : string) {
      const completed = await this.taskModel.count({where : { status:'Completed',assignedTo: full_name}});
      const inProgress = await this.taskModel.count({where : { status:'In Progress', assignedTo: full_name}});
      const pending = await this.taskModel.count({where : { status:'Pending', assignedTo: full_name}});

      return {
        completed,
        inProgress,
        pending,
        total: completed + inProgress + pending,
      };
    }

  async getVerificationAndTaskAveragesForUser(userName: string) {
    const invoiceVerified = ['ReadyForPaid', 'Partial_paid', 'Paid'];

    const calcAvg = (rows: any[]) => {
      if (!rows.length) return 0;

      const totalDays = rows.reduce((sum, r) => {
        const created = new Date(r.createdAt).getTime();
        const updated = new Date(r.updatedAt).getTime();
        const diffDays = (updated - created) / (1000 * 60 * 60 * 24);
        return sum + diffDays;
      }, 0);

      return Number((totalDays / rows.length).toFixed(2));
    };

    const [verifiedInvoices, verifiedDN, verifiedGR] = await Promise.all([
      this.invoiceModel.findAll({
        where: { status: { [Op.in]: invoiceVerified } },
        attributes: ['createdAt', 'updatedAt'],
        raw: true,
      }),
      this.dnModel.findAll({
        where: { status: 'Verified' },
        attributes: ['createdAt', 'updatedAt'],
        raw: true,
      }),
      this.grModel.findAll({
        where: { status: 'Verified' },
        attributes: ['createdAt', 'updatedAt'],
        raw: true,
      }),
    ]);

    const allVerifiedDocs = [...verifiedInvoices, ...verifiedDN, ...verifiedGR];
    const verificationAvg = calcAvg(allVerifiedDocs);


    const tasks = await this.taskModel.findAll({
    where: { assignedTo: userName }
      });

      const completedTasks = await this.taskModel.findAll({
      where: { status: 'Completed', assignedTo: userName }
      });

      const total = tasks.length;
      const comp = completedTasks.length;

      const taskAvg =
      total === 0 ? 0 : Number(((comp / total) * 100).toFixed(2));

    return {
      verificationAvg,
      taskAvg,
    };
  }


  }
