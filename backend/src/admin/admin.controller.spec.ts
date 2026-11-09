import { BadRequestException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AdminController } from './admin.controller';
import { OwnerAuthenticationGuard } from './owner-authentication.guard';
import { OwnerGuard } from './owner.guard';
import { AdminService } from './admin.service';

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

  it('applies Owner ID session authentication before owner authorization', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminController)).toEqual([
      OwnerAuthenticationGuard, OwnerGuard,
    ]);
  });

  it('returns the configured Owner ID session identity', () => {
    const request = { ownerSession: { ownerId: 'configured-owner-id' } } as any;
    expect(controller.getAccess(request)).toEqual({ access: 'owner', uid: 'configured-owner-id' });
  });

  it('rejects a missing or non-boolean disabled field before calling the service', () => {
    const request = { ownerSession: { ownerId: 'owner-1' } } as any;
    expect(() => controller.setUserDisabled('user-1', {}, request)).toThrow(BadRequestException);
    expect(() => controller.setUserDisabled('user-1', { disabled: 'true' }, request)).toThrow(BadRequestException);
    expect(admin.setUserDisabled).not.toHaveBeenCalled();
  });

  it('passes Owner ID session identity to account-change audit records', async () => {
    const result = { uid: 'user-2', disabled: true };
    (admin.setUserDisabled as jest.Mock).mockResolvedValue(result);
    const response = await controller.setUserDisabled('user-2', { disabled: true }, {
      ownerSession: { ownerId: 'configured-owner-id' },
    } as any);
    expect(admin.setUserDisabled).toHaveBeenCalledWith('user-2', true, 'configured-owner-id');
    expect(response).toEqual(result);
  });
});
