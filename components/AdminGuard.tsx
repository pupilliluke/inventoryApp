import React, { ReactNode } from 'react';
import { SafeAreaView, View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import ScreenHeader from './ScreenHeader';
import { useIsAdmin } from '../utils/admin';
import { color, space, font } from '../theme/tokens';

interface AdminGuardProps {
  title: string;
  children: ReactNode;
}

/**
 * Renders children only for admins. Non-admins see an "admins only" notice.
 * The admin check is a hook called unconditionally; the guarded screen mounts
 * (with its own hooks) only when access is granted, so rules-of-hooks hold.
 */
export default function AdminGuard({ title, children }: AdminGuardProps) {
  const isAdmin = useIsAdmin();
  const navigation = useNavigation();

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={title} onBack={() => navigation.goBack()} />
      <View style={styles.center}>
        <Text style={styles.title}>Admins only</Text>
        <Text style={styles.subtitle}>You don't have access to this page.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.appBg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.xl },
  title: { ...font.title, marginBottom: space.xs },
  subtitle: { fontSize: 13, color: color.textMuted, textAlign: 'center' },
});
