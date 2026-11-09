import { BadRequestException, Injectable } from '@nestjs/common';
import { FirebaseAdminService } from '../auth/firebase-admin';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const CRASH_REPORT_FIELDS = [
  'message', 'stack', 'source', 'url', 'userAgent', 'appVersion', 'uid', 'ts',
] as const;

@Injectable()
export class AdminService {
  constructor(private readonly firebase: FirebaseAdminService) {}

  async getOverview() {
    const db = this.firebase.getFirestore();
    const [users, proUsers, crashReports, referrals, payments] = await Promise.all([
      db.collection('users').count().get(),
      db.collection('users').where('isProUser', '==', true).count().get(),
      db.collection('crash_reports').count().get(),
      db.collection('users').where('referralCount', '>', 0).count().get(),
      db.collectionGroup('payments').where('status', '==', 'success').select('amount').get(),
    ]);
    const totalUsers = users.data().count;
    const proUserCount = proUsers.data().count;
    const successfulPayments = payments.docs;
    const revenuePaise = successfulPayments.reduce((sum, doc) => {
      const amount = doc.get('amount');
      return sum + (typeof amount === 'number' && Number.isFinite(amount) ? amount : 0);
    }, 0);
    return {
      totalUsers, proUsers: proUserCount,
      freeUsers: Math.max(0, totalUsers - proUserCount),
      crashReports: crashReports.data().count,
      referredUsers: referrals.data().count,
      successfulPayments: successfulPayments.length,
      revenuePaise,
    };
  }

  async listUsers(limitValue?: string, pageToken?: string) {
    const limit = this.parseLimit(limitValue, DEFAULT_PAGE_SIZE);
    const auth = this.firebase.getAuth();
    const db = this.firebase.getFirestore();
    const page = await auth.listUsers(limit, pageToken || undefined);
    const refs = page.users.map((user) => db.collection('users').doc(user.uid));
    const profiles = refs.length ? await db.getAll(...refs) : [];
    const users = page.users.map((user, index) => {
      const profile = profiles[index]?.exists ? profiles[index].data() || {} : {};
      return {
        uid: user.uid, email: user.email || null,
        displayName: user.displayName || profile.userName || null,
        emailVerified: user.emailVerified, disabled: user.disabled,
        createdAt: user.metadata.creationTime || null,
        isProUser: profile.isProUser === true,
        joinedAt: profile.joinedAt || null,
        referralCount: Number(profile.referralCount) || 0,
      };
    });
    return { users, nextPageToken: page.pageToken || null };
  }

  async setUserDisabled(uid: string, disabled: boolean, ownerUid: string) {
    if (!uid || typeof disabled !== 'boolean') {
      throw new BadRequestException("Expected a user UID and boolean 'disabled' value.");
    }
    if (uid === ownerUid && disabled) {
      throw new BadRequestException('You cannot disable your own owner account.');
    }
    if (disabled) {
      const target = await this.firebase.getAuth().getUser(uid);
      // Owner ID login is a separate identity from Firebase users. Fail closed unless
      // the Firebase accounts that must remain protected are explicitly allowlisted.
      const ownerUids = this.readAllowlist(process.env.OWNER_UIDS);
      const ownerEmails = this.readAllowlist(process.env.OWNER_EMAILS)
        .map((email) => email.toLowerCase());
      if (ownerUids.length === 0 && ownerEmails.length === 0) {
        throw new BadRequestException('Configure OWNER_UIDS or OWNER_EMAILS before disabling user accounts.');
      }
      const targetEmail = typeof target.email === 'string' ? target.email.toLowerCase() : '';
      const isConfiguredOwner = ownerUids.includes(target.uid)
        || (target.emailVerified === true && targetEmail.length > 0
          && ownerEmails.includes(targetEmail));
      if (isConfiguredOwner) {
        throw new BadRequestException('Configured owner accounts cannot be disabled from the owner dashboard.');
      }
    }
    const user = await this.firebase.getAuth().updateUser(uid, { disabled });
    return { uid: user.uid, disabled: user.disabled };
  }

  private readAllowlist(value: string | undefined): string[] {
    return String(value || '').split(',').map((entry) => entry.trim()).filter(Boolean);
  }

  async listCrashReports(limitValue?: string, cursor?: string) {
    const limit = this.parseLimit(limitValue, DEFAULT_PAGE_SIZE);
    const db = this.firebase.getFirestore();
    let query = db.collection('crash_reports').orderBy('ts', 'desc').limit(limit);
    if (cursor) {
      const cursorId = this.decodeCursor(cursor);
      const cursorDoc = await db.collection('crash_reports').doc(cursorId).get();
      if (!cursorDoc.exists) throw new BadRequestException('Invalid cursor.');
      query = query.startAfter(cursorDoc);
    }
    const snapshot = await query.get();
    const reports = snapshot.docs.map((doc) => {
      const data = doc.data() || {};
      const report: Record<string, unknown> = { id: doc.id };
      for (const field of CRASH_REPORT_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(data, field)) {
          report[field] = field === 'url' ? this.sanitizeCrashUrl(data[field]) : data[field];
        }
      }
      return report;
    });
    const last = snapshot.docs[snapshot.docs.length - 1];
    return {
      reports,
      nextCursor: last ? Buffer.from(last.id, 'utf8').toString('base64url') : null,
    };
  }

  async listReferrals(limitValue?: string) {
    const limit = this.parseLimit(limitValue, 20);
    const snapshot = await this.firebase.getFirestore().collection('users')
      .where('referralCount', '>', 0)
      .orderBy('referralCount', 'desc')
      .limit(limit).get();
    return {
      referrals: snapshot.docs.map((doc) => ({
        uid: doc.id,
        displayName: doc.get('userName') || null,
        referralCount: Number(doc.get('referralCount')) || 0,
      })),
    };
  }

  private sanitizeCrashUrl(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
      // Query strings and fragments can contain tokens, identifiers, or user-entered data.
      url.search = '';
      url.hash = '';
      return url.toString();
    } catch {
      return null;
    }
  }

  private parseLimit(value: string | undefined, fallback: number): number {
    if (value === undefined || value === '') return fallback;
    if (!/^\d+$/.test(value)) throw new BadRequestException('Invalid limit.');
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 1) {
      throw new BadRequestException('Invalid limit.');
    }
    return Math.min(parsed, MAX_PAGE_SIZE);
  }

  private decodeCursor(cursor: string): string {
    if (!/^[A-Za-z0-9_-]+$/.test(cursor)) throw new BadRequestException('Invalid cursor.');
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    if (!decoded || Buffer.from(decoded, 'utf8').toString('base64url') !== cursor) {
      throw new BadRequestException('Invalid cursor.');
    }
    return decoded;
  }
}
