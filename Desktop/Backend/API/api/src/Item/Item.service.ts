import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Item } from './item.model';
import { CreateItemDto } from './CreatItemDto';
import { UpdateItemDto } from './UpdateItemDto';
import { Op } from 'sequelize';

@Injectable()
export class ItemService {
  constructor(
    @InjectModel(Item) private itemModel: typeof Item,
  ) {}

 async create(createItemDto: CreateItemDto): Promise<Item> {
    const name = createItemDto.item_name.trim();

    const existing = await this.itemModel.findOne({
      where: { item_name: { [Op.like]: name }, status: 'active' },
    });
    if (existing) throw new BadRequestException('Item with this name already exists.');

    const code = createItemDto.item_code || `${name.substring(0,2).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const item = await this.itemModel.create({
      item_name: name,
      item_code: code,
      min_price: createItemDto.min_price ?? 0,
      max_price: createItemDto.max_price ?? 0,
      status: 'active',
    } as any);

    return item;
  }

  async update(id: number, updateDto: UpdateItemDto): Promise<Item> {
    const item = await this.itemModel.findByPk(id);
    if (!item) throw new NotFoundException('Item not found');

    if (updateDto.item_name) {
      const name = updateDto.item_name.trim();

      const existing = await this.itemModel.findOne({
        where: {
          item_name: { [Op.like]: name },
          status: 'active',
          item_id: { [Op.ne]: id },
        },
      });
      if (existing) throw new BadRequestException('Another active item with this name already exists.');

      item.item_name = name;
    }

    if (updateDto.min_price !== undefined) item.min_price = updateDto.min_price;
    if (updateDto.max_price !== undefined) item.max_price = updateDto.max_price;
    if (updateDto.status) item.status = updateDto.status;

    await item.save();
    return item;
  }

async search(name: string): Promise<Item[]> {
  return await this.itemModel.findAll({
    where: {
      item_name: { [Op.like]: `%${name}%` }, 
      status: 'active', 
    },
  });
}

async findAll(): Promise<Item[]> {
    const items= await this.itemModel.findAll();
     if (items.length === 0) {
      throw new NotFoundException('There are no permissions');
    }
    return items; 
  }
}
