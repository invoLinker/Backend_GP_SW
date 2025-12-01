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

  async createDeliveryNote(dto: CreateDeliveryNoteDto, createdBy: number, file?: Express.Multer.File) {
  const transaction = await this.deliveryNoteModel.sequelize!.transaction();
  const errors: string[] = [];

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
    

     const existingInvoice = await this.deliveryNoteModel.findOne({
    where: { dn_number: dto.dn_number},
    transaction,
    });

    if (existingInvoice) {
      await transaction.rollback();
      throw new BadRequestException(
        `DN with number ${dto.dn_number} already exists`
      );
    }
    
       let pdfUrl: string | null = null;
  let invoice_image: string | null = null;
  let excelUrl: string | null = null;

  if (file) {
    const extRaw = file.originalname.split(".").pop();
    if (!extRaw) {
      throw new BadRequestException("Cannot detect file type");
    }

    const ext = extRaw.toLowerCase();
    const filePath = `/uploads/DN/${file.filename}`;

    if (ext === "pdf") {
      pdfUrl = filePath;
    } else if (["jpg", "jpeg", "png"].includes(ext)) {
      invoice_image = filePath;
    } else if (["xls", "xlsx"].includes(ext)) {
      excelUrl = filePath;
    } else {
      await transaction.rollback();
      throw new BadRequestException(`Unsupported file type .${ext}`);
    }
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
      to_name: dto.to_name ?? null,
      to_email:dto.to_email ?? null ,
      to_phone:dto.to_phone ?? null,
      to_address:dto.to_address ?? null,
      status: errors.length > 0 ? 'Incident' : 'Pending', 
      notes: errors.length > 0 ? errors.join('; ') : null,
      pdfUrl,
      invoice_image,
      excelUrl,
      }as any, { transaction });


    for (const item of dto.items) {
      await this.deliveryNoteItemModel.create({
        ...item,
        dn_id: deliveryNote.dn_id,
      } as any, { transaction });
    }

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

    return {
     deliveryNote,
     path: pdfUrl || invoice_image || excelUrl || null
    };

}

async saveInvoiceImage( filePath: string, dn_number: string,){
     const si = await this.deliveryNoteModel.findOne({ where: { dn_number: dn_number } });

  if (!si) {
    throw new NotFoundException(`Delivery Note with #${dn_number} not found`);
  }

  const extension = filePath.split('.').pop()?.toLowerCase();

  if (!extension) {
    throw new BadRequestException('Cannot detect file type');
  }

  let response: any = { message: '' };

  if (extension === 'pdf') {
    si.pdfUrl = filePath;
    response = {
      message: 'PDF uploaded successfully',
      pathPdf: filePath,
    };
  }

  else if (extension === 'xlsx' || extension === 'xls') {
    si.excelUrl = filePath;
    response = {
      message: 'Excel uploaded successfully',
      pathExcel: filePath,
    };
  }

  else {
    throw new BadRequestException(
      `Unsupported file type ".${extension}". Only PDF or Excel are allowed.`
    );
  }

  await si.save();

  return response;

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
    include: [
      {
        model: Role,
        as: 'role',
        where: { role_name: roles }
      }
    ]
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