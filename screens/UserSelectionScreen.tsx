import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ImageBackground } from 'react-native';
import { Text, Card, Title, Button, ActivityIndicator, List, TouchableRipple } from 'react-native-paper';
import { getDatabase, ref, onValue, orderByChild, query } from 'firebase/database';
import { useSession } from '../context/SessionContext';
import { User } from '../types/session';
import { useNavigation } from '@react-navigation/native';

export default function UserSelectionScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const { setActiveUser } = useSession();
  const navigation = useNavigation();

  useEffect(() => {
    const db = getDatabase();
    const usersRef = query(ref(db, 'users'), orderByChild('name'));
    
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const usersList: User[] = Object.entries(data).map(([id, userData]: [string, any]) => ({
          id,
          name: userData.name,
          ...userData
        }));
        setUsers(usersList);
      } else {
        setUsers([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Failed to load users:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
  };

  const handleConfirmSelection = async () => {
    if (!selectedUserId) return;
    
    const selectedUser = users.find(user => user.id === selectedUserId);
    if (!selectedUser) return;

    setConfirming(true);
    
    try {
      setActiveUser({
        id: selectedUser.id,
        name: selectedUser.name
      });
      
      // Navigate to main inventory screen
      navigation.navigate('Inventory' as never);
    } catch (error) {
      console.error('Failed to set active user:', error);
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" animating={true} />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ImageBackground
      source={require('../assets/bg.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.title}>Select User</Title>
              <Text style={styles.subtitle}>
                Choose your user account to track your inventory changes
              </Text>
              
              {users.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No users found</Text>
                  <Text style={styles.emptySubtext}>
                    Please add users through the User Management page first
                  </Text>
                </View>
              ) : (
                <View style={styles.usersList}>
                  {users.map((user) => (
                    <TouchableRipple
                      key={user.id}
                      onPress={() => handleUserSelect(user.id)}
                      style={[
                        styles.userItem,
                        selectedUserId === user.id && styles.selectedUserItem
                      ]}
                    >
                      <View style={styles.userItemContent}>
                        <Text style={[
                          styles.userName,
                          selectedUserId === user.id && styles.selectedUserName
                        ]}>
                          {user.name}
                        </Text>
                        {selectedUserId === user.id && (
                          <Text style={styles.selectedIcon}>✓</Text>
                        )}
                      </View>
                    </TouchableRipple>
                  ))}
                </View>
              )}

              {selectedUserId && (
                <Button
                  mode="contained"
                  onPress={handleConfirmSelection}
                  loading={confirming}
                  disabled={confirming}
                  style={styles.confirmButton}
                  contentStyle={styles.confirmButtonContent}
                >
                  {confirming ? 'Setting up...' : 'Continue as ' + users.find(u => u.id === selectedUserId)?.name}
                </Button>
              )}
            </Card.Content>
          </Card>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  usersList: {
    marginBottom: 24,
  },
  userItem: {
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#F8F9FA',
  },
  selectedUserItem: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  userItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    position: 'relative',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    flex: 1,
  },
  selectedUserName: {
    color: '#2E7D32',
  },
  selectedIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    position: 'absolute',
    right: 16,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
  },
  confirmButtonContent: {
    paddingVertical: 8,
  },
});