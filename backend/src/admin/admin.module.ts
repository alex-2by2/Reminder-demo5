import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OwnerAuthenticationGuard } from './owner-authentication.guard';
import { OwnerSessionService } from './owner-session.service';
import { OwnerSessionController } from './owner-session.controller';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { OwnerGuard } from './owner.guard';

@Module({
  imports: [AuthModule],
  controllers: [AdminController, OwnerSessionController],
  providers: [OwnerAuthenticationGuard, OwnerSessionService, OwnerGuard, AdminService],
})
export class AdminModule {}
