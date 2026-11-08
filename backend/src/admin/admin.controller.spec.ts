import { BadRequestException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AdminController } from './admin.controller';
import { OwnerAuthenticationGuard } from './owner-authentication.guard';
import { OwnerGuard } from './owner.guard';
import { AdminService } from './admin.service';
import type { AuthenticatedRequest } from '../auth/firebase-auth.guard';

describe('AdminController', () => {
  const admin = {
    getOverview: jest.fn(),
    listUsers: jest.fn(),
    setUserDisabled: jest.fn(),
    listCrashReports: jest.fn(),
    listReferrals: jest.fn(),
  } as unknown as AdminService;
  const controller = new AdminController(admin);

  beforeEach(() => jest.clearAllMocks());

  it('applies Firebase authentication before the owner allowlist guard', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminController)).toEqual([
      OwnerAuthenticationGuard,
      OwnerGuard,
    ]);
  });

  it('returns owner access only for the authenticated request identity', () => {
    const request = { user: { uid: 'verified-owner-uid' } } as AuthenticatedRequest;
    expect(controller.getAccess(request)).toEqual({
      access: 'owner',
      uid: 'verified-owner-uid',
    });
  });

  it('rejects a missing or non-boolean disabled field before calling the service', () => {
    expect(() => controller.setUserDisabled('user-1', {}, {
      user: { uid: 'owner-1' },
    } as AuthenticatedRequest)).toThrow(BadRequestException);
    expect(() => controller.setUserDisabled('user-1', {
      disabled: 'true',
    }, {
      user: { uid: 'owner-1' },
    } as AuthenticatedRequest)).toThrow(BadRequestException);
    expect(admin.setUserDisabled).not.toHaveBeenCalled();
  });

  it('passes the Owner ID session identity to account-change audit records', async () => {
    const result = { uid: 'user-2', disabled: true };
    (admin.setUserDisabled as jest.Mock).mockResolvedValue(result);
    const response = await controller.setUserDisabled('user-2', { disabled: true }, {
      ownerSession: { ownerId: 'configured-owner-id' },
    } as any);

    expect(admin.setUserDisabled).toHaveBeenCalledWith('user-2', true, 'configured-owner-id');
    expect(response).toEqual(result);
  });

  it('passes validated account changes with the verified owner UID', async () => {
    const result = { uid: 'user-1', disabled: true };
    (admin.setUserDisabled as jest.Mock).mockResolvedValue(result);
    const response = await controller.setUserDisabled('user-1', {
      disabled: true,
    }, {
      user: { uid: 'owner-verified-by-firebase' },
    } as AuthenticatedRequest);

    expect(admin.setUserDisabled).toHaveBeenCalledWith(
      'user-1',
      true,
      'owner-verified-by-firebase',
    );
    expect(response).toEqual(result);
  });
});
