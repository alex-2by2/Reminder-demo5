import { Module } from '@nestjs/common';
import { FirebaseAdminService } from './firebase-admin';

@Module({
  providers: [FirebaseAdminService],
  exports: [FirebaseAdminService],
})
export class AuthModule {}
