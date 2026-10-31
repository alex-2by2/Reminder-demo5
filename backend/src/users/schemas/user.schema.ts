import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({
  collection: 'users',
  timestamps: true,
  versionKey: false,
})
export class User {
  @Prop({ required: true, unique: true, immutable: true, maxlength: 128 })
  firebaseUid!: string;

  @Prop({ type: String, default: null, trim: true, maxlength: 320 })
  email!: string | null;

  @Prop({ type: Boolean, default: false })
  emailVerified!: boolean;

  @Prop({ type: String, default: null, trim: true, maxlength: 120 })
  displayName!: string | null;

  @Prop({ type: String, default: null, maxlength: 2048 })
  photoURL!: string | null;

  @Prop({ type: String, default: null, maxlength: 80 })
  signInProvider!: string | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ firebaseUid: 1 }, { unique: true });
