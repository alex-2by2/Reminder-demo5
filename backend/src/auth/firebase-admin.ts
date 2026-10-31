import { Injectable, UnauthorizedException } from '@nestjs/common';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { DecodedIdToken } from 'firebase-admin/auth';

@Injectable()
export class FirebaseAdminService {
  private app: App | undefined;

  async verifyIdToken(token: string): Promise<DecodedIdToken> {
    const app = this.getApp();
    try {
      return await getAuth(app).verifyIdToken(token, true);
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token.');
    }
  }

  private getApp(): App {
    if (this.app) return this.app;
    const existing = getApps().find((candidate) => candidate.name === 'easy-life-tools-api');
    if (existing) {
      this.app = existing;
      return existing;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Firebase Admin credentials are not configured on the server.');
    }

    this.app = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    }, 'easy-life-tools-api');
    return this.app;
  }
}
