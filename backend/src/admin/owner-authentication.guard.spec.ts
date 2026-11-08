import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { OwnerAuthenticationGuard } from './owner-authentication.guard';
import { OwnerSessionService } from './owner-session.service';
import { FirebaseAdminService } from '../auth/firebase-admin';

describe('OwnerAuthenticationGuard', () => {
  const originalOrigin = process.env.RENDER_EXTERNAL_URL;
  const verifyIdToken = jest.fn();
  const getSession = jest.fn();
  let guard: OwnerAuthenticationGuard;

  const run = (request: any) => guard.canActivate({
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext);

  const makeRequest = (method = 'GET', headerValues: Record<string, string> = {}) => ({
    method,
    headers: {},
    user: undefined,
    ownerSession: undefined,
    header: (name: string) => headerValues[name.toLowerCase()],
  } as any);

  beforeEach(() => {
    process.env.RENDER_EXTERNAL_URL = 'https://owner.example';
    jest.clearAllMocks();
    guard = new OwnerAuthenticationGuard(
      { verifyIdToken } as unknown as FirebaseAdminService,
      { getSession } as unknown as OwnerSessionService,
    );
  });

  afterAll(() => {
    if (originalOrigin === undefined) delete process.env.RENDER_EXTERNAL_URL;
    else process.env.RENDER_EXTERNAL_URL = originalOrigin;
  });

  it('authenticates a valid bearer token without consulting cookie sessions', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'firebase-owner' });
    const req = makeRequest('GET', { authorization: 'Bearer valid-token' });
    await expect(run(req)).resolves.toBe(true);
    expect(req.user).toEqual({ uid: 'firebase-owner' });
    expect(getSession).not.toHaveBeenCalled();
  });

  it('does not fall back to a cookie when a supplied bearer token is invalid', async () => {
    verifyIdToken.mockRejectedValue(new UnauthorizedException());
    const req = makeRequest('GET', { authorization: 'Bearer bad-token' });
    await expect(run(req)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(getSession).not.toHaveBeenCalled();
  });

  it('allows read-only cookie sessions without CSRF headers', async () => {
    getSession.mockResolvedValue({ ownerId: 'owner-test' });
    const req = makeRequest();
    await expect(run(req)).resolves.toBe(true);
    expect(req.ownerSession).toEqual({ ownerId: 'owner-test' });
  });

  it('rejects state-changing cookie requests without exact origin and custom header', async () => {
    getSession.mockResolvedValue({ ownerId: 'owner-test' });
    const req = makeRequest('PATCH');
    await expect(run(req)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('allows state-changing cookie requests only with exact origin and custom header', async () => {
    getSession.mockResolvedValue({ ownerId: 'owner-test' });
    const req = makeRequest('PATCH', {
      origin: 'https://owner.example',
      'x-owner-action': '1',
    });
    await expect(run(req)).resolves.toBe(true);
  });
});
