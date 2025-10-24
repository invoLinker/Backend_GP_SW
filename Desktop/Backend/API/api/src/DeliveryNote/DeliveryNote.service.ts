import { Injectable, InternalServerErrorException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { DeliveryNote } from './delivery-note.model';
import { PurchaseOrder } from '../PO/po.model';
import { CreateDeliveryNoteDto } from './DeliveryNoteDTO';
import { DeliveryNoteItem } from './delivery-note-item.model';
import { Supplier } from 'src/Suppliers/supplier.model';
import { Op } from 'sequelize';

@Injectable()
export class DeliveryNoteService {
  constructor(
    @InjectModel(DeliveryNote) private deliveryNoteModel: typeof DeliveryNote,
    @InjectModel(DeliveryNoteItem) private deliveryNoteItemModel: typeof DeliveryNoteItem,
    @InjectModel(PurchaseOrder) private poModel: typeof PurchaseOrder,
    @InjectModel(Supplier) private supplierModel: typeof Supplier,

  ) {}

  async createDeliveryNote(dto: CreateDeliveryNoteDto, createdBy: number) {
  const transaction = await this.deliveryNoteModel.sequelize!.transaction();
  const errors: string[] = [];

  try {
    const po = await this.poModel.findOne({ where: { po_number: dto.po_number }, transaction });
    if (!po) errors.push('PO number not found');

    const supplier = await Supplier.findOne({ where: { contact_email: dto.supplier_email }, transaction });
    if(!supplier) errors.push('Supplier not found');
    

    const deliveryNote = await this.deliveryNoteModel.create({
      supplier_id: supplier? supplier.supplier_id : null,
      dn_number: dto.dn_number,
      dn_date: dto.dn_date,
      po_number: po ? dto.po_number : null,
      supplier_name: dto.supplier_name ?? null,
      supplier_email: dto.supplier_email ?? null,
      supplier_phone: dto.supplier_phone ?? null,
      supplier_address: dto.supplier_address ?? null,
      created_by: createdBy,
      status: errors.length > 0 ? 'Incident' : 'Pending', 
      notes: errors.length > 0 ? errors.join('; ') : null,
      }as any, { transaction });


    // إنشاء العناصر
    for (const item of dto.items) {
      await this.deliveryNoteItemModel.create({
        ...item,
        dn_id: deliveryNote.dn_id,
      } as any, { transaction });
    }

    const noteWithItems = await this.deliveryNoteModel.findOne({
      where: { dn_id: deliveryNote.dn_id },
      include: [{ model: this.deliveryNoteItemModel, as: 'items' }],
      transaction,
    });

    await transaction.commit();
    return noteWithItems;

  } catch (err) {
    await transaction.rollback();
    throw new InternalServerErrorException(err.message);
  }
}


  async getAll() {
    return this.deliveryNoteModel.findAll({
      include: [{ model: this.deliveryNoteItemModel, as: 'items' }],
      order: [['createdAt', 'DESC']],
    });
  }

  // ✅ Get delivery notes by status
  async getByStatus(status: string) {
    const validStatuses = [
      'Pending',
      'Received',
      'Incident',
      'Verified',
      'Approved',
      'Rejected',
    ];

    if (!validStatuses.includes(status)) {
      throw new NotFoundException(`Invalid status: ${status}`);
    }

    const notes = await this.deliveryNoteModel.findAll({
      where: { status },
      include: [{ model: this.deliveryNoteItemModel, as: 'items' }],
      order: [['createdAt', 'DESC']],
    });

    if (!notes.length) throw new NotFoundException(`No delivery notes with status ${status}`);
    return notes;
  }

  async search(keyword: string) {
    const results = await this.deliveryNoteModel.findAll({
      where: {
        [Op.or]: [
          { dn_number: { [Op.like]: `%${keyword}%` } },
          { supplier_name: { [Op.like]: `%${keyword}%` } },
          { po_number: { [Op.like]: `%${keyword}%` } },
        ],
      },
      include: [{ model: this.deliveryNoteItemModel, as: 'items' }],
      order: [['createdAt', 'DESC']],
    });

    if (!results.length)
      throw new NotFoundException(`No delivery notes found for: ${keyword}`);

    return results;
  }

  async updateDeliveryNote(dn_number: string, updateData: any, userId: number) {
    const dn = await this.deliveryNoteModel.findOne({
      where: { dn_number },
      include: [
        { model: this.deliveryNoteItemModel, as: 'items' },
        // { model: this.poModel, attributes: ['po_number']}, 
      ],
    });

    if (!dn) throw new NotFoundException('Delivery Note not found');

    if (dn.status === 'Received')
      throw new BadRequestException('Received delivery notes cannot be modified');

    if (dn.status === 'Approved' && updateData.status && updateData.status !== 'Approved')
      throw new BadRequestException('Approved notes cannot change to a lower status');

    let po: PurchaseOrder | null = null;
    if (updateData.po_number) {
      po = await this.poModel.findOne({
        where: { po_number: updateData.po_number },
        // include: [Supplier ],
      });
      if (!po) throw new BadRequestException('Purchase Order not found');
      dn.po_number = updateData.po_number;
    }

    if (!po?.supplier) {
      throw new BadRequestException('Purchase Order does not have a linked Supplier');
    }

    dn.supplier_name = po.supplier.supplier_name;
    dn.supplier_email = po.supplier.contact_email;
    dn.supplier_phone = po.supplier.contact_phone;
    dn.supplier_address = po.supplier.contact_address;

    if (updateData.document_images) {
      dn.notes = `${dn.notes ?? ''}\n[Old document replaced at ${new Date().toISOString()}]`;
      dn.document_images = updateData.document_images;
    }

    if (updateData.notes) {
      dn.notes = `${dn.notes ?? ''}\n[${new Date().toLocaleString()} by user ${userId}]: ${updateData.notes}`;
    }

    if (updateData.status) {
      dn.status = updateData.status;
    }

    dn.created_by = userId;
    dn.updatedAt = new Date();

    await dn.save();

    return { message: 'Delivery Note updated successfully', dn };
  }


}
