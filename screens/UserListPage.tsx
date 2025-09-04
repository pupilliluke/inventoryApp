import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, StyleSheet, FlatList, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Appbar, Checkbox, List, IconButton, Card, Title, Paragraph, Chip, Divider, FAB, Portal, Modal, Dialog } from 'react-native-paper';
import { ref, onValue, set, remove } from 'firebase/database';
import { db } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { useSession } from '../context/SessionContext';
import { UserMutations, UserNotAuthenticatedError } from '../utils/inventoryMutations';
import { AddIcon, DeleteIcon, UsersIcon, EditIcon, ViewIcon, CheckIcon, CloseIcon, SearchIcon } from '../components/CustomIcons';
import CustomIconButton from '../components/CustomIconButton';

export default function UserListPage() {
  const navigation = useNavigation();
  const { activeUser } = useSession();
  const [username, setUsername] = useState('');
  const [userItems, setUserItems] = useState({});
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
    // Load inventory data
    const invRef = ref(db, 'inventory');
    const inventoryUnsubscribe = onValue(invRef, snapshot => {
      const data = snapshot.val() || {};
      setInventory(Object.values(data));
    });

    // Load users data
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
      if (selectedUser === userToDelete) {
        setSelectedUser(null);
        setUserItems({});
      }
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
      
      if (selectedUser === oldName) {
        setSelectedUser(newName);
      }
      
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

  const loadUserList = (userKey) => {
    setSelectedUser(userKey);
    const userRef = ref(db, `users/${userKey}/list`);
    onValue(userRef, snapshot => {
      const data = snapshot.val() || {};
      setUserItems(data);
    });
  };

  const toggleItem = async (code) => {
    if (!selectedUser) return;
    
    try {
      const newValue = !userItems[code];
      const itemRef = ref(db, `users/${selectedUser}/list/${code}`);
      
      if (newValue) {
        await set(itemRef, true);
      } else {
        await remove(itemRef);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update item');
      console.error(error);
    }
  };

  const filteredInventory = inventory.filter(item => 
    searchQuery && (
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const getUserStats = (userKey) => {
    const userList = users[userKey]?.list || {};
    const totalItems = Object.keys(userList).length;
    const checkedItems = Object.values(userList).filter(Boolean).length;
    return { totalItems, checkedItems };
  };

  const renderUserCard = ({ item: userKey }) => {
    const user = users[userKey];
    const stats = getUserStats(userKey);
    const isSelected = selectedUser === userKey;
    const isEditing = editingUser === userKey;

    return (
      <Card style={[styles.userCard, isSelected && styles.selectedUserCard]}>
        <Card.Content>
          <View style={styles.userHeader}>
            {isEditing ? (
              <TextInput
                value={newUserName}
                onChangeText={setNewUserName}
                style={styles.editInput}
                mode="outlined"
                dense
                placeholder="Enter new name"
                onSubmitEditing={() => handleRenameUser(userKey, newUserName)}
                autoFocus
              />
            ) : (
              <View style={{ flex: 1 }}>
                <Title style={styles.userName}>{user.name}</Title>
                <Paragraph style={styles.userStats}>
                  {stats.totalItems} items • {stats.checkedItems} completed
                </Paragraph>
              </View>
            )}
            
            <View style={styles.userActions}>
              {isEditing ? (
                <>
                  <IconButton
                    icon={() => <CheckIcon size={18} color="#4CAF50" />}
                    size={20}
                    onPress={() => handleRenameUser(userKey, newUserName)}
                  />
                  <IconButton
                    icon={() => <CloseIcon size={18} color="#FF5722" />}
                    size={20}
                    onPress={() => {
                      setEditingUser(null);
                      setNewUserName('');
                    }}
                  />
                </>
              ) : (
                <>
                  <IconButton
                    icon={() => <ViewIcon size={18} color="#2196F3" />}
                    size={20}
                    onPress={() => loadUserList(userKey)}
                  />
                  <IconButton
                    icon={() => <EditIcon size={18} color="#FF9800" />}
                    size={20}
                    onPress={() => {
                      setEditingUser(userKey);
                      setNewUserName(user.name);
                    }}
                  />
                  <IconButton
                    icon={() => <DeleteIcon size={18} color="#F44336" />}
                    size={20}
                    onPress={() => handleDeleteUser(userKey)}
                  />
                </>
              )}
            </View>
          </View>
          
          {stats.totalItems > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${(stats.checkedItems / stats.totalItems) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round((stats.checkedItems / stats.totalItems) * 100)}%
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderInventoryItem = ({ item }) => (
    <Card style={styles.inventoryItemCard}>
      <Card.Content>
        <View style={styles.inventoryItemRow}>
          <Checkbox
            status={userItems[item.code] ? 'checked' : 'unchecked'}
            onPress={() => toggleItem(item.code)}
          />
          <View style={styles.itemInfo}>
            <Text style={styles.itemCode}>{item.code}</Text>
            <Text style={styles.itemName}>{item.name}</Text>
            <Chip mode="outlined" compact style={styles.typeChip}>
              {item.type}
            </Chip>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.header}>
        <CustomIconButton
          iconType="back"
          onPress={() => navigation.goBack()}
        />
        <Appbar.Content 
          title="User Management" 
          titleStyle={styles.headerTitle}
        />
        <CustomIconButton
          iconType="add"
          onPress={() => setShowAddUser(true)}
        />
      </Appbar.Header>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView}>
          {/* Add User Section */}
          {showAddUser && (
            <Card style={styles.addUserCard}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Add New User</Title>
                <TextInput
                  label="Username"
                  value={username}
                  onChangeText={setUsername}
                  style={styles.addUserInput}
                  mode="outlined"
                  onSubmitEditing={handleAddUser}
                  right={
                    <TextInput.Icon 
                      icon={() => <AddIcon size={18} color="#666666" />} 
                      onPress={handleAddUser}
                    />
                  }
                />
                <View style={styles.addUserActions}>
                  <Button 
                    mode="contained" 
                    onPress={handleAddUser}
                    style={styles.addButton}
                  >
                    Add User
                  </Button>
                  <Button 
                    mode="text" 
                    onPress={() => {
                      setShowAddUser(false);
                      setUsername('');
                    }}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </Button>
                </View>
              </Card.Content>
            </Card>
          )}

          {/* Users List */}
          <View style={styles.section}>
            <Title style={styles.sectionTitle}>
              All Users ({Object.keys(users).length})
            </Title>
            {Object.keys(users).length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <Text style={styles.emptyText}>No users yet</Text>
                  <Text style={styles.emptySubtext}>
                    Add your first user to get started
                  </Text>
                </Card.Content>
              </Card>
            ) : (
              <FlatList
                data={Object.keys(users)}
                renderItem={renderUserCard}
                keyExtractor={(item) => item}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
              />
            )}
          </View>

          {/* Selected User's Items */}
          {selectedUser && (
            <View style={styles.section}>
              <Title style={styles.sectionTitle}>
                {users[selectedUser]?.name}'s Checklist
              </Title>
              
              <TextInput
                label="Search items..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
                mode="outlined"
                left={<TextInput.Icon icon={() => <SearchIcon size={18} color="#666666" />} />}
                right={
                  searchQuery ? (
                    <TextInput.Icon 
                      icon={() => <CloseIcon size={18} color="#666666" />}
                      onPress={() => setSearchQuery('')}
                    />
                  ) : null
                }
              />

              {!searchQuery ? (
                <Card style={styles.emptyCard}>
                  <Card.Content>
                    <Text style={styles.emptyText}>Search for items to manage user lists</Text>
                  </Card.Content>
                </Card>
              ) : filteredInventory.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Card.Content>
                    <Text style={styles.emptyText}>No items found matching your search</Text>
                  </Card.Content>
                </Card>
              ) : (
                <FlatList
                  data={filteredInventory}
                  renderItem={renderInventoryItem}
                  keyExtractor={(item) => item.code}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false}
                />
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {!showAddUser && (
        <FAB
          icon={() => <AddIcon size={20} color="#FFFFFF" />}
          style={styles.fab}
          onPress={() => setShowAddUser(true)}
          label="Add User"
        />
      )}

      {/* Delete Confirmation Modal */}
      <Portal>
        <Dialog 
          visible={deleteConfirmVisible} 
          onDismiss={cancelDeleteUser}
          style={styles.confirmModal}
          theme={{
            colors: { backdrop: 'rgba(0, 0, 0, 0.5)' }
          }}
        >
          <Dialog.Icon icon={() => <DeleteIcon size={48} color="#F44336" />} />
          <Dialog.Title style={styles.modalTitle}>Delete User</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.modalText}>
              Are you sure you want to delete "{userToDelete}" and all their checklist data?
            </Paragraph>
            <Paragraph style={styles.modalWarning}>
              This action cannot be undone.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions style={styles.modalActions}>
            <Button 
              mode="text" 
              onPress={cancelDeleteUser}
              textColor="#666666"
            >
              Cancel
            </Button>
            <Button 
              mode="contained" 
              onPress={confirmDeleteUser}
              buttonColor="#F44336"
              style={styles.deleteButton}
            >
              Delete User
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Edit Confirmation Modal */}
      <Portal>
        <Dialog 
          visible={editConfirmVisible} 
          onDismiss={cancelRenameUser}
          style={styles.confirmModal}
          theme={{
            colors: { backdrop: 'rgba(0, 0, 0, 0.5)' }
          }}
        >
          <Dialog.Icon icon={() => <EditIcon size={48} color="#FF9800" />} />
          <Dialog.Title style={styles.modalTitle}>Confirm Rename</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.modalText}>
              Rename user from "{userToEdit.oldName}" to "{userToEdit.newName}"?
            </Paragraph>
            <Paragraph style={styles.modalSubtext}>
              This will update the user's name everywhere in the app.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions style={styles.modalActions}>
            <Button 
              mode="text" 
              onPress={cancelRenameUser}
              textColor="#666666"
            >
              Cancel
            </Button>
            <Button 
              mode="contained" 
              onPress={confirmRenameUser}
              buttonColor="#FF9800"
              style={styles.confirmButton}
            >
              Rename User
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    elevation: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  addUserCard: {
    marginBottom: 24,
    elevation: 2,
  },
  addUserInput: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  addUserActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  addButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    // Default styling
  },
  userCard: {
    marginBottom: 12,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  selectedUserCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  userStats: {
    fontSize: 14,
    color: '#666666',
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editInput: {
    flex: 1,
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    minWidth: 32,
  },
  searchInput: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  inventoryItemCard: {
    marginBottom: 8,
    elevation: 1,
    backgroundColor: '#FFFFFF',
  },
  inventoryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  itemName: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  typeChip: {
    alignSelf: 'flex-start',
  },
  emptyCard: {
    elevation: 1,
    backgroundColor: '#FFFFFF',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#4CAF50',
  },
  confirmModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    zIndex: 9999,
    margin: 16,
    maxWidth: '90%',
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  modalWarning: {
    fontSize: 14,
    color: '#F44336',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 8,
  },
  modalSubtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
  },
  modalActions: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  deleteButton: {
    minWidth: 120,
  },
  confirmButton: {
    minWidth: 120,
  },
});