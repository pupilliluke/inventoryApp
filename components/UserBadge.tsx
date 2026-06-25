import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Menu, Text } from 'react-native-paper';
import { UsersIcon, CloseIcon } from './CustomIcons';
import { useSession } from '../context/SessionContext';
import { useAuth } from '@clerk/expo';
import { color, space, radius } from '../theme/tokens';

interface UserBadgeProps {
  style?: any;
}

export default function UserBadge({ style }: UserBadgeProps) {
  const { activeUser, clearSession } = useSession();
  const { signOut } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);

  if (!activeUser) {
    return null;
  }

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
          onPress={handleSignOut}
          title="Sign Out"
          leadingIcon={() => <CloseIcon size={20} color={color.negative} />}
        />
      </Menu>
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
});
