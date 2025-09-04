import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Chip, Menu, IconButton, Text, Portal, Dialog, Button } from 'react-native-paper';
import { UsersIcon, SwitchIcon } from './CustomIcons';
import { useSession } from '../context/SessionContext';
import { useNavigation } from '@react-navigation/native';

interface UserBadgeProps {
  style?: any;
}

export default function UserBadge({ style }: UserBadgeProps) {
  const { activeUser, clearSession } = useSession();
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

  return (
    <View style={[styles.container, style]}>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <Chip
            icon={() => <UsersIcon size={16} color="#1565C0" />}
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
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
    borderWidth: 1,
  },
  chipText: {
    color: '#1565C0',
    fontWeight: '600',
    fontSize: 14,
  },
  menuContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    elevation: 8,
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    margin: 16,
    maxWidth: '90%',
    alignSelf: 'center',
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
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