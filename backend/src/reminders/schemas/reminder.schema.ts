import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReminderDocument = HydratedDocument<Reminder>;

@Schema({ _id: false })
export class ReminderSubtask {
  @Prop({ required: true, trim: true, maxlength: 300 })
  text!: string;

  @Prop({ type: Boolean, default: false })
  done!: boolean;
}

@Schema({ _id: false })
export class ReminderCategory {
  @Prop({ required: true, trim: true, maxlength: 80 })
  name!: string;

  @Prop({ type: String, default: '', maxlength: 24 })
  icon!: string;
}

@Schema({ _id: false })
export class CustomRepeat {
  @Prop({ required: true, min: 1, max: 999 })
  interval!: number;

  @Prop({ required: true, enum: ['hours', 'days', 'weeks', 'months', 'years'] })
  type!: string;
}

export const ReminderSubtaskSchema = SchemaFactory.createForClass(ReminderSubtask);
export const ReminderCategorySchema = SchemaFactory.createForClass(ReminderCategory);
export const CustomRepeatSchema = SchemaFactory.createForClass(CustomRepeat);

@Schema({ collection: 'reminders', timestamps: true, versionKey: false })
export class Reminder {
  @Prop({ required: true, immutable: true, index: true, maxlength: 128 })
  firebaseUid!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 200 })
  task!: string;

  @Prop({ type: String, default: '', maxlength: 5000 })
  notes!: string;

  // Preserve the existing PWA's local datetime string; interpretation uses timeZone.
  @Prop({ type: String, required: true, maxlength: 80 })
  time!: string;

  @Prop({ type: String, default: 'Asia/Kolkata', maxlength: 80 })
  timeZone!: string;

  @Prop({ type: String, enum: ['none', 'daily', 'weekly', 'monthly', 'yearly', 'custom', 'hourly'], default: 'none' })
  repeat!: string;

  @Prop({ type: CustomRepeatSchema, default: null })
  customRepeat!: CustomRepeat | null;

  @Prop({ type: String, enum: ['low', 'medium', 'high'], default: 'medium' })
  priority!: string;

  @Prop({ type: String, default: '', maxlength: 1000 })
  tags!: string;

  @Prop({ type: [ReminderSubtaskSchema], default: [] })
  subtasks!: ReminderSubtask[];

  @Prop({ type: ReminderCategorySchema, default: null })
  category!: ReminderCategory | null;

  @Prop({ type: String, enum: ['pending', 'completed'], default: 'pending' })
  status!: string;

  @Prop({ type: Boolean, default: false })
  pinned!: boolean;

  @Prop({ type: Boolean, default: false })
  archived!: boolean;

  @Prop({ type: Number, default: 0, min: 0, max: 525600 })
  preAlarm!: number;

  @Prop({ type: String, default: '', maxlength: 320 })
  assignee!: string;

  @Prop({ type: String, default: '', maxlength: 128 })
  project!: string;

  @Prop({ type: String, required: true, maxlength: 80 })
  clientId!: string;

  @Prop({ type: Date, default: null })
  completedAt!: Date | null;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const ReminderSchema = SchemaFactory.createForClass(Reminder);
ReminderSchema.index({ firebaseUid: 1, deletedAt: 1, createdAt: -1 });
ReminderSchema.index({ firebaseUid: 1, clientId: 1 }, { unique: true });
