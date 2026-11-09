import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { OwnerAuthenticationGuard } from './owner-authentication.guard';
import { OwnerSessionService } from './owner-session.service';

describe('OwnerAuthenticationGuard', () => {
  const originalOrigin = process.env.RENDER_EXTERNAL_URL;
  const getSession = jest.fn();
  let guard: OwnerAuthenticationGuard;
  const run = (request: any) => guard.canActivate({
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext);
  const makeRequest = (method = 'GET', headerValues: Record<string, string> = {}) => ({
    method, headers: {}, ownerSession: undefined,
    header: (name: string) => headerValues[name.toLowerCase()],
  } as any);

  beforeEach(() => {
    process.env.RENDER_EXTERNAL_URL = 'https://owner.example';
    jest.clearAllMocks();
    guard = new OwnerAuthenticationGuard({ getSession } as unknown as OwnerSessionService);
  });
  afterAll(() => {
    if (originalOrigin === undefined) delete process.env.RENDER_EXTERNAL_URL;
    else process.env.RENDER_EXTERNAL_URL = originalOrigin;
  });

  it('requires a valid Owner ID session and attaches its identity', async () => {
    getSession.mockResolvedValue({ ownerId: 'owner-test' });
    const req = makeRequest();
    await expect(run(req)).resolves.toBe(true);
    expect(req.ownerSession).toEqual({ ownerId: 'owner-test' });
  });
  it('rejects requests without an Owner ID session', async () => {
    getSession.mockResolvedValue(null);
    await expect(run(makeRequest())).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('rejects state-changing requests without exact origin and custom header', async () => {
    getSession.mockResolvedValue({ ownerId: 'owner-test' });
    await expect(run(makeRequest('PATCH'))).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('allows state-changing requests only with exact origin and custom header', async () => {
    getSession.mockResolvedValue({ ownerId: 'owner-test' });
    const req = makeRequest('PATCH', { origin: 'https://owner.example', 'x-owner-action': '1' });
    await expect(run(req)).resolves.toBe(true);
  });
});
