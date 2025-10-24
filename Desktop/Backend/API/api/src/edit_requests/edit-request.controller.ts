import { Controller, Get, Post, Put, Delete, Param, Body, ParseIntPipe, UseGuards, Patch } from '@nestjs/common';
import { EditRequestService } from './edit-request.service';
import { EditRequest } from './edit_requests.model';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionName } from 'src/permission/permission.decorator';
import { UpdateEditRequestDto } from './UpdateEditRequestDto';

@Controller('edit-requests')
export class EditRequestController {
  constructor(private readonly editRequestService: EditRequestService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @PermissionName('get_edit_request')
  findAll(): Promise<EditRequest[]> {
    return this.editRequestService.findAll();
  }

@Get('status/:status')
@UseGuards(JwtAuthGuard)
  @PermissionName('get_edit_request')
findByStatus(@Param('status') status: 'pending' | 'approved' | 'rejected'): Promise<EditRequest[]> {
return this.editRequestService.findByStatus(status);
}


@Patch(':id')
update(
  @Param('id', ParseIntPipe) id: number,
  @Body() data: UpdateEditRequestDto,
): Promise<EditRequest> {
  return this.editRequestService.update(id, data);
}

}
