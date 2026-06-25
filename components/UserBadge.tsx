import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip, Menu, IconButton, Text, Portal, Dialog, Button } from 'react-native-paper';
import { UsersIcon, SwitchIcon, CloseIcon } from './CustomIcons';
import { useSession } from '../context/SessionContext';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@clerk/expo';

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
          <Chip
            icon={() => <UsersIcon size={16} color="#5B21B6" />}
            onPress={() => setMenuVisible(true)}
            style={styles.chip}
            textStyle={styles.chipText}
          >
            {activeUser.name}
          </Chip>
        }
        contentStyle={styles.menuContent}
      >
        <Menu.Item
          onPress={handleSwitchUser}
          title="Switch User"
          leadingIcon={() => <SwitchIcon size={20} color="#666666" />}
        />
        <Menu.Item
          onPress={handleSignOut}
          title="Sign Out"
          leadingIcon={() => <CloseIcon size={20} color="#E74C3C" />}
        />
      </Menu>

      {/* Switch User Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={confirmSwitchVisible}
          onDismiss={cancelSwitchUser}
          style={styles.dialog}
          theme={{
            colors: {
              backdrop: 'rgba(0, 0, 0, 0.5)'
            }
          }}
        >
          <Dialog.Icon icon={() => <SwitchIcon size={48} color="#FF9800" />} />
          <Dialog.Title style={styles.dialogTitle}>Switch User</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Are you sure you want to switch from "{activeUser.name}"?
            </Text>
            <Text style={styles.dialogSubtext}>
              You'll return to the user selection screen.
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button
              mode="text"
              onPress={cancelSwitchUser}
              textColor="#666666"
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={confirmSwitchUser}
              buttonColor="#FF9800"
            >
              Switch User
            </Button>
          </Dialog.Actions>
        </Dialog>
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
    backgroundColor: '#F3E8FF',
    borderColor: '#8B5CF6',
    borderWidth: 2,
  },
  chipText: {
    color: '#2C3E50',
    fontWeight: '600',
    fontSize: 14,
  },
  menuContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#F3E8FF',
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    margin: 16,
    maxWidth: '90%',
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: '#F3E8FF',
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
  },
  dialogText: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  dialogSubtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  dialogActions: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
});