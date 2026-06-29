import React, { useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import { useAuth, useUser } from '@clerk/expo';
import LoadingScreen from '../screens/LoadingScreen';
import SignInScreen from '../screens/SignInScreen';
import SSOCallbackScreen from '../screens/SSOCallbackScreen';
import WaitlistScreen from '../screens/WaitlistScreen';
import { useSession } from '../context/SessionContext';
import { ensureFirebaseUser } from '../utils/userSync';
import { useApprovalState } from '../utils/admin';

// On web, Google OAuth returns to this path so Clerk can complete the handshake.
function isSSOCallbackRoute(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    window.location.pathname.startsWith('/sso-callback')
  );
}

/**
 * Resolve the user's name from Clerk.
 *
 * Sign in with Apple only delivers the name on the *first* authorization, and
 * Clerk records it on the external account rather than always promoting it to
 * the top-level user fields. So when the user's first/last/full name are empty
 * (the usual case for Apple), fall back to the name stored on the external
 * account before giving up.
 */
function resolveClerkName(user: NonNullable<ReturnType<typeof useUser>['user']>): {
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
} {
  let firstName = user.firstName;
  let lastName = user.lastName;
  const fullName = user.fullName;

  if (!firstName && !lastName && !fullName) {
    const account = user.externalAccounts?.find((a) => a.firstName || a.lastName);
    if (account) {
      firstName = account.firstName ?? null;
      lastName = account.lastName ?? null;
    }
  }

  return { firstName, lastName, fullName };
}

interface AuthGateProps {
  children: ReactNode;
}

/**
 * Gates the app behind Clerk authentication:
 *  1. Shows a loading screen while Clerk initializes.
 *  2. Shows the Google sign-in screen when signed out.
 *  3. On sign-in, syncs the Google identity into Firebase `users/` and sets it as
 *     the active session user (the operator-selection screen is gone — the signed-in
 *     Google name is the active user), then renders the app.
 */
export default function AuthGate({ children }: AuthGateProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { setActiveUser, clearSession } = useSession();
  const [synced, setSynced] = useState(false);
  const approval = useApprovalState();

  useEffect(() => {
    let cancelled = false;

    if (isSignedIn && user && !synced) {
      const email =
        user.primaryEmailAddress?.emailAddress ??
        user.emailAddresses?.[0]?.emailAddress;

      const { firstName, lastName, fullName } = resolveClerkName(user);

      if (!email) {
        // No email (shouldn't happen with Google) — fall back to the Clerk id/name.
        setActiveUser({ id: user.id, name: fullName ?? 'User' });
        setSynced(true);
        return;
      }

      ensureFirebaseUser({
        email,
        firstName,
        lastName,
        fullName,
      })
        .then((syncedUser) => {
          if (cancelled) return;
          // The Google name becomes the active operator used for logging/pull lists.
          setActiveUser({ id: syncedUser.id, name: syncedUser.name });
          setSynced(true);
        })
        .catch((err) => {
          console.error('Failed to sync Clerk user to Firebase:', err);
          if (cancelled) return;
          // Don't block the user on a sync hiccup — use the Clerk identity directly.
          const fallbackName =
            [firstName, lastName].filter(Boolean).join(' ').trim() || fullName || email;
          setActiveUser({
            id: email,
            name: fallbackName,
          });
          setSynced(true);
        });
    }

    // Reset session state when the user signs out.
    if (!isSignedIn && synced) {
      clearSession();
      setSynced(false);
    }

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, user, synced, setActiveUser, clearSession]);

  if (!isLoaded) {
    return <LoadingScreen message="Starting up..." />;
  }

  // Complete the OAuth redirect before evaluating signed-in state.
  if (isSSOCallbackRoute()) {
    return <SSOCallbackScreen />;
  }

  if (!isSignedIn) {
    return <SignInScreen />;
  }

  if (!synced) {
    return <LoadingScreen message="Setting up your account..." />;
  }

  // Approval gate: a brand-new user's record syncs as `pending` and must be
  // approved by an admin. Show the setup screen until the record resolves, then
  // the waitlist while pending. Admins resolve to `approved` immediately.
  if (approval === 'loading') {
    return <LoadingScreen message="Setting up your account..." />;
  }

  if (approval === 'pending') {
    return <WaitlistScreen />;
  }

  return <>{children}</>;
}
