import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { FirebaseAdminService } from '../auth/firebase-admin';
import { OwnerSessionService } from './owner-session.service';
import type { AuthenticatedRequest } from '../auth/firebase-auth.guard';

export interface OwnerRequest extends AuthenticatedRequest {
  ownerSession?: { ownerId: string };
}

@Injectable()
export class OwnerAuthenticationGuard implements CanActivate {
  constructor(
    private readonly firebase: FirebaseAdminService,
    private readonly sessions: OwnerSessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OwnerRequest>();
    const authorization = request.header('authorization') || '';
    // Never fall back to a cookie after a supplied bearer token fails.
    if (authorization) {
      const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
      if (!match) throw new UnauthorizedException('Invalid authorization header.');
      request.user = await this.firebase.verifyIdToken(match[1]);
      return true;
    }
    const session = await this.sessions.getSession(request);
    if (!session) throw new UnauthorizedException('Owner authentication required.');
    request.ownerSession = { ownerId: session.ownerId };
    // Cookies are SameSite=Strict, and state-changing requests also require
    // an exact same-origin Origin header and a non-simple custom header.
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const expected = new URL(process.env.RENDER_EXTERNAL_URL || 'http://localhost:3001').origin;
      if (request.header('origin') !== expected || request.header('x-owner-action') !== '1') {
        throw new UnauthorizedException('Invalid owner request origin.');
      }
    }
    return true;
  }
}
