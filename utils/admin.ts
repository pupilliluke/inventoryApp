import { useUser } from '@clerk/expo';

/**
 * Emails granted admin access (User Management, Recount). Compared case-insensitively.
 */
export const ADMIN_EMAILS = ['pupilli.dev@gmail.com'];

export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

/** True when the signed-in Clerk user's email is on the admin list. */
export function useIsAdmin(): boolean {
  const { user } = useUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress;
  return isAdminEmail(email);
}
