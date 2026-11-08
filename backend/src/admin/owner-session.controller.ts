import { Body, Controller, Get, Post, Req, Res, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { OwnerSessionService } from './owner-session.service';

@Controller('owner-session')
export class OwnerSessionController {
  constructor(private readonly sessions: OwnerSessionService) {}

  private sameOrigin(request: Request): void {
    const origin = request.header('origin');
    const expected = new URL(process.env.RENDER_EXTERNAL_URL || 'http://localhost:3001').origin;
    if (origin !== expected || request.header('x-owner-action') !== '1') {
      throw new ForbiddenException('Invalid request origin.');
    }
  }

  @Post('login')
  async login(@Req() req: Request, @Res({ passthrough: true }) res: Response,
    @Body() body: { id?: unknown; password?: unknown }) {
    this.sameOrigin(req);
    return this.sessions.login(body?.id, body?.password, res);
  }

  @Get('me')
  async me(@Req() req: Request) {
    const session = await this.sessions.getSession(req);
    if (!session) throw new UnauthorizedException('Owner session required.');
    return { access: 'owner', ownerId: session.ownerId };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.sameOrigin(req);
    await this.sessions.logout(req, res);
    return { ok: true };
  }
}
