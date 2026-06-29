import React, { useEffect } from 'react';
import { useClerk } from '@clerk/clerk-expo';
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

  useEffect(() => {
    let cancelled = false;
    const home = typeof window !== 'undefined' ? `${window.location.origin}/` : '/';

    // Back-button (or any stray visit) lands here without OAuth params. Don't
    // re-run the handshake — that would sign the user out. Just go home, using
    // `replace` so `/sso-callback` drops out of the history stack.
    if (!hasOAuthCallbackParams()) {
      if (typeof window !== 'undefined') {
        window.location.replace(home);
      }
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
  }, [clerk]);

  return <LoadingScreen message="Finishing sign in..." />;
}
