import { Controller, Get, Post, Body, Param, Query, Delete, UseGuards,Req, Patch, ParseIntPipe, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { StockService } from './stock.service';
import { CreateStockDto } from './CreateStockDto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionName } from 'src/permission/permission.decorator';
import { UpdateStockDto } from './UpdateStockDTO';
import { FilterStockDto } from './FilterStockDto';
import { HistoryLogService } from '../History/history-log.service';
import { HistoryCategory, HistorySeverity } from '../History/create-history-log.dto';
import { database } from 'firebase-admin';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { StockCheckItemDto } from './stock-check.dto';


@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService,
              private readonly historyLogService: HistoryLogService

  ) {}

  @Post('generate-qr')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/QR',
        filename: (req, file, cb) => {
          const uniqueName =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, uniqueName + extname(file.originalname));
        },
      }),
    }),
  )
  async generateQr(
    @Body('barcode') barcode: string,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.stockService.generateQrForStock(barcode, image);
  }

  @Post('check')
  async checkStock(
    @Body() items: StockCheckItemDto[],
  ) {
    return this.stockService.check(items);
  }

  @Post('check/pdf')
  async generateCheckReportPDF(
    @Body() items: StockCheckItemDto[],
  ) {
    const pdfPath = await this.stockService.generateCheckReportPDF(items);
    console.log('test');
    return {
      message: 'Report Created Successfully',
      pdfPath: pdfPath,
      downloadUrl: `/${pdfPath}`,
    };
  }

  @Post(':po_number')
  @UseGuards(JwtAuthGuard)
  @PermissionName('create_stock')
  async createByPO(@Param('po_number') po_number: string, @Req() req: any) {
    try {
      const result = await this.stockService.create(po_number);

      await this.historyLogService.createLog({
        action: 'Stock Created',
        description: `Stock for PO ${po_number} created`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: result.message,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Stock Creation Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.ERROR,
        details: error,
      });

      throw error;
    }
  }


  @Get()
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_stock')
 async getStocks(@Query() filter: FilterStockDto) {
    return this.stockService.getAllStocksWithQuantity(filter);
  }

  
  @Get('all')
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_stock')
  async getAll() {
    return this.stockService.getAllStocks();
  }

  @Get('status/:status')
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_stock')
  async getByStatus(@Param('status') status: string) {
    return this.stockService.getStocksByStatus(status);
  }


  @Get('search')
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_stock')
  async search(@Query('q') q: string) {
    return this.stockService.searchStocks(q);
  }

  @Get('InfoItem')
  async InfoItem(@Query('barcode') barcode: string) {
    return this.stockService.InfoItem(barcode);
  }

  @Patch('return')
  @UseGuards(JwtAuthGuard)
  async returnStock(
    @Body('item_name') item_name: string,
    @Body('quantity') quantity: number,
    @Request() req
  ) {
    if (!item_name || item_name.trim() === '') {
      return {
        message: 'Product name is required',
      };
    }

    if (!quantity || quantity <= 0) {
      return {
        message: 'Returned quantity must be greater than 0',
      };
    }
try {
      const result = await this.stockService.returnToStockByName(item_name, quantity);

      await this.historyLogService.createLog({
        action: 'Return Items To Stock',
        description: `Item with name ${item_name} return to stock with quantity ${quantity}`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: result.message,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Return Items To Stock Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.ERROR,
        details: error,
      });

      throw error;
    }

  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @PermissionName('update_stock')
  async update(@Body() updateStockDto: UpdateStockDto, @Req() req: any) {
    try {
      const result = await this.stockService.takeFromStockByName(
        updateStockDto.item_name!,
        updateStockDto.quantity!
      );

      await this.historyLogService.createLog({
        action: 'Stock Quantity Updated',
        description: `Stock of ${updateStockDto.item_name} decreased by ${updateStockDto.quantity}`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: result.message,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Update Stock Quantity Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.ERROR,
        details: updateStockDto,
      });
      throw error;
    }
  }


  @Patch(':id')
  async updateStock(
    @Param('id', ParseIntPipe) stockId: number,
    @Body() body: { status?: string; expiration_date?: string; Itemlocation?: string }
  ) {
    const exp = body.expiration_date ? new Date(body.expiration_date) : undefined;

    return this.stockService.updateStockRecord(
      stockId,
      body.status as any,
      exp,
      body.Itemlocation
    );
  }


 
  @Delete(':stock_id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('delete_stock')
  async remove(@Param('stock_id') stock_id: number, @Req() req: any) {
    try {
      const result = await this.stockService.deleteStock(stock_id);

      await this.historyLogService.createLog({
        action: 'Stock Deleted',
        description: `Stock id=${stock_id} deleted`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.WARNING,
        details: result,
      });

      return result;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Delete Stock Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.ERROR,
        details: error,
      });
      throw error;
    }
  }

  @Get('items')
  async getUniqueItems() {
    return await this.stockService.getUniqueStockItems();
  }

   @Get('summary')
  async summary() {
    return await this.stockService.summary();
  }

  


  
}
