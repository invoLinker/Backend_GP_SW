import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { EditRequest } from './edit_requests.model';
import { EditRequestService } from './edit-request.service';
import { EditRequestController } from './edit-request.controller';
import { PurchaseOrder } from 'src/PO/po.model';
import { User } from 'src/users/users.model';

@Module({
  imports: [SequelizeModule.forFeature([EditRequest, PurchaseOrder, User])],
  providers: [EditRequestService],
  controllers: [EditRequestController],
})
export class EditRequestModule {}
