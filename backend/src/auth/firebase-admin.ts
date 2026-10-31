import { Injectable, UnauthorizedException } from '@nestjs/common';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { DecodedIdToken } from 'firebase-admin/auth';

const INVALID_TOKEN_ERROR_CODES = new Set([
  'auth/argument-error',
  'auth/id-token-expired',
  'auth/id-token-revoked',
  'auth/invalid-id-token',
  'auth/invalid-argument',
  'auth/user-disabled',
  'auth/user-not-found',
]);

@Injectable()
export class FirebaseAdminService {
  private app: App | undefined;

  async verifyIdToken(token: string): Promise<DecodedIdToken> {
    const app = this.getApp();
    try {
      return await getAuth(app).verifyIdToken(token, true);
    } catch (error) {
      const code = this.firebaseErrorCode(error);
      if (code && INVALID_TOKEN_ERROR_CODES.has(code)) {
        throw new UnauthorizedException('Invalid or expired authentication token.');
      }
      // Do not misreport Firebase outages, network failures, or unexpected SDK
      // errors as bad credentials. Let Nest handle these as server failures.
      throw error;
    }
  }

  private firebaseErrorCode(error: unknown): string | undefined {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
      return undefined;
    }
    return typeof error.code === 'string' ? error.code : undefined;
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
