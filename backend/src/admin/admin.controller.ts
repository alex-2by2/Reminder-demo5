import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest, FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { AdminService } from './admin.service';
import { OwnerGuard } from './owner.guard';

@Controller('admin')
@UseGuards(FirebaseAuthGuard, OwnerGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('access')
  getAccess(@Req() request: AuthenticatedRequest) {
    return { access: 'owner', uid: request.user!.uid };
  }

  @Get('overview')
  getOverview() {
    return this.admin.getOverview();
  }

  @Get('users')
  listUsers(@Query('limit') limit?: string, @Query('pageToken') pageToken?: string) {
    return this.admin.listUsers(limit, pageToken);
  }

  @Patch('users/:uid')
  setUserDisabled(
    @Param('uid') uid: string,
    @Body() body: { disabled?: unknown },
    @Req() request: AuthenticatedRequest,
  ) {
    if (typeof body?.disabled !== 'boolean') {
      throw new BadRequestException("Expected a boolean 'disabled' value.");
    }
    return this.admin.setUserDisabled(uid, body.disabled, request.user!.uid);
  }

  @Get('crash-reports')
  listCrashReports(@Query('limit') limit?: string, @Query('cursor') cursor?: string) {
    return this.admin.listCrashReports(limit, cursor);
  }

  @Get('referrals')
  listReferrals(@Query('limit') limit?: string) {
    return this.admin.listReferrals(limit);
  }
}
