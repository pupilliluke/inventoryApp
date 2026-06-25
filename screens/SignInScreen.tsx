import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Image, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { useSSO, useSignIn } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { GoogleIcon } from '../components/CustomIcons';
import { color, space, radius } from '../theme/tokens';

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
  const { startSSOFlow } = useSSO();
  const { signIn } = useSignIn();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        // Full-page redirect flow on web. A popup-based flow trips
        // Cross-Origin-Opener-Policy and can't hand the session back, so we
        // navigate the whole page to Google and return via /sso-callback.
        const origin = window.location.origin;
        const { error: ssoError } = await signIn.sso({
          strategy: 'oauth_google',
          redirectUrl: `${origin}/`,
          redirectCallbackUrl: `${origin}/sso-callback`,
        });
        // On success the browser navigates away; only errors return here.
        if (ssoError) {
          setError((ssoError as any)?.message ?? 'Sign in failed. Please try again.');
        }
        return;
      }

      // Native: in-app browser flow (COOP does not apply).
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: AuthSession.makeRedirectUri(),
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        // AuthGate picks up the signed-in state and continues.
      } else {
        setError('Could not complete sign in. Please try again.');
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(err?.errors?.[0]?.message ?? err?.message ?? 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [startSSOFlow, signIn]);

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

        <View style={styles.card}>
          <TouchableOpacity
            onPress={handleGoogleSignIn}
            disabled={loading}
            style={styles.googleButton}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color={color.textSecondary} />
            ) : (
              <GoogleIcon size={18} />
            )}
            <Text style={styles.googleButtonLabel}>
              {loading ? 'Signing in…' : 'Continue with Google'}
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
  card: {
    width: '100%',
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    padding: space.xl,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: color.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.border,
    paddingVertical: space.md,
  },
  googleButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: color.text,
  },
  error: {
    color: color.negative,
    marginTop: space.lg,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});
