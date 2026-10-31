import { UnauthorizedException } from '@nestjs/common';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FirebaseAdminService } from './firebase-admin';

jest.mock('firebase-admin/app', () => ({
  cert: jest.fn((credentials) => credentials),
  getApps: jest.fn(),
  initializeApp: jest.fn(),
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(),
}));

describe('FirebaseAdminService', () => {
  const originalEnv = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  };
  const app = { name: 'easy-life-tools-api' };
  const verifyIdToken = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'firebase-admin@example.test';
    process.env.FIREBASE_PRIVATE_KEY = 'test-private-key';
    (getApps as jest.Mock).mockReturnValue([]);
    (initializeApp as jest.Mock).mockReturnValue(app);
    (getAuth as jest.Mock).mockReturnValue({ verifyIdToken });
    verifyIdToken.mockResolvedValue({ uid: 'verified-user' });
  });

  afterAll(() => {
    if (originalEnv.projectId === undefined) delete process.env.FIREBASE_PROJECT_ID;
    else process.env.FIREBASE_PROJECT_ID = originalEnv.projectId;
    if (originalEnv.clientEmail === undefined) delete process.env.FIREBASE_CLIENT_EMAIL;
    else process.env.FIREBASE_CLIENT_EMAIL = originalEnv.clientEmail;
    if (originalEnv.privateKey === undefined) delete process.env.FIREBASE_PRIVATE_KEY;
    else process.env.FIREBASE_PRIVATE_KEY = originalEnv.privateKey;
  });

  it('verifies the token with revocation checking enabled', async () => {
    const service = new FirebaseAdminService();

    await expect(service.verifyIdToken('valid-token')).resolves.toEqual({
      uid: 'verified-user',
    });

    expect(initializeApp).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'test-project' }),
      'easy-life-tools-api',
    );
    expect(verifyIdToken).toHaveBeenCalledWith('valid-token', true);
  });

  it('maps invalid, expired, or revoked tokens to UnauthorizedException', async () => {
    verifyIdToken.mockRejectedValueOnce(new Error('token expired'));
    const service = new FirebaseAdminService();

    await expect(service.verifyIdToken('expired-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('keeps missing server credentials as a configuration error, not a 401', async () => {
    delete process.env.FIREBASE_PROJECT_ID;
    const service = new FirebaseAdminService();

    await expect(service.verifyIdToken('any-token')).rejects.toThrow(
      'Firebase Admin credentials are not configured on the server.',
    );
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('reuses an already initialized Firebase Admin app', async () => {
    (getApps as jest.Mock).mockReturnValue([app]);
    const service = new FirebaseAdminService();

    await expect(service.verifyIdToken('valid-token')).resolves.toEqual({
      uid: 'verified-user',
    });

    expect(initializeApp).not.toHaveBeenCalled();
    expect(verifyIdToken).toHaveBeenCalledWith('valid-token', true);
  });

  it('normalizes escaped newlines in the private key before initializing the app', async () => {
    process.env.FIREBASE_PRIVATE_KEY = 'line-one\\nline-two';
    const service = new FirebaseAdminService();

    await service.verifyIdToken('valid-token');

    expect(cert).toHaveBeenCalledWith(
      expect.objectContaining({ privateKey: 'line-one\nline-two' }),
    );
  });
});
