import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AddressInfo } from 'node:net';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { OwnerAuthenticationGuard } from './owner-authentication.guard';
import { OwnerSessionService } from './owner-session.service';
import { FirebaseAdminService } from '../auth/firebase-admin';
import { OwnerGuard } from './owner.guard';

describe('AdminController HTTP authorization', () => {
  let app: INestApplication;
  let baseUrl: string;
  const originalOwnerUids = process.env.OWNER_UIDS;
  const getOverview = jest.fn().mockResolvedValue({ totalUsers: 1 });
  const verifyIdToken = jest.fn(async (token: string) => {
    if (token === 'invalid-token') throw new UnauthorizedException('Invalid token.');
    if (token === 'owner-token') return { uid: 'configured-owner' };
    return { uid: 'ordinary-user' };
  });

  beforeAll(async () => {
    process.env.OWNER_UIDS = 'configured-owner';
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: { getOverview } },
        { provide: FirebaseAdminService, useValue: { verifyIdToken } },
        { provide: OwnerSessionService, useValue: { getSession: jest.fn().mockResolvedValue(null) } },
        OwnerAuthenticationGuard,
        OwnerGuard,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
    if (originalOwnerUids === undefined) delete process.env.OWNER_UIDS;
    else process.env.OWNER_UIDS = originalOwnerUids;
  });

  beforeEach(() => {
    getOverview.mockClear();
    verifyIdToken.mockClear();
  });

  it('rejects requests without a Firebase bearer token before the handler runs', async () => {
    const response = await fetch(`${baseUrl}/api/v1/admin/overview`);

    expect(response.status).toBe(401);
    expect(getOverview).not.toHaveBeenCalled();
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('rejects invalid Firebase tokens before the handler runs', async () => {
    const response = await fetch(`${baseUrl}/api/v1/admin/overview`, {
      headers: { Authorization: 'Bearer invalid-token' },
    });

    expect(response.status).toBe(401);
    expect(getOverview).not.toHaveBeenCalled();
    expect(verifyIdToken).toHaveBeenCalledWith('invalid-token');
  });

  it('rejects authenticated non-owners before the handler runs', async () => {
    const response = await fetch(`${baseUrl}/api/v1/admin/overview`, {
      headers: { Authorization: 'Bearer user-token' },
    });

    expect(response.status).toBe(403);
    expect(getOverview).not.toHaveBeenCalled();
    expect(verifyIdToken).toHaveBeenCalledWith('user-token');
  });

  it('allows a Firebase-authenticated UID on the server-side owner allowlist', async () => {
    const response = await fetch(`${baseUrl}/api/v1/admin/overview`, {
      headers: { Authorization: 'Bearer owner-token' },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ totalUsers: 1 });
    expect(getOverview).toHaveBeenCalledTimes(1);
  });
});
