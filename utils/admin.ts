import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebaseConfig';
import { emailToUserKey } from './userKey';

/**
 * Bootstrap admins. These emails are always admins regardless of their Firebase
 * record, so there is always at least one admin who can grant the role to others
 * and who can never be locked out. Additional admins are granted at runtime by
 * setting `role: 'admin'` on their `users/{key}` record (see UserMutations).
 * Compared case-insensitively.
 */
export const ADMIN_EMAILS = ['pupilli.dev@gmail.com'];

export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

/** True when a Firebase `users/{key}` record carries the admin role. */
export function isAdminRole(record?: { role?: string } | null): boolean {
  return record?.role === 'admin';
}

/**
 * True when the signed-in user is an admin: either a bootstrap admin on
 * ADMIN_EMAILS, or one whose Firebase `users/{key}` record has been granted
 * `role: 'admin'` by another admin. Subscribes to the record so a grant or
 * revocation takes effect live without re-signing-in.
 */
export function useIsAdmin(): boolean {
  const { user } = useUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress;

  const [roleIsAdmin, setRoleIsAdmin] = useState(false);

  useEffect(() => {
    if (!email) {
      setRoleIsAdmin(false);
      return;
    }
    const userRef = ref(db, `users/${emailToUserKey(email)}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      setRoleIsAdmin(isAdminRole(snapshot.val()));
    });
    return unsubscribe;
  }, [email]);

  return isAdminEmail(email) || roleIsAdmin;
}

export type ApprovalState = 'loading' | 'pending' | 'approved';

/**
 * Live approval state for the signed-in user. Admins (bootstrap email or granted
 * role) are always approved. A record whose `status` is `'pending'` gates the
 * user onto the waitlist; a missing status is treated as approved (grandfathered).
 * Returns `'loading'` until the user's record exists, so the gate can show a
 * setup screen rather than flashing the waitlist before the record syncs.
 */
export function useApprovalState(): ApprovalState {
  const { user } = useUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress;

  const [state, setState] = useState<ApprovalState>('loading');

  useEffect(() => {
    if (!email) {
      setState('loading');
      return;
    }
    if (isAdminEmail(email)) {
      setState('approved');
      return;
    }
    const userRef = ref(db, `users/${emailToUserKey(email)}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      const record = snapshot.val();
      if (!record) {
        // Record not created yet (sync in flight) — keep showing the setup screen.
        setState('loading');
        return;
      }
      if (isAdminRole(record)) {
        setState('approved');
        return;
      }
      setState(record.status === 'pending' ? 'pending' : 'approved');
    });
    return unsubscribe;
  }, [email]);

  return state;
}

export interface PendingUser {
  key: string;
  name: string;
  email?: string;
}

/**
 * Live list of users awaiting approval (status `'pending'`, excluding admins).
 * Drives the admin's dashboard notification and the User Management waitlist.
 */
export function usePendingUsers(): PendingUser[] {
  const [pending, setPending] = useState<PendingUser[]>([]);

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const list: PendingUser[] = [];
      Object.keys(data).forEach((key) => {
        const record = data[key] || {};
        const recordIsAdmin = isAdminEmail(record.email) || isAdminRole(record);
        if (!recordIsAdmin && record.status === 'pending') {
          list.push({ key, name: record.name ?? key, email: record.email });
        }
      });
      setPending(list);
    });
    return unsubscribe;
  }, []);

  return pending;
}
