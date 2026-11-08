import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { OwnerRequest } from './owner-authentication.guard';

/**
 * Restricts owner/admin endpoints to explicitly configured owner identities.
 * UID allowlisting is authoritative; email allowlisting requires Firebase's
 * verified-email claim. Client-supplied roles and profile fields are ignored.
 */
@Injectable()
export class OwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<OwnerRequest>();
    if (request.ownerSession?.ownerId && request.ownerSession.ownerId === process.env.OWNER_LOGIN_ID) return true;
    const user = request.user;
    if (!user?.uid) throw new ForbiddenException('Owner access required.');

    const ownerUids = this.readAllowlist(process.env.OWNER_UIDS);
    const ownerEmails = this.readAllowlist(process.env.OWNER_EMAILS)
      .map((email) => email.toLowerCase());

    const isOwnerUid = ownerUids.includes(user.uid);
    const email = typeof user.email === 'string' ? user.email.toLowerCase() : '';
    const isVerifiedOwnerEmail = user.email_verified === true
      && email.length > 0
      && ownerEmails.includes(email);

    if (!isOwnerUid && !isVerifiedOwnerEmail) {
      throw new ForbiddenException('Owner access required.');
    }
    return true;
  }

  private readAllowlist(value: string | undefined): string[] {
    return String(value || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
}
