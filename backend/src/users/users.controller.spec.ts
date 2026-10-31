import { UnauthorizedException } from '@nestjs/common';
import { DecodedIdToken } from 'firebase-admin/auth';
import { AuthenticatedRequest } from '../auth/firebase-auth.guard';
import { UserProfile, UsersService } from './users.service';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  const getOrCreateProfile = jest.fn();
  const usersService = { getOrCreateProfile } as unknown as UsersService;
  const controller = new UsersController(usersService);

  beforeEach(() => getOrCreateProfile.mockReset());

  it('uses only the verified request identity to load the current profile', async () => {
    const token = {
      uid: 'verified-user-uid',
      email: 'verified@example.com',
    } as DecodedIdToken;
    const profile = {
      id: 'mongo-id',
      firebaseUid: 'verified-user-uid',
      email: 'verified@example.com',
      emailVerified: true,
      displayName: null,
      photoURL: null,
      signInProvider: 'password',
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies UserProfile;
    getOrCreateProfile.mockResolvedValue(profile);

    const request = {
      user: token,
      body: { uid: 'attacker-controlled-uid' },
    } as unknown as AuthenticatedRequest;

    await expect(controller.getCurrentUser(request)).resolves.toBe(profile);
    expect(getOrCreateProfile).toHaveBeenCalledTimes(1);
    expect(getOrCreateProfile).toHaveBeenCalledWith(token);
  });

  it('rejects a request when the authentication guard did not attach an identity', async () => {
    const request = {} as AuthenticatedRequest;

    expect(() => controller.getCurrentUser(request)).toThrow(
      UnauthorizedException,
    );
    expect(getOrCreateProfile).not.toHaveBeenCalled();
  });
});
