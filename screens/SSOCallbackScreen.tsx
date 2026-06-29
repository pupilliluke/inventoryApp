import React, { useEffect } from 'react';
import { useClerk } from '@clerk/clerk-expo';
import LoadingScreen from './LoadingScreen';

/**
 * Web-only landing page for the OAuth redirect (/sso-callback).
 *
 * Clerk redirects the browser here after Google authentication. We complete the
 * handshake with `handleRedirectCallback`, which activates the session and then
 * navigates to the app root, where AuthGate takes over.
 */
export default function SSOCallbackScreen() {
  const clerk = useClerk();

  useEffect(() => {
    let cancelled = false;
    const home = typeof window !== 'undefined' ? `${window.location.origin}/` : '/';
    clerk
      .handleRedirectCallback({
        // "force" URLs override Clerk's defaults for BOTH sign-in and the
        // first-time sign-up path, so a brand-new user lands back on our app
        // instead of Clerk's account portal.
        signInForceRedirectUrl: home,
        signUpForceRedirectUrl: home,
        signInFallbackRedirectUrl: home,
        signUpFallbackRedirectUrl: home,
      })
      .catch((err) => {
        console.error('SSO callback error:', err);
        // On failure, return to the sign-in screen.
        if (!cancelled && typeof window !== 'undefined') {
          window.location.href = '/';
        }
      });
    return () => {
      cancelled = true;
    };
  }, [clerk]);

  return <LoadingScreen message="Finishing sign in..." />;
}
