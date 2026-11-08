import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { OwnerSessionService } from './owner-session.service';
import type { Request } from 'express';

export interface OwnerRequest extends Request {
  ownerSession?: { ownerId: string };
}

@Injectable()
export class OwnerAuthenticationGuard implements CanActivate {
  constructor(private readonly sessions: OwnerSessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OwnerRequest>();
    const session = await this.sessions.getSession(request);
    if (!session) throw new UnauthorizedException('Owner ID authentication required.');
    request.ownerSession = { ownerId: session.ownerId };
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const expected = new URL(process.env.RENDER_EXTERNAL_URL || 'http://localhost:3001').origin;
      if (request.header('origin') !== expected || request.header('x-owner-action') !== '1') {
        throw new UnauthorizedException('Invalid owner request origin.');
      }
    }
    return true;
  }
}
