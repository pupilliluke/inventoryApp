import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { getDatabase, ref, onValue, orderByChild, query } from 'firebase/database';
import { useSession } from '../context/SessionContext';
import { User } from '../types/session';
import { useNavigation } from '@react-navigation/native';
import { SuccessIcon } from '../components/CustomIcons';
import { color, space, radius, font } from '../theme/tokens';

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

  const handleUserSelect = (userId: string) => setSelectedUserId(userId);

  const handleConfirmSelection = async () => {
    if (!selectedUserId) return;
    const selectedUser = users.find(user => user.id === selectedUserId);
    if (!selectedUser) return;

    setConfirming(true);
    try {
      setActiveUser({ id: selectedUser.id, name: selectedUser.name });
      navigation.navigate('Inventory' as never);
    } catch (error) {
      console.error('Failed to set active user:', error);
    } finally {
      setConfirming(false);
    }
  };

  // Enter key confirms selection (web).
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && selectedUserId && !confirming) {
        event.preventDefault();
        event.stopPropagation();
        handleConfirmSelection();
      }
    };
    window.addEventListener('keydown', handleKeyPress, true);
    return () => window.removeEventListener('keydown', handleKeyPress, true);
  }, [selectedUserId, confirming]);

  if (loading) {
    return (
      <SafeAreaView style={styles.background}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={color.onChrome} animating />
          <Text style={styles.loadingText}>Loading users…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedName = users.find(u => u.id === selectedUserId)?.name;

  return (
    <View style={styles.background}>
      <SafeAreaView style={styles.container}>
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.eyebrow}>Phantom Warehouse</Text>
            <Text style={styles.title}>Select Operator</Text>
          </View>

          <View style={styles.panelBody}>
            {users.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No users found</Text>
                <Text style={styles.emptySubtext}>Add users through the User Management page first.</Text>
              </View>
            ) : (
              <ScrollView style={styles.list} contentContainerStyle={{ paddingVertical: space.xs }}>
                {users.map((user, idx) => {
                  const selected = selectedUserId === user.id;
                  return (
                    <TouchableOpacity
                      key={user.id}
                      onPress={() => handleUserSelect(user.id)}
                      style={[
                        styles.userRow,
                        idx === users.length - 1 && styles.userRowLast,
                        selected && styles.userRowSelected,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.userName, selected && styles.userNameSelected]}>{user.name}</Text>
                      {selected && <SuccessIcon size={20} color={color.positive} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <TouchableOpacity
            onPress={handleConfirmSelection}
            disabled={!selectedUserId || confirming}
            style={[styles.confirmButton, (!selectedUserId || confirming) && styles.confirmButtonDisabled]}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmButtonText}>
              {confirming ? 'Setting up…' : selectedName ? `Continue as ${selectedName}` : 'Select a user'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: color.chromeAlt,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  panel: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    overflow: 'hidden',
  },
  panelHeader: {
    backgroundColor: color.chrome,
    paddingVertical: space.lg,
    paddingHorizontal: space.lg,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: color.onChromeMuted,
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: color.onChrome,
    letterSpacing: 0.3,
  },
  panelBody: {
    maxHeight: 360,
  },
  list: {
    flexGrow: 0,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  userRowLast: {
    borderBottomWidth: 0,
  },
  userRowSelected: {
    backgroundColor: color.accentBg,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: color.text,
  },
  userNameSelected: {
    color: color.accent,
  },
  confirmButton: {
    backgroundColor: color.accent,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: color.borderStrong,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: color.textInverse,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: space.lg,
    fontSize: 14,
    color: color.onChromeMuted,
    fontWeight: '500',
  },
  emptyState: {
    padding: space.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: color.textSecondary,
    marginBottom: space.sm,
  },
  emptySubtext: {
    fontSize: 13,
    color: color.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
});
