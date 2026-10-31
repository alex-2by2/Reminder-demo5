import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { DecodedIdToken } from 'firebase-admin/auth';
import { CreateReminderDto, ListRemindersQueryDto, UpdateReminderDto } from './dto/reminder.dto';
import { Reminder } from './schemas/reminder.schema';

@Injectable()
export class RemindersService {
  constructor(@InjectModel(Reminder.name) private readonly reminderModel: Model<Reminder>) {}

  async create(token: DecodedIdToken, dto: CreateReminderDto) {
    const reminder = await this.reminderModel.create({
      ...dto,
      firebaseUid: token.uid,
      clientId: dto.clientId,
      timeZone: dto.timeZone || 'Asia/Kolkata',
      status: 'pending',
      deletedAt: null,
    });
    return this.toResponse(reminder);
  }

  async list(token: DecodedIdToken, query: ListRemindersQueryDto) {
    const limit = query.limit || 50;
    const page = query.page || 1;
    const filter: Record<string, unknown> = { firebaseUid: token.uid, deletedAt: null };
    if (query.status) filter.status = query.status;

    const [items, total] = await Promise.all([
      this.reminderModel.find(filter).sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit).limit(limit).lean().exec(),
      this.reminderModel.countDocuments(filter).exec(),
    ]);

    return {
      items: items.map((item) => this.toResponse(item)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(token: DecodedIdToken, id: string) {
    this.assertId(id);
    const reminder = await this.reminderModel.findOne({
      _id: id, firebaseUid: token.uid, deletedAt: null,
    }).lean().exec();
    if (!reminder) throw new NotFoundException('Reminder not found.');
    return this.toResponse(reminder);
  }

  async update(token: DecodedIdToken, id: string, dto: UpdateReminderDto) {
    this.assertId(id);
    const update: Record<string, unknown> = { ...dto };
    if (dto.status === 'completed') update.completedAt = new Date();
    if (dto.status === 'pending') update.completedAt = null;
    const reminder = await this.reminderModel.findOneAndUpdate(
      { _id: id, firebaseUid: token.uid, deletedAt: null },
      { $set: update },
      { new: true, runValidators: true },
    ).lean().exec();
    if (!reminder) throw new NotFoundException('Reminder not found.');
    return this.toResponse(reminder);
  }

  async softDelete(token: DecodedIdToken, id: string) {
    this.assertId(id);
    const reminder = await this.reminderModel.findOneAndUpdate(
      { _id: id, firebaseUid: token.uid, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true },
    ).lean().exec();
    if (!reminder) throw new NotFoundException('Reminder not found.');
    return { id: String(reminder._id), deleted: true };
  }

  async restore(token: DecodedIdToken, id: string) {
    this.assertId(id);
    const reminder = await this.reminderModel.findOneAndUpdate(
      { _id: id, firebaseUid: token.uid, deletedAt: { $ne: null } },
      { $set: { deletedAt: null } },
      { new: true, runValidators: true },
    ).lean().exec();
    if (!reminder) throw new NotFoundException('Deleted reminder not found.');
    return this.toResponse(reminder);
  }

  private assertId(id: string): void {
    if (!isValidObjectId(id)) throw new NotFoundException('Reminder not found.');
  }

  private toResponse(reminder: any) {
    return {
      id: String(reminder._id),
      clientId: reminder.clientId,
      task: reminder.task,
      notes: reminder.notes,
      time: reminder.time,
      timeZone: reminder.timeZone,
      repeat: reminder.repeat,
      customRepeat: reminder.customRepeat,
      priority: reminder.priority,
      tags: reminder.tags,
      subtasks: reminder.subtasks,
      category: reminder.category,
      status: reminder.status,
      pinned: reminder.pinned,
      archived: reminder.archived,
      preAlarm: reminder.preAlarm,
      assignee: reminder.assignee,
      project: reminder.project,
      createdAt: reminder.createdAt,
      updatedAt: reminder.updatedAt,
    };
  }
}
