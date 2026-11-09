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
    const paymentDocs = [
      { get: (field: string) => field === 'amount' ? 49900 : undefined },
      { get: (field: string) => field === 'amount' ? 'bad-value' : undefined },
    ];
    const paymentQuery = {
      where: jest.fn(() => ({
        select: jest.fn(() => ({
          get: async () => ({ docs: paymentDocs }),
        })),
      })),
    };
    const db = {
      collection: (name: string) => collection(name),
      collectionGroup: () => paymentQuery,
    };
    firebase.getFirestore.mockReturnValue(db);

    const result = await service.getOverview();
    expect(paymentQuery.where).toHaveBeenCalledWith('status', '==', 'success');
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

  it('blocks disabling another UID-allowlisted owner account', async () => {
    const updateUser = jest.fn();
    const getUser = jest.fn().mockResolvedValue({
      uid: 'owner-2', email: 'second-owner@example.com', emailVerified: true,
    });
    firebase.getAuth.mockReturnValue({ getUser, updateUser });
    const previous = process.env.OWNER_UIDS;
    process.env.OWNER_UIDS = 'owner-1, owner-2';
    try {
      await expect(service.setUserDisabled('owner-2', true, 'owner-1'))
        .rejects.toThrow('Configured owner accounts cannot be disabled');
      expect(getUser).toHaveBeenCalledWith('owner-2');
      expect(updateUser).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) delete process.env.OWNER_UIDS;
      else process.env.OWNER_UIDS = previous;
    }
  });

  it('blocks disabling a verified OWNER_EMAILS account case-insensitively', async () => {
    const updateUser = jest.fn();
    const getUser = jest.fn().mockResolvedValue({
      uid: 'owner-email', email: 'SECOND-OWNER@example.com', emailVerified: true,
    });
    firebase.getAuth.mockReturnValue({ getUser, updateUser });
    const previous = process.env.OWNER_EMAILS;
    process.env.OWNER_EMAILS = 'second-owner@example.com';
    try {
      await expect(service.setUserDisabled('owner-email', true, 'owner-1'))
        .rejects.toThrow('Configured owner accounts cannot be disabled');
      expect(updateUser).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) delete process.env.OWNER_EMAILS;
      else process.env.OWNER_EMAILS = previous;
    }
  });

  it('fails closed when no Firebase owner accounts are configured for protection', async () => {
    const updateUser = jest.fn();
    const getUser = jest.fn().mockResolvedValue({
      uid: 'user-1', email: 'user@example.com', emailVerified: true,
    });
    firebase.getAuth.mockReturnValue({ getUser, updateUser });
    const previousUids = process.env.OWNER_UIDS;
    const previousEmails = process.env.OWNER_EMAILS;
    delete process.env.OWNER_UIDS;
    delete process.env.OWNER_EMAILS;
    try {
      await expect(service.setUserDisabled('user-1', true, 'owner-id'))
        .rejects.toThrow('Configure OWNER_UIDS or OWNER_EMAILS');
      expect(updateUser).not.toHaveBeenCalled();
    } finally {
      if (previousUids === undefined) delete process.env.OWNER_UIDS;
      else process.env.OWNER_UIDS = previousUids;
      if (previousEmails === undefined) delete process.env.OWNER_EMAILS;
      else process.env.OWNER_EMAILS = previousEmails;
    }
  });

  it('allows disabling a non-owner account when protected Firebase owners are configured', async () => {
    const updateUser = jest.fn().mockResolvedValue({ uid: 'user-1', disabled: true });
    const getUser = jest.fn().mockResolvedValue({
      uid: 'user-1', email: 'user@example.com', emailVerified: true,
    });
    firebase.getAuth.mockReturnValue({ getUser, updateUser });
    const previousUids = process.env.OWNER_UIDS;
    const previousEmails = process.env.OWNER_EMAILS;
    process.env.OWNER_UIDS = 'owner-firebase-uid';
    process.env.OWNER_EMAILS = '';
    try {
      await expect(service.setUserDisabled('user-1', true, 'owner-id'))
        .resolves.toEqual({ uid: 'user-1', disabled: true });
      expect(updateUser).toHaveBeenCalledWith('user-1', { disabled: true });
    } finally {
      if (previousUids === undefined) delete process.env.OWNER_UIDS;
      else process.env.OWNER_UIDS = previousUids;
      if (previousEmails === undefined) delete process.env.OWNER_EMAILS;
      else process.env.OWNER_EMAILS = previousEmails;
    }
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
    firebase.getFirestore.mockReturnValue({
      collection: () => ({ orderBy: () => ({ limit: () => ({}) }) }),
    });
    await expect(service.listCrashReports(undefined, '%%%'))
      .rejects.toThrow(BadRequestException);
  });

  it('starts the next crash-report page after the validated cursor document', async () => {
    const cursorDocument = { exists: true, id: 'report-1' };
    const nextDocument = { id: 'report-2', data: () => ({ message: 'next page' }) };
    const query = {
      startAfter: jest.fn(),
      get: jest.fn().mockResolvedValue({ docs: [nextDocument] }),
    };
    query.startAfter.mockReturnValue(query);
    const collection = {
      orderBy: () => ({ limit: () => query }),
      doc: jest.fn(() => ({ get: jest.fn().mockResolvedValue(cursorDocument) })),
    };
    firebase.getFirestore.mockReturnValue({ collection: () => collection });

    const cursor = Buffer.from('report-1').toString('base64url');
    const result = await service.listCrashReports('10', cursor);

    expect(collection.doc).toHaveBeenCalledWith('report-1');
    expect(query.startAfter).toHaveBeenCalledWith(cursorDocument);
    expect(result.reports).toEqual([{ id: 'report-2', message: 'next page' }]);
  });

  it('rejects zero and non-numeric pagination limits', async () => {
    await expect(service.listUsers('0')).rejects.toThrow(BadRequestException);
    await expect(service.listUsers('1.5')).rejects.toThrow(BadRequestException);
  });

  it('rejects disabling a user when the payload is not boolean', async () => {
    const updateUser = jest.fn();
    firebase.getAuth.mockReturnValue({ updateUser });
    await expect(service.setUserDisabled('user-1', 'true' as unknown as boolean, 'owner-1'))
      .rejects.toThrow(BadRequestException);
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('returns only approved crash report fields and an encoded cursor', async () => {
    const lastDoc = {
      id: 'report-2',
      data: () => ({
        message: 'failure',
        stack: 'Error: failure',
        source: 'error',
        url: 'https://example.test/app?access_token=secret#private',
        userAgent: 'test-agent',
        appVersion: '1.2.3',
        uid: 'user-1',
        ts: '2026-01-01T00:00:00.000Z',
        accessToken: 'must-not-leak',
        privateProfile: { email: 'private@example.com' },
        unexpectedFutureField: 'must-not-leak',
      }),
    };
    const query = { get: jest.fn().mockResolvedValue({ docs: [lastDoc] }) };
    const db = {
      collection: () => ({ orderBy: () => ({ limit: () => query }) }),
    };
    firebase.getFirestore.mockReturnValue(db);

    const result = await service.listCrashReports('10');
    expect(result.reports).toEqual([{
      id: 'report-2',
      message: 'failure',
      stack: 'Error: failure',
      source: 'error',
      url: 'https://example.test/app',
      userAgent: 'test-agent',
      appVersion: '1.2.3',
      uid: 'user-1',
      ts: '2026-01-01T00:00:00.000Z',
    }]);
    expect(result.nextCursor).toBe(Buffer.from('report-2').toString('base64url'));
  });

  it('returns referrals ordered by referral count from Firestore', async () => {
    const get = jest.fn().mockResolvedValue({
      docs: [{
        id: 'user-2',
        get: (field: string) => field === 'userName' ? 'Referral user' : 7,
      }],
    });
    const limit = jest.fn(() => ({ get }));
    const orderBy = jest.fn(() => ({ limit }));
    const where = jest.fn(() => ({ orderBy }));
    firebase.getFirestore.mockReturnValue({ collection: () => ({ where }) });

    const result = await service.listReferrals('15');
    expect(where).toHaveBeenCalledWith('referralCount', '>', 0);
    expect(orderBy).toHaveBeenCalledWith('referralCount', 'desc');
    expect(limit).toHaveBeenCalledWith(15);
    expect(result).toEqual({
      referrals: [{ uid: 'user-2', displayName: 'Referral user', referralCount: 7 }],
    });
  });

});
