import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, UseGuards, Request, Patch } from '@nestjs/common';
import { EditRequestService } from './edit-request.service';
import { EditRequest } from './edit_requests.model';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionName } from 'src/permission/permission.decorator';
import { UpdateEditRequestDto } from './UpdateEditRequestDto';
import { HistoryLogService } from '../History/history-log.service';
import { HistoryCategory, HistorySeverity } from '../History/create-history-log.dto';
@Controller('edit-requests')
export class EditRequestController {
  constructor(private readonly editRequestService: EditRequestService,
              private readonly historyLogService: HistoryLogService

  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_edit_request')
  findAll(): Promise<EditRequest[]> {
    return this.editRequestService.findAll();
  }

  @Get('status/:status')
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_edit_request')
  findByStatus(@Param('status') status: 'Pending' | 'Approved' | 'Rejected'): Promise<EditRequest[]> {
  return this.editRequestService.findByStatus(status);
  }


  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateEditRequestDto,
    @Request() req){
    try {
      const updated = await this.editRequestService.update(id, data);

      await this.historyLogService.createLog({
        action: 'Edit Request Updated',
        description: `Edit request with id=${id} updated`,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.SUCCESS,
        details: updated,
      });

      return updated;
    } catch (error) {
      await this.historyLogService.createLog({
        action: 'Edit Request Update Failed',
        description: error.message,
        user: req.user?.email ?? 'Unknown',
        userRole: req.user?.role ?? 'Unknown',
        category: HistoryCategory.DATA,
        severity: HistorySeverity.ERROR,
        details: error ,
      });
      throw error;
    }
  }

  
}
