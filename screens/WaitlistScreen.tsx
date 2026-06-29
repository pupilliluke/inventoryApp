import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { color, space, radius } from '../theme/tokens';

/**
 * Shown to a signed-in user whose Firebase record is still `status: 'pending'`.
 * They've authenticated successfully but an admin hasn't approved their access
 * yet. AuthGate subscribes to the approval state live, so once an admin approves
 * them this screen is replaced by the app automatically — no re-sign-in needed.
 */
export default function WaitlistScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const [signingOut, setSigningOut] = useState(false);

  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    '';

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      setSigningOut(false);
    }
  };

  return (
    <View style={styles.background}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>⏳</Text>
        </View>

        <Text style={styles.eyebrow}>Pending Approval</Text>
        <Text style={styles.title}>You're on the waitlist</Text>
        <Text style={styles.subtitle}>
          Your account has been created and is waiting for an administrator to approve access.
          You'll get in as soon as you're approved — no need to sign in again.
        </Text>

        {email ? (
          <View style={styles.emailChip}>
            <Text style={styles.emailText}>{email}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={handleSignOut}
          disabled={signingOut}
          style={styles.signOutButton}
          activeOpacity={0.8}
        >
          {signingOut ? (
            <ActivityIndicator size="small" color={color.textSecondary} />
          ) : (
            <Text style={styles.signOutLabel}>Sign out</Text>
          )}
        </TouchableOpacity>
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
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.lg,
  },
  iconText: { fontSize: 30 },
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
    marginBottom: space.lg,
    fontWeight: '500',
    lineHeight: 20,
  },
  emailChip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    marginBottom: space.xl,
  },
  emailText: {
    fontSize: 13,
    fontWeight: '600',
    color: color.onChrome,
  },
  signOutButton: {
    width: '100%',
    backgroundColor: color.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.border,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  signOutLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: color.text,
  },
});
