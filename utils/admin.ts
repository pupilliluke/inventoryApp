import { useEffect, useState } from 'react';
import { useUser } from '@clerk/expo';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebaseConfig';
import { emailToUserKey } from './userSync';

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
