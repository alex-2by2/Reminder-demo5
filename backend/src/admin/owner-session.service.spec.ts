import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { OwnerSessionService } from './owner-session.service';

describe('OwnerSessionService', () => {
  const originalId = process.env.OWNER_LOGIN_ID;
  const originalPassword = process.env.OWNER_PASSWORD;
  const insertOne = jest.fn().mockResolvedValue({ acknowledged: true });
  const findOne = jest.fn();
  const deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
  const deleteMany = jest.fn().mockResolvedValue({ deletedCount: 1 });
  const createIndex = jest.fn().mockResolvedValue('index-created');
  const collection = jest.fn(() => ({ insertOne, findOne, deleteOne, deleteMany, createIndex }));
  const connection = { collection } as any;
  let service: OwnerSessionService;
  const response = { cookie: jest.fn(), clearCookie: jest.fn() } as any;

  beforeEach(() => {
    process.env.OWNER_LOGIN_ID = 'owner-test';
    process.env.OWNER_PASSWORD = 'a-strong-test-password';
    jest.clearAllMocks();
    service = new OwnerSessionService(connection);
  });

  afterAll(() => {
    if (originalId === undefined) delete process.env.OWNER_LOGIN_ID;
    else process.env.OWNER_LOGIN_ID = originalId;
    if (originalPassword === undefined) delete process.env.OWNER_PASSWORD;
    else process.env.OWNER_PASSWORD = originalPassword;
  });

  it('rejects invalid credentials without creating a session', async () => {
    await expect(service.login('owner-test', 'wrong-password', response))
      .rejects.toBeInstanceOf(UnauthorizedException);
    expect(insertOne).not.toHaveBeenCalled();
    expect(response.cookie).not.toHaveBeenCalled();
  });

  it('fails closed when the temporary password is not configured safely', async () => {
    process.env.OWNER_PASSWORD = 'short';
    await expect(service.login('owner-test', 'short', response))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('stores only a digest of a random session token and sets a secure host cookie', async () => {
    await service.login('owner-test', 'a-strong-test-password', response);

    expect(createIndex).toHaveBeenCalledTimes(3);
    expect(createIndex).toHaveBeenCalledWith({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'owner_session_expiry_ttl' });
    expect(insertOne).toHaveBeenCalledTimes(1);
    const stored = insertOne.mock.calls[0][0];
    expect(stored.ownerId).toBe('owner-test');
    expect(stored.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.tokenHash).not.toBe(response.cookie.mock.calls[0][1]);
    expect(response.cookie).toHaveBeenCalledWith('__Host-easy_owner', expect.stringMatching(/^[A-Za-z0-9_-]{43}$/), {
      httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 8 * 60 * 60 * 1000,
    });
    expect(stored.expiresAt.getTime() - stored.createdAt.getTime()).toBe(8 * 60 * 60 * 1000);
  });

  it('rejects malformed or missing session cookies without querying MongoDB', async () => {
    const request = { headers: { cookie: '__Host-easy_owner=invalid' } } as any;
    await expect(service.getSession(request)).resolves.toBeNull();
    expect(findOne).not.toHaveBeenCalled();
  });

  it('accepts only an unexpired session belonging to the currently configured owner', async () => {
    const token = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    findOne.mockResolvedValue({
      tokenHash: 'unused-test-hash',
      ownerId: 'owner-test',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });
    const request = { headers: { cookie: '__Host-easy_owner=' + token } } as any;

    await expect(service.getSession(request)).resolves.toMatchObject({ ownerId: 'owner-test' });
    expect(findOne).toHaveBeenCalledWith({
      tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      expiresAt: { $gt: expect.any(Date) },
    });
  });

  it('rejects a session that belongs to a different configured owner', async () => {
    findOne.mockResolvedValue({
      tokenHash: 'unused-test-hash',
      ownerId: 'previous-owner',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });
    const request = { headers: { cookie: '__Host-easy_owner=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' } } as any;

    await expect(service.getSession(request)).resolves.toBeNull();
  });

  it('revokes the current session and clears the cookie on logout', async () => {
    const request = { headers: { cookie: '__Host-easy_owner=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' } } as any;
    await service.logout(request, response);
    expect(createIndex).toHaveBeenCalledTimes(3);
    expect(deleteOne).toHaveBeenCalledWith({ tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(response.clearCookie).toHaveBeenCalledWith('__Host-easy_owner', {
      httpOnly: true, secure: true, sameSite: 'strict', path: '/',
    });
  });
});
