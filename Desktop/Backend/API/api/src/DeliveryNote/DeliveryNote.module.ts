import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { DeliveryNote } from './delivery-note.model';
import { PurchaseOrder } from '../PO/po.model';
import { DeliveryNoteService } from './DeliveryNote.service';
import { DeliveryNoteController } from './DeliveryNote.controller';
import { DeliveryNoteItem } from './delivery-note-item.model';
import { Supplier } from 'src/Suppliers/supplier.model';
import { User } from 'src/users/users.model';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Module({
  imports: [SequelizeModule.forFeature([DeliveryNote, PurchaseOrder, DeliveryNoteItem, Supplier, User]),
  MulterModule.register({
    storage: diskStorage({
      destination: './uploads/DN',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + extname(file.originalname));
      },
    }),
  })
  ],
  controllers: [DeliveryNoteController],
  providers: [DeliveryNoteService],
})
export class DeliveryNoteModule {}
