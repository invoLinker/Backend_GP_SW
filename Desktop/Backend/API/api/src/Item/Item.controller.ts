import { Controller, Get, Post, Body, Param, Patch, Delete, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { ItemService } from './Item.service';
import { CreateItemDto } from './CreatItemDto';
import { UpdateItemDto } from './UpdateItemDto';
import { Item } from './item.model';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionName } from 'src/permission/permission.decorator';

@Controller('items')
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @PermissionName('create_item')
  create(@Body() createDto: CreateItemDto): Promise<Item> {
    return this.itemService.create(createDto);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @PermissionName('search_item')
  async search(@Query('name') name: string): Promise<Item[]> {
  return this.itemService.search(name);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_item')
  async findAll(): Promise<Item[]> {
      return this.itemService.findAll();
    }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @PermissionName('update_item')
  async update( @Param('id', ParseIntPipe) id: number, @Body() updateItemDto: UpdateItemDto): Promise<Item> {
    return this.itemService.update(id, updateItemDto);
  }

//   @Delete(':id')
//   remove(@Param('id') id: number): Promise<{ message: string }> {
//     return this.itemService.remove(id);
//   }
}
