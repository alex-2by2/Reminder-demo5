import { ForbiddenException } from '@nestjs/common';
import { OwnerSessionController } from './owner-session.controller';
import { OwnerSessionService } from './owner-session.service';

describe('OwnerSessionController origin protection', () => {
  const originalOrigin = process.env.RENDER_EXTERNAL_URL;
  const login = jest.fn().mockResolvedValue({ access: 'owner', ownerId: 'owner-test' });
  const getSession = jest.fn().mockResolvedValue({ ownerId: 'owner-test' });
  const logout = jest.fn().mockResolvedValue(undefined);
  let controller: OwnerSessionController;

  beforeEach(() => {
    delete process.env.RENDER_EXTERNAL_URL;
    jest.clearAllMocks();
    controller = new OwnerSessionController({ login, getSession, logout } as unknown as OwnerSessionService);
  });

  afterAll(() => {
    if (originalOrigin === undefined) delete process.env.RENDER_EXTERNAL_URL;
    else process.env.RENDER_EXTERNAL_URL = originalOrigin;
  });

  const request = (origin?: string, action?: string) => ({
    header: (name: string) => name === 'origin' ? origin : name === 'x-owner-action' ? action : undefined,
  }) as any;

  it('rejects login when the browser origin is missing or does not match', async () => {
    await expect(controller.login(request(undefined, '1'), {} as any, { id: 'owner-test', password: 'password' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.login(request('https://attacker.example', '1'), {} as any, { id: 'owner-test', password: 'password' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(login).not.toHaveBeenCalled();
  });

  it('requires the non-simple owner action header for login', async () => {
    await expect(controller.login(request('http://localhost:3001'), {} as any, { id: 'owner-test', password: 'password' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(login).not.toHaveBeenCalled();
  });

  it('allows same-origin login and delegates credentials without logging them', async () => {
    const response = {} as any;
    await expect(controller.login(request('http://localhost:3001', '1'), response, {
      id: 'owner-test', password: 'password',
    })).resolves.toEqual({ access: 'owner', ownerId: 'owner-test' });
    expect(login).toHaveBeenCalledWith('owner-test', 'password', response);
  });

  it('requires same-origin protection before logout', async () => {
    await expect(controller.logout(request('http://localhost:3001'), {} as any))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(logout).not.toHaveBeenCalled();
  });

  it('returns the active session owner without exposing the session token', async () => {
    await expect(controller.me({} as any)).resolves.toEqual({ access: 'owner', ownerId: 'owner-test' });
    expect(getSession).toHaveBeenCalledTimes(1);
  });
});
