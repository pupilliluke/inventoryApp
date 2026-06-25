import React, { useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import { useAuth, useUser } from '@clerk/expo';
import LoadingScreen from '../screens/LoadingScreen';
import SignInScreen from '../screens/SignInScreen';
import SSOCallbackScreen from '../screens/SSOCallbackScreen';
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
 *  3. On sign-in, syncs the user's email into Firebase `users/` so they appear
 *     in the existing user-selection list, then renders the app.
 */
export default function AuthGate({ children }: AuthGateProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [synced, setSynced] = useState(false);
  const [syncError, setSyncError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (isSignedIn && user && !synced) {
      const email =
        user.primaryEmailAddress?.emailAddress ??
        user.emailAddresses?.[0]?.emailAddress;

      if (!email) {
        // No email on the account — let them through to user selection anyway.
        setSynced(true);
        return;
      }

      ensureFirebaseUser({
        email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
      })
        .then(() => {
          if (!cancelled) setSynced(true);
        })
        .catch((err) => {
          console.error('Failed to sync Clerk user to Firebase:', err);
          if (!cancelled) {
            setSyncError(true);
            setSynced(true); // don't block the user on a sync hiccup
          }
        });
    }

    // Reset sync state when the user signs out.
    if (!isSignedIn && synced) {
      setSynced(false);
      setSyncError(false);
    }

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, user, synced]);

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
