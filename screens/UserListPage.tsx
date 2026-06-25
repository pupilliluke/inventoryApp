import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, StyleSheet, FlatList, Alert, ScrollView, KeyboardAvoidingView, Platform, TextInput, TouchableOpacity } from 'react-native';
import { Text, Portal, Modal } from 'react-native-paper';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { useSession } from '../context/SessionContext';
import { UserMutations, UserNotAuthenticatedError } from '../utils/inventoryMutations';
import { AddIcon, DeleteIcon, EditIcon, ViewIcon, CheckIcon, CloseIcon, SearchIcon } from '../components/CustomIcons';
import ScreenHeader from '../components/ScreenHeader';
import CustomIconButton from '../components/CustomIconButton';
import { color, space, radius, font, mono } from '../theme/tokens';

export default function UserListPage() {
  const navigation = useNavigation();
  const { activeUser } = useSession();
  const [username, setUsername] = useState('');
  const [inventory, setInventory] = useState([]);
  const [users, setUsers] = useState({});
  const [editingUser, setEditingUser] = useState(null);
  const [newUserName, setNewUserName] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [editConfirmVisible, setEditConfirmVisible] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [userToEdit, setUserToEdit] = useState({ oldName: '', newName: '' });

  useEffect(() => {
    const invRef = ref(db, 'inventory');
    const inventoryUnsubscribe = onValue(invRef, snapshot => {
      const data = snapshot.val() || {};
      setInventory(Object.values(data));
    });

    const usersRef = ref(db, 'users');
    const usersUnsubscribe = onValue(usersRef, snapshot => {
      setUsers(snapshot.val() || {});
    });

    return () => {
      inventoryUnsubscribe();
      usersUnsubscribe();
    };
  }, []);

  const handleAddUser = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }
    if (users[username]) {
      Alert.alert('Error', 'User already exists');
      return;
    }
    try {
      await UserMutations.createUser(activeUser, username);
      setUsername('');
      setShowAddUser(false);
      Alert.alert('Success', 'User added successfully');
    } catch (error) {
      if (error instanceof UserNotAuthenticatedError) {
        navigation.navigate('UserSelection' as never);
      } else {
        Alert.alert('Error', 'Failed to add user');
        console.error(error);
      }
    }
  };

  const handleDeleteUser = (userKey) => {
    setUserToDelete(userKey);
    setDeleteConfirmVisible(true);
  };

  const confirmDeleteUser = async () => {
    try {
      await UserMutations.deleteUser(activeUser, userToDelete);
      if (selectedUser === userToDelete) setSelectedUser(null);
      setDeleteConfirmVisible(false);
      setUserToDelete(null);
      Alert.alert('Success', 'User deleted successfully');
    } catch (error) {
      if (error instanceof UserNotAuthenticatedError) {
        navigation.navigate('UserSelection' as never);
      } else {
        Alert.alert('Error', 'Failed to delete user');
        console.error(error);
      }
    }
  };

  const cancelDeleteUser = () => {
    setDeleteConfirmVisible(false);
    setUserToDelete(null);
  };

  const handleRenameUser = (oldName, newName) => {
    if (!newName.trim() || newName === oldName) {
      setEditingUser(null);
      setNewUserName('');
      return;
    }
    if (users[newName]) {
      Alert.alert('Error', 'A user with that name already exists');
      return;
    }
    setUserToEdit({ oldName, newName });
    setEditConfirmVisible(true);
  };

  const confirmRenameUser = async () => {
    try {
      const { oldName, newName } = userToEdit;
      const userData = users[oldName];
      await UserMutations.renameUser(activeUser, oldName, newName, userData);
      if (selectedUser === oldName) setSelectedUser(newName);
      setEditingUser(null);
      setNewUserName('');
      setEditConfirmVisible(false);
      setUserToEdit({ oldName: '', newName: '' });
      Alert.alert('Success', 'User renamed successfully');
    } catch (error) {
      if (error instanceof UserNotAuthenticatedError) {
        navigation.navigate('UserSelection' as never);
      } else {
        Alert.alert('Error', 'Failed to rename user');
        console.error(error);
      }
    }
  };

  const cancelRenameUser = () => {
    setEditConfirmVisible(false);
    setUserToEdit({ oldName: '', newName: '' });
    setEditingUser(null);
    setNewUserName('');
  };

  const loadUserList = (userKey) => setSelectedUser(userKey);

  const filteredInventory = inventory.filter(item =>
    searchQuery && (
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const renderUserRow = ({ item: userKey, index }) => {
    const user = users[userKey];
    const isSelected = selectedUser === userKey;
    const isEditing = editingUser === userKey;

    return (
      <View style={[styles.userRow, isSelected && styles.userRowSelected]}>
        {isEditing ? (
          <TextInput
            value={newUserName}
            onChangeText={setNewUserName}
            style={styles.inlineInput}
            placeholder="Enter new name"
            placeholderTextColor={color.textMuted}
            onSubmitEditing={() => handleRenameUser(userKey, newUserName)}
            autoFocus
          />
        ) : (
          <Text style={styles.userName}>{user.name}</Text>
        )}

        <View style={styles.userActions}>
          {isEditing ? (
            <>
              <CustomIconButton iconType="check" size={18} color={color.positive} onPress={() => handleRenameUser(userKey, newUserName)} />
              <CustomIconButton iconType="close" size={18} color={color.negative} onPress={() => { setEditingUser(null); setNewUserName(''); }} />
            </>
          ) : (
            <>
              <CustomIconButton iconType="view" size={18} color={color.accent} onPress={() => loadUserList(userKey)} />
              <CustomIconButton iconType="edit" size={18} color={color.warning} onPress={() => { setEditingUser(userKey); setNewUserName(user.name); }} />
              <CustomIconButton iconType="delete" size={18} color={color.negative} onPress={() => handleDeleteUser(userKey)} />
            </>
          )}
        </View>
      </View>
    );
  };

  const renderInventoryRow = ({ item }) => (
    <View style={styles.invRow}>
      <Text style={styles.invCode}>{item.code}</Text>
      <Text style={styles.invName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.invType}>{item.type}</Text>
    </View>
  );

  const userKeys = Object.keys(users);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="User Management"
        onBack={() => navigation.goBack()}
        right={<CustomIconButton iconType="add" onPress={() => setShowAddUser(true)} color={color.onChrome} />}
      />

      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ padding: space.md }}>
          {showAddUser && (
            <View style={styles.panel}>
              <Text style={styles.sectionLabel}>Add New User</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                style={styles.field}
                placeholder="Username"
                placeholderTextColor={color.textMuted}
                onSubmitEditing={handleAddUser}
              />
              <View style={styles.formActions}>
                <TouchableOpacity style={styles.btnGhost} onPress={() => { setShowAddUser(false); setUsername(''); }} activeOpacity={0.8}>
                  <Text style={styles.btnGhostText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnPrimary} onPress={handleAddUser} activeOpacity={0.8}>
                  <Text style={styles.btnPrimaryText}>Add User</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Text style={styles.heading}>All Users · {userKeys.length}</Text>
          {userKeys.length === 0 ? (
            <View style={styles.emptyPanel}>
              <Text style={styles.emptyText}>No users yet</Text>
              <Text style={styles.emptySubtext}>Add your first user to get started.</Text>
            </View>
          ) : (
            <View style={styles.table}>
              <FlatList
                data={userKeys}
                renderItem={renderUserRow}
                keyExtractor={(item) => item}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            </View>
          )}

          {selectedUser && (
            <View style={{ marginTop: space.xl }}>
              <Text style={styles.heading}>{users[selectedUser]?.name}'s Checklist</Text>

              <View style={styles.searchContainer}>
                <SearchIcon size={16} color={color.textMuted} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={styles.searchInput}
                  placeholder="Search items…"
                  placeholderTextColor={color.textMuted}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <CloseIcon size={16} color={color.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {!searchQuery ? (
                <View style={styles.emptyPanel}>
                  <Text style={styles.emptyText}>Search for items to manage user lists</Text>
                </View>
              ) : filteredInventory.length === 0 ? (
                <View style={styles.emptyPanel}>
                  <Text style={styles.emptyText}>No items found</Text>
                </View>
              ) : (
                <View style={styles.table}>
                  <FlatList
                    data={filteredInventory}
                    renderItem={renderInventoryRow}
                    keyExtractor={(item) => item.code}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                  />
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Delete confirmation */}
      <Portal>
        <Modal visible={deleteConfirmVisible} onDismiss={cancelDeleteUser} contentContainerStyle={styles.dialog} dismissable>
          <Text style={styles.dialogTitle}>Delete User</Text>
          <Text style={styles.dialogBody}>
            Delete "{userToDelete}" and all their data? <Text style={styles.dialogDanger}>This cannot be undone.</Text>
          </Text>
          <View style={styles.dialogActions}>
            <TouchableOpacity style={styles.btnGhost} onPress={cancelDeleteUser} activeOpacity={0.8}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnDanger} onPress={confirmDeleteUser} activeOpacity={0.8}>
              <Text style={styles.btnPrimaryText}>Delete User</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </Portal>

      {/* Rename confirmation */}
      <Portal>
        <Modal visible={editConfirmVisible} onDismiss={cancelRenameUser} contentContainerStyle={styles.dialog} dismissable>
          <Text style={styles.dialogTitle}>Confirm Rename</Text>
          <Text style={styles.dialogBody}>
            Rename "{userToEdit.oldName}" to "{userToEdit.newName}"? This updates the name everywhere.
          </Text>
          <View style={styles.dialogActions}>
            <TouchableOpacity style={styles.btnGhost} onPress={cancelRenameUser} activeOpacity={0.8}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnWarning} onPress={confirmRenameUser} activeOpacity={0.8}>
              <Text style={styles.btnPrimaryText}>Rename User</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.appBg },
  content: { flex: 1 },

  panel: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    padding: space.md,
    marginBottom: space.lg,
  },
  sectionLabel: { ...font.label, marginBottom: space.sm },
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
  formActions: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.md,
  },
  heading: {
    ...font.label,
    fontSize: 12,
    marginBottom: space.sm,
  },
  table: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
    overflow: 'hidden',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.sm,
    paddingLeft: space.md,
    paddingRight: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  userRowSelected: {
    backgroundColor: color.accentBg,
    borderLeftWidth: 3,
    borderLeftColor: color.accent,
  },
  userName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: color.text,
  },
  inlineInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: color.borderFocus,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    fontSize: 14,
    color: color.text,
    marginRight: space.sm,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
    gap: space.sm,
  },
  invCode: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '700',
    color: color.accent,
    width: 72,
  },
  invName: {
    flex: 1,
    fontSize: 14,
    color: color.text,
  },
  invType: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: color.textSecondary,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.xs,
    paddingVertical: 1,
    backgroundColor: color.surfaceAlt,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    marginBottom: space.md,
  },
  searchInput: {
    flex: 1,
    height: 42,
    fontSize: 14,
    color: color.text,
  },
  emptyPanel: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    padding: space.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: color.textSecondary,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: color.textMuted,
    textAlign: 'center',
    marginTop: space.xs,
  },

  // Buttons
  btnGhost: {
    flex: 1,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  btnGhostText: { fontSize: 14, fontWeight: '700', color: color.textSecondary },
  btnPrimary: {
    flex: 1,
    backgroundColor: color.accent,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: color.textInverse },
  btnDanger: {
    flex: 1,
    backgroundColor: color.negative,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  btnWarning: {
    flex: 1,
    backgroundColor: color.warning,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    alignItems: 'center',
  },

  // Dialog
  dialog: {
    backgroundColor: color.surface,
    marginHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    padding: space.xl,
    maxWidth: 420,
    width: '88%',
    alignSelf: 'center',
  },
  dialogTitle: { ...font.title, fontSize: 16, marginBottom: space.sm },
  dialogBody: { fontSize: 14, color: color.textSecondary, lineHeight: 21 },
  dialogDanger: { color: color.negative, fontWeight: '700' },
  dialogActions: { flexDirection: 'row', gap: space.sm, marginTop: space.xl },
});
