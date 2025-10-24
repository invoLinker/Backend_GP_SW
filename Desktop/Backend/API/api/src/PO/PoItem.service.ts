import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PurchaseOrderItem } from './PoItem.model';
import { CreatePurchaseOrderItemDto } from './CreatePurchaseOrderItemDto';
import { PurchaseOrder } from './po.model';
import { InjectModel } from '@nestjs/sequelize';
import { Item } from 'src/Item/item.model';
import { EditRequest } from 'src/edit_requests/edit_requests.model';

@Injectable()
export class PurchaseOrderItemService {
  constructor(
    @InjectModel(PurchaseOrder) private poModel: typeof PurchaseOrder,
    @InjectModel(PurchaseOrderItem) private poItemModel: typeof PurchaseOrderItem,
    @InjectModel(EditRequest) private readonly editRequestModel: typeof EditRequest,
  ) {}

async createItem(poId: number, itemData: Partial<PurchaseOrderItem>, userId: number): Promise<PurchaseOrder | EditRequest> {
  const transaction = await this.poItemModel.sequelize!.transaction();

  try {
    // جلب الفاتورة مع العناصر
    const po = await this.poModel.findByPk(poId, {
      include: [{ model: PurchaseOrderItem, as: 'items' }],
      transaction,
    });
    if (!po) throw new NotFoundException(`Purchase Order with id ${poId} not found`);

    // الحالات الممنوعة من التعديل مباشرة
    const blockedStatuses = ['Sent', 'Closed', 'Cancelled'];
    
    // 1️⃣ إذا الفاتورة في status ممنوع → نرجع BadRequest
    if (blockedStatuses.includes(po.status)) {
      throw new BadRequestException(`Cannot add items to Purchase Order with status "${po.status}"`);
    }


    let approvedRequest: EditRequest | null = null;
    // 2️⃣ إذا الفاتورة Approved → نتحقق من EditRequest الموافق عليه
    if (po.status === 'Approved') {
       approvedRequest = await this.editRequestModel.findOne({
        where: {
          invoice_id: poId,
          user_id: userId,
          is_edit: false,
        },
        transaction,
      });

      if (!approvedRequest) {
        // إنشاء طلب تعديل جديد بدل الإضافة مباشرة
        const editRequest = await this.editRequestModel.create({
          invoice_id: po.po_id,
          user_id: userId,
          message: `User requests to add item: ${JSON.stringify(itemData)}`,
          status: 'pending',
          is_edit: false,
        } as any, { transaction });

        await transaction.commit();
        return editRequest;
      }
    }

    // التحقق من وجود العنصر في جدول Items
    const existingItem = await Item.findOne({
      where: {
        item_code: itemData.barcode,
        item_name: itemData.item_name,
        status: 'active',
      },
      transaction,
    });

    if (!existingItem) {
      throw new BadRequestException(`Item with name "${itemData.item_name}" does not exist in the system.`);
    }


    if (approvedRequest) {
      // بعد الانتهاء من التعديل نضع can_edit = false
      approvedRequest.is_edit = true;
      await approvedRequest.save({ transaction });
    }

    // إنشاء العنصر الجديد باستخدام القيم الصحيحة من جدول Items
    await this.poItemModel.create(
      {
        po_id: poId,
        item_name: existingItem.item_name,
        barcode: existingItem.item_code,
        quantity: itemData.quantity,
        unit: itemData.unit,
        unit_price: itemData.unit_price,
      } as any,
      { transaction },
    );



    // إعادة حساب الـ subtotal بعد الإضافة
    const items = await this.poItemModel.findAll({ where: { po_id: poId }, transaction });
    let subtotal = 0;
    for (const item of items) {
      subtotal += item.quantity * item.unit_price;
    }

    const vat = subtotal * 0.16;
    const total_amount = subtotal + vat;

    // تحديث الفاتورة
    po.subtotal = subtotal;
    po.vat = vat;
    po.total_amount = total_amount;

    await po.save({ transaction });
    await transaction.commit();

    // جلب الفاتورة مع كل العناصر بعد التحديث
    const updatedPo = await this.poModel.findByPk(poId, {
      include: [{ model: PurchaseOrderItem, as: 'items' }],
    });

    if (!updatedPo) throw new InternalServerErrorException('Failed to retrieve updated Purchase Order');

    return updatedPo;
  } catch (error) {
    await transaction.rollback();
    console.error('Error adding item to Purchase Order:', error);

    if (error instanceof BadRequestException || error instanceof NotFoundException) {
      throw error;
    }

    throw new InternalServerErrorException('Failed to add item to Purchase Order');
  }
}



  async getItemsByPoId(poId: number): Promise<PurchaseOrderItem[]> {
  const po = await this.poModel.findByPk(poId, {
    include: [{ model: PurchaseOrderItem, as: 'items' }]
  });

  if (!po) throw new NotFoundException(`Purchase Order with id ${poId} not found`);

  return po.items; // ترجع كل العناصر المرتبطة بالفاتورة
}

async getItemById(itemId: number): Promise<PurchaseOrderItem> {
  const item = await this.poItemModel.findByPk(itemId);

  if (!item) throw new NotFoundException(`Purchase Order Item with id ${itemId} not found`);

  return item;
}

async getAll() {
    return await this.poItemModel.findAll({
      include: [PurchaseOrder], // بيرجع كمان بيانات الفاتورة المرتبطة
    });
  }

async updateItem(
  itemId: number,
  itemData: Partial<PurchaseOrderItem>,
  userId: number
): Promise<PurchaseOrder | EditRequest> {
  const transaction = await this.poItemModel.sequelize!.transaction();

  try {
    // جلب العنصر
    const item = await this.poItemModel.findByPk(itemId, { transaction });
    if (!item) throw new NotFoundException(`Purchase Order Item with id ${itemId} not found`);

    // جلب الفاتورة المرتبطة
    const poId = item.po_id;
    const po = await this.poModel.findByPk(poId, {
      include: [{ model: PurchaseOrderItem, as: 'items' }],
      transaction,
    });
    if (!po) throw new NotFoundException(`Purchase Order with id ${poId} not found`);

    // الحالات الممنوعة من التعديل مباشرة
    const blockedStatuses = ['Sent', 'Closed', 'Cancelled'];
    if (blockedStatuses.includes(po.status)) {
      throw new BadRequestException(`Cannot edit items of Purchase Order with status "${po.status}"`);
    }

    // إذا الفاتورة Approved → التحقق من EditRequest
    let approvedRequest: EditRequest | null = null;
    if (po.status === 'Approved') {
      approvedRequest = await this.editRequestModel.findOne({
        where: {
          invoice_id: poId,
          user_id: userId,
          is_edit: false,
        },
        transaction,
      });

      if (!approvedRequest) {
        // إنشاء طلب تعديل بدل التعديل مباشرة
        const editRequest = await this.editRequestModel.create({
          invoice_id: poId,
          user_id: userId,
          message: `User requests to update PO item: ${JSON.stringify(itemData)}`,
          status: 'pending',
          is_edit: false,
        } as any, { transaction });

        await transaction.commit();
        return editRequest;
      }
    }

    // التعديل الفعلي للعنصر
    item.item_name = itemData.item_name ?? item.item_name;
    item.quantity = itemData.quantity ?? item.quantity;
    item.unit = itemData.unit ?? item.unit;
    item.unit_price = itemData.unit_price ?? item.unit_price;
    await item.save({ transaction });

    // إذا موجود approvedRequest → تحديث is_edit بعد التعديل
    if (approvedRequest) {
      approvedRequest.is_edit = true;
      await approvedRequest.save({ transaction });
    }

    // إعادة حساب subtotal والفاتورة
    const items = await this.poItemModel.findAll({ where: { po_id: poId }, transaction });
    let subtotal = 0;
    for (const i of items) {
      subtotal += i.quantity * i.unit_price;
    }
    po.subtotal = subtotal;
    po.vat = subtotal * 0.16;
    po.total_amount = po.subtotal + po.vat;

    await po.save({ transaction });
    await transaction.commit();

    // جلب الفاتورة بعد التحديث
    const updatedPo = await this.poModel.findByPk(poId, {
      include: [{ model: PurchaseOrderItem, as: 'items' }],
    });

    return updatedPo!;
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating PO item:', error);

    if (error instanceof BadRequestException || error instanceof NotFoundException) {
      throw error;
    }

    throw new InternalServerErrorException('Failed to update Purchase Order Item');
  }
}


async deleteItems(poId: number, itemIds: number[], userId: number): Promise<PurchaseOrder | EditRequest> {
  const transaction = await this.poItemModel.sequelize!.transaction();

  try {
    const po = await this.poModel.findByPk(poId, {
      include: [{ model: PurchaseOrderItem, as: 'items' }],
      transaction,
    });

    if (!po) throw new NotFoundException(`Purchase Order with id ${poId} not found`);

    const blockedStatuses = ['Sent', 'Closed', 'Cancelled'];
    if (blockedStatuses.includes(po.status)) {
      throw new BadRequestException(`Cannot delete items from Purchase Order with status "${po.status}"`);
    }

    // إذا الفاتورة Approved → نتحقق من طلب تعديل مقبول
    let approvedRequest: EditRequest | null = null;
    if (po.status === 'Approved') {
      approvedRequest = await this.editRequestModel.findOne({
        where: {
          invoice_id: poId,
          user_id: userId,
          status: 'approved',
          is_edit: false,
        },
        transaction,
      });

      if (!approvedRequest) {
        // إنشاء طلب تعديل جديد بدل الحذف المباشر
      const editRequest = await this.editRequestModel.create({
        invoice_id: poId,
        user_id: userId,
        message: `User requests to delete items: ${po.items
          .filter(i => itemIds.includes(i.po_item_id))
          .map(i => i.item_name)
          .join(', ')}`,  // هنا نرسل الاسم بدل الرقم
        status: 'pending',
        is_edit: false,
      } as any, { transaction });


        await transaction.commit();
        return editRequest;
      }
    }

    // ✅ التحقق إن كل العناصر موجودة داخل الفاتورة
    const poItemIds = po.items.map(i => i.po_item_id);
    const notFoundItems = itemIds.filter(id => !poItemIds.includes(id));
    if (notFoundItems.length > 0) {
      throw new BadRequestException(`Items with ids ${notFoundItems.join(', ')} not found in this Purchase Order`);
    }

    // حذف العناصر
    await this.poItemModel.destroy({
      where: { po_item_id: itemIds },
      transaction,
    });

    if (approvedRequest) {
      approvedRequest.is_edit = true;
      await approvedRequest.save({ transaction });
    }

    // تحديث الفاتورة بعد الحذف
    let subtotal = 0;
    for (const item of po.items.filter(i => !itemIds.includes(i.po_item_id))) {
      subtotal += item.quantity * item.unit_price;
    }

    po.subtotal = subtotal;
    po.vat = subtotal * 0.16;
    po.total_amount = subtotal + po.vat;

    await po.save({ transaction });
    await transaction.commit();

    const updatedPo = await this.poModel.findByPk(poId, {
      include: [{ model: PurchaseOrderItem, as: 'items' }],
    });

    if (!updatedPo) throw new InternalServerErrorException('Failed to retrieve updated Purchase Order');

    return updatedPo;

  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting items from Purchase Order:', error);
    throw new InternalServerErrorException('Failed to delete Purchase Order Items');
  }
}


  
}
