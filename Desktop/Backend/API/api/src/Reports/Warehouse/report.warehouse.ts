import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Stock } from '../../Stock/stock.model';
import { fn, col, Op, literal } from 'sequelize';
import { GoodsReceipts } from 'src/GoodsReceipt/GoodsReceipt.model';
import { GoodsReceiptItem } from 'src/GoodsReceipt/GoodsReceiptItem.model';
import { DeliveryNote } from 'src/DeliveryNote/delivery-note.model';
import { PurchaseOrderItem } from 'src/PO/PoItem.model';
import { PurchaseOrder } from 'src/PO/po.model';
import { HistoryLog } from 'src/History/history-log.model';


@Injectable()
export class warehouseReportService {
  constructor(
    @InjectModel(Stock)
    private stockModel: typeof Stock,
     @InjectModel(GoodsReceipts)
    private grModel: typeof GoodsReceipts,
    @InjectModel(PurchaseOrderItem)
    private poItemModel: typeof PurchaseOrderItem,
    @InjectModel(GoodsReceiptItem)
    private grItemModel: typeof GoodsReceiptItem,
    @InjectModel(HistoryLog)
    private historyLogModel: typeof HistoryLog,
  ) {}

  async getStockStatusDistribution(year?: number) {
    const where: any = {};

    // لو حابة تضيفي فلترة سنة (اختياري)
    if (year) {
      where.createdAt = {
        [Op.between]: [
          new Date(`${year}-01-01`),
          new Date(`${year}-12-31`),
        ],
      };
    }

    const results = await this.stockModel.findAll({
      attributes: [
        'status',
        [fn('COUNT', col('stock_id')), 'count'],
      ],
      where,
      group: ['status'],
      raw: true,
    });

    // default values
    const summary = {
      Available: 0,
      OutOfStock: 0,
      Expired: 0,
      Reserved: 0,
    };

    results.forEach((r: any) => {
      if (summary[r.status] !== undefined) {
        summary[r.status] = Number(r.count);
      }
    });

    return summary;
  }


  async getStockByExpirationRange() {
    const stocks = await this.stockModel.findAll({
      attributes: ['expiration_date', 'quantity'],
      raw: true,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = {
      expired: 0,
      within30Days: 0,
      within90Days: 0,
      moreThan90Days: 0,
      noExpiration: 0,
    };

    stocks.forEach((item: any) => {
      const qty = Number(item.quantity) || 0;

      if (!item.expiration_date) {
        result.noExpiration += qty;
        return;
      }

      const expDate = new Date(item.expiration_date);
      expDate.setHours(0, 0, 0, 0);

      const diffDays =
        Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        result.expired += qty;
      } else if (diffDays <= 30) {
        result.within30Days += qty;
      } else if (diffDays <= 90) {
        result.within90Days += qty;
      } else {
        result.moreThan90Days += qty;
      }
    });

    return result;
  }

  async getTopProductsByQuantity() {
  const rows = await this.stockModel.findAll({
    attributes: [
      [fn('LOWER', col('item_name')), 'normalized_name'],
      [fn('SUM', col('quantity')), 'total_quantity'],
      [fn('MAX', col('unit')), 'unit'],
    ],
    where: {
      status: ['Available', 'Reserved'],
    },
    group: [fn('LOWER', col('item_name'))],   // ✅ بدون literal
    order: [[fn('SUM', col('quantity')), 'DESC']], // ✅ بدون literal
    limit: 10,
    raw: true,
  });

  return rows.map((r: any) => ({
    name: this.capitalize(r.normalized_name),
    quantity: Number(r.total_quantity),
    unit: r.unit ?? '',
  }));
}

  private capitalize(name: string) {
    if (!name) return name;
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  async getGoodsReceiptsTrend(
    periodType: 'monthly' | 'yearly',
    year?: number,
  ) {
    if (periodType === 'monthly') {
      if (!year) {
        throw new Error('Year is required for monthly trend');
      }

      const results = await this.grModel.findAll({
        attributes: [
          [fn('MONTH', col('gr_date')), 'month'],
          [fn('COUNT', col('gr_id')), 'count'],
        ],
        where: {
          gr_date: {
            [Op.between]: [
              new Date(`${year}-01-01`),
              new Date(`${year}-12-31`),
            ],
          },
        },
        group: [fn('MONTH', col('gr_date'))],
        raw: true,
      });

      // 12 months default = 0
      const monthly = Array(12).fill(0);

      results.forEach((r: any) => {
        const index = Number(r.month) - 1;
        monthly[index] = Number(r.count);
      });

      return {
        periodType: 'monthly',
        year,
        data: monthly,
      };
    }

    // ===== YEARLY =====
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 11 }, (_, i) => currentYear - i);

    const results = await this.grModel.findAll({
      attributes: [
        [fn('YEAR', col('gr_date')), 'year'],
        [fn('COUNT', col('gr_id')), 'count'],
      ],
      where: {
        gr_date: {
          [Op.between]: [
            new Date(`${years[years.length - 1]}-01-01`),
            new Date(`${years[0]}-12-31`),
          ],
        },
      },
      group: [fn('YEAR', col('gr_date'))],
      raw: true,
    });

    const yearlyMap: Record<number, number> = {};
    years.forEach(y => (yearlyMap[y] = 0));

    results.forEach((r: any) => {
      yearlyMap[Number(r.year)] = Number(r.count);
    });

    return {
      periodType: 'yearly',
      data: years.map(y => ({
        year: y,
        count: yearlyMap[y],
      })),
    };
  }

   async getStockAgingAnalysis() {
    const stocks = await this.stockModel.findAll({
    attributes: ['createdAt'],
    where: {
        status: ['Available', 'Reserved'],
    },
    raw: true,
    });


    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ranges = [
      { label: '0-30 Days', min: 0, max: 30, count: 0, },
      { label: '31-60 Days', min: 31, max: 60, count: 0, },
      { label: '61-90 Days', min: 61, max: 90, count: 0,  },
      { label: '91-180 Days', min: 91, max: 180, count: 0, },
      { label: '181+ Days', min: 181, max: Infinity, count: 0,},
    ];

    stocks.forEach((item: any) => {
      const createdDate = new Date(item.createdAt);
      createdDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor(
        (today.getTime() - createdDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      const range = ranges.find(r =>
        r.max === Infinity
          ? diffDays >= r.min
          : diffDays >= r.min && diffDays <= r.max,
      );

      if (range) range.count += 1;
    });

    return {
      labels: ranges.map(r => r.label),
      data: ranges.map(r => r.count),
    };
  }

  async getStockValueReport() {
    // 1️⃣ Get stock + delivery note (po_number)
    const stocks = await this.stockModel.findAll({
      where: {
        status: ['Available', 'Expired', 'Reserved'],
      },
      include: [
        {
          model: DeliveryNote,
          attributes: ['po_number'],
        },
      ],
    });

    if (!stocks.length) {
      return {
        Available: 0,
        Expired: 0,
        Reserved: 0,
        total: 0,
      };
    }

    // 2️⃣ Collect unique PO numbers
    const poNumbers = [
      ...new Set(
        stocks
          .map(s => s.delivery_note?.po_number)
          .filter(Boolean),
      ),
    ];

    if (!poNumbers.length) {
      return {
        Available: 0,
        Expired: 0,
        Reserved: 0,
        total: 0,
      };
    }

    // 3️⃣ Fetch all Purchase Orders for these PO numbers
    const purchaseOrders = await PurchaseOrder.findAll({
      where: {
        po_number: {
          [Op.in]: poNumbers,
        },
      },
      attributes: ['po_id', 'po_number'],
      raw: true,
    });

    if (!purchaseOrders.length) {
      return {
        Available: 0,
        Expired: 0,
        Reserved: 0,
        total: 0,
      };
    }

    // 4️⃣ Get all PO IDs
    const poIds = purchaseOrders.map(po => po.po_id);

    // 5️⃣ Fetch purchase order items (prices) for all PO IDs
    const poItems = await this.poItemModel.findAll({
      where: {
        po_id: {
          [Op.in]: poIds,
        },
      },
      attributes: ['po_id', 'item_name', 'unit_price'],
      raw: true,
    });

    // 6️⃣ Build PO number map (po_id -> po_number)
    const poNumberMap = new Map<number, string>();
    purchaseOrders.forEach((po: any) => {
      poNumberMap.set(po.po_id, po.po_number);
    });

    // 7️⃣ Build price map
    // key = po_number|item_name
    const priceMap = new Map<string, number>();

    poItems.forEach((item: any) => {
      const poNumber = poNumberMap.get(item.po_id);
      if (poNumber) {
        const key = `${poNumber}|${item.item_name.toLowerCase()}`;
        priceMap.set(key, Number(item.unit_price) || 0);
      }
    });

    // 8️⃣ Calculate values
    const result = {
      Available: 0,
      Expired: 0,
      Reserved: 0,
      total: 0,
    };

    stocks.forEach((stock: any) => {
      const qty = Number(stock.quantity) || 0;
      if (qty <= 0) return;

      const poNumber = stock.delivery_note?.po_number;
      if (!poNumber) return;

      const key = `${poNumber}|${stock.item_name.toLowerCase()}`;
      const unitPrice = priceMap.get(key) || 0;

      const value = qty * unitPrice;

      if (result[stock.status] !== undefined) {
        result[stock.status] += value;
        result.total += value;
      }
    });

    return result;
  }

  async getExpiredLossReport() {
    // 1️⃣ Get all expired stock items with delivery note
    const expiredStocks = await this.stockModel.findAll({
      where: {
        status: 'Expired',
      },
      include: [
        {
          model: DeliveryNote,
          attributes: ['po_number'],
        },
      ],
      attributes: ['stock_id', 'item_name', 'quantity', 'unit', 'expiration_date'],
    });

    if (!expiredStocks.length) {
      return {
        allItems: [],
        top5: [],
        totalLoss: 0,
        totalItems: 0,
      };
    }

    // 2️⃣ Collect unique PO numbers
    const poNumbers = [
      ...new Set(
        expiredStocks
          .map(s => s.delivery_note?.po_number)
          .filter(Boolean),
      ),
    ];

    if (!poNumbers.length) {
      return {
        allItems: [],
        top5: [],
        totalLoss: 0,
        totalItems: 0,
      };
    }

    // 3️⃣ Fetch all Purchase Orders with supplier info
    const purchaseOrders = await PurchaseOrder.findAll({
      where: {
        po_number: {
          [Op.in]: poNumbers,
        },
      },
      attributes: ['po_id', 'po_number', 'supplier_email', 'supplier_phone'],
      raw: true,
    });

    if (!purchaseOrders.length) {
      return {
        allItems: [],
        top5: [],
        totalLoss: 0,
        totalItems: 0,
      };
    }

    // 4️⃣ Get all PO IDs
    const poIds = purchaseOrders.map(po => po.po_id);

    // 5️⃣ Fetch purchase order items (prices)
    const poItems = await this.poItemModel.findAll({
      where: {
        po_id: {
          [Op.in]: poIds,
        },
      },
      attributes: ['po_id', 'item_name', 'unit_price'],
      raw: true,
    });

    // 6️⃣ Build PO number map and supplier map
    const poNumberMap = new Map<number, string>();
    const poSupplierMap = new Map<number, string>(); // po_id -> supplier identifier
    purchaseOrders.forEach((po: any) => {
      poNumberMap.set(po.po_id, po.po_number);
      // Use supplier email as supplier identifier (or extract supplier name if available)
      const supplierId = po.supplier_email ? po.supplier_email.split('@')[0] : `S${po.po_id}`;
      poSupplierMap.set(po.po_id, supplierId);
    });

    // 7️⃣ Build price map
    const priceMap = new Map<string, number>();
    poItems.forEach((item: any) => {
      const poNumber = poNumberMap.get(item.po_id);
      if (poNumber) {
        const key = `${poNumber}|${item.item_name.toLowerCase()}`;
        priceMap.set(key, Number(item.unit_price) || 0);
      }
    });

    // 8️⃣ Build PO number to PO ID map (for supplier lookup)
    const poNumberToPoIdMap = new Map<string, number>();
    purchaseOrders.forEach((po: any) => {
      poNumberToPoIdMap.set(po.po_number, po.po_id);
    });

    // 9️⃣ Calculate losses for each expired item
    const itemsWithLoss = expiredStocks
      .map((stock: any) => {
        const qty = Number(stock.quantity) || 0;
        if (qty <= 0) return null;

        const poNumber = stock.delivery_note?.po_number;
        if (!poNumber) return null;

        const key = `${poNumber}|${stock.item_name.toLowerCase()}`;
        const unitPrice = priceMap.get(key) || 0;
        const loss = qty * unitPrice;

        // Get supplier from PO
        const poId = poNumberToPoIdMap.get(poNumber);
        const supplier = poId ? poSupplierMap.get(poId) || '' : '';

        return {
          product: stock.item_name,
          quantity: qty,
          unitPrice: unitPrice,
          unit: stock.unit || '',
          category: '', // يمكن إضافتها من Item model لاحقاً
          supplier: supplier,
          loss: loss,
          expirationDate: stock.expiration_date,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.loss - a.loss); // Sort by loss descending

    const totalLoss = itemsWithLoss.reduce((sum: number, item: any) => sum + item.loss, 0);
    const top5 = itemsWithLoss.slice(0, 5);

    return {
      allItems: itemsWithLoss,
      top5: top5,
      totalLoss: totalLoss,
      totalItems: itemsWithLoss.length,
    };
  }

  async getSupplierImpactOnStock() {
    // 1️⃣ Get all expired stock items with delivery note and PO info
    const expiredStocks = await this.stockModel.findAll({
      where: {
        status: 'Expired',
      },
      include: [
        {
          model: DeliveryNote,
          attributes: ['po_number', 'dn_date', 'supplier_name'],
        },
      ],
      attributes: ['stock_id', 'item_name', 'quantity', 'unit', 'expiration_date'],
    });

    if (!expiredStocks.length) {
      return [];
    }

    // 2️⃣ Collect unique PO numbers
    const poNumbers = [
      ...new Set(
        expiredStocks
          .map(s => s.delivery_note?.po_number)
          .filter(Boolean),
      ),
    ];

    if (!poNumbers.length) {
      return [];
    }

    // 3️⃣ Fetch all Purchase Orders with order dates
    const purchaseOrders = await PurchaseOrder.findAll({
      where: {
        po_number: {
          [Op.in]: poNumbers,
        },
      },
      attributes: ['po_id', 'po_number', 'order_date'],
      raw: true,
    });

    if (!purchaseOrders.length) {
      return [];
    }

    // 4️⃣ Get all PO IDs
    const poIds = purchaseOrders.map(po => po.po_id);

    // 5️⃣ Fetch purchase order items (prices)
    const poItems = await this.poItemModel.findAll({
      where: {
        po_id: {
          [Op.in]: poIds,
        },
      },
      attributes: ['po_id', 'item_name', 'unit_price'],
      raw: true,
    });

    // 6️⃣ Build maps
    const poNumberMap = new Map<number, string>();
    const poOrderDateMap = new Map<number, Date>(); // po_id -> order_date
    const poNumberToPoIdMap = new Map<string, number>(); // po_number -> po_id

    purchaseOrders.forEach((po: any) => {
      poNumberMap.set(po.po_id, po.po_number);
      poOrderDateMap.set(po.po_id, po.order_date);
      poNumberToPoIdMap.set(po.po_number, po.po_id);
    });

    // 1️⃣0️⃣ Build price map
    const priceMap = new Map<string, number>();
    poItems.forEach((item: any) => {
      const poNumber = poNumberMap.get(item.po_id);
      if (poNumber) {
        const key = `${poNumber}|${item.item_name.toLowerCase()}`;
        priceMap.set(key, Number(item.unit_price) || 0);
      }
    });

    // 1️⃣1️⃣ Group expired stocks by supplier
    const supplierDataMap = new Map<string, {
      supplier: string;
      expiredItems: any[];
      totalExpiredValue: number;
      deliveryNotes: Set<string>; // Track unique delivery notes for delay calculation
      poNumbers: Set<string>; // Track unique PO numbers
    }>();

    expiredStocks.forEach((stock: any) => {
      const qty = Number(stock.quantity) || 0;
      if (qty <= 0) return;

      const poNumber = stock.delivery_note?.po_number;
      if (!poNumber) return;

      // Get supplier name directly from DeliveryNote
      const supplier = stock.delivery_note?.supplier_name || 'Unknown';
      const key = `${poNumber}|${stock.item_name.toLowerCase()}`;
      const unitPrice = priceMap.get(key) || 0;
      const loss = qty * unitPrice;

      if (!supplierDataMap.has(supplier)) {
        supplierDataMap.set(supplier, {
          supplier,
          expiredItems: [],
          totalExpiredValue: 0,
          deliveryNotes: new Set(),
          poNumbers: new Set(),
        });
      }

      const supplierData = supplierDataMap.get(supplier)!;
      supplierData.expiredItems.push({
        item_name: stock.item_name,
        quantity: qty,
        loss: loss,
      });
      supplierData.totalExpiredValue += loss;
      supplierData.deliveryNotes.add(stock.delivery_note?.dn_id?.toString() || '');
      supplierData.poNumbers.add(poNumber);
    });

    // 9️⃣ Calculate delay rate for each supplier
    // Get all delivery notes for these suppliers to calculate delays
    const allDeliveryNotes = await DeliveryNote.findAll({
      where: {
        po_number: {
          [Op.in]: Array.from(
            new Set(
              expiredStocks
                .map(s => s.delivery_note?.po_number)
                .filter(Boolean),
            ),
          ),
        },
      },
      attributes: ['dn_id', 'po_number', 'dn_date'],
      raw: true,
    });

    // Calculate delay rate: compare dn_date with po order_date
    const delayRates = new Map<string, number>(); // supplier -> delay rate

    supplierDataMap.forEach((data, supplier) => {
      let totalDelays = 0;
      let totalDeliveries = 0;

      data.poNumbers.forEach(poNumber => {
        const poId = poNumberToPoIdMap.get(poNumber);
        if (!poId) return;

        const orderDate = poOrderDateMap.get(poId);
        if (!orderDate) return;

        const deliveryNotesForPO = allDeliveryNotes.filter(dn => dn.po_number === poNumber);
        
        deliveryNotesForPO.forEach(dn => {
          totalDeliveries++;
          if (dn.dn_date && orderDate) {
            const orderDateObj = new Date(orderDate);
            const dnDateObj = new Date(dn.dn_date);
            const daysDiff = Math.max(0, (dnDateObj.getTime() - orderDateObj.getTime()) / (1000 * 60 * 60 * 24));
            
            // Consider delay if more than 7 days late
            if (daysDiff > 7) {
              totalDelays++;
            }
          }
        });
      });

      const delayRate = totalDeliveries > 0 
        ? Number(((totalDelays / totalDeliveries) * 100).toFixed(1))
        : 0;
      
      delayRates.set(supplier, delayRate);
    });

    // 1️⃣0️⃣ Calculate quality score (based on expired rate, delay rate, etc.)
    // Quality score formula: 5 - (expiredValue/100000 * 0.5) - (delayRate/20 * 1) - (expiredCount/50 * 0.3)
    // Clamped between 1 and 5
    const qualityScores = new Map<string, number>();

    supplierDataMap.forEach((data, supplier) => {
      const expiredCount = data.expiredItems.length;
      const delayRate = delayRates.get(supplier) || 0;
      
      // Calculate quality score (inverse of problems)
      let score = 5;
      score -= Math.min(2, (data.totalExpiredValue / 100000) * 0.5); // Max -2 for high expired value
      score -= Math.min(1.5, (delayRate / 20) * 1); // Max -1.5 for high delay rate
      score -= Math.min(1.5, (expiredCount / 50) * 0.3); // Max -1.5 for high expired count
      
      score = Math.max(1, Math.min(5, Number(score.toFixed(1)))); // Clamp between 1 and 5
      qualityScores.set(supplier, score);
    });

    // 1️⃣1️⃣ Build final result
    const result = Array.from(supplierDataMap.values()).map(data => {
      const supplier = data.supplier;
      const delayRate = delayRates.get(supplier) || 0;
      const qualityScore = qualityScores.get(supplier) || 3.0;

      return {
        supplier: supplier,
        expiredCount: data.expiredItems.length,
        expiredValue: Number(data.totalExpiredValue.toFixed(2)),
        delayRate: delayRate,
        qualityScore: qualityScore,
      };
    });

    // Sort by expired value (worst first)
    return result.sort((a, b) => b.expiredValue - a.expiredValue);
  }

  async getFastVsSlowMovingProducts() {
    // 1️⃣ Get all unique products from Stock with their total quantity
    const stockItems = await this.stockModel.findAll({
      attributes: [
        'item_name',
        [fn('SUM', col('quantity')), 'total_quantity'],
      ],
      group: ['item_name'],
      raw: true,
    });

    if (!stockItems.length) {
      return {
        products: [],
        distribution: {
          fast: 0,
          medium: 0,
          slow: 0,
          total: 0,
        },
      };
    }

    // 2️⃣ Get all stock movement logs (when items are taken from stock)
    const stockLogs = await this.historyLogModel.findAll({
      where: {
        action: 'Stock Quantity Updated',
      },
      attributes: ['description'],
      raw: true,
    });

    // 3️⃣ Extract item names from descriptions and count movements (case-insensitive)
    // Description format: "Stock of {item_name} decreased by {quantity}"
    const movementMap = new Map<string, number>(); // Key: lowercase item_name, Value: count
    
    stockLogs.forEach((log: any) => {
      const description = log.description || '';
      
      // Check if description matches the exact pattern
      if (description.startsWith('Stock of ') && description.includes(' decreased by ')) {
        // Extract item_name: "Stock of {item_name} decreased by {quantity}"
        // Split by " decreased by " and take the part after "Stock of "
        const parts = description.split(' decreased by ');
        if (parts.length >= 1) {
          const itemNamePart = parts[0]; // "Stock of {item_name}"
          if (itemNamePart.startsWith('Stock of ')) {
            const itemName = itemNamePart.substring(9).trim(); // Remove "Stock of " prefix
            if (itemName) {
              // Use lowercase for case-insensitive matching
              const itemNameLower = itemName.toLowerCase();
              const currentCount = movementMap.get(itemNameLower) || 0;
              movementMap.set(itemNameLower, currentCount + 1);
            }
          }
        }
      }
    });

    // 4️⃣ Build products array with classification
    const products = stockItems.map((item: any) => {
      const itemName = item.item_name;
      const quantity = Number(item.total_quantity) || 0;
      // Use lowercase for case-insensitive matching
      const movementCount = movementMap.get(itemName.toLowerCase()) || 0;

      // Classify by movement count
      let category: 'Fast' | 'Medium' | 'Slow';
      if (movementCount >= 20) {
        category = 'Fast';
      } else if (movementCount >= 10) {
        category = 'Medium';
      } else {
        category = 'Slow';
      }

      return {
        product: itemName,
        category: category,
        movementCount: movementCount,
        quantity: quantity,
      };
    });

    // 5️⃣ Calculate distribution
    const fast = products.filter(p => p.category === 'Fast').length;
    const medium = products.filter(p => p.category === 'Medium').length;
    const slow = products.filter(p => p.category === 'Slow').length;

    return {
      products: products.sort((a, b) => b.movementCount - a.movementCount), // Sort by movement count descending
      distribution: {
        fast: fast,
        medium: medium,
        slow: slow,
        total: products.length,
      },
    };
  }

  async getWarehouseSummary() {
    // 1️⃣ Get all stock items grouped by status
    const stockStatusCounts = await this.stockModel.findAll({
      attributes: [
        'status',
        [fn('COUNT', col('stock_id')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    // 2️⃣ Build status count map
    const statusMap = new Map<string, number>();
    stockStatusCounts.forEach((item: any) => {
      statusMap.set(item.status, Number(item.count) || 0);
    });

    // 3️⃣ Calculate totals
    const totalItems = stockStatusCounts.reduce((sum: number, item: any) => {
      return sum + (Number(item.count) || 0);
    }, 0);

    const availableItems = statusMap.get('Available') || 0;
    const outOfStockItems = statusMap.get('OutOfStock') || 0;
    const expiredItems = statusMap.get('Expired') || 0;
    const reservedItems = statusMap.get('Reserved') || 0;

    // 4️⃣ Get total goods receipts count
    const totalGoodsReceipts = await this.grModel.count();

    return {
      totalItems: totalItems,
      availableItems: availableItems,
      outOfStockItems: outOfStockItems,
      expiredItems: expiredItems,
      reservedItems: reservedItems,
      totalGoodsReceipts: totalGoodsReceipts,
    };
  }

}
