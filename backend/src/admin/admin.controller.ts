import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/firebase-auth.guard';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { OwnerGuard } from './owner.guard';

@Controller('admin')
@UseGuards(FirebaseAuthGuard, OwnerGuard)
export class AdminController {
  /**
   * Small protected handshake endpoint. It proves the unified API applies
   * Firebase authentication first and owner authorization second.
   */
  @Get('access')
  getAccess(@Req() request: AuthenticatedRequest) {
    return {
      access: 'owner',
      uid: request.user!.uid,
    };
  }
}
