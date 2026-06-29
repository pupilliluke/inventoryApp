import React, { useEffect } from 'react';
import { useClerk, useAuth } from '@clerk/clerk-expo';
import LoadingScreen from './LoadingScreen';

/**
 * True only when the current URL actually carries OAuth callback params.
 *
 * After a successful sign-in we navigate to `/`, but `/sso-callback` stays in
 * the browser history. Pressing "back" returns the browser to a bare
 * `/sso-callback` (no params). Re-running the handshake in that case tears down
 * the in-flight transfer and signs the user out — so we must NOT touch the
 * session unless real callback params are present.
 */
function hasOAuthCallbackParams(): boolean {
  if (typeof window === 'undefined') return false;
  const { search, hash } = window.location;
  const params = new URLSearchParams(search || (hash.startsWith('#') ? hash.slice(1) : hash));
  // Clerk / the OAuth provider hand back at least one of these on a real return.
  return (
    params.has('code') ||
    params.has('__clerk_handshake') ||
    params.has('__clerk_status') ||
    params.has('rotating_token_nonce') ||
    params.has('state')
  );
}

/**
 * Web-only landing page for the OAuth redirect (/sso-callback).
 *
 * Clerk redirects the browser here after Google authentication. We complete the
 * handshake with `handleRedirectCallback`, which activates the session and then
 * navigates to the app root, where AuthGate takes over.
 */
export default function SSOCallbackScreen() {
  const clerk = useClerk();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    let cancelled = false;
    const home = typeof window !== 'undefined' ? `${window.location.origin}/` : '/';
    const goHome = () => {
      // `replace` so `/sso-callback` drops out of the history stack.
      if (typeof window !== 'undefined') window.location.replace(home);
    };

    // Wait for Clerk to resolve auth state before deciding anything.
    if (!isLoaded) return;

    // Already signed in → this is a stale/back-button visit to /sso-callback
    // (the handshake already completed). Re-running it would tear down the live
    // session and sign the user out. Just go home. This is the robust guard:
    // it holds even when the OAuth params still linger in the URL, which is the
    // case the params-only check below cannot catch.
    if (isSignedIn) {
      goHome();
      return;
    }

    // Signed out with no real callback params — a stray visit. Go home without
    // touching the session.
    if (!hasOAuthCallbackParams()) {
      goHome();
      return;
    }

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
  }, [clerk, isLoaded, isSignedIn]);

  return <LoadingScreen message="Finishing sign in..." />;
}
