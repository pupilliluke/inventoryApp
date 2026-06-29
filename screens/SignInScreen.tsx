import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Image, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { useOAuth, useSignIn } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { GoogleIcon, AppleIcon } from '../components/CustomIcons';

type OAuthStrategy = 'oauth_google' | 'oauth_apple';
import { color, space } from '../theme/tokens';

// Ensures the browser-based auth session can complete (native redirects).
WebBrowser.maybeCompleteAuthSession();

// Warm up / cool down the in-app browser on native for a smoother OAuth flow.
function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

export default function SignInScreen() {
  useWarmUpBrowser();
  const { signIn, isLoaded } = useSignIn();
  // useOAuth binds the provider at hook-init time, so we create one per strategy.
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: 'oauth_apple' });
  const [loadingStrategy, setLoadingStrategy] = useState<OAuthStrategy | null>(null);
  const [error, setError] = useState('');

  const handleOAuth = useCallback(async (strategy: OAuthStrategy) => {
    setError('');
    setLoadingStrategy(strategy);
    try {
      if (Platform.OS === 'web') {
        // Full-page redirect flow on web. A popup-based flow trips
        // Cross-Origin-Opener-Policy and can't hand the session back, so we
        // navigate the whole page to the provider and return via /sso-callback,
        // where SSOCallbackScreen completes the handshake.
        if (!isLoaded || !signIn) {
          setError('Still loading — please try again in a moment.');
          return;
        }
        const origin = window.location.origin;
        await signIn.authenticateWithRedirect({
          strategy,
          redirectUrl: `${origin}/sso-callback`,
          redirectUrlComplete: `${origin}/`,
        });
        // On success the browser navigates away; only errors return here.
        return;
      }

      // Native: in-app browser flow (COOP does not apply).
      const startFlow = strategy === 'oauth_apple' ? startAppleOAuth : startGoogleOAuth;
      const result = await startFlow({
        redirectUrl: AuthSession.makeRedirectUri(),
      });

      // TEMP DIAGNOSTIC: see exactly what the OAuth flow returns.
      console.log('[OAuth result]', JSON.stringify({
        createdSessionId: result.createdSessionId,
        signInStatus: result.signIn?.status,
        signUpStatus: result.signUp?.status,
        signUpMissingFields: result.signUp?.missingFields,
        signUpUnverifiedFields: result.signUp?.unverifiedFields,
      }));

      const { createdSessionId, setActive, signUp } = result;

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        // AuthGate picks up the signed-in state and continues.
      } else if (signUp && setActive) {
        // New OAuth user: if Clerk created a complete sign-up, activate its session.
        if (signUp.status === 'complete' && signUp.createdSessionId) {
          await setActive({ session: signUp.createdSessionId });
        } else {
          setError(`Sign-up needs: ${signUp.missingFields?.join(', ') || signUp.status || 'unknown'}`);
        }
      } else {
        setError('Could not complete sign in. Please try again.');
      }
    } catch (err: any) {
      console.error(`${strategy} sign-in error:`, err);
      setError(err?.errors?.[0]?.message ?? err?.message ?? 'Sign in failed. Please try again.');
    } finally {
      setLoadingStrategy(null);
    }
  }, [signIn, isLoaded, startGoogleOAuth, startAppleOAuth]);

  return (
    <View style={styles.background}>
      <View style={styles.content}>
        <Image
          source={require('../assets/1024.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.eyebrow}>Inventory System</Text>
        <Text style={styles.title}>Phantom Warehouse</Text>
        <Text style={styles.subtitle}>Sign in to access the inventory system</Text>

        <View style={styles.actions}>
          {Platform.OS !== 'android' && (
            <TouchableOpacity
              onPress={() => handleOAuth('oauth_apple')}
              disabled={loadingStrategy !== null}
              style={[styles.button, styles.appleButton]}
              activeOpacity={0.85}
            >
              {loadingStrategy === 'oauth_apple' ? (
                <ActivityIndicator size="small" color="#0f172a" />
              ) : (
                <AppleIcon size={19} color="#0f172a" />
              )}
              <Text style={[styles.buttonLabel, styles.appleButtonLabel]}>
                {loadingStrategy === 'oauth_apple' ? 'Signing in…' : 'Continue with Apple'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => handleOAuth('oauth_google')}
            disabled={loadingStrategy !== null}
            style={[styles.button, styles.googleButton]}
            activeOpacity={0.85}
          >
            {loadingStrategy === 'oauth_google' ? (
              <ActivityIndicator size="small" color={color.onChrome} />
            ) : (
              <GoogleIcon size={19} />
            )}
            <Text style={[styles.buttonLabel, styles.googleButtonLabel]}>
              {loadingStrategy === 'oauth_google' ? 'Signing in…' : 'Continue with Google'}
            </Text>
          </TouchableOpacity>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: color.chromeAlt,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 4,
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: color.onChromeMuted,
    marginBottom: space.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: color.onChrome,
    textAlign: 'center',
    marginBottom: space.sm,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    color: color.onChromeMuted,
    textAlign: 'center',
    marginBottom: space.xl,
    fontWeight: '500',
  },
  actions: {
    width: '100%',
    gap: space.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    height: 54,
    borderRadius: 14,
    paddingHorizontal: space.lg,
    // Soft elevation to lift the buttons off the dark backdrop.
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  appleButton: {
    backgroundColor: '#FFFFFF',
  },
  appleButtonLabel: {
    color: '#0f172a',
  },
  googleButton: {
    // Frosted, slightly raised panel that reads against the dark slate.
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  googleButtonLabel: {
    color: color.onChrome,
  },
  error: {
    color: '#fca5a5',
    marginTop: space.sm,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});
