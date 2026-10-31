import { Model } from 'mongoose';
import { DecodedIdToken } from 'firebase-admin/auth';
import { CreateReminderDto, ListRemindersQueryDto, UpdateReminderDto } from './dto/reminder.dto';
import { Reminder } from './schemas/reminder.schema';
import { RemindersService } from './reminders.service';

describe('RemindersService ownership boundaries', () => {
  const create = jest.fn();
  const findOneAndUpdate = jest.fn();
  const findOne = jest.fn();
  const find = jest.fn();
  const countDocuments = jest.fn();
  const model = { create, findOneAndUpdate, findOne, find, countDocuments } as unknown as Model<Reminder>;
  const service = new RemindersService(model);
  const token = { uid: 'verified-owner-uid' } as DecodedIdToken;

  beforeEach(() => {
    create.mockReset();
    findOneAndUpdate.mockReset();
    findOne.mockReset();
    find.mockReset();
    countDocuments.mockReset();
  });

  it('creates a reminder with ownership from the verified token, not request data', async () => {
    const now = new Date();
    create.mockResolvedValue({
      _id: { toString: () => 'mongo-reminder-id' },
      clientId: 'client-123', task: 'Call customer', notes: '', time: '2026-11-01T09:00',
      timeZone: 'Asia/Kolkata', repeat: 'none', customRepeat: null, priority: 'medium',
      tags: '', subtasks: [], category: null, status: 'pending', pinned: false,
      archived: false, preAlarm: 0, assignee: '', project: '', createdAt: now, updatedAt: now,
    });
    const dto = { clientId: 'client-123', task: 'Call customer', time: '2026-11-01T09:00' } as CreateReminderDto;

    const result = await service.create(token, dto);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      firebaseUid: 'verified-owner-uid',
      clientId: 'client-123',
      status: 'pending',
      deletedAt: null,
    }));
    expect(result.id).toBe('mongo-reminder-id');
    expect(result).not.toHaveProperty('firebaseUid');
  });

  it('scopes reminder updates to the verified owner and hides other users records', async () => {
    const updated = { _id: 'reminder-id', clientId: 'c1', task: 'Updated', createdAt: new Date(), updatedAt: new Date() };
    const exec = jest.fn().mockResolvedValue(updated);
    const lean = jest.fn().mockReturnValue({ exec });
    findOneAndUpdate.mockReturnValue({ lean });
    const existingExec = jest.fn().mockResolvedValue({ repeat: 'none', customRepeat: null });
    findOne.mockReturnValue({ lean: jest.fn().mockReturnValue({ exec: existingExec }) });

    await service.update(token, '507f1f77bcf86cd799439011', { task: 'Updated' } as UpdateReminderDto);

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { _id: '507f1f77bcf86cd799439011', firebaseUid: 'verified-owner-uid', deletedAt: null },
      { $set: { task: 'Updated', repeat: 'none', customRepeat: null } },
      { new: true, runValidators: true },
    );
  });

  it('always filters list queries by verified owner and active records', async () => {
    const exec = jest.fn().mockResolvedValue([]);
    const lean = jest.fn().mockReturnValue({ exec });
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });
    find.mockReturnValue({ sort });
    countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

    await service.list(token, { page: 1, limit: 25 } as ListRemindersQueryDto);

    expect(find).toHaveBeenCalledWith({ firebaseUid: 'verified-owner-uid', deletedAt: null });
    expect(countDocuments).toHaveBeenCalledWith({ firebaseUid: 'verified-owner-uid', deletedAt: null });
  });

  it('scopes single-reminder reads to the verified owner', async () => {
    const exec = jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439011', task: 'Owned' });
    const lean = jest.fn().mockReturnValue({ exec });
    findOne.mockReturnValue({ lean });
    await service.getById(token, '507f1f77bcf86cd799439011');
    expect(findOne).toHaveBeenCalledWith({
      _id: '507f1f77bcf86cd799439011',
      firebaseUid: 'verified-owner-uid',
      deletedAt: null,
    });
  });

  it('soft-deletes only an active reminder owned by the verified user', async () => {
    const exec = jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439011' });
    const lean = jest.fn().mockReturnValue({ exec });
    findOneAndUpdate.mockReturnValue({ lean });
    await service.softDelete(token, '507f1f77bcf86cd799439011');
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { _id: '507f1f77bcf86cd799439011', firebaseUid: 'verified-owner-uid', deletedAt: null },
      { $set: { deletedAt: expect.any(Date) } },
      { new: true },
    );
  });

  it('restores only a deleted reminder owned by the verified user', async () => {
    const exec = jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439011', task: 'Restored' });
    const lean = jest.fn().mockReturnValue({ exec });
    findOneAndUpdate.mockReturnValue({ lean });
    await service.restore(token, '507f1f77bcf86cd799439011');
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { _id: '507f1f77bcf86cd799439011', firebaseUid: 'verified-owner-uid', deletedAt: { $ne: null } },
      { $set: { deletedAt: null } },
      { new: true, runValidators: true },
    );
  });

  it('rejects malformed identifiers before querying MongoDB', async () => {
    await expect(service.getById(token, 'not-an-object-id')).rejects.toThrow('Reminder not found.');
    expect(findOne).not.toHaveBeenCalled();
  });

});
