import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { DecodedIdToken } from 'firebase-admin/auth';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

export interface UserProfile {
  id: string;
  firebaseUid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  signInProvider: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  async getOrCreateProfile(token: DecodedIdToken): Promise<UserProfile> {
    const updates: Partial<User> & { lastSeenAt?: Date } = {
      emailVerified: token.email_verified === true,
      lastSeenAt: new Date(),
    };

    if (typeof token.email === 'string') updates.email = token.email;
    if (typeof token.name === 'string') updates.displayName = token.name;
    if (typeof token.picture === 'string') updates.photoURL = token.picture;

    const provider = token.firebase?.sign_in_provider;
    if (typeof provider === 'string') updates.signInProvider = provider;

    const user = await this.userModel.findOneAndUpdate(
      { firebaseUid: token.uid },
      {
        $set: updates,
        $setOnInsert: { firebaseUid: token.uid },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    ) as UserDocument | null;

    if (!user) {
      throw new InternalServerErrorException('Unable to load user profile.');
    }

    return {
      id: user._id.toString(),
      firebaseUid: user.firebaseUid,
      email: user.email ?? null,
      emailVerified: user.emailVerified,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      signInProvider: user.signInProvider ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
