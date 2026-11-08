import { Injectable, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Request, Response } from 'express';

const scrypt = promisify(scryptCallback);
const COOKIE = '__Host-easy_owner';
const TTL = 8 * 60 * 60 * 1000;
const GENERIC_ERROR = 'Invalid owner credentials.';
type Session = { tokenHash: string; ownerId: string; expiresAt: Date; createdAt: Date };

@Injectable()
export class OwnerSessionService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  private configured(): { id: string; hash: string } {
    const id = process.env.OWNER_LOGIN_ID;
    const hash = process.env.OWNER_PASSWORD_HASH;
    if (!id || !hash || !/^scrypt\$16384\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(hash)) {
      throw new ServiceUnavailableException('Owner password login is not configured.');
    }
    return { id, hash };
  }

  private sessions() { return this.connection.collection<Session>('owner_sessions'); }
  private digest(token: string) { return createHash('sha256').update(token).digest('hex'); }

  private async verifyPassword(password: string, encoded: string): Promise<boolean> {
    const [, , , , salt, expected] = encoded.split('$');
    const actual = await scrypt(password, Buffer.from(salt, 'hex'), 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }) as Buffer;
    return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
  }

  async login(id: unknown, password: unknown, response: Response): Promise<{ access: 'owner'; ownerId: string }> {
    const credentials = this.configured();
    if (typeof id !== 'string' || typeof password !== 'string' || id.length > 128 || password.length > 1024) {
      throw new UnauthorizedException(GENERIC_ERROR);
    }
    // Run the password KDF even for an unknown ID to avoid an obvious timing oracle.
    const validPassword = await this.verifyPassword(password, credentials.hash);
    const givenId = Buffer.from(id);
    const expectedId = Buffer.from(credentials.id);
    const validId = givenId.length === expectedId.length && timingSafeEqual(givenId, expectedId);
    if (!validId || !validPassword) throw new UnauthorizedException(GENERIC_ERROR);
    const token = randomBytes(32).toString('base64url');
    const now = new Date();
    await this.sessions().insertOne({
      tokenHash: this.digest(token), ownerId: credentials.id,
      createdAt: now, expiresAt: new Date(now.getTime() + TTL),
    });
    response.cookie(COOKIE, token, {
      httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: TTL,
    });
    return { access: 'owner', ownerId: credentials.id };
  }

  async getSession(request: Request): Promise<Session | null> {
    const cookie = (request.headers.cookie || '').split(';').map(v => v.trim())
      .find(v => v.startsWith(COOKIE + '='));
    const token = cookie?.slice(COOKIE.length + 1);
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const session = await this.sessions().findOne({
      tokenHash: this.digest(token), expiresAt: { $gt: new Date() },
    });
    if (!session || session.ownerId !== process.env.OWNER_LOGIN_ID) return null;
    return session;
  }

  async logout(request: Request, response: Response): Promise<void> {
    const cookie = (request.headers.cookie || '').split(';').map(v => v.trim())
      .find(v => v.startsWith(COOKIE + '='));
    const token = cookie?.slice(COOKIE.length + 1);
    if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) {
      await this.sessions().deleteOne({ tokenHash: this.digest(token) });
    }
    response.clearCookie(COOKIE, { httpOnly: true, secure: true, sameSite: 'strict', path: '/' });
  }

  async revokeAll(): Promise<void> {
    await this.sessions().deleteMany({ ownerId: process.env.OWNER_LOGIN_ID });
  }
}
