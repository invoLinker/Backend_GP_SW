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
import { StockCheckItemDto } from './stock-check.dto';
 import puppeteer from 'puppeteer';
import { InvoiceService } from 'src/Verification/verification.service';


type CheckStatus =
  | 'MATCH'
  | 'SHORTAGE'
  | 'EXTRA'
  | 'NOT_IN_SYSTEM'
  | 'MISSING_IN_PHYSICAL'
  | 'WASTE'
  | 'OUT_OF_STOCK';
  
  @Injectable()
  export class StockService {
    constructor(
      @InjectModel(Stock) private stockModel: typeof Stock,
      @InjectModel(SupplierInvoice) private invoiceModel: typeof SupplierInvoice,
      @InjectModel(GoodsReceipts) private goodModel: typeof GoodsReceipts,
      private readonly invoiceService: InvoiceService,
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

    await this.invoiceService.updateWorkflowState(po_number, 'GR', true);

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


  
  
  async check(items: StockCheckItemDto[]) {

  const normalizeDate = (date?: string | Date | null): string | null => {
    if (!date) return null;
    const d = typeof date === 'string' ? new Date(date) : date;
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  };

  // 1️⃣ Normalize input
  const normalizedItems = items.map(i => ({
    item_name: i.item_name?.trim().toLowerCase(),
    barcode: i.barcode?.trim(),
    expiration_date: normalizeDate(i.expiration_date),
    physical_quantity: i.physical_quantity ?? 0,
  }));

  // 2️⃣ Group physical input by (barcode + expiration)
  const physicalMap = new Map<string, number>();
  const physicalKeys = new Set<string>();
  const physicalBarcodes = new Set<string>();

  for (const item of normalizedItems) {
    const key = `${item.barcode}_${item.expiration_date ?? 'NULL'}`;
    physicalMap.set(key, (physicalMap.get(key) || 0) + item.physical_quantity);
    physicalKeys.add(key);
    physicalBarcodes.add(item.barcode!);
  }

  // 3️⃣ Load ALL system stock (including Expired)
  const systemStocks = await this.stockModel.findAll();

  // 4️⃣ Build system map (barcode + expiration)
  const systemMap = new Map<
    string,
    {
      quantity: number;
      item_name: string;
      status: 'Available' | 'Reserved' | 'Expired' | string;
    }
  >();

  for (const s of systemStocks) {
    const exp = normalizeDate(s.expiration_date);
    const key = `${s.barcode}_${exp ?? 'NULL'}`;

    if (!systemMap.has(key)) {
      systemMap.set(key, {
        quantity: 0,
        item_name: s.item_name,
        status: s.status,
      });
    }

    const entry = systemMap.get(key)!;
    entry.quantity += s.quantity || 0;

    // إذا أي سجل Expired → كله Expired
    if (s.status === 'Expired') {
      entry.status = 'Expired';
    }
    // إذا أي سجل OutOfStock → كله OutOfStock (لكن بس لو ما فيش Expired)
    else if (s.status === 'OutOfStock' && entry.status !== 'Expired') {
      entry.status = 'OutOfStock';
    }
  }

  const results: any[] = [];

  // 5️⃣ Compare physical vs system
  for (const [key, physicalQty] of physicalMap.entries()) {
    const [barcode, expRaw] = key.split('_');
    const expiration_date = expRaw === 'NULL' ? null : expRaw;

    let systemEntry = systemMap.get(key);
    let systemQty = systemEntry?.quantity || 0;
    let systemStatus = systemEntry?.status;

    // 🔍 If no exact match, search for same barcode + same expiration date
    if (!systemEntry) {
      if (expiration_date) {
        // Search for entries with same barcode and exact expiration date
        for (const [sysKey, sysEntry] of systemMap.entries()) {
          const [sysBarcode, sysExpRaw] = sysKey.split('_');
          const sysExpDate = sysExpRaw === 'NULL' ? null : sysExpRaw;
          
          if (sysBarcode === barcode && sysExpDate === expiration_date) {
            systemEntry = sysEntry;
            systemQty = sysEntry.quantity;
            systemStatus = sysEntry.status;
            break;
          }
        }
      }
      
      // If still not found and no expiration date specified, search by barcode only
      if (!systemEntry) {
        const sameBarcodeEntries = [...systemMap.entries()].filter(([k]) =>
          k.startsWith(`${barcode}_`)
        );
        
        if (sameBarcodeEntries.length > 0) {
          // Get the first entry to get item name and check status
          const firstEntry = sameBarcodeEntries[0][1];
          systemEntry = {
            quantity: 0,
            item_name: firstEntry.item_name,
            status: firstEntry.status,
          };
          
          // Sum all quantities for this barcode
          for (const [, entry] of sameBarcodeEntries) {
            systemEntry.quantity += entry.quantity || 0;
            // If any is Expired, mark as Expired
            if (entry.status === 'Expired') {
              systemEntry.status = 'Expired';
            }
          }
          
          systemQty = systemEntry.quantity;
          systemStatus = systemEntry.status;
        }
      }
    }

    let status: CheckStatus;
    let message: string;

    // 🔴 غير موجود بالسيستم نهائيًا
    if (!systemEntry) {
      status = 'NOT_IN_SYSTEM';
      message = 'Not in system';
    }
    // 🟤 Waste (Expired) - always WASTE regardless of quantity
    else if (systemStatus === 'Expired') {
      status = 'WASTE';
      message = 'This item needs to be disposed because it has expired';
    }
    // ⚫ Out of Stock
    else if (systemStatus === 'OutOfStock') {
      status = 'OUT_OF_STOCK';
      message = 'This is registered in the system as out of stock';
    }
    // 🟢 Available - compare quantities
    else if (systemStatus === 'Available') {
      if (physicalQty === systemQty) {
        status = 'MATCH';
        message = 'Match';
      } else if (physicalQty > systemQty) {
        status = 'EXTRA';
        message = 'Quantity in warehouse is more than stored in system';
      } else {
        status = 'SHORTAGE';
        message = 'Quantity in warehouse is less than stored in system';
      }
    }
    // 🔵 Reserved - same logic as Available
    else if (systemStatus === 'Reserved') {
      if (physicalQty === systemQty) {
        status = 'MATCH';
        message = 'Match';
      } else if (physicalQty > systemQty) {
        status = 'EXTRA';
        message = 'Quantity in warehouse is more than stored in system';
      } else {
        status = 'SHORTAGE';
        message = 'Quantity in warehouse is less than stored in system';
      }
    }
    // 🔵 Default case
    else {
      if (physicalQty === systemQty) {
        status = 'MATCH';
        message = 'Match';
      } else if (physicalQty > systemQty) {
        status = 'EXTRA';
        message = 'Quantity in warehouse is more than stored in system';
      } else {
        status = 'SHORTAGE';
        message = 'Quantity in warehouse is less than stored in system';
      }
    }

    results.push({
      item_name: systemEntry?.item_name ?? normalizedItems.find(i => i.barcode === barcode)?.item_name,
      barcode,
      expiration_date,
      system_quantity: systemQty,
      physical_quantity: physicalQty,
      difference: physicalQty - systemQty,
      status,
      message,
    });
  }

  // 6️⃣ System items not counted physically
  for (const [key, systemEntry] of systemMap.entries()) {
    if (!physicalKeys.has(key) && systemEntry.quantity > 0) {
      const [barcode, expRaw] = key.split('_');
      const expiration_date = expRaw === 'NULL' ? null : expRaw;

      let status: CheckStatus;
      let message: string;
      
      if (systemEntry.status === 'Expired') {
        status = 'WASTE';
        message = 'This item needs to be disposed because it has expired';
      } else if (systemEntry.status === 'OutOfStock') {
        status = 'OUT_OF_STOCK';
        message = 'This is registered in the system as out of stock';
      } else {
        status = 'MISSING_IN_PHYSICAL';
        message = 'In system but not in physical count';
      }

      results.push({
        item_name: systemEntry.item_name,
        barcode,
        expiration_date,
        system_quantity: systemEntry.quantity,
        physical_quantity: 0,
        difference: -systemEntry.quantity,
        status,
        message,
      });
    }
  }

  // 7️⃣ تجميع النتائج حسب الباركود (تقرير منظم)
  const reportMap = new Map<string, {
    item_name: string;
    barcode: string;
    comparisons: Array<{
      expiration_date: string | null;
      system_quantity: number;
      physical_quantity: number;
      difference: number;
      status: CheckStatus;
      message: string;
    }>;
    overall_status: CheckStatus;
    total_system_quantity: number;
    total_physical_quantity: number;
    total_difference: number;
  }>();

  for (const result of results) {
    const barcode = result.barcode;
    
    if (!reportMap.has(barcode)) {
      // 🔍 Calculate total system quantity from systemMap for this barcode
      let totalSystemQty = 0;
      let itemName = result.item_name || '';
      let overallStatus: CheckStatus = result.status;
      
      for (const [sysKey, sysEntry] of systemMap.entries()) {
        if (sysKey.startsWith(`${barcode}_`)) {
          totalSystemQty += sysEntry.quantity || 0;
          if (!itemName) itemName = sysEntry.item_name;
          if (sysEntry.status === 'Expired') {
            overallStatus = 'WASTE';
          }
        }
      }
      
      reportMap.set(barcode, {
        item_name: itemName,
        barcode: barcode,
        comparisons: [],
        overall_status: overallStatus,
        total_system_quantity: totalSystemQty,
        total_physical_quantity: 0,
        total_difference: 0,
      });
    }

    const reportItem = reportMap.get(barcode)!;
    reportItem.comparisons.push({
      expiration_date: result.expiration_date,
      system_quantity: result.system_quantity,
      physical_quantity: result.physical_quantity,
      difference: result.difference,
      status: result.status,
      message: result.message,
    });

    // Only add physical quantity (system quantity already calculated from systemMap)
    reportItem.total_physical_quantity += result.physical_quantity;
    reportItem.total_difference = reportItem.total_physical_quantity - reportItem.total_system_quantity;

    // تحديث الحالة الإجمالية (الأولوية: WASTE > OUT_OF_STOCK > SHORTAGE > EXTRA > NOT_IN_SYSTEM > MISSING_IN_PHYSICAL > MATCH)
    const priority: Record<CheckStatus, number> = {
      'WASTE': 7,
      'OUT_OF_STOCK': 6,
      'SHORTAGE': 5,
      'EXTRA': 4,
      'NOT_IN_SYSTEM': 3,
      'MISSING_IN_PHYSICAL': 2,
      'MATCH': 1,
    };
    
    if (priority[result.status] > priority[reportItem.overall_status]) {
      reportItem.overall_status = result.status;
    }
  }

  // تحويل الـ Map لـ Array وترتيب حسب الأولوية
  const report = Array.from(reportMap.values()).sort((a, b) => {
    const priority: Record<CheckStatus, number> = {
      'WASTE': 7,
      'OUT_OF_STOCK': 6,
      'SHORTAGE': 5,
      'EXTRA': 4,
      'NOT_IN_SYSTEM': 3,
      'MISSING_IN_PHYSICAL': 2,
      'MATCH': 1,
    };
    return priority[b.overall_status] - priority[a.overall_status];
  });

  // 8️⃣ Summary
  const summary = {
    MATCH: results.filter(r => r.status === 'MATCH').length,
    SHORTAGE: results.filter(r => r.status === 'SHORTAGE').length,
    EXTRA: results.filter(r => r.status === 'EXTRA').length,
    NOT_IN_SYSTEM: results.filter(r => r.status === 'NOT_IN_SYSTEM').length,
    MISSING_IN_PHYSICAL: results.filter(r => r.status === 'MISSING_IN_PHYSICAL').length,
    WASTE: results.filter(r => r.status === 'WASTE').length,
    OUT_OF_STOCK: results.filter(r => r.status === 'OUT_OF_STOCK').length,
    TOTAL_ITEMS: report.length,
    TOTAL_COMPARISONS: results.length,
  };

  return {
    report,
    summary,
    // للتوافق مع الكود القديم
    items: results,
  };
}

 

async generateCheckReportPDF(
  items: StockCheckItemDto[],
): Promise<string> {

  // 1️⃣ نجيب نتيجة الجرد
  const { report, summary } = await this.check(items);

  // 2️⃣ Date
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // 3️⃣ Status colors - Blue theme for invoices
  const statusColors: Record<string, string> = {
    MATCH: '#28a745', // Green (keep for success)
    SHORTAGE: '#1e88e5', // Blue
    EXTRA: '#42a5f5', // Light Blue
    NOT_IN_SYSTEM: '#64b5f6', // Lighter Blue
    MISSING_IN_PHYSICAL: '#90caf9', // Very Light Blue
    WASTE: '#dc3545', // Red (keep for waste)
    OUT_OF_STOCK: '#5c6bc0', // Indigo Blue
  };

  // 4️⃣ بناء تفاصيل التقرير
  let reportHTML = '';

  for (const item of report) {
    const rowColor = item.overall_status === 'WASTE' ? '#fff5f5' : 
                     item.overall_status === 'MATCH' ? '#f0fff4' : 
                     item.overall_status === 'SHORTAGE' ? '#e3f2fd' : '#fff';

    reportHTML += `
      <section style="margin-bottom:30px; page-break-inside:avoid; background:#fff; padding:15px; border-radius:6px; box-shadow:0 1px 4px rgba(0,0,0,0.08); border:1px solid #e9ecef; border-top:4px solid #1976d2;">
        <h3 style="color:#1976d2; margin-bottom:8px; font-size:16px; font-weight:600;">${item.item_name}</h3>
        <p style="margin:0 0 12px 0; color:#666; font-size:12px;"><strong style="color:#333;">Barcode:</strong> <span style="color:#1976d2; font-weight:600; font-size:13px;">${item.barcode}</span></p>

        <table style="width:100%; border-collapse:collapse; margin-top:12px; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
          <thead>
            <tr style="background:linear-gradient(135deg, #1976d2 0%, #42a5f5 100%); color:#fff;">
              <th style="padding:8px; text-align:left; border:none; font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:0.3px;">Item Name</th>
              <th style="padding:8px; text-align:center; border:none; font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:0.3px;">System Qty</th>
              <th style="padding:8px; text-align:center; border:none; font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:0.3px;">Physical Qty</th>
              <th style="padding:8px; text-align:center; border:none; font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:0.3px;">Difference</th>
              <th style="padding:8px; text-align:left; border:none; font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:0.3px;">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background:${rowColor}; border-bottom:1px solid #e9ecef;">
              <td style="padding:8px; border:none; color:#333; font-size:12px; font-weight:500;">${item.item_name}</td>
              <td style="padding:8px; border:none; text-align:center; color:#333; font-size:12px; font-weight:600;">${item.total_system_quantity}</td>
              <td style="padding:8px; border:none; text-align:center; color:#333; font-size:12px; font-weight:600;">${item.total_physical_quantity}</td>
              <td style="padding:8px; border:none; text-align:center; font-weight:bold; font-size:12px; color:${item.total_difference > 0 ? '#28a745' : item.total_difference < 0 ? '#dc3545' : '#333'}">${item.total_difference > 0 ? '+' : ''}${item.total_difference}</td>
              <td style="padding:8px; border:none;">
                <span style="color:${statusColors[item.overall_status]}; font-weight:500; padding:4px 8px; border-radius:4px; background:${statusColors[item.overall_status]}15; display:inline-block; font-size:11px; line-height:1.4;">
                  ${item.comparisons[0]?.message}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    `;
  }

  // 5️⃣ Full HTML
  const html = `
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8" />
<title>Stock Inventory Report</title>
<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    font-family: 'Segoe UI', 'Roboto', Tahoma, Arial, sans-serif;
    direction: ltr;
    padding: 20px;
    color: #2c3e50;
    background: #f5f7fa;
    line-height: 1.5;
    font-size: 13px;
  }
  .container {
    max-width: 1200px;
    margin: 0 auto;
    background: #fff;
    padding: 30px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    border: 1px solid #e9ecef;
  }
  h1 {
    text-align: center;
    color: #1976d2;
    font-size: 24px;
    margin-bottom: 10px;
    padding-bottom: 12px;
    border-bottom: 2px solid #1976d2;
    font-weight: 600;
  }
  .date {
    text-align: center;
    color: #666;
    margin-bottom: 20px;
    font-size: 12px;
  }
  .summary {
    background: #f8f9fa;
    border-radius: 6px;
    padding: 20px;
    margin: 20px 0;
    box-shadow: 0 1px 4px rgba(0,0,0,0.05);
    border: 1px solid #e9ecef;
  }
  .summary h2 {
    color: #1976d2;
    margin-bottom: 15px;
    font-size: 18px;
    border-bottom: 2px solid #1976d2;
    padding-bottom: 8px;
    font-weight: 600;
  }
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
  }
  .summary-item {
    background: #fff;
    padding: 12px;
    border-radius: 6px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  }
  .summary-item strong {
    display: block;
    margin-bottom: 6px;
    font-size: 11px;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .summary-item .value {
    font-size: 22px;
    font-weight: bold;
    display: block;
  }
  .summary-item.match { 
    background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
    color: #fff;
  }
  .summary-item.match strong { color: rgba(255,255,255,0.9); }
  .summary-item.shortage { 
    background: linear-gradient(135deg, #1e88e5 0%, #42a5f5 100%);
    color: #fff;
  }
  .summary-item.shortage strong { color: rgba(255,255,255,0.9); }
  .summary-item.extra { 
    background: linear-gradient(135deg, #42a5f5 0%, #64b5f6 100%);
    color: #fff;
  }
  .summary-item.extra strong { color: rgba(255,255,255,0.9); }
  .summary-item.not-in-system { 
    background: linear-gradient(135deg, #64b5f6 0%, #90caf9 100%);
    color: #fff;
  }
  .summary-item.not-in-system strong { color: rgba(255,255,255,0.9); }
  .summary-item.missing { 
    background: linear-gradient(135deg, #90caf9 0%, #bbdefb 100%);
    color: #fff;
  }
  .summary-item.missing strong { color: rgba(255,255,255,0.9); }
  .summary-item.waste { 
    background: linear-gradient(135deg, #dc3545 0%, #e57373 100%);
    color: #fff;
  }
  .summary-item.waste strong { color: rgba(255,255,255,0.9); }
  .summary-item.out-of-stock { 
    background: linear-gradient(135deg, #5c6bc0 0%, #7986cb 100%);
    color: #fff;
  }
  .summary-item.out-of-stock strong { color: rgba(255,255,255,0.9); }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
  }
  th, td {
    border: 1px solid #e0e0e0;
    padding: 12px;
  }
  th {
    background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%);
    color: #fff;
    font-weight: 600;
    text-align: left;
  }
  @media print {
    body { background: #fff; }
    .container { box-shadow: none; }
  }
</style>
</head>
<body>

<div class="container">
  <h1>Stock Inventory Report</h1>
  <p class="date">Report Date: ${dateStr}</p>

  <div class="summary">
    <h2>Summary</h2>
    <div class="summary-grid">
      <div class="summary-item match">
        <strong>Match</strong>
        <span class="value">${summary.MATCH}</span>
      </div>
      <div class="summary-item shortage">
        <strong>Shortage</strong>
        <span class="value">${summary.SHORTAGE}</span>
      </div>
      <div class="summary-item extra">
        <strong>Extra</strong>
        <span class="value">${summary.EXTRA}</span>
      </div>
      <div class="summary-item not-in-system">
        <strong>Not in System</strong>
        <span class="value">${summary.NOT_IN_SYSTEM}</span>
      </div>
      <div class="summary-item missing">
        <strong>Missing in Physical</strong>
        <span class="value">${summary.MISSING_IN_PHYSICAL}</span>
      </div>
      <div class="summary-item waste">
        <strong>Waste</strong>
        <span class="value">${summary.WASTE}</span>
      </div>
      <div class="summary-item out-of-stock">
        <strong>Out of Stock</strong>
        <span class="value">${summary.OUT_OF_STOCK}</span>
      </div>
    </div>
  </div>

  <h2 style="color:#1976d2; margin:20px 0 15px 0; font-size:18px; border-bottom:2px solid #1976d2; padding-bottom:8px; font-weight:600;">Details</h2>
  ${reportHTML}
</div>

</body>
</html>
  `;

  // 6️⃣ Run Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(60000); // 60 seconds
    await page.setDefaultTimeout(60000);
    
    await page.setContent(html, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    // Wait a bit for styles to render
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 7️⃣ Save PDF
    const reportsDir = path.join(process.cwd(), 'uploads', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const fileName = `stock-check-${Date.now()}.pdf`;
    const filePath = path.join(reportsDir, fileName);

    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm',
      },
      timeout: 60000,
    });

    await browser.close();

    return `uploads/reports/${fileName}`;
  } catch (error) {
    await browser.close();
    throw new InternalServerErrorException(`Failed to generate PDF: ${error.message}`);
  }
}


async getAllCheckReports() {
  const reportsDir = path.join(process.cwd(), 'uploads', 'reports');

  if (!fs.existsSync(reportsDir)) {
    return [];
  }

  const files = fs
    .readdirSync(reportsDir)
    .filter(file => file.startsWith('stock-check-') && file.endsWith('.pdf'));

  const reports = files.map(file => {
    const fullPath = path.join(reportsDir, file);
    const stats = fs.statSync(fullPath);

    return {
      path: `uploads/reports/${file}`,
      createdAt: stats.birthtime,
    };
  });

  reports.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return reports;
}


  }
  