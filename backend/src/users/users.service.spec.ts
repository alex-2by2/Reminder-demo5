import { Model } from 'mongoose';
import { DecodedIdToken } from 'firebase-admin/auth';
import { User } from './schemas/user.schema';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const findOneAndUpdate = jest.fn();
  const model = { findOneAndUpdate } as unknown as Model<User>;
  const service = new UsersService(model);

  beforeEach(() => findOneAndUpdate.mockReset());

  it('creates or updates only the profile matching the verified Firebase UID', async () => {
    const now = new Date('2026-10-31T10:00:00.000Z');
    const profile = {
      _id: { toString: () => 'mongo-user-id' },
      firebaseUid: 'verified-firebase-uid',
      email: 'person@example.com',
      emailVerified: true,
      displayName: 'Verified Person',
      photoURL: null,
      signInProvider: 'google.com',
      createdAt: now,
      updatedAt: now,
    };
    findOneAndUpdate.mockResolvedValue(profile);

    const token = {
      uid: 'verified-firebase-uid',
      email: 'person@example.com',
      email_verified: true,
      name: 'Verified Person',
      firebase: { sign_in_provider: 'google.com' },
    } as unknown as DecodedIdToken;

    const result = await service.getOrCreateProfile(token);

    expect(findOneAndUpdate).toHaveBeenCalledTimes(1);
    const [filter, update, options] = findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ firebaseUid: 'verified-firebase-uid' });
    expect(update.$setOnInsert).toEqual({ firebaseUid: 'verified-firebase-uid' });
    expect(update.$set.email).toBe('person@example.com');
    expect(options).toMatchObject({
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    });
    expect(result).toEqual({
      id: 'mongo-user-id',
      firebaseUid: 'verified-firebase-uid',
      email: 'person@example.com',
      emailVerified: true,
      displayName: 'Verified Person',
      photoURL: null,
      signInProvider: 'google.com',
      createdAt: now,
      updatedAt: now,
    });
  });

  it('does not accept or use a client-supplied UID when token claims omit optional fields', async () => {
    const now = new Date();
    findOneAndUpdate.mockResolvedValue({
      _id: { toString: () => 'id-2' },
      firebaseUid: 'uid-from-token',
      email: null,
      emailVerified: false,
      displayName: null,
      photoURL: null,
      signInProvider: null,
      createdAt: now,
      updatedAt: now,
    });

    await service.getOrCreateProfile({
      uid: 'uid-from-token',
    } as unknown as DecodedIdToken);

    const [filter, update] = findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual({ firebaseUid: 'uid-from-token' });
    expect(update.$setOnInsert.firebaseUid).toBe('uid-from-token');
    expect(update.$set).not.toHaveProperty('email');
    expect(update.$set).not.toHaveProperty('displayName');
  });
});
