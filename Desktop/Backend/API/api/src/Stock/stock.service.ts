import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';


  @Injectable()
  export class StockService {
    constructor(
      @InjectModel(Stock) private stockModel: typeof Stock,
      @InjectModel(SupplierInvoice) private invoiceModel: typeof SupplierInvoice,
      @InjectModel(GoodsReceipts) private goodModel: typeof GoodsReceipts,
      private readonly notificationService: NotificationService,
    ) {}

    private async notifyByRole(
      roles: ('Warehouse' | 'Accountant')[],
      title: string,
      message: string,
    ) {
      const users = await User.findAll({
        include: [{ model: Role, where: { role_name: roles } }],
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

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async notifyExpiringSoonStock() {
      const EXPIRY_WARNING_DAYS = 30;
      const today = new Date();
      const warningDate = new Date();
      warningDate.setDate(today.getDate() + EXPIRY_WARNING_DAYS);

      const stocks = await this.stockModel.findAll({
        where: {
          status: ['Available', 'Reserved'],
          expiration_date: {
            [Op.between]: [today, warningDate],
          },
        },
      });

      for (const stock of stocks) {
        await this.notifyByRole(
          ['Warehouse'],
          '⚠ Expiration Warning',
          `Product "${stock.item_name}" will expire on ${stock.expiration_date
            ?.toISOString()
            .split('T')[0]}`,
        );
      }
    }


    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async checkExpiredStock() {
      const today = new Date();

      const stocks = await this.stockModel.findAll({
        where: {
          status: ['Available', 'Reserved'],
          expiration_date: { [Op.lt]: today },
        },
      });

      for (const stock of stocks) {
        stock.status = 'Expired';
        await stock.save();

        await this.notifyByRole(
          ['Warehouse'],
          '❌ Product Expired',
          `Product "${stock.item_name}" has expired.`,
        );
      }
    }

    async create(po_number: string){
    const po = await PurchaseOrder.findOne({
      where: { po_number },
    });

    if (!po) throw new ConflictException('Purchase Order not found');

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
      const allStocks = await this.stockModel.findAll();

      const stocks = allStocks.filter(s =>
        s.item_name?.toLowerCase().trim() === productName.toLowerCase().trim()
      );

      if (stocks.length === 0) {
        throw new NotFoundException(`No stock found for product: ${productName}`);
      }

      const sortedStocks = stocks.sort((a, b) => {
        if (!a.expiration_date && !b.expiration_date) return 0;
        if (!a.expiration_date) return 1;
        if (!b.expiration_date) return -1;
        return a.expiration_date.getTime() - b.expiration_date.getTime();
      });

      const totalAvailable = sortedStocks.reduce((sum, s) => sum + s.quantity, 0);
      if (quantityNeeded > totalAvailable) {
        throw new ConflictException(
          `Requested quantity exceeds available stock. Available: ${totalAvailable}`
        );
      }

      const LOW_STOCK_THRESHOLD = 10;

      let remaining = quantityNeeded;
      const usedBatches: string[] = [];

      let lowStockNotified = false;
      let outOfStockNotified = false;

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

          if (!outOfStockNotified) {
            await this.notifyByRole(
              ['Warehouse', 'Accountant'],
              '❌ Out of Stock',
              `Product "${productName}" is now out of stock.`
            );
            outOfStockNotified = true;
          }
        } else {
          usedBatches.push(`${remaining} units (expire: ${exp})`);
          stock.quantity -= remaining;
          await stock.save();
          remaining = 0;

          if (
            stock.quantity <= LOW_STOCK_THRESHOLD &&
            stock.quantity > 0 &&
            !lowStockNotified
          ) {
            await this.notifyByRole(
              ['Warehouse', 'Accountant'],
              '⚠ Low Stock Alert',
              `Product "${productName}" is low on stock. Remaining quantity: ${stock.quantity}`
            );
            lowStockNotified = true;
          }
        }
      }

      return {
        message: `✅ Taken ${quantityNeeded} units of "${productName}". Used batches: ${usedBatches.join(', ')}`
      };
    }


    async getAllStocksWithQuantity(filter?: FilterStockDto) {
      const where: any = {};

      if (filter?.product_name) {
        where.product_name = { [Op.like]: `%${filter.product_name}%` };
      }

      if (filter?.status) {
        where.status = filter.status;
      }

      const stocks = await this.stockModel.findAll({ where });

      const grouped: Record<string, any> = {};

      for (const stock of stocks) {
        const key = stock.item_name; 
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
        const key = stock.item_name; 
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

    const stockRecords = await this.stockModel.findAll();

    const stocks = stockRecords.filter(s =>
      s.item_name?.toLowerCase().trim() === productName.toLowerCase().trim()
    );

    if (stocks.length === 0) {
      throw new NotFoundException(`No stock found for product: ${productName}`);
    }

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

      const exp = stock.expiration_date
        ? stock.expiration_date.toISOString().split("T")[0]
        : "No Expiration Date";

      const qtyToReturn = remaining; 

      stock.quantity += qtyToReturn;
      await stock.save();

      remaining -= qtyToReturn;
    }

    return {message: "♻ Return to Stock successfully"};
  }


  async updateStockRecord(
    stockId: number,
    status?: 'Available' | 'Expired' | 'Reserved' | 'OutOfStock',
    expiration_date?: Date | null,
    Itemlocation?: string | null
  ) {
    const stock = await this.stockModel.findByPk(stockId);
    if (!stock) throw new NotFoundException('Stock item not found');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Itemlocation !== undefined) {
      stock.Itemlocation = Itemlocation!;
    }

     if (expiration_date !== undefined) {
      stock.expiration_date = expiration_date;
    }

    const expirationDate = stock.expiration_date ? new Date(stock.expiration_date) : null;
    if (expirationDate) {
      expirationDate.setHours(0, 0, 0, 0);
      
      if (expirationDate < today) {
        stock.status = 'Expired';
        await stock.save();
        return {message: "Stock updated successfully - Status set to Expired because expiration date has passed"};
      }
      
      if (expirationDate >= today && status === 'Expired') {
        if (stock.quantity === 0) {
          stock.status = 'OutOfStock';
        } else {
          stock.status = 'Available';
        }
        await stock.save();
        return {message: "Stock updated successfully - Status corrected to Available because expiration date has not passed yet"};
      }
    }

    if (status !== undefined) {
      if (status === 'Available' && stock.quantity === 0) {
        stock.status = 'OutOfStock';
      } else {
        stock.status = status;
      }
    } else {
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

    const uniqueNames = new Set<string>();

    for (const s of stocks) {
      if (s.item_name) {
        uniqueNames.add(s.item_name.trim().toLowerCase());
      }
    }

    return Array.from(uniqueNames);
  }


  async summary() {
    const availableAndReservedQty = await this.stockModel.sum('quantity', {
    where: {
      status: {
        [Op.in]: ['Available', 'Reserved'],
      },
    },
    });

    const expiredQty = await this.stockModel.sum('quantity', {
      where: {
        status: 'Expired',
      },
    });


    const GRPending= await this.goodModel.findAll({where:{status:'Pending'}});
    const GRVerified= await this.goodModel.findAll({where:{status:'Verified'}});

    return {
      totalStock: availableAndReservedQty,
      expiredItems: expiredQty,
      GRPending:GRPending.length,
      GRVerified:GRVerified.length
    };
  }


 async generateQrForStock(
    barcode: string,
    image?: Express.Multer.File,
  ) {
    // 1️⃣ دور على الايتيم
    const item = await this.stockModel.findOne({ where: { barcode } });
    if (!item) {
      throw new NotFoundException('Stock item not found');
    }

    try {
      // 2️⃣ مسار QR
      const qrDir = path.join(process.cwd(), 'uploads', 'QR');
      if (!fs.existsSync(qrDir)) {
        fs.mkdirSync(qrDir, { recursive: true });
      }

      const qrFileName = `${barcode}.png`;
      const qrFilePath = path.join(qrDir, qrFileName);

      // 3️⃣ توليد QR
      await QRCode.toFile(qrFilePath, barcode, {
        width: 300,
        margin: 2,
        errorCorrectionLevel: 'M',
      });

      // 4️⃣ تخزين المسارات بالداتابيس
      item.QR = `uploads/QR/${qrFileName}`;


      await item.save();

      return {
        message: 'QR generated and saved successfully',
        barcode: item.barcode,
        qrPath: item.QR,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to generate QR');
    }
  }


  async InfoItem(barcode: string){
    return this.stockModel.findOne({where:{barcode:barcode}});
  }

  }