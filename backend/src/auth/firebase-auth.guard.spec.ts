import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { FirebaseAdminService } from './firebase-admin';

describe('FirebaseAuthGuard', () => {
  const verifyIdToken = jest.fn();
  const guard = new FirebaseAuthGuard({
    verifyIdToken,
  } as unknown as FirebaseAdminService);

  const makeContext = (authorization?: string) => {
    const request = {
      header: jest.fn().mockReturnValue(authorization),
    };
    return {
      context: {
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext,
      request,
    };
  };

  beforeEach(() => verifyIdToken.mockReset());

  it('rejects requests without a Bearer token', async () => {
    const { context } = makeContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('rejects malformed authorization headers', async () => {
    const { context } = makeContext('Basic abc123');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('verifies the token and attaches the decoded identity to the request', async () => {
    const decoded = { uid: 'firebase-user-123', sub: 'firebase-user-123' };
    verifyIdToken.mockResolvedValue(decoded);
    const { context, request } = makeContext('Bearer valid-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifyIdToken).toHaveBeenCalledWith('valid-token');
    expect((request as { user?: unknown }).user).toEqual(decoded);
  });

  it('propagates token verification failures', async () => {
    verifyIdToken.mockRejectedValue(new UnauthorizedException());
    const { context } = makeContext('Bearer invalid-token');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
