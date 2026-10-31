import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateReminderDto, ListRemindersQueryDto, UpdateReminderDto } from './reminder.dto';

describe('Reminder DTO null and enum validation', () => {
  it('rejects null repeat values on create', async () => {
    const dto = plainToInstance(CreateReminderDto, {
      clientId: 'client-1',
      task: 'Test',
      time: '2026-11-01T09:00',
      repeat: null,
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'repeat')).toBe(true);
  });

  it('rejects null subtasks on create and update', async () => {
    const createDto = plainToInstance(CreateReminderDto, {
      clientId: 'client-1',
      task: 'Test',
      time: '2026-11-01T09:00',
      subtasks: null,
    });
    const updateDto = plainToInstance(UpdateReminderDto, { subtasks: null });
    const [createErrors, updateErrors] = await Promise.all([
      validate(createDto),
      validate(updateDto),
    ]);
    expect(createErrors.some((error) => error.property === 'subtasks')).toBe(true);
    expect(updateErrors.some((error) => error.property === 'subtasks')).toBe(true);
  });

  it('rejects null recurrence fields on update', async () => {
    const dto = plainToInstance(UpdateReminderDto, {
      repeat: null,
      customRepeat: null,
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'repeat')).toBe(true);
    expect(errors.some((error) => error.property === 'customRepeat')).toBe(true);
  });

  it('rejects more than 100 subtasks on create and update', async () => {
    const subtasks = Array.from({ length: 101 }, (_, index) => ({ text: `Subtask ${index}` }));
    const createDto = plainToInstance(CreateReminderDto, {
      clientId: 'client-1', task: 'Test', time: '2026-11-01T09:00', subtasks,
    });
    const updateDto = plainToInstance(UpdateReminderDto, { subtasks });
    const [createErrors, updateErrors] = await Promise.all([validate(createDto), validate(updateDto)]);
    expect(createErrors.some((error) => error.property === 'subtasks')).toBe(true);
    expect(updateErrors.some((error) => error.property === 'subtasks')).toBe(true);
  });

  it('accepts exactly 100 subtasks', async () => {
    const subtasks = Array.from({ length: 100 }, (_, index) => ({ text: `Subtask ${index}` }));
    const dto = plainToInstance(UpdateReminderDto, { subtasks });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects pagination page values above the supported maximum', async () => {
    const dto = plainToInstance(ListRemindersQueryDto, { page: '1001' });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'page')).toBe(true);
  });

  it('accepts the maximum supported pagination page', async () => {
    const dto = plainToInstance(ListRemindersQueryDto, { page: '1000' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts omitted optional recurrence fields', async () => {
    const dto = plainToInstance(UpdateReminderDto, { task: 'Updated title' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
