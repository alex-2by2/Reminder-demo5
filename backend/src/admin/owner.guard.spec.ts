import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { OwnerGuard } from './owner.guard';

describe('OwnerGuard', () => {
  const originalId = process.env.OWNER_LOGIN_ID;
  const guard = new OwnerGuard();
  const contextFor = (ownerId?: string): ExecutionContext => {
    const request = { ownerSession: ownerId ? { ownerId } : undefined };
    return { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
  };
  afterEach(() => {
    if (originalId === undefined) delete process.env.OWNER_LOGIN_ID;
    else process.env.OWNER_LOGIN_ID = originalId;
  });
  it('allows only the currently configured Owner ID session', () => {
    process.env.OWNER_LOGIN_ID = 'owner-id';
    expect(guard.canActivate(contextFor('owner-id'))).toBe(true);
  });
  it('rejects a different Owner ID session', () => {
    process.env.OWNER_LOGIN_ID = 'owner-id';
    expect(() => guard.canActivate(contextFor('other-id'))).toThrow(ForbiddenException);
  });
  it('rejects requests without an Owner ID session', () => {
    process.env.OWNER_LOGIN_ID = 'owner-id';
    expect(() => guard.canActivate(contextFor())).toThrow(ForbiddenException);
  });
});
