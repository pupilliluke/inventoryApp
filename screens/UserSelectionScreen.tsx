import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { Text, Card, Title, Button, ActivityIndicator, List, TouchableRipple } from 'react-native-paper';
import { getDatabase, ref, onValue, orderByChild, query } from 'firebase/database';
import { useSession } from '../context/SessionContext';
import { User } from '../types/session';
import { useNavigation } from '@react-navigation/native';
import { SuccessIcon } from '../components/CustomIcons';

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

  // Add keyboard event listener for Enter key to trigger continue button
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && selectedUserId && !confirming) {
        event.preventDefault();
        event.stopPropagation();
        handleConfirmSelection();
      }
    };

    window.addEventListener('keydown', handleKeyPress, true); // Use capture phase
    return () => window.removeEventListener('keydown', handleKeyPress, true);
  }, [selectedUserId, confirming]);

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
    <View style={styles.background}>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Title style={styles.title}>Fireworks Inventory</Title>
            <Text style={styles.subtitle}>
              Select your account to access the inventory system
            </Text>
          </View>

          {/* Main Content Card */}
          <Card style={styles.mainCard}>
            <Card.Content style={styles.cardContent}>
              {users.length === 0 ? (
                <View style={styles.emptyStateCard}>
                  <Text style={styles.emptyText}>No users found</Text>
                  <Text style={styles.emptySubtext}>
                    Please add users through the User Management page first
                  </Text>
                </View>
              ) : (
                <View style={styles.usersSection}>
                  <View style={styles.usersList}>
                    {users.map((user) => (
                      <Card 
                        key={user.id} 
                        style={[
                          styles.userCard,
                          selectedUserId === user.id && styles.selectedUserCard
                        ]}
                      >
                        <TouchableRipple
                          onPress={() => handleUserSelect(user.id)}
                          style={styles.userTouchable}
                        >
                          <View style={styles.userItemContent}>
                            <View style={styles.userInfo}>
                              <Text style={[
                                styles.userName,
                                selectedUserId === user.id && styles.selectedUserName
                              ]}>
                                {user.name}
                              </Text>
                            </View>
                            {selectedUserId === user.id && (
                              <View style={styles.selectedIconContainer}>
                                <SuccessIcon size={24} color="#4CAF50" />
                              </View>
                            )}
                          </View>
                        </TouchableRipple>
                      </Card>
                    ))}
                  </View>
                </View>
              )}
            </Card.Content>
          </Card>

          {/* Continue Button Section */}
          {selectedUserId && (
            <View style={styles.actionContainer}>
              <Button
                mode="contained"
                onPress={handleConfirmSelection}
                loading={confirming}
                disabled={confirming}
                style={styles.confirmButton}
                contentStyle={styles.confirmButtonContent}
                labelStyle={styles.confirmButtonLabel}
              >
                {confirming ? 'Setting up...' : 'Continue as ' + users.find(u => u.id === selectedUserId)?.name}
              </Button>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#5B21B6', // Darker professional purple
    // You can also use a linear gradient here for more sophistication
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  headerSection: {
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    fontWeight: '500',
    opacity: 0.95,
  },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    marginBottom: 16,
  },
  cardContent: {
    padding: 32,
  },
  usersSection: {
    width: '100%',
  },
  usersList: {
    gap: 12,
  },
  userCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedUserCard: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8E9',
    elevation: 4,
  },
  userTouchable: {
    borderRadius: 16,
  },
  userItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  selectedUserName: {
    color: '#2E7D32',
  },
  selectedIconContainer: {
    marginLeft: 16,
    backgroundColor: '#E8F5E8',
    borderRadius: 20,
    padding: 8,
  },
  actionContainer: {
    paddingTop: 16,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    elevation: 4,
  },
  confirmButtonContent: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  confirmButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    margin: 40,
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  emptyStateCard: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6C757D',
    marginBottom: 12,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#ADB5BD',
    textAlign: 'center',
    lineHeight: 24,
  },
});