import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { DecodedIdToken } from 'firebase-admin/auth';
import { CreateReminderDto, ListRemindersQueryDto, UpdateReminderDto } from './dto/reminder.dto';
import { Reminder } from './schemas/reminder.schema';

@Injectable()
export class RemindersService {
  constructor(@InjectModel(Reminder.name) private readonly reminderModel: Model<Reminder>) {}

  async create(token: DecodedIdToken, dto: CreateReminderDto) {
    this.validateTimeZone(dto.timeZone);
    this.validateReminderTime(dto.time);
    this.validateRepeat(dto.repeat, dto.customRepeat);
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
    this.validateTimeZone(dto.timeZone);
    if (dto.time !== undefined) this.validateReminderTime(dto.time);
    const filter = { _id: id, firebaseUid: token.uid, deletedAt: null };
    const existing = await this.reminderModel.findOne(filter).lean().exec();
    if (!existing) throw new NotFoundException('Reminder not found.');
    const effectiveRepeat = dto.repeat ?? existing.repeat;
    const effectiveCustomRepeat = dto.customRepeat === undefined
      ? existing.customRepeat
      : dto.customRepeat;
    this.validateRepeat(effectiveRepeat, effectiveCustomRepeat);
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

  private validateTimeZone(timeZone?: string): void {
    if (timeZone === undefined) return;
    if (typeof timeZone !== 'string' || !timeZone.trim()) {
      throw new BadRequestException('Time zone must be a non-empty IANA time zone.');
    }
    try {
      new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    } catch {
      throw new BadRequestException('Invalid IANA time zone.');
    }
  }

  private validateReminderTime(value: string): void {
    // Accept the PWA's datetime-local value and ISO-8601 imports, with or without seconds/offset.
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})?$/.exec(value);
    if (!match) throw new BadRequestException('Time must be a valid ISO local date-time.');
    const [, yearText, monthText, dayText, hourText, minuteText, secondText = '0', , offset] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const second = Number(secondText);
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth || hour > 23 || minute > 59 || second > 59) {
      throw new BadRequestException('Time contains an invalid calendar date or clock value.');
    }
    if (offset && offset !== 'Z') {
      const offsetHours = Number(offset.slice(1, 3));
      const offsetMinutes = Number(offset.slice(4, 6));
      if (offsetHours > 14 || offsetMinutes > 59 || (offsetHours === 14 && offsetMinutes !== 0)) {
        throw new BadRequestException('Time contains an invalid UTC offset.');
      }
    }
  }

  private validateRepeat(repeat?: string, customRepeat?: { interval: number; type: string }): void {
    if ((repeat === 'custom' || repeat === 'hourly') && !customRepeat) {
      throw new BadRequestException('customRepeat is required for custom and hourly reminders.');
    }
    if (repeat === 'hourly' && customRepeat?.type !== 'hours') {
      throw new BadRequestException('Hourly reminders must use the hours interval unit.');
    }
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
      completedAt: reminder.completedAt ?? null,
      createdAt: reminder.createdAt,
      updatedAt: reminder.updatedAt,
    };
  }
}
