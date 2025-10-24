import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { DeliveryNote } from './delivery-note.model';
import { PurchaseOrder } from '../PO/po.model';
import { DeliveryNoteService } from './DeliveryNote.service';
import { DeliveryNoteController } from './DeliveryNote.controller';
import { DeliveryNoteItem } from './delivery-note-item.model';
import { Supplier } from 'src/Suppliers/supplier.model';

@Module({
  imports: [SequelizeModule.forFeature([DeliveryNote, PurchaseOrder, DeliveryNoteItem, Supplier])],
  controllers: [DeliveryNoteController],
  providers: [DeliveryNoteService],
})
export class DeliveryNoteModule {}
