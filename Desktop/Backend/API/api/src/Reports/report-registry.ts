import { ReportDefinition, ReportType, ReportOutputType } from './report-types';
import { Sequelize } from 'sequelize-typescript';

/**
 * سجل التقارير - لتسجيل وإدارة جميع التقارير المتاحة
 * يمكن إضافة تقارير جديدة بسهولة هنا
 */
export class ReportRegistry {
  private static reports: Map<string, ReportDefinition> = new Map();

  /**
   * تسجيل تقرير جديد
   */
  static registerReport(report: ReportDefinition): void {
    this.reports.set(report.id, report);
  }

  /**
   * الحصول على تقرير بالمعرف
   */
  static getReport(reportId: string): ReportDefinition | undefined {
    return this.reports.get(reportId);
  }

  /**
   * الحصول على جميع التقارير
   */
  static getAllReports(): ReportDefinition[] {
    return Array.from(this.reports.values());
  }

  /**
   * الحصول على التقارير المتاحة لدور معين
   */
  static getReportsForRole(role: string): ReportDefinition[] {
    return Array.from(this.reports.values()).filter(
      (report) => !report.allowedRoles || report.allowedRoles.includes(role)
    );
  }

  /**
   * تهيئة التقارير الافتراضية
   */
  static initializeReports(sequelize: Sequelize): void {
    // ============================================
    // تقارير جاهزة (Pre-built Reports)
    // ============================================

    // 1. تقرير طلبات الشراء
    this.registerReport({
      id: 'purchase_orders_summary',
      name: 'ملخص طلبات الشراء',
      description: 'تقرير شامل عن جميع طلبات الشراء مع إحصائيات',
      type: ReportType.PRE_BUILT,
      outputType: ReportOutputType.DATA,
      allowedRoles: ['Admin', 'Finance', 'Accountant'],
      dataFetcher: async (params: any) => {
        const { startDate, endDate, status } = params;
        let query = `
          SELECT 
            po.po_number,
            po.status,
            po.total_amount,
            po.created_at,
            s.supplier_name,
            COUNT(poi.item_id) as items_count
          FROM purchaseorders po
          LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
          LEFT JOIN purchaseorderitems poi ON po.po_id = poi.po_id
          WHERE 1=1
        `;
        
        const replacements: any = {};
        if (startDate) {
          query += ' AND po.created_at >= :startDate';
          replacements.startDate = startDate;
        }
        if (endDate) {
          query += ' AND po.created_at <= :endDate';
          replacements.endDate = endDate;
        }
        if (status) {
          query += ' AND po.status = :status';
          replacements.status = status;
        }
        
        query += ' GROUP BY po.po_id ORDER BY po.created_at DESC LIMIT 100';
        
        const [results] = await sequelize.query(query, { replacements });
        return results;
      },
      parameters: [
        {
          name: 'startDate',
          type: 'date',
          required: false,
          description: 'تاريخ البداية',
        },
        {
          name: 'endDate',
          type: 'date',
          required: false,
          description: 'تاريخ النهاية',
        },
        {
          name: 'status',
          type: 'select',
          required: false,
          description: 'حالة طلب الشراء',
          options: [
            { label: 'معلق', value: 'pending' },
            { label: 'موافق عليه', value: 'approved' },
            { label: 'مرفوض', value: 'rejected' },
          ],
        },
      ],
    });

    // 2. تقرير الفواتير
    this.registerReport({
      id: 'supplier_invoices_summary',
      name: 'ملخص فواتير الموردين',
      description: 'تقرير عن فواتير الموردين والمدفوعات',
      type: ReportType.PRE_BUILT,
      outputType: ReportOutputType.DATA,
      allowedRoles: ['Admin', 'Finance', 'Accountant'],
      dataFetcher: async (params: any) => {
        const { startDate, endDate } = params;
        let query = `
          SELECT 
            si.invoice_id,
            si.invoice_number,
            si.po_number,
            si.total_amount,
            si.status,
            si.created_at,
            s.supplier_name,
            (SELECT SUM(amount) FROM payments WHERE invoice_id = si.invoice_id) as paid_amount
          FROM supplier_invoices si
          LEFT JOIN suppliers s ON si.supplier_id = s.supplier_id
          WHERE 1=1
        `;
        
        const replacements: any = {};
        if (startDate) {
          query += ' AND si.created_at >= :startDate';
          replacements.startDate = startDate;
        }
        if (endDate) {
          query += ' AND si.created_at <= :endDate';
          replacements.endDate = endDate;
        }
        
        query += ' ORDER BY si.created_at DESC LIMIT 100';
        
        const [results] = await sequelize.query(query, { replacements });
        return results;
      },
      parameters: [
        {
          name: 'startDate',
          type: 'date',
          required: false,
          description: 'تاريخ البداية',
        },
        {
          name: 'endDate',
          type: 'date',
          required: false,
          description: 'تاريخ النهاية',
        },
      ],
    });

    // 3. تقرير المخزون
    this.registerReport({
      id: 'stock_summary',
      name: 'ملخص المخزون',
      description: 'تقرير عن حالة المخزون الحالية',
      type: ReportType.PRE_BUILT,
      outputType: ReportOutputType.DATA,
      dataFetcher: async () => {
        const query = `
          SELECT 
            item_name,
            barcode,
            SUM(quantity) as total_quantity,
            AVG(unit_price) as avg_price
          FROM stock
          GROUP BY item_name, barcode
          ORDER BY total_quantity DESC
          LIMIT 100
        `;
        const [results] = await sequelize.query(query);
        return results;
      },
    });

    // ============================================
    // تقارير تحليلية (AI Analytical Reports)
    // ============================================

    // 4. تحليل أداء الموردين
    this.registerReport({
      id: 'supplier_performance_analysis',
      name: 'تحليل أداء الموردين',
      description: 'تحليل شامل لأداء الموردين باستخدام الذكاء الاصطناعي',
      type: ReportType.AI_ANALYTICAL,
      outputType: ReportOutputType.AI_ANALYSIS,
      allowedRoles: ['Admin', 'Finance'],
      requiresAIAnalysis: true,
      dataFetcher: async (params: any) => {
        const query = `
          SELECT 
            s.supplier_name,
            COUNT(DISTINCT po.po_id) as total_orders,
            SUM(po.total_amount) as total_order_amount,
            COUNT(DISTINCT si.invoice_id) as total_invoices,
            SUM(si.total_amount) as total_invoice_amount,
            AVG(DATEDIFF(si.created_at, po.created_at)) as avg_delivery_days
          FROM suppliers s
          LEFT JOIN purchaseorders po ON s.supplier_id = po.supplier_id
          LEFT JOIN supplier_invoices si ON po.po_number = si.po_number
          GROUP BY s.supplier_id, s.supplier_name
          HAVING total_orders > 0
          ORDER BY total_order_amount DESC
        `;
        const [results] = await sequelize.query(query);
        return results;
      },
      parameters: [
        {
          name: 'minOrders',
          type: 'number',
          required: false,
          description: 'الحد الأدنى لعدد الطلبات',
          defaultValue: 1,
        },
      ],
    });

    // 5. تحليل تدفق الأموال
    this.registerReport({
      id: 'cash_flow_analysis',
      name: 'تحليل تدفق الأموال',
      description: 'تحليل تدفق الأموال والمدفوعات باستخدام الذكاء الاصطناعي',
      type: ReportType.AI_ANALYTICAL,
      outputType: ReportOutputType.AI_ANALYSIS,
      allowedRoles: ['Admin', 'Finance'],
      requiresAIAnalysis: true,
      dataFetcher: async (params: any) => {
        const { startDate, endDate } = params;
        let query = `
          SELECT 
            DATE(p.created_at) as payment_date,
            SUM(p.amount) as daily_payment,
            COUNT(DISTINCT p.invoice_id) as invoices_count,
            (SELECT SUM(total_amount) FROM supplier_invoices 
             WHERE DATE(created_at) = DATE(p.created_at)) as daily_invoices
          FROM payments p
          WHERE 1=1
        `;
        
        const replacements: any = {};
        if (startDate) {
          query += ' AND p.created_at >= :startDate';
          replacements.startDate = startDate;
        }
        if (endDate) {
          query += ' AND p.created_at <= :endDate';
          replacements.endDate = endDate;
        }
        
        query += ' GROUP BY DATE(p.created_at) ORDER BY payment_date DESC LIMIT 30';
        
        const [results] = await sequelize.query(query, { replacements });
        return results;
      },
      parameters: [
        {
          name: 'startDate',
          type: 'date',
          required: false,
          description: 'تاريخ البداية',
        },
        {
          name: 'endDate',
          type: 'date',
          required: false,
          description: 'تاريخ النهاية',
        },
      ],
    });

    // 6. تحليل المخزون والتنبؤ
    this.registerReport({
      id: 'inventory_analysis',
      name: 'تحليل المخزون والتنبؤ',
      description: 'تحليل شامل للمخزون مع توصيات باستخدام الذكاء الاصطناعي',
      type: ReportType.AI_ANALYTICAL,
      outputType: ReportOutputType.BOTH,
      requiresAIAnalysis: true,
      dataFetcher: async () => {
        const query = `
          SELECT 
            s.item_name,
            s.barcode,
            SUM(s.quantity) as current_stock,
            AVG(s.unit_price) as avg_price,
            (SELECT SUM(quantity) FROM purchaseorderitems poi 
             JOIN purchaseorders po ON poi.po_id = po.po_id 
             WHERE poi.item_name = s.item_name AND poi.barcode = s.barcode 
             AND po.status = 'approved') as pending_orders,
            (SELECT SUM(quantity) FROM goods_receipt_items gri 
             JOIN goods_receipts gr ON gri.gr_id = gr.gr_id 
             WHERE gri.item_name = s.item_name AND gri.barcode = s.barcode 
             AND gr.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as received_last_month
          FROM stock s
          GROUP BY s.item_name, s.barcode
          ORDER BY current_stock DESC
          LIMIT 50
        `;
        const [results] = await sequelize.query(query);
        return results;
      },
    });
  }
}

