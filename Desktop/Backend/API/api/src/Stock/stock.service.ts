// src/stock/stock.service.ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Stock } from './stock.model';
import { SupplierInvoice } from 'src/supplier-invoices/supplier-invoice.model';
import { GoodsReceipts } from 'src/GoodsReceipt/GoodsReceipt.model';
import { UpdateStockDto } from './UpdateStockDTO';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Op } from 'sequelize';
import { FilterStockDto } from './FilterStockDto';


@Injectable()
export class StockService {
  constructor(
    @InjectModel(Stock) private stockModel: typeof Stock,
    @InjectModel(SupplierInvoice) private invoiceModel: typeof SupplierInvoice,
    @InjectModel(GoodsReceipts) private goodModel: typeof GoodsReceipts,
  ) {}

  async create(invoiceId: number): Promise<Stock[]> {
    // 1. تحقق أن الفاتورة جاهزة
    const invoice = await this.invoiceModel.findByPk(invoiceId);
    if (!invoice) throw new ConflictException('Invoice not found');
    if (invoice.status !== 'ReadyForPaid') {
      throw new ConflictException('Invoice is not ready to be added to stock');
    }

    // 2. جلب كل GoodsReceipt الخاصة بهذه الفاتورة
    const goodsReceipts = await this.goodModel.findAll({
      where: { dn_id: invoiceId }, // تأكد من العلاقة الصحيحة
      include: ['items'],
    });

    if (goodsReceipts.length === 0) {
      throw new ConflictException('No goods receipts found for this invoice');
    }

    const stockItems: Stock[] = [];

    for (const gr of goodsReceipts) {
      for (const item of gr.items) {
        // البحث عن نفس المنتج بنفس barcode + expiration_date + dn_id
        const existingStock = await this.stockModel.findOne({
          where: {
            dn_id: gr.dn_id,
            barcode: item.barcode,
            expiration_date: item.expiration_date || null,
          },
        }as any);

        if (existingStock) {
          // المنتج موجود مسبقًا، نجمع الكميات
          existingStock.quantity += item.received_quantity;
          await existingStock.save();
          stockItems.push(existingStock);
        } else {
          // المنتج غير موجود، نضيفه كسطر جديد
          const stockItem = await this.stockModel.create({
            product_name: item.item_name,
            barcode: item.barcode,
            dn_id: gr.dn_id,
            quantity: item.received_quantity,
            unit: item.unit,
            expiration_date: item.expiration_date || null,
            status: 'Available',
          } as any);
          stockItems.push(stockItem);
        }
      }
    }

    return stockItems;
  }


async takeFromStockByName(productName: string, quantityNeeded: number): Promise<string> {
  // 1️⃣ جلب كل السجلات للمنتج
  const stocks = await this.stockModel.findAll({
    where: { item_name: productName },
  });

  if (stocks.length === 0) {
    throw new NotFoundException(`No stock found for product: ${productName}`);
  }

  // 2️⃣ ترتيب السجلات حسب قرب تاريخ الانتهاء (الأقرب أول، null آخر)
  const sortedStocks = stocks.sort((a, b) => {
    if (!a.expiration_date && !b.expiration_date) return 0;
    if (!a.expiration_date) return 1;  // null آخر
    if (!b.expiration_date) return -1;
    return a.expiration_date.getTime() - b.expiration_date.getTime();
  });

  // 3️⃣ حساب إجمالي الكمية المتوفرة
  const totalAvailable = sortedStocks.reduce((sum, s) => sum + s.quantity, 0);
  if (quantityNeeded > totalAvailable) {
    throw new ConflictException(
      `Requested quantity exceeds available stock. The available quantity is: ${totalAvailable}`
    );
  }

  // 4️⃣ خصم الكميات حسب تاريخ الصلاحية
  let remaining = quantityNeeded;
  const usedBatches: string[] = [];

  for (const stock of sortedStocks) {
    if (remaining <= 0) break;

    const exp = stock.expiration_date
      ? stock.expiration_date.toISOString().split('T')[0]
      : 'No Expiration Date';

    if (stock.quantity <= remaining) {
      usedBatches.push(`${stock.quantity} units (expire: ${exp})`);
      remaining -= stock.quantity;
      stock.quantity = 0;
      stock.status = 'OutOfStock';
      await stock.save();
    } else {
      usedBatches.push(`${remaining} units (expire: ${exp})`);
      stock.quantity -= remaining;
      await stock.save();
      remaining = 0;
    }
  }

  // 5️⃣ رسالة للمستخدم
  return `✅ Taken ${quantityNeeded} units of "${productName}". Use first the batches with expiration: ${usedBatches.join(', ')}`;
}

async updateStockState(stockId: number, newStatus: 'Available' | 'Expired' | 'Reserved'|'OutOfStock'): Promise<Stock> {
  const stock = await this.stockModel.findByPk(stockId);
  if (!stock) throw new NotFoundException('Stock item not found');

  const today = new Date();

  // ⚠️ أول شي نفحص الكمية والصلاحية
  if (stock.quantity === 0) {
    stock.status = 'OutOfStock';
      await stock.save();

    throw new ConflictException('Cannot update status: stock quantity is zero (OutOfStock).');

  } else if (stock.expiration_date && stock.expiration_date < today) {
    stock.status = 'Expired';
      await stock.save();

    throw new ConflictException('Cannot update status: product is expired.');

  } else {
    stock.status = newStatus!;
  }

  await stock.save();
  return stock;
}

async updateStockExpiration(stockId: number, newExpiration: string | Date): Promise<Stock> {
  const stock = await this.stockModel.findByPk(stockId);
  if (!stock) throw new NotFoundException('Stock item not found');

  const today = new Date();
  const newExpDate = newExpiration instanceof Date ? newExpiration : new Date(newExpiration);

  if (stock.quantity === 0) {
    stock.status = 'OutOfStock';
      await stock.save();

    throw new ConflictException('Cannot update expiration date: stock  is already (OutOfStock).');
  } else {
    if (newExpDate < today) {
      stock.expiration_date = newExpDate;
      stock.status = 'Expired';
    } else {
      stock.expiration_date = newExpDate;
      stock.status = 'Available';
    }
  }

  await stock.save();
  return stock;
}



@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkExpiredStock() {
    const today = new Date();

    // جلب كل السجلات اللي حالتها مش Expired
    const stocks = await this.stockModel.findAll({
      where: {
        status: ['Available', 'Reserved'], // ممكن تضيف "OutOfStock" لو بدك
        expiration_date: { [Op.lt]: today },
      },
    });

    for (const stock of stocks) {
      stock.status = 'Expired';
      await stock.save();
    }

    console.log(`✅ Checked expired stock: ${stocks.length} items updated`);
  }



  async getAllStocksWithQuantity(filter?: FilterStockDto) {
    const where: any = {};

    if (filter?.product_name) {
      where.product_name = { [Op.like]: `%${filter.product_name}%` };
    }

    if (filter?.status) {
      where.status = filter.status;
    }

    // جلب كل السجلات أولاً
    const stocks = await this.stockModel.findAll({ where });

    // تجميع حسب اسم المنتج أو الباركود (حسب ما تحب)
    const grouped: Record<string, any> = {};

    for (const stock of stocks) {
      const key = stock.item_name; // أو stock.barcode
      if (!grouped[key]) {
        grouped[key] = {
          product_name: stock.item_name,
          barcode: stock.barcode,
          total_quantity: 0,
          batches: [],
        };
      }
      grouped[key].total_quantity += stock.quantity;
      grouped[key].batches.push({
        stock_id: stock.stock_id,
        quantity: stock.quantity,
        expiration_date: stock.expiration_date,
        status: stock.status,
      });
    }

    // تحويل الـ Record لـ Array
    return Object.values(grouped);
  }


  async getAllStocks() {
    const stocks = await this.stockModel.findAll();
    if (stocks.length === 0) throw new NotFoundException('No stock found');

    return stocks;
  }


  async getStocksByStatus(status: string) {
    const stocks = await this.stockModel.findAll({ where: { status } });
    if (stocks.length === 0) throw new NotFoundException(`No stock found with status: ${status}`);

    return this.groupByProduct(stocks);
  }

   async searchStocks(name: string) {
  return await this.stockModel.findAll({
    where: {
      [Op.or]: [
        { barcode: { [Op.like]: `%${name}%` } },
        { item_name: { [Op.like]: `%${name}%` } },
        { unit: { [Op.like]: `%${name}%` } },
      ],
    },
  });
}


 async deleteStock(stockId: number): Promise<{ message: string }> {
    const stock = await this.stockModel.findByPk(stockId);
    if (!stock) throw new NotFoundException('Stock item not found');

    // ⚠️ السماح بالحذف فقط لو الحالة OutOfStock أو Expired
    if (stock.status !== 'OutOfStock' && stock.status !== 'Expired') {
      throw new ConflictException(
        `Cannot delete stock item "${stock.item_name}" because it is still available.`
      );
    }

    await stock.destroy();
    return { message: `Stock item "${stock.item_name}" deleted successfully.` };
  }

  
  private groupByProduct(stocks: Stock[]) {
    const grouped: Record<string, any> = {};

    for (const stock of stocks) {
      const key = stock.item_name; // أو stock.barcode حسب ما تحب
      if (!grouped[key]) {
        grouped[key] = {
          product_name: stock.item_name,
          barcode: stock.barcode,
          total_quantity: 0,
          batches: [],
        };
      }
      grouped[key].total_quantity += stock.quantity;
      grouped[key].batches.push({
        stock_id: stock.stock_id,
        quantity: stock.quantity,
        expiration_date: stock.expiration_date,
        status: stock.status,
      });
    }

    return Object.values(grouped);
  }
}