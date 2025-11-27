import { Injectable, InternalServerErrorException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { DeliveryNote } from './delivery-note.model';
import { PurchaseOrder } from '../PO/po.model';
import { CreateDeliveryNoteDto } from './DeliveryNoteDTO';
import { DeliveryNoteItem } from './delivery-note-item.model';
import { Supplier } from 'src/Suppliers/supplier.model';
import { Op } from 'sequelize';
import { User } from 'src/users/users.model';
import { NotificationService } from 'src/Notification/notification.service';
import { NotificationChannel } from 'src/Notification/create-notification.dto';
import { Role } from 'src/roles/roles.model';
import {NotificationCategory} from '../Notification/create-notification.dto'

@Injectable()
export class DeliveryNoteService {
  constructor(
    @InjectModel(DeliveryNote) private deliveryNoteModel: typeof DeliveryNote,
    @InjectModel(DeliveryNoteItem) private deliveryNoteItemModel: typeof DeliveryNoteItem,
    @InjectModel(PurchaseOrder) private poModel: typeof PurchaseOrder,
    @InjectModel(Supplier) private supplierModel: typeof Supplier,
    @InjectModel(User)private userModel: typeof User,
    private readonly notificationService: NotificationService
  ) {}

  async createDeliveryNote(dto: CreateDeliveryNoteDto, createdBy: number) {
  const transaction = await this.deliveryNoteModel.sequelize!.transaction();
  const errors: string[] = [];

  try {
    const po = await this.poModel.findOne({ where: { po_number: dto.po_number }, transaction });
    if (!po) errors.push('PO number not found');

    let supplier: Supplier | null = null;

        if (dto.supplier_email) {
        const supplierUser = await this.userModel.findOne({
            where: { email: dto.supplier_email },
            transaction,
        });

        if (!supplierUser) {
            errors.push(`Supplier with email ${dto.supplier_email} not found`);
        } else {
            supplier = await this.supplierModel.findOne({
            where: { user_id: supplierUser.user_id },
            transaction,
            });

            if (!supplier) {
            errors.push(`Supplier record linked to user ${dto.supplier_email} not found`);
            }
        }
        } else {
        errors.push('Supplier email missing');
        }
    

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
      to_name: dto.to_name,
      to_email:dto.to_email,
      to_phone:dto.to_phone,
      to_address:dto.to_address,
      status: errors.length > 0 ? 'Incident' : 'Pending', 
      notes: errors.length > 0 ? errors.join('; ') : null,
      }as any, { transaction });


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

    if (errors.length > 0) {
      await this.notifyUsers(
      ['Admin', 'Accountant'],
      errors.length > 0 ? 'Delivery Note Incident' : 'New Delivery Note Created',
      errors.length > 0
        ? `DN ${dto.dn_number} contains issues: ${errors.join(', ')}`
        : `A new Delivery Note ${dto.dn_number} has been added.`
    );
    }

    return noteWithItems;


  } catch (err) {
    await transaction.rollback();
    throw new InternalServerErrorException(err.message);
  }
}

async saveInvoiceImage( image: Express.Multer.File, Id: number,){
    const dn = await this.deliveryNoteModel.findByPk(Id);
    if (!dn){
        throw new NotFoundException("Supplier invoice not found");
    }

    dn.document_images = `/uploads/DN/${image.filename}`; 
    await dn.save();
    return "​✔️​ The image was uploaded successfully."

    }


  async getAll() {
    return this.deliveryNoteModel.findAll({
      include: [{ model: this.deliveryNoteItemModel, as: 'items' }],
      order: [['createdAt', 'DESC']],
    });
  }

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

async UpdateDN(id: number, dto: CreateDeliveryNoteDto, createdBy: number) {
  const transaction = await this.deliveryNoteModel.sequelize!.transaction();
  const errors: string[] = [];

  try {
    const deliveryNote = await this.deliveryNoteModel.findByPk(id, { transaction });
    if (!deliveryNote) {
      await transaction.rollback();
      throw new NotFoundException('Delivery Note not found');
    }
   

    await this.deliveryNoteItemModel.destroy({ where: { dn_id: id }, transaction });

    const fieldsToClear = [
      'po_number','supplier_id',
      'incident_reason','to_name','to_email','to_phone','to_address',
      'created_by','dn_date',
      'supplier_name','supplier_email','supplier_phone','supplier_address'
    ];
    for (const f of fieldsToClear) {
      deliveryNote[f] = null;
    }

    const po = await this.poModel.findOne({ where: { po_number: dto.po_number }, transaction });
    if (!po) errors.push('PO number not found');

    let supplier: Supplier | null = null;
    if (dto.supplier_email) {
      const supplierUser = await this.userModel.findOne({
        where: { email: dto.supplier_email },
        transaction,
      });
      if (!supplierUser) {
        errors.push(`Supplier with email ${dto.supplier_email} not found`);
      } else {
        supplier = await this.supplierModel.findOne({
          where: { user_id: supplierUser.user_id },
          transaction,
        });
        if (!supplier) {
          errors.push(`Supplier record linked to user ${dto.supplier_email} not found`);
        }
      }
    } else {
      errors.push('Supplier email missing');
    }

    Object.assign(deliveryNote, {
      dn_id:id,
      supplier_id: supplier ? supplier.supplier_id : null,
      dn_number: dto.dn_number,
      dn_date: dto.dn_date,
      po_number: po ? dto.po_number : null,
      supplier_name: dto.supplier_name ?? null,
      supplier_email: dto.supplier_email ?? null,
      supplier_phone: dto.supplier_phone ?? null,
      supplier_address: dto.supplier_address ?? null,
      created_by: createdBy,
      to_name: dto.to_name,
      to_email: dto.to_email,
      to_phone: dto.to_phone,
      to_address: dto.to_address,
      status: errors.length > 0 ? 'Incident' : 'Pending',
      notes: errors.length > 0 ? errors.join('; ') : null,
    });

    await deliveryNote.save({ transaction });

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

    if (errors.length > 0) {
      await this.notifyUsers(
      ['Accountant'],
      errors.length > 0 ? 'Delivery Note Updated With Incident' : 'Delivery Note Updated',
      errors.length > 0
        ? `DN ${dto.dn_number} contains issues: ${errors.join(', ')}`
        : `A Delivery Note ${dto.dn_number} has been updated.`
    );
    }

    return noteWithItems;


  } catch (err) {
    await transaction.rollback();
    throw new InternalServerErrorException(err.message);
  }
}

async deleteInvoiceById(id: number) {
  const invoice = await this.deliveryNoteModel.findByPk(id);
  if (!invoice) throw new NotFoundException('DN not found');

  await this.deliveryNoteItemModel.destroy({
    where: { dn_id: id },
  });

  await invoice.destroy();

  return { message: 'DN deleted successfully' };
}

private async notifyUsers(roles: string[], title: string, message: string) {
  const users = await this.userModel.findAll({
    where: { role: roles },
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



}