import React, { useState } from 'react';
import { SafeAreaView, View, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useUser, useAuth } from '@clerk/expo';
import { getDatabase, ref, update } from 'firebase/database';
import ScreenHeader from '../components/ScreenHeader';
import { AccountIcon, CheckIcon } from '../components/CustomIcons';
import { useSession } from '../context/SessionContext';
import { useIsAdmin } from '../utils/admin';
import { emailToUserKey } from '../utils/userSync';
import { appendLog, LogMessages } from '../utils/logging';
import { color, space, radius, font } from '../theme/tokens';

/**
 * Account page: the signed-in user can update their display name and see whether
 * they hold admin status. The name is the "operator" used across logging and pull
 * lists. We update it in three places so the change sticks:
 *   1. Clerk (firstName/lastName) — the source of truth re-applied on every login.
 *   2. Firebase `users/{key}` — what the rest of the app reads.
 *   3. The active session — so the UI reflects it immediately.
 */
export default function AccountPage() {
  const navigation = useNavigation();
  const { user } = useUser();
  const { signOut } = useAuth();
  const { activeUser, setActiveUser, clearSession } = useSession();
  const isAdmin = useIsAdmin();

  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    '';

  const [name, setName] = useState(activeUser?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const trimmedName = name.trim();
  const isDirty = trimmedName.length > 0 && trimmedName !== (activeUser?.name ?? '');

  const handleSave = async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    setFeedback(null);
    const previousName = activeUser?.name ?? '';
    try {
      // Split the single name field back into Clerk's first/last so it survives
      // the next sign-in (where displayNameFor rebuilds the name from these).
      const parts = trimmedName.split(/\s+/);
      const firstName = parts.shift() ?? '';
      const lastName = parts.join(' ');

      if (user) {
        try {
          await user.update({ firstName, lastName });
        } catch (clerkErr) {
          // Some Clerk configurations lock OAuth-provided names. Don't fail the
          // whole save — the Firebase/session name below still takes effect.
          console.warn('Could not update Clerk name:', clerkErr);
        }
      }

      let userId = activeUser?.id ?? '';
      if (email) {
        const db = getDatabase();
        const key = emailToUserKey(email);
        await update(ref(db, `users/${key}`), {
          name: trimmedName,
          email,
          updatedAt: new Date().toISOString(),
        });
        userId = key;
        setActiveUser({ id: key, name: trimmedName });
      } else if (activeUser) {
        setActiveUser({ ...activeUser, name: trimmedName });
      }

      // Record the rename in the activity log under the new identity.
      await appendLog({
        userId,
        userName: trimmedName,
        message: LogMessages.selfRenamed(previousName || trimmedName, trimmedName),
      });

      setFeedback({ kind: 'success', text: 'Name updated.' });
    } catch (err) {
      console.error('Failed to update name:', err);
      setFeedback({ kind: 'error', text: 'Could not update your name. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    clearSession();
    try {
      await signOut();
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Account" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Identity summary */}
        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <AccountIcon size={28} color={color.accent} />
          </View>
          <Text style={styles.identityName} numberOfLines={1}>{activeUser?.name ?? 'User'}</Text>
          {email ? <Text style={styles.identityEmail} numberOfLines={1}>{email}</Text> : null}
          <View style={[styles.statusBadge, isAdmin ? styles.statusBadgeAdmin : styles.statusBadgeUser]}>
            <Text style={[styles.statusBadgeText, isAdmin ? styles.statusBadgeTextAdmin : styles.statusBadgeTextUser]}>
              {isAdmin ? 'Admin' : 'Standard User'}
            </Text>
          </View>
        </View>

        {/* Edit name */}
        <Text style={styles.sectionLabel}>Display Name</Text>
        <View style={styles.formBlock}>
          <Text style={styles.helperText}>
            This is how you appear on logs and pull lists.
          </Text>
          <TextInput
            value={name}
            onChangeText={(text) => { setName(text); setFeedback(null); }}
            style={styles.field}
            placeholder="Your name"
            placeholderTextColor={color.textMuted}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          {feedback && (
            <Text style={[styles.feedback, feedback.kind === 'error' && styles.feedbackError]}>
              {feedback.text}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.primaryAction, (!isDirty || saving) && styles.primaryActionDisabled]}
            onPress={handleSave}
            disabled={!isDirty || saving}
            activeOpacity={0.8}
          >
            <CheckIcon size={18} color={color.textInverse} />
            <Text style={styles.primaryActionText}>{saving ? 'Saving…' : 'Save Name'}</Text>
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.appBg },
  content: { padding: space.md, paddingBottom: space.xxl },

  identityCard: {
    alignItems: 'center',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingVertical: space.xl,
    paddingHorizontal: space.lg,
    marginBottom: space.xl,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: color.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  identityName: { ...font.title, fontSize: 18, marginBottom: 2 },
  identityEmail: { fontSize: 13, color: color.textMuted, marginBottom: space.md },
  statusBadge: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  statusBadgeAdmin: { backgroundColor: color.accentBg, borderColor: color.accent },
  statusBadgeUser: { backgroundColor: color.surfaceAlt, borderColor: color.border },
  statusBadgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  statusBadgeTextAdmin: { color: color.accent },
  statusBadgeTextUser: { color: color.textSecondary },

  sectionLabel: { ...font.label, marginBottom: space.sm },
  formBlock: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceAlt,
    padding: space.md,
  },
  helperText: { fontSize: 13, color: color.textSecondary, marginBottom: space.md },
  field: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: 14,
    backgroundColor: color.surface,
    color: color.text,
  },
  feedback: { fontSize: 13, color: color.positive, marginTop: space.sm, fontWeight: '600' },
  feedbackError: { color: color.negative },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: color.accent,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    marginTop: space.lg,
  },
  primaryActionDisabled: { opacity: 0.5 },
  primaryActionText: { fontSize: 14, fontWeight: '700', color: color.textInverse, letterSpacing: 0.5 },

  signOutBtn: {
    marginTop: space.xl,
    borderWidth: 1,
    borderColor: color.negative,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  signOutText: { fontSize: 14, fontWeight: '700', color: color.negative },
});
