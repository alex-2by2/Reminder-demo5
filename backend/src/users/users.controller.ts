import {
  Controller,
  Get,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest, FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { UserProfile, UsersService } from './users.service';
import { Req } from '@nestjs/common';

@Controller('me')
@UseGuards(FirebaseAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getCurrentUser(@Req() request: AuthenticatedRequest): Promise<UserProfile> {
    if (!request.user) {
      throw new UnauthorizedException('Authenticated identity is missing.');
    }
    return this.usersService.getOrCreateProfile(request.user);
  }
}
