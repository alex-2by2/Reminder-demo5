import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { OwnerGuard } from './owner.guard';
import type { AuthenticatedRequest } from '../auth/firebase-auth.guard';

function contextFor(user?: Partial<NonNullable<AuthenticatedRequest['user']>>): ExecutionContext {
  const request = { user } as AuthenticatedRequest;
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('OwnerGuard', () => {
  const originalUids = process.env.OWNER_UIDS;
  const originalEmails = process.env.OWNER_EMAILS;
  const guard = new OwnerGuard();

  afterEach(() => {
    if (originalUids === undefined) delete process.env.OWNER_UIDS;
    else process.env.OWNER_UIDS = originalUids;
    if (originalEmails === undefined) delete process.env.OWNER_EMAILS;
    else process.env.OWNER_EMAILS = originalEmails;
  });

  it('allows an explicitly allowlisted Firebase UID', () => {
    process.env.OWNER_UIDS = 'owner-uid';
    process.env.OWNER_EMAILS = '';
    expect(guard.canActivate(contextFor({ uid: 'owner-uid' }))).toBe(true);
  });

  it('allows a verified allowlisted email case-insensitively', () => {
    process.env.OWNER_UIDS = '';
    process.env.OWNER_EMAILS = 'owner@example.com';
    expect(guard.canActivate(contextFor({
      uid: 'user-uid',
      email: 'OWNER@example.com',
      email_verified: true,
    }))).toBe(true);
  });

  it('rejects an unverified allowlisted email', () => {
    process.env.OWNER_UIDS = '';
    process.env.OWNER_EMAILS = 'owner@example.com';
    expect(() => guard.canActivate(contextFor({
      uid: 'user-uid',
      email: 'owner@example.com',
      email_verified: false,
    }))).toThrow(ForbiddenException);
  });

  it('rejects normal users even if their profile could claim an owner role', () => {
    process.env.OWNER_UIDS = 'actual-owner';
    process.env.OWNER_EMAILS = 'owner@example.com';
    expect(() => guard.canActivate(contextFor({
      uid: 'regular-user',
      email: 'user@example.com',
      email_verified: true,
      role: 'owner',
    } as never))).toThrow(ForbiddenException);
  });

  it('rejects requests without an authenticated Firebase identity', () => {
    process.env.OWNER_UIDS = 'owner-uid';
    process.env.OWNER_EMAILS = '';
    expect(() => guard.canActivate(contextFor())).toThrow(ForbiddenException);
  });
});
