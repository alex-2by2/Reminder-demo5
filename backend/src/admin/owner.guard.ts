import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { OwnerRequest } from './owner-authentication.guard';

@Injectable()
export class OwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<OwnerRequest>();
    if (request.ownerSession?.ownerId && request.ownerSession.ownerId === process.env.OWNER_LOGIN_ID) return true;
    throw new ForbiddenException('Owner access required.');
  }
}
