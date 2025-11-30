import { Module, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { EditRequest } from './edit_requests.model';
import { EditRequestService } from './edit-request.service';
import { EditRequestController } from './edit-request.controller';
import { PurchaseOrder } from 'src/PO/po.model';
import { User } from 'src/users/users.model';
import { HistoryLog } from 'src/History/history-log.model';
import { HistoryLogService } from 'src/History/history-log.service';
import { NotificationModule } from 'src/Notification/notification.module'; 
import { PurchaseOrderModule } from 'src/PO/po.module';


@Module({
  imports: [
    SequelizeModule.forFeature([EditRequest, PurchaseOrder, User, HistoryLog]),
    NotificationModule,
    forwardRef(() => PurchaseOrderModule)
  ],
  providers: [EditRequestService, HistoryLogService],
  controllers: [EditRequestController],
  exports: [EditRequestService]
})
export class EditRequestModule {}
