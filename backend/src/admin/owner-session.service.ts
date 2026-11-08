import { Injectable, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';

const COOKIE = '__Host-easy_owner';
const TTL = 8 * 60 * 60 * 1000;
const GENERIC_ERROR = 'Invalid owner credentials.';
type Session = { tokenHash: string; ownerId: string; expiresAt: Date; createdAt: Date };

@Injectable()
export class OwnerSessionService {
  private indexesReady: Promise<void> | null = null;

  constructor(@InjectConnection() private readonly connection: Connection) {}

  private async ensureIndexes(): Promise<void> {
    if (!this.indexesReady) {
      this.indexesReady = Promise.all([
        this.sessions().createIndex({ tokenHash: 1 }, { unique: true, name: 'owner_session_token_unique' }),
        this.sessions().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'owner_session_expiry_ttl' }),
        this.sessions().createIndex({ ownerId: 1 }, { name: 'owner_session_owner_lookup' }),
      ]).then(() => undefined).catch((error) => {
        this.indexesReady = null;
        throw error;
      });
    }
    await this.indexesReady;
  }

  private configured(): { id: string; password: string } {
    const id = process.env.OWNER_LOGIN_ID;
    const password = process.env.OWNER_PASSWORD;
    if (!id || id.length > 128 || !password || password.length < 12 || password.length > 1024) {
      throw new ServiceUnavailableException('Owner password login is not configured.');
    }
    return { id, password };
  }

  private sessions() { return this.connection.collection<Session>('owner_sessions'); }
  private digest(token: string) { return createHash('sha256').update(token).digest('hex'); }

  async login(id: unknown, password: unknown, response: Response): Promise<{ access: 'owner'; ownerId: string }> {
    const credentials = this.configured();
    if (typeof id !== 'string' || typeof password !== 'string' || id.length > 128 || password.length > 1024) {
      throw new UnauthorizedException(GENERIC_ERROR);
    }
    const givenId = Buffer.from(id);
    const expectedId = Buffer.from(credentials.id);
    const givenPassword = Buffer.from(password);
    const expectedPassword = Buffer.from(credentials.password);
    const validId = givenId.length === expectedId.length && timingSafeEqual(givenId, expectedId);
    const validPassword = givenPassword.length === expectedPassword.length && timingSafeEqual(givenPassword, expectedPassword);
    if (!validId || !validPassword) throw new UnauthorizedException(GENERIC_ERROR);
    await this.ensureIndexes();
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
    await this.ensureIndexes();
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
      await this.ensureIndexes();
      await this.sessions().deleteOne({ tokenHash: this.digest(token) });
    }
    response.clearCookie(COOKIE, { httpOnly: true, secure: true, sameSite: 'strict', path: '/' });
  }

  async revokeAll(): Promise<void> {
    await this.ensureIndexes();
    await this.sessions().deleteMany({ ownerId: process.env.OWNER_LOGIN_ID });
  }
}
