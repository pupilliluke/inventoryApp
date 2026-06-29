import { getDatabase, ref, get, update, set } from 'firebase/database';
import { isAdminEmail } from './admin';
import { emailToUserKey } from './userKey';

// Re-exported for existing importers (e.g. AccountPage) that pull it from here.
export { emailToUserKey } from './userKey';

export type ApprovalStatus = 'pending' | 'approved';

export interface ClerkIdentity {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
}

export interface SyncedUser {
  id: string;
  name: string;
  status: ApprovalStatus;
}

/**
 * Build the display name from the Google/Clerk token: prefer "First Last",
 * then the full name, and only fall back to the email if no name is available.
 */
export function displayNameFor(identity: ClerkIdentity): string {
  const fromParts = [identity.firstName, identity.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return fromParts || identity.fullName?.trim() || identity.email;
}

/**
 * Ensure a Firebase `users/{key}` entry exists for the given Clerk identity.
 *
 * The entry is keyed by the (sanitized) email so identity stays stable, but the
 * displayed `name` is the person's first/last name from the Clerk token. Existing
 * entries keep their inventory `list`; only the name/email metadata is refreshed.
 *
 * Access control: brand-new, non-admin users are created as `status: 'pending'`
 * and must be approved by an admin before they can use the app. Bootstrap admins
 * are always approved, and users that predate this feature (no `status` field)
 * are grandfathered in as approved so the rollout never locks anyone out.
 */
export async function ensureFirebaseUser(identity: ClerkIdentity): Promise<SyncedUser> {
  const db = getDatabase();
  const key = emailToUserKey(identity.email);
  const userRef = ref(db, `users/${key}`);
  const name = displayNameFor(identity);
  const adminEmail = isAdminEmail(identity.email);

  const snapshot = await get(userRef);
  if (snapshot.exists()) {
    const existing = snapshot.val() || {};
    // Admins are always approved. Otherwise preserve a pending decision; a missing
    // status means a pre-feature record, which we grandfather (and persist) as approved.
    const status: ApprovalStatus = adminEmail
      ? 'approved'
      : existing.status === 'pending'
      ? 'pending'
      : 'approved';
    // Preserve the existing list; refresh the display name/email.
    await update(userRef, {
      name,
      email: identity.email,
      source: 'clerk',
      status,
      updatedAt: new Date().toISOString(),
    });
    return { id: key, name, status };
  }

  const status: ApprovalStatus = adminEmail ? 'approved' : 'pending';
  await set(userRef, {
    name,
    email: identity.email,
    list: {},
    status,
    createdAt: new Date().toISOString(),
    source: 'clerk',
  });

  return { id: key, name, status };
}
