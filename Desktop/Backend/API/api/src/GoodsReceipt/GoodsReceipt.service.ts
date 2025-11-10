import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { GoodsReceipts } from './GoodsReceipt.model';
import { GoodsReceiptItem } from './GoodsReceiptItem.model';
import { DeliveryNote } from '../DeliveryNote/delivery-note.model';
import { PurchaseOrder } from '../PO/po.model';
import { CreateGoodsReceiptDto } from './GoodsReceiptDto';
import { Op, where } from 'sequelize';

@Injectable()
export class GoodsReceiptService {
  constructor(
    @InjectModel(GoodsReceipts) private grModel: typeof GoodsReceipts,
    @InjectModel(GoodsReceiptItem) private grItemModel: typeof GoodsReceiptItem,
    @InjectModel(DeliveryNote) private dnModel: typeof DeliveryNote,
    @InjectModel(PurchaseOrder) private poModel: typeof PurchaseOrder,
  ) {}

  private async generateGRNumber(): Promise<string> {
    const lastGR = await this.grModel.findOne({ order: [['gr_id', 'DESC']] });
    const lastNumber = lastGR ? parseInt(lastGR.gr_number?.split('-')[1] || '0', 10) : 0;
    return `GR-${(lastNumber + 1).toString().padStart(5, '0')}`;
  }

  async createGR(dto: CreateGoodsReceiptDto, userId: number) {
    const transaction = await this.grModel.sequelize!.transaction();

    try {
      const dn = await this.dnModel.findOne({
        where: { dn_number: dto.dn_number },
        transaction,
      });

       const po = await this.poModel.findOne({
        where: { po_number: dto.po_number },
        transaction,
      });

        
      if (!po || !dn) {
        throw new Error('Purchase Order or Delivery Note not found');
      }

      // if (dn.status === 'Incident') {
      // throw new BadRequestException(`Cannot create Goods Receipt: Delivery Note status is '${dn.status}'`);
      // }

      const generatedGRNumber = await this.generateGRNumber();

      const gr = await this.grModel.create(
        {
          gr_number: generatedGRNumber,
          gr_date: new Date(),
          dn_id: dn.dn_id,
          received_by: userId,
          notes: dto.notes ?? null,
          po_number: dto.po_number,
          status: 'Pending',
        } as any,
        { transaction },
      );

      for (const item of dto.items) {
        await this.grItemModel.create(
          {
            ...item,
            gr_id: gr.gr_id,
          } as any,
          { transaction },
        );
      }

      const grWithItems = await this.grModel.findOne({
        where: { gr_id: gr.gr_id },
        include: [{ model: this.grItemModel, as: 'items' }],
        transaction,
      });

      await transaction.commit();
      return grWithItems;
    } catch (err) {
      await transaction.rollback();
      throw new InternalServerErrorException(err.message);
    }
  }

  async getAll() {
    return this.grModel.findAll({
      include: [
        { model: this.grItemModel, as: 'items' },
        // { model: this.poModel, attributes: ['po_number'] },
        { model: this.dnModel, attributes: ['dn_number'] },
      ],
    });
  }


async getByStatus(status: string) {
    const validStatuses = ['Pending', 'Received', 'Verified', 'Incident'];

    if (!validStatuses.includes(status)) {
      throw new NotFoundException(`Invalid status: ${status}`);
    }

    return this.grModel.findAll({
    where: { status },
    include: [
      { model: this.grItemModel, as: 'items' },
      { model: this.dnModel, attributes: ['dn_number'] },
    ],
  } as any);
  }

 async search(keyword: string) {
    const results = await this.grModel.findAll({
      where: {
        [Op.or]: [
          { gr_number: { [Op.like]: `%${keyword}%` } },
          { notes: { [Op.like]: `%${keyword}%` } },
          { po_number: { [Op.like]: `%${keyword}%` } },
        ],
      },
      include: [
        { model: this.grItemModel, as: 'items' },
        { model: this.dnModel, attributes: ['dn_number'] }
      ],
      order: [['createdAt', 'DESC']],
    });

    if (!results.length)
      throw new NotFoundException(`No Goods Receipt found for: ${keyword}`);

    return results;
  }

  async updateGR(gr_id: number, dto: CreateGoodsReceiptDto) {
  const transaction = await this.grModel.sequelize!.transaction();

  try {
    const gr = await this.grModel.findByPk(gr_id, { transaction });
    if (!gr) throw new NotFoundException('Goods Receipt not found');

    if (dto.dn_number) {
      const dn = await this.dnModel.findOne({
        where: { dn_number: dto.dn_number },
        transaction,
      });
      if (!dn) throw new Error('Delivery Note not found');
    }

    if (dto.po_number) {
      const po = await this.poModel.findOne({
        where: { po_number: dto.po_number },
        transaction,
      });
      if (!po) throw new Error('Purchase Order not found');
    }

    await gr.update(
      {
        notes: dto.notes ?? gr.notes,
        po_number: dto.po_number ?? gr.po_number,
      },
      { transaction },
    );

    // حذف الـ items القديمة
    await this.grItemModel.destroy({ where: { gr_id }, transaction });

    // إضافة الـ items الجديدة
    for (const item of dto.items) {
      await this.grItemModel.create(
        { ...item, gr_id } as any,
        { transaction },
      );
    }

    await transaction.commit();

    return this.grModel.findOne({
      where: { gr_id },
      include: [{ model: this.grItemModel, as: 'items' }],
    });
  } catch (err) {
    await transaction.rollback();
    throw new InternalServerErrorException(err.message);
  }
}


  async deleteGR(gr_id: number) {
    const transaction = await this.grModel.sequelize!.transaction();
    try {
      const gr = await this.grModel.findByPk(gr_id, { transaction });
      if (!gr) throw new NotFoundException('Goods Receipt not found');

      await this.grItemModel.destroy({ where: { gr_id }, transaction });

      await gr.destroy({ transaction });

      await transaction.commit();
      return { message: 'Goods Receipt deleted successfully' };
    } catch (err) {
      await transaction.rollback();
      throw new InternalServerErrorException(err.message);
    }
  }

}
