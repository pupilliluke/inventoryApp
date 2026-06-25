import { getDatabase, ref, get, update, set } from 'firebase/database';

/**
 * Firebase Realtime Database keys may not contain '.', '#', '$', '[', ']' or '/'.
 * Emails contain '.' and '@', so we sanitize them into a safe key.
 */
export function emailToUserKey(email: string): string {
  return email.trim().toLowerCase().replace(/[.#$/[\]]/g, '_');
}

export interface ClerkIdentity {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
}

export interface SyncedUser {
  id: string;
  name: string;
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
 */
export async function ensureFirebaseUser(identity: ClerkIdentity): Promise<SyncedUser> {
  const db = getDatabase();
  const key = emailToUserKey(identity.email);
  const userRef = ref(db, `users/${key}`);
  const name = displayNameFor(identity);

  const snapshot = await get(userRef);
  if (snapshot.exists()) {
    // Preserve the existing list; refresh the display name/email.
    await update(userRef, {
      name,
      email: identity.email,
      source: 'clerk',
      updatedAt: new Date().toISOString(),
    });
  } else {
    await set(userRef, {
      name,
      email: identity.email,
      list: {},
      createdAt: new Date().toISOString(),
      source: 'clerk',
    });
  }

  return { id: key, name };
}
