import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Image, Platform } from 'react-native';
import { Text, Title, Card, Button } from 'react-native-paper';
import { useSSO, useSignIn } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { GoogleIcon } from '../components/CustomIcons';

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
        <Title style={styles.title}>Phantom Warehouse</Title>
        <Text style={styles.subtitle}>Sign in to access the inventory system</Text>

        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Button
              mode="contained"
              onPress={handleGoogleSignIn}
              loading={loading}
              disabled={loading}
              icon={() => <GoogleIcon size={20} />}
              style={styles.googleButton}
              contentStyle={styles.googleButtonContent}
              labelStyle={styles.googleButtonLabel}
            >
              {loading ? 'Signing in...' : 'Continue with Google'}
            </Button>

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </Card.Content>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#5B21B6',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.92,
    textAlign: 'center',
    marginBottom: 28,
    fontWeight: '500',
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    elevation: 8,
  },
  cardContent: {
    padding: 24,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DADCE0',
  },
  googleButtonContent: {
    paddingVertical: 8,
    flexDirection: 'row',
  },
  googleButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3C4043',
  },
  error: {
    color: '#E74C3C',
    marginTop: 16,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
