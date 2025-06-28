import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, TextInput, Button, Appbar, Checkbox, List, IconButton } from 'react-native-paper';
import { ref, onValue, set, remove } from 'firebase/database';
import { db } from '../firebaseConfig';

export default function UserListPage({ navigation }) {
  const [username, setUsername] = useState('');
  const [userItems, setUserItems] = useState({});
  const [inventory, setInventory] = useState([]);
  const [users, setUsers] = useState({});
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    const invRef = ref(db, 'inventory');
    onValue(invRef, snapshot => {
      const data = snapshot.val() || {};
      setInventory(Object.values(data));
    });

    const usersRef = ref(db, 'users');
    onValue(usersRef, snapshot => {
      setUsers(snapshot.val() || {});
    });
  }, []);

  const handleAddUser = () => {
    if (!username) return;
    set(ref(db, `users/${username}`), { name: username, list: {} });
    setUsername('');
  };

  const handleDeleteUser = (userKey) => {
    Alert.alert('Confirm', `Delete user "${userKey}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => remove(ref(db, `users/${userKey}`)),
      },
    ]);
  };

  const handleRenameUser = (oldName) => {
    if (!editingName || editingName === oldName) return;
    const oldRef = ref(db, `users/${oldName}`);
    const newRef = ref(db, `users/${editingName}`);

    onValue(oldRef, snapshot => {
      const userData = snapshot.val();
      if (userData) {
        set(newRef, { ...userData, name: editingName });
        remove(oldRef);
      }
    }, { onlyOnce: true });

    setEditingName('');
  };

  const loadUserList = (name) => {
    setUsername(name);
    const userRef = ref(db, `users/${name}/list`);
    onValue(userRef, snapshot => {
      const data = snapshot.val() || {};
      setUserItems(data);
    });
  };

  const toggleItem = (code) => {
    const updated = !userItems[code];
    set(ref(db, `users/${username}/list/${code}`), updated ? true : null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="User Firework Lists" />
      </Appbar.Header>

      <View style={styles.content}>
        <TextInput
          label="New Username"
          value={username}
          onChangeText={setUsername}
          style={styles.input}
        />
        <Button mode="contained" onPress={handleAddUser} style={{ marginBottom: 12 }}>
          Add User
        </Button>

        <Text variant="titleMedium" style={{ marginBottom: 10 }}>All Users</Text>
        {Object.keys(users).map(user => (
          <List.Item
            key={user}
            title={user}
            description={`Items: ${Object.keys(users[user]?.list || {}).length}`}
            right={() => (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <IconButton icon="eye" onPress={() => loadUserList(user)} />
                <IconButton icon="pencil" onPress={() => setEditingName(user)} />
                <IconButton icon="delete" onPress={() => handleDeleteUser(user)} />
              </View>
            )}
          />
        ))}

        {editingName !== '' && (
          <View style={{ marginVertical: 16 }}>
            <TextInput
              label={`Rename "${editingName}" to:`}
              value={editingName}
              onChangeText={setEditingName}
              style={styles.input}
            />
            <Button onPress={() => handleRenameUser(editingName)} mode="contained">
              Save Name
            </Button>
          </View>
        )}

        {username && Object.keys(userItems).length > 0 && (
          <>
            <Text variant="titleMedium" style={{ marginTop: 20 }}>
              {username}'s Firework List
            </Text>
            <FlatList
              data={inventory}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Checkbox
                    status={userItems[item.code] ? 'checked' : 'unchecked'}
                    onPress={() => toggleItem(item.code)}
                  />
                  <Text>{item.code} - {item.name}</Text>
                </View>
              )}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    padding: 16,
  },
  input: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
});
