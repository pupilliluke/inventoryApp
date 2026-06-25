import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Menu, Text, Portal, Modal } from 'react-native-paper';
import { UsersIcon, SwitchIcon, CloseIcon } from './CustomIcons';
import { useSession } from '../context/SessionContext';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@clerk/expo';
import { color, space, radius, font } from '../theme/tokens';

interface UserBadgeProps {
  style?: any;
}

export default function UserBadge({ style }: UserBadgeProps) {
  const { activeUser, clearSession } = useSession();
  const { signOut } = useAuth();
  const navigation = useNavigation();
  const [menuVisible, setMenuVisible] = useState(false);
  const [confirmSwitchVisible, setConfirmSwitchVisible] = useState(false);

  if (!activeUser) {
    return null;
  }

  const handleSwitchUser = () => {
    setMenuVisible(false);
    setConfirmSwitchVisible(true);
  };

  const confirmSwitchUser = () => {
    clearSession();
    setConfirmSwitchVisible(false);
    navigation.navigate('UserSelection' as never);
  };

  const cancelSwitchUser = () => {
    setConfirmSwitchVisible(false);
  };

  const handleSignOut = async () => {
    setMenuVisible(false);
    clearSession();
    try {
      await signOut();
      // AuthGate will detect the signed-out state and show the sign-in screen.
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.chip} activeOpacity={0.7}>
            <UsersIcon size={14} color={color.onChrome} />
            <Text style={styles.chipText} numberOfLines={1}>{activeUser.name}</Text>
          </TouchableOpacity>
        }
        contentStyle={styles.menuContent}
      >
        <Menu.Item
          onPress={handleSwitchUser}
          title="Switch User"
          leadingIcon={() => <SwitchIcon size={20} color={color.textSecondary} />}
        />
        <Menu.Item
          onPress={handleSignOut}
          title="Sign Out"
          leadingIcon={() => <CloseIcon size={20} color={color.negative} />}
        />
      </Menu>

      {/* Switch User Confirmation */}
      <Portal>
        <Modal
          visible={confirmSwitchVisible}
          onDismiss={cancelSwitchUser}
          contentContainerStyle={styles.dialog}
          dismissable
        >
          <Text style={styles.dialogTitle}>Switch User</Text>
          <Text style={styles.dialogText}>
            Switch from "{activeUser.name}"? You'll return to the user selection screen.
          </Text>
          <View style={styles.dialogActions}>
            <TouchableOpacity style={styles.dialogGhost} onPress={cancelSwitchUser} activeOpacity={0.8}>
              <Text style={styles.dialogGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dialogPrimary} onPress={confirmSwitchUser} activeOpacity={0.8}>
              <Text style={styles.dialogPrimaryText}>Switch User</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    maxWidth: 140,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  chipText: {
    color: color.onChrome,
    fontWeight: '600',
    fontSize: 13,
  },
  menuContent: {
    backgroundColor: color.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.border,
  },
  dialog: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    marginHorizontal: space.lg,
    padding: space.xl,
    maxWidth: 420,
    width: '88%',
    alignSelf: 'center',
  },
  dialogTitle: {
    ...font.title,
    fontSize: 16,
    marginBottom: space.sm,
  },
  dialogText: {
    fontSize: 14,
    color: color.textSecondary,
    lineHeight: 21,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.xl,
  },
  dialogGhost: {
    flex: 1,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  dialogGhostText: {
    fontSize: 14,
    fontWeight: '700',
    color: color.textSecondary,
  },
  dialogPrimary: {
    flex: 1,
    backgroundColor: color.accent,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  dialogPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: color.textInverse,
  },
});