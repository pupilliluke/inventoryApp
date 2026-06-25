import React, { useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import { useAuth, useUser } from '@clerk/expo';
import LoadingScreen from '../screens/LoadingScreen';
import SignInScreen from '../screens/SignInScreen';
import SSOCallbackScreen from '../screens/SSOCallbackScreen';
import { useSession } from '../context/SessionContext';
import { ensureFirebaseUser } from '../utils/userSync';

// On web, Google OAuth returns to this path so Clerk can complete the handshake.
function isSSOCallbackRoute(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    window.location.pathname.startsWith('/sso-callback')
  );
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

  useEffect(() => {
    let cancelled = false;

    if (isSignedIn && user && !synced) {
      const email =
        user.primaryEmailAddress?.emailAddress ??
        user.emailAddresses?.[0]?.emailAddress;

      if (!email) {
        // No email (shouldn't happen with Google) — fall back to the Clerk id/name.
        setActiveUser({ id: user.id, name: user.fullName ?? 'User' });
        setSynced(true);
        return;
      }

      ensureFirebaseUser({
        email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
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
          setActiveUser({
            id: email,
            name: user.fullName ?? email,
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

  return <>{children}</>;
}
