import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { CreateReminderDto, ListRemindersQueryDto, UpdateReminderDto } from './dto/reminder.dto';
import { RemindersService } from './reminders.service';

@Controller('reminders')
@UseGuards(FirebaseAuthGuard)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateReminderDto) {
    return this.remindersService.create(this.identity(request), dto);
  }

  @Get()
  list(@Req() request: AuthenticatedRequest, @Query() query: ListRemindersQueryDto) {
    return this.remindersService.list(this.identity(request), query);
  }

  @Get(':id')
  getById(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.remindersService.getById(this.identity(request), id);
  }

  @Patch(':id')
  update(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateReminderDto) {
    return this.remindersService.update(this.identity(request), id, dto);
  }

  @Delete(':id')
  softDelete(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.remindersService.softDelete(this.identity(request), id);
  }

  @Patch(':id/restore')
  restore(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.remindersService.restore(this.identity(request), id);
  }

  private identity(request: AuthenticatedRequest) {
    if (!request.user) throw new Error('Firebase auth guard did not attach an identity.');
    return request.user;
  }
}
