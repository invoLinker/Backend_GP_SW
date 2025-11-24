import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { PurchaseOrder } from './po.model';
import { PurchaseOrderItem } from './PoItem.model';
import { CreatePurchaseOrderDto } from './CreatePurchaseOrderDto';
import { CreatePurchaseOrderItemDto } from './CreatePurchaseOrderItemDto';
import { Item } from 'src/Item/item.model';
import { Supplier } from 'src/Suppliers/supplier.model';
import { Op } from 'sequelize';
import { EditRequest } from 'src/edit_requests/edit_requests.model';
import { PaymentMethod } from 'src/supplier-invoices/SupplierInvoiceDto';
import { User } from 'src/users/users.model';

@Injectable()
export class PurchaseOrderService {
  constructor(
    @InjectModel(PurchaseOrder)
    private readonly poModel: typeof PurchaseOrder,

    @InjectModel(PurchaseOrderItem)
    private readonly itemModel: typeof PurchaseOrderItem,

    @InjectModel(EditRequest)
    private readonly editRequestModel: typeof EditRequest,

    @InjectModel(User)
    private readonly userModel: typeof User,

    @InjectModel(Supplier)
    private readonly supplierModel: typeof Supplier,
    

    private readonly sequelize: Sequelize, 
  ) {}


async create(createPoDto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
  const transaction = await this.poModel.sequelize!.transaction();

  try {
    const supplierUser = await this.userModel.findOne({
      where: { email: createPoDto.supplier_email },
      transaction,
    });

    if (!supplierUser) {
      throw new BadRequestException(`Supplier with email "${createPoDto.supplier_email}" does not exist.`);
    }

    const supplier = await this.supplierModel.findOne({
      where: { user_id: supplierUser.user_id },
      transaction,
    });

    if (!supplier) {
      throw new BadRequestException(`No supplier record linked to user "${createPoDto.supplier_email}"`);
    }

    let subtotal = 0;
    let vat = 0;
    let total_amount = 0;

    for (const item of createPoDto.items || []) {
      subtotal += item.quantity * item.unit_price;
    }
    vat = subtotal * 0.16;
    total_amount = subtotal + vat;

    const lastPo = await this.poModel.findOne({
      order: [['po_id', 'DESC']],
      transaction,
    });
    const lastNumber = lastPo ? parseInt(lastPo.po_number.split('-')[1]) : 0;
    const po_number = `PO-${lastNumber + 1}`;

    const po = await this.poModel.create(
      {
        supplier_id: supplier.supplier_id,
        order_date: createPoDto.order_date ? new Date(createPoDto.order_date) : new Date(),
        subtotal,
        vat,
        note:createPoDto.note,
        total_amount,
        expected_delivery: createPoDto.expected_delivery ? new Date(createPoDto.expected_delivery) : null,
        status: createPoDto.status || 'Open',
        currency:createPoDto.currency,
        payment_method:createPoDto.payment_method,
        po_number,
        company_name:createPoDto.company_name,
        company_email:createPoDto.company_email,
        company_phone:createPoDto.company_phone,
        company_address:createPoDto.company_address,
        supplier_email:createPoDto.supplier_email,
        supplier_phone:createPoDto.supplier_phone,
        supplier_address:createPoDto.supplier_address,
      } as any,
      { transaction },
    );

    for (const itemDto of createPoDto.items || []) {
  const existingItem = await Item.findOne({
    where: {
      item_code: itemDto.barcode,
      item_name: itemDto.item_name,
      status: 'active',
    },
    transaction,
  });

      if (!existingItem) {
        throw new BadRequestException(`Item with name "${itemDto.item_name}" does not exist in the system.`);
      }

      await this.itemModel.create(
        {
          po_id: po.po_id,
          item_name: existingItem.item_name,
          barcode: existingItem.item_code,
          quantity: itemDto.quantity,
          unit: itemDto.unit,
          unit_price: itemDto.unit_price,
        } as any,
        { transaction },
      );
    }

    await transaction.commit();
    const savedPo = await this.poModel.findByPk(po.po_id, {
      include: [{ model: PurchaseOrderItem, as: 'items' }],
    });

    if (!savedPo) {
      throw new InternalServerErrorException(
        'Purchase Order was created but could not be retrieved.'
      );
    }

    return savedPo;

  } catch (error) {
    await transaction.rollback();

    if (error.name === 'SequelizeValidationError') {
      throw new BadRequestException(error.message);
    }

    console.error('Error creating Purchase Order:', error);
    throw new InternalServerErrorException('Failed to create Purchase Order');
  }
}



async findAll(): Promise<PurchaseOrder[]> {
    return this.poModel.findAll({
      include: [{ model: PurchaseOrderItem, as: 'items' }],
      order: [['po_id', 'DESC']], 
    });
  }

  async findOne(id: number): Promise<PurchaseOrder> {
    const po = await this.poModel.findByPk(id, {
      include: [{ model: PurchaseOrderItem, as: 'items' }],
    });

    if (!po) {
      throw new NotFoundException(`Purchase Order with not found`);
    }

    return po;
  }

  async findByPONumber(id: string): Promise<PurchaseOrder> {
    const po = await this.poModel.findOne({
    where: {po_number: id,
    },
  });

    if (!po) {
      throw new NotFoundException(`Purchase Order with PO-Number ${id} not found`);
    }

    return po;
  }


  async findBySupplier(supplierId: number): Promise<PurchaseOrder[]> {
    const pos = await this.poModel.findAll({
      where: { supplier_id: supplierId },
      include: [{ model: PurchaseOrderItem, as: 'items' }],
    });

    if (!pos || pos.length === 0) {
      throw new NotFoundException(`No Purchase Orders found for supplier ${supplierId}`);
    }

    return pos;
  }

  async findByStatus(status: 'Open'| 'Closed'| 'Cancelled'| 'Draft'| 'Approved'| 'Sent' |'Incident'|'ReadyForPaid'): Promise<PurchaseOrder[]> {
    const pos = await this.poModel.findAll({
      where: { status },
      include: [{ model: PurchaseOrderItem, as: 'items' }],
    });

    if (!pos || pos.length === 0) {
      throw new NotFoundException(`No Purchase Orders found with status ${status}`);
    }

    return pos;
  }


  async update(poId: number, updateDto: Partial<CreatePurchaseOrderDto>, userId: number ): Promise<PurchaseOrder | EditRequest> {
  const transaction = await this.poModel.sequelize!.transaction();

  try {
    const po = await this.poModel.findByPk(poId, {
      transaction,
      include: [{ model: PurchaseOrderItem, as: 'items' }],
    });
    if (!po) throw new NotFoundException(`Purchase Order with id ${poId} not found`);

    const blockedStatuses = ['Sent', 'Closed', 'Cancelled'];
    if (blockedStatuses.includes(po.status)) {
      throw new BadRequestException(`Cannot modify Purchase Order in status "${po.status}".`);
    }

    const approvedRequest = await this.editRequestModel.findOne({
      where: { 
        invoice_id: poId, 
        user_id: userId,
        status: 'approved',
        is_edit: true 
      },
      transaction,
    });

    if ((po.status === 'Approved' || po.status === 'Open') && !approvedRequest) {
      const editRequest = await this.editRequestModel.create({
        invoice_id: po.po_id,
        user_id: userId,
        message: `User requests to update PO fields: ${JSON.stringify(updateDto)}`,
        status: 'pending',
        is_edit: false, 
      } as any, { transaction });

      await transaction.commit();
      return editRequest;
    }
    if (approvedRequest) {
      approvedRequest.is_edit = true;
      await approvedRequest.save({ transaction });
    }

     if (updateDto.supplier_email) {
      const supplierUser = await this.userModel.findOne({
        where: { email: updateDto.supplier_email || po.supplier_email },
        transaction,
      });
      if (!supplierUser) {
        throw new BadRequestException(`Supplier with email "${updateDto.supplier_email}" does not exist.`);
      }

      const supplier = await this.supplierModel.findOne({
        where: { user_id: supplierUser.user_id },
        transaction,
      });
      if (!supplier) {
        throw new BadRequestException(`No supplier record linked to user "${updateDto.supplier_email || po.supplier_email}"`);
      }

      po.supplier_id = supplier.supplier_id;
      if (updateDto.supplier_email) po.supplier_email = updateDto.supplier_email;
      
    }

    if (updateDto.supplier_phone) po.supplier_phone = updateDto.supplier_phone;
    if (updateDto.supplier_address) po.supplier_address = updateDto.supplier_address;

    if (updateDto.company_name) po.company_name = updateDto.company_name;
    if (updateDto.company_email) po.company_email = updateDto.company_email;
    if (updateDto.company_phone) po.company_phone = updateDto.company_phone;
    if (updateDto.company_address) po.company_address = updateDto.company_address;

    if (updateDto.order_date !== undefined) po.order_date = new Date(updateDto.order_date);
    if (updateDto.expected_delivery !== undefined) po.expected_delivery = new Date(updateDto.expected_delivery!);
    if (updateDto.status !== undefined) po.status = updateDto.status;
    if (updateDto.currency!==undefined) po.currency=updateDto.currency;
    if (updateDto.payment_method!==undefined) po.payment_method=updateDto.payment_method;

    if (updateDto.items && updateDto.items.length > 0) {
      await this.itemModel.destroy({ where: { po_id: poId }, transaction });

      for (const itemDto of updateDto.items) {
        const existingItem = await Item.findOne({
          where: { item_code: itemDto.barcode, item_name: itemDto.item_name, status: 'active' },
          transaction,
        });
        if (!existingItem) throw new BadRequestException(`Item "${itemDto.item_name}" not found or inactive.`);

        await this.itemModel.create({
          po_id: po.po_id,
          item_name: existingItem.item_name,
          barcode: existingItem.item_code,
          quantity: itemDto.quantity,
          unit: itemDto.unit,
          unit_price: itemDto.unit_price,
        } as any, { transaction });
      }
    }

    const itemsToCalculate = updateDto.items || po.items;
    po.subtotal = itemsToCalculate.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
    po.vat = po.subtotal * 0.16;
    po.total_amount = po.subtotal + po.vat;

    await po.save({ transaction });
    await transaction.commit();

    return await this.poModel.findByPk(poId, {
      include: [{ model: PurchaseOrderItem, as: 'items' }],
    }) as PurchaseOrder;

  } catch (error) {
    await transaction.rollback();
    console.error('Error updating Purchase Order:', error);

    if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
    throw new InternalServerErrorException('Failed to update Purchase Order');
  }
}


async deleteById(poId: number): Promise<{ message: string }> {
  const transaction = await this.poModel.sequelize!.transaction();

  try {
    const po = await this.poModel.findByPk(poId, { transaction });
    if (!po) throw new NotFoundException(`Purchase Order with ID ${poId} not found`);

    const blockedStatuses = ['Sent', 'Closed', 'Approved'];
    if (blockedStatuses.includes(po.status)) {
      throw new BadRequestException(
        `Cannot delete Purchase Order with status "${po.status}".`
      );
    }

    await this.itemModel.destroy({ where: { po_id: poId }, transaction });
    await po.destroy({ transaction });

    await transaction.commit();
    return { message: `Purchase Order with ID ${poId} deleted successfully` };
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting Purchase Order:', error);
    if (error instanceof BadRequestException || error instanceof NotFoundException) {
      throw error;
    }
    throw new InternalServerErrorException('Failed to delete Purchase Order');
  }
}



async deleteAll(): Promise<{ message: string }> {
  const transaction = await this.poModel.sequelize!.transaction();

  try {
    const allPOs = await this.poModel.findAll({ transaction });

    if (!allPOs.length) {
      await transaction.rollback();
      return { message: 'No Purchase Orders found' };
    }

    const blockedStatuses = ['Sent', 'Closed', 'Cancelled', 'Approved', 'Paid'];

    await Promise.all(
      allPOs.map(async (po) => {
        if (!blockedStatuses.includes(po.status)) {
          await this.itemModel.destroy({ where: { po_id: po.po_id }, transaction });
          await po.destroy({ transaction });
        }
      })
    );

    await transaction.commit();
    return { message: 'Allowed Purchase Orders deleted successfully' };
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting all Purchase Orders:', error);
    throw new InternalServerErrorException('Failed to delete all Purchase Orders');
  }
}

async deleteBySupplierId(supplierId: number): Promise<{ message: string }> {
  const transaction = await this.poModel.sequelize!.transaction();
  try {
    const pos = await this.poModel.findAll({ where: { supplier_id: supplierId }, transaction });
    if (!pos.length) return { message: `No Purchase Orders found for Supplier ID ${supplierId}` };

    const blockedStatuses = ['Sent', 'Closed', 'Approved'];

    await Promise.all(
      pos.map(async (po) => {
        if (!blockedStatuses.includes(po.status)) {
          await this.itemModel.destroy({ where: { po_id: po.po_id }, transaction });
          await po.destroy({ transaction });
        }
      })
    );

    await transaction.commit();
    return { message: `Allowed Purchase Orders for Supplier ID ${supplierId} deleted successfully` };
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting Purchase Orders by supplier:', error);
    throw new InternalServerErrorException('Failed to delete Purchase Orders by supplier');
  }
}

async deleteByStatus(status: string): Promise<{ message: string }> {
  const transaction = await this.poModel.sequelize!.transaction();
  try {
    const pos = await this.poModel.findAll({ where: { status }, transaction });
    if (!pos.length) return { message: `No Purchase Orders found with status "${status}"` };

    const blockedStatuses = ['Sent', 'Closed', 'Approved'];

    await Promise.all(
      pos.map(async (po) => {
        if (!blockedStatuses.includes(po.status)) {
          await this.itemModel.destroy({ where: { po_id: po.po_id }, transaction });
          await po.destroy({ transaction });
        }
      })
    );

    await transaction.commit();
    return { message: `Allowed Purchase Orders with status "${status}" deleted successfully` };
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting Purchase Orders by status:', error);
    throw new InternalServerErrorException('Failed to delete Purchase Orders by status');
  }
}

}