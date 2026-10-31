import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsDefined, IsIn, IsInt, IsNotEmpty, IsOptional, IsString,
  Max, MaxLength, Min, ValidateIf, ValidateNested,
} from 'class-validator';

const REPEATS = ['none', 'daily', 'weekly', 'monthly', 'yearly', 'custom', 'hourly'];
const PRIORITIES = ['low', 'medium', 'high'];
const REPEAT_UNITS = ['hours', 'days', 'weeks', 'months', 'years'];

export class CustomRepeatDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999)
  interval!: number;

  @IsString()
  @IsIn(REPEAT_UNITS)
  type!: string;
}

export class ReminderSubtaskDto {
  @IsString()
  @MaxLength(300)
  text!: string;

  @IsOptional()
  @IsBoolean()
  done?: boolean;
}

export class ReminderCategoryDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(24)
  icon?: string;
}

export class CreateReminderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  clientId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  task!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  time!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timeZone?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsDefined()
  @IsString()
  @IsIn(REPEATS)
  repeat?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomRepeatDto)
  customRepeat?: CustomRepeatDto;

  @IsOptional()
  @IsString()
  @IsIn(PRIORITIES)
  priority?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  tags?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsDefined()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReminderSubtaskDto)
  subtasks?: ReminderSubtaskDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ReminderCategoryDto)
  category?: ReminderCategoryDto;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @IsBoolean()
  archived?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(525600)
  preAlarm?: number;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  assignee?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  project?: string;
}

export class UpdateReminderDto {
  @IsOptional() @IsString() @MaxLength(200)
  task?: string;

  @IsOptional() @IsString() @MaxLength(5000)
  notes?: string;

  @IsOptional() @IsString() @MaxLength(80)
  time?: string;

  @IsOptional() @IsString() @MaxLength(80)
  timeZone?: string;

  @ValidateIf((_object, value) => value !== undefined) @IsDefined() @IsString() @IsIn(REPEATS)
  repeat?: string;

  @ValidateIf((_object, value) => value !== undefined) @IsDefined() @ValidateNested() @Type(() => CustomRepeatDto)
  customRepeat?: CustomRepeatDto;

  @IsOptional() @IsString() @IsIn(PRIORITIES)
  priority?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  tags?: string;

  @ValidateIf((_object, value) => value !== undefined) @IsDefined() @IsArray() @ValidateNested({ each: true }) @Type(() => ReminderSubtaskDto)
  subtasks?: ReminderSubtaskDto[];

  @IsOptional() @ValidateNested() @Type(() => ReminderCategoryDto)
  category?: ReminderCategoryDto;

  @ValidateIf((_object, value) => value !== undefined) @IsDefined() @IsString() @IsIn(['pending', 'completed'])
  status?: string;

  @IsOptional() @IsBoolean()
  pinned?: boolean;

  @IsOptional() @IsBoolean()
  archived?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(525600)
  preAlarm?: number;

  @IsOptional() @IsString() @MaxLength(320)
  assignee?: string;

  @IsOptional() @IsString() @MaxLength(128)
  project?: string;
}

export class ListRemindersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  page = 1;

  @IsOptional()
  @IsString()
  @IsIn(['pending', 'completed'])
  status?: string;
}
