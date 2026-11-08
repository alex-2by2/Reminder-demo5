import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { OwnerGuard } from './owner.guard';

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [FirebaseAuthGuard, OwnerGuard, AdminService],
})
export class AdminModule {}
