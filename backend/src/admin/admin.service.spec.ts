import { BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { FirebaseAdminService } from '../auth/firebase-admin';

describe('AdminService', () => {
  let firebase: {
    getAuth: jest.Mock;
    getFirestore: jest.Mock;
  };
  let service: AdminService;

  beforeEach(() => {
    firebase = {
      getAuth: jest.fn(),
      getFirestore: jest.fn(),
    };
    service = new AdminService(firebase as unknown as FirebaseAdminService);
  });

  it('aggregates dashboard metrics and only counts successful numeric payments', async () => {
    const collection = jest.fn((name: string) => ({
      count: () => ({ get: async () => ({ data: () => ({ count: name === 'users' ? 10 : 2 }) }) }),
      where: () => ({ count: () => ({ get: async () => ({ data: () => ({ count: 2 }) }) }) }),
    }));
    const payments = {
      select: () => ({
        get: async () => ({
          docs: [
            { get: (field: string) => field === 'status' ? 'success' : 49900 },
            { get: (field: string) => field === 'status' ? 'pending' : 49900 },
            { get: (field: string) => field === 'status' ? 'success' : 'bad-value' },
          ],
        }),
      }),
    };
    const db = {
      collection: (name: string) => collection(name),
      collectionGroup: () => payments,
    };
    firebase.getFirestore.mockReturnValue(db);

    const result = await service.getOverview();
    expect(result).toEqual({
      totalUsers: 10,
      proUsers: 2,
      freeUsers: 8,
      crashReports: 2,
      referredUsers: 2,
      successfulPayments: 2,
      revenuePaise: 49900,
    });
  });

  it('preserves per-user profile data while listing Firebase Auth users', async () => {
    const auth = {
      listUsers: jest.fn().mockResolvedValue({
        users: [{
          uid: 'user-1',
          email: 'user@example.com',
          displayName: 'User',
          emailVerified: true,
          disabled: false,
          metadata: { creationTime: '2026-01-01T00:00:00Z' },
        }],
        pageToken: 'next-page',
      }),
    };
    const profile = {
      exists: true,
      data: () => ({ userName: 'Profile name', isProUser: true, joinedAt: 'today', referralCount: 3 }),
    };
    const db = {
      collection: () => ({ doc: () => 'user-profile-ref' }),
      getAll: jest.fn().mockResolvedValue([profile]),
    };
    firebase.getAuth.mockReturnValue(auth);
    firebase.getFirestore.mockReturnValue(db);

    const result = await service.listUsers('25', 'page-token');
    expect(auth.listUsers).toHaveBeenCalledWith(25, 'page-token');
    expect(db.getAll).toHaveBeenCalledWith('user-profile-ref');
    expect(result.users[0]).toMatchObject({
      uid: 'user-1',
      displayName: 'User',
      isProUser: true,
      referralCount: 3,
    });
    expect(result.nextPageToken).toBe('next-page');
  });

  it('blocks an owner from disabling their own account', async () => {
    firebase.getAuth.mockReturnValue({ updateUser: jest.fn() });
    await expect(service.setUserDisabled('owner-1', true, 'owner-1'))
      .rejects.toThrow(BadRequestException);
    expect(firebase.getAuth().updateUser).not.toHaveBeenCalled();
  });

  it('rejects invalid page limits rather than silently accepting malformed input', async () => {
    await expect(service.listUsers('1abc')).rejects.toThrow(BadRequestException);
  });

  it('caps valid page limits at the maximum', async () => {
    const auth = { listUsers: jest.fn().mockResolvedValue({ users: [], pageToken: undefined }) };
    firebase.getAuth.mockReturnValue(auth);
    firebase.getFirestore.mockReturnValue({});
    await service.listUsers('500');
    expect(auth.listUsers).toHaveBeenCalledWith(100, undefined);
  });

  it('rejects malformed crash report cursors', async () => {
    firebase.getFirestore.mockReturnValue({ collection: jest.fn() });
    await expect(service.listCrashReports(undefined, '%%%'))
      .rejects.toThrow(BadRequestException);
  });
});
