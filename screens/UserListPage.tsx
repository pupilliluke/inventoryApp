import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, TextInput, Button, Appbar, Checkbox, List, IconButton } from 'react-native-paper';
import { ref, onValue, set, remove } from 'firebase/database';
import { db } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';

export default function UserListPage() {
    const navigation = useNavigation();
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
    console.log(`Deleting user: ${userKey}`);
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
      <Appbar.Header style={{
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
      }}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="User Firework Lists" titleStyle={{
          fontSize: 18,
          fontWeight: '600',
          color: '#333333'
        }} />
      </Appbar.Header>

      <View style={styles.content}>
        <TextInput
          label="New Username"
          value={username}
          onChangeText={setUsername}
          style={styles.input}
        />
        <Button 
          mode="contained" 
          onPress={handleAddUser} 
          style={{ 
            marginBottom: 16,
            backgroundColor: '#F5F5F5',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#E5E5E5',
          }}
          contentStyle={{
            paddingVertical: 8,
          }}
          labelStyle={{
            fontSize: 14,
            fontWeight: '500',
            color: '#666666',
          }}
        >
          Add User
        </Button>
    
        <Text variant="titleMedium" style={{ 
          marginBottom: 16, 
          fontSize: 18,
          fontWeight: '700',
          color: '#2C3E50',
          textAlign: 'center'
        }}>All Users</Text>
        {Object.keys(users).map(user => (
          <View key={user} style={{
            backgroundColor: '#FFFFFF',
            marginVertical: 4,
            borderRadius: 12,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 3,
          }}>
            <List.Item
              titleStyle={{ 
                color: '#2C3E50', 
                fontSize: 16,
                fontWeight: '600'
              }}
              descriptionStyle={{
                color: '#6C757D',
                fontSize: 14,
                fontWeight: '500'
              }}
              title={user}
              description={`Items: ${Object.keys(users[user]?.list || {}).length}`}
              right={() => ( 
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <IconButton 
                    icon="eye" 
                    iconColor="#666666"
                    onPress={() => loadUserList(user)} 
                  />
                  <IconButton 
                    icon="pencil" 
                    iconColor="#666666"
                    onPress={() => setEditingName(user)} 
                  />
                  <IconButton 
                    icon="delete" 
                    iconColor="#999999"
                    onPress={() => handleDeleteUser(user)} 
                  />
                </View>
              )}
            />
          </View>
        ))}

        {editingName !== '' && (
          <View style={{ 
            marginVertical: 20,
            backgroundColor: '#FFFFFF',
            padding: 16,
            borderRadius: 12,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}>
            <TextInput
              label={`Rename "${editingName}" to:`}
              value={editingName}
              onChangeText={setEditingName}
              style={styles.input}
              mode="outlined"
            />
            <Button 
              onPress={() => handleRenameUser(editingName)} 
              mode="contained"
              style={{
                borderRadius: 8,
                marginTop: 8,
              }}
              contentStyle={{
                paddingVertical: 6,
              }}
            >
              Save Name
            </Button>
          </View>
        )}

        {username && Object.keys(userItems).length > 0 && (
          <>
            <Text variant="titleMedium" style={{ 
              marginTop: 24,
              marginBottom: 16,
              fontSize: 18,
              fontWeight: '700',
              color: '#2C3E50',
              textAlign: 'center'
            }}>
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
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 20,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
});
