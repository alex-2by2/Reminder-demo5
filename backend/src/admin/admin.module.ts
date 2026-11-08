import { Module } from '@nestjs/common';
import { OwnerAuthenticationGuard } from './owner-authentication.guard';
import { OwnerSessionService } from './owner-session.service';
import { OwnerSessionController } from './owner-session.controller';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { OwnerGuard } from './owner.guard';

@Module({
  controllers: [AdminController, OwnerSessionController],
  providers: [OwnerAuthenticationGuard, OwnerSessionService, OwnerGuard, AdminService],
})
export class AdminModule {}
