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
import { PurchaseOrder } from 'src/PO/po.model';
import { NotificationService } from 'src/Notification/notification.service';
import { User } from 'src/users/users.model';
import { Role } from 'src/roles/roles.model';
import { NotificationChannel, NotificationCategory } from 'src/Notification/create-notification.dto';


@Injectable()
export class StockService {
  constructor(
    @InjectModel(Stock) private stockModel: typeof Stock,
    @InjectModel(SupplierInvoice) private invoiceModel: typeof SupplierInvoice,
    @InjectModel(GoodsReceipts) private goodModel: typeof GoodsReceipts,
    private readonly notificationService: NotificationService,
  ) {}

  async create(po_number: string){
  // 1. validate PO exists
  const po = await PurchaseOrder.findOne({
    where: { po_number },
  });

  if (!po) throw new ConflictException('Purchase Order not found');

  // 2. fetch goods receipts linked to this PO
  const goodsReceipts = await this.goodModel.findAll({
    where: { po_number },
    include: ['items'],
  });

  if (!goodsReceipts.length) {
    throw new ConflictException('No Goods Receipts found for this PO');
  }

  const stockItems: Stock[] = [];

  for (const gr of goodsReceipts) {
    for (const item of gr.items) {

      const existingStock = await this.stockModel.findOne({
        where: {
          // item_name: item.item_name,
          barcode:item.barcode,
          expiration_date: item.expiration_date ?? null,
        },
      } as any);

      if (existingStock) {
        existingStock.quantity += item.quantity;
        await existingStock.save();
        stockItems.push(existingStock);
      } else {
        const stockItem = await this.stockModel.create({
          item_name: item.item_name,
          barcode: item.barcode,
          quantity: item.quantity,
          dn_id: gr.dn_id,   
          unit: item.unit,
          expiration_date: item.expiration_date ?? null,
          po_number: po_number,  
          status: 'Available',
        } as any);
        
        stockItems.push(stockItem);
      }
    }
  }

  await this.notifyWarehouse(
  'Stock Updated',
  `New stock items have been added from PO ${po_number}.`
  );

  return {message: "Add Items To Stock Successfully"};
}



async takeFromStockByName(productName: string, quantityNeeded: number) {
  // 1️⃣ جلب كل السجلات للمنتج
 const stock = await this.stockModel.findAll();

const stocks = stock.filter(s =>
  s.item_name?.toLowerCase().trim() === productName.toLowerCase().trim()
);

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
return {
  message: `✅ Taken ${quantityNeeded} units of "${productName}". Use first the batches with expiration: ${usedBatches.join(', ')}`
};
}




@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkExpiredStock() {
      console.log('⭐ CRON is running - expiration check started');

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

  async returnToStockByName(
  productName: string,
  qtyReturned: number
) {

  // 1️⃣ fetch records case-insensitive
  const stockRecords = await this.stockModel.findAll();

  const stocks = stockRecords.filter(s =>
    s.item_name?.toLowerCase().trim() === productName.toLowerCase().trim()
  );

  if (stocks.length === 0) {
    throw new NotFoundException(`No stock found for product: ${productName}`);
  }

  // 2️⃣ sort by expiry — earliest first
  const sortedStocks = stocks.sort((a, b) => {
    if (!a.expiration_date && !b.expiration_date) return 0;
    if (!a.expiration_date) return 1;
    if (!b.expiration_date) return -1;
    return a.expiration_date.getTime() - b.expiration_date.getTime();
  });

  let remaining = qtyReturned;
  const returnedInfo: string[] = [];

  for (const stock of sortedStocks) {
    if (remaining <= 0) break;

    // simulate FIFO return — return batch-by-batch
    const exp = stock.expiration_date
      ? stock.expiration_date.toISOString().split("T")[0]
      : "No Expiration Date";

    // add to this batch only the amount returned against what was consumed
    const qtyToReturn = remaining; // FIFO: return first to earliest batch

    stock.quantity += qtyToReturn;
    await stock.save();

    remaining -= qtyToReturn;
  }

  return {message: "♻ Return to Stock successfully"};
}


 async updateStockRecord(
  stockId: number,
  status?: 'Available' | 'Expired' | 'Reserved' | 'OutOfStock',
  expiration_date?: Date | null
) {
  const stock = await this.stockModel.findByPk(stockId);
  if (!stock) throw new NotFoundException('Stock item not found');

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

  // ✔ تطبيق التاريخ أولاً إذا كان محدداً
  if (expiration_date !== undefined) {
    stock.expiration_date = expiration_date;
  }

  // ✔ فحص expiration_date أولاً
  const expirationDate = stock.expiration_date ? new Date(stock.expiration_date) : null;
  if (expirationDate) {
    expirationDate.setHours(0, 0, 0, 0); // Reset time to start of day
    
    // إذا التاريخ expired، status يجب أن يكون 'Expired' دائماً
    if (expirationDate < today) {
      stock.status = 'Expired';
      await stock.save();
      return {message: "Stock updated successfully - Status set to Expired because expiration date has passed"};
    }
    
    // إذا التاريخ لسا مطول (لم ينتهي) والمستخدم حط status 'Expired'، نصححه
    if (expirationDate >= today && status === 'Expired') {
      // التاريخ لم ينتهي بعد، نصحح status إلى 'Available' (أو نتركه كما هو إذا كان مناسب)
      if (stock.quantity === 0) {
        stock.status = 'OutOfStock';
      } else {
        stock.status = 'Available';
      }
      await stock.save();
      return {message: "Stock updated successfully - Status corrected to Available because expiration date has not passed yet"};
    }
  }

  // ✔ تطبيق الحالة إذا لم يكن expired
  if (status !== undefined) {
    if (status === 'Available' && stock.quantity === 0) {
      stock.status = 'OutOfStock';
    } else {
      stock.status = status;
    }
  } else {
    // إذا المستخدم ما حدد status، نفحص الكمية تلقائياً
    if (stock.quantity === 0 && stock.status !== 'Expired') {
      stock.status = 'OutOfStock';
    }
  }

  await stock.save();
  return {message: "Stock updated successfully"};
}

private async notifyWarehouse(title: string, message: string) {
  const users = await User.findAll({
    include: [{ model: Role, where: { role_name: 'Warehouse' } }],
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


async getUniqueStockItems() {
  const stocks = await this.stockModel.findAll({
    attributes: ["item_name"],
    raw: true,
  });

  if (!stocks.length) {
    throw new NotFoundException("No stock found");
  }

  // استخدام Set لتجنب التكرار
  const uniqueNames = new Set<string>();

  for (const s of stocks) {
    if (s.item_name) {
      uniqueNames.add(s.item_name.trim().toLowerCase());
    }
  }

  return Array.from(uniqueNames);
}


}