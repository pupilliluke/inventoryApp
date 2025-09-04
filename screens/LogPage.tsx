import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Appbar, Chip, ActivityIndicator, Title } from 'react-native-paper';
import { getDatabase, ref, query, orderByChild, limitToLast, onValue } from 'firebase/database';
import { LogEntry } from '../types/session';
import { useNavigation } from '@react-navigation/native';
import CustomIconButton from '../components/CustomIconButton';

export default function LogPage() {
  const navigation = useNavigation();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const db = getDatabase();
    const logsRef = ref(db, 'log');

    const unsubscribe = onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      
      if (data) {
        const logsList: LogEntry[] = Object.entries(data)
          .filter(([logId, logData]: [string, any]) => typeof logData === 'object' && logData.message)
          .map(([logId, logData]: [string, any]) => ({
            logId,
            message: logData.message || 'No message',
            userId: logData.userId || 'unknown',
            userName: logData.userName || 'Unknown User',
            ts: logData.ts || Date.now(),
          }));
        
        // Sort newest first (reverse order since we got them oldest first)
        logsList.sort((a, b) => b.ts - a.ts);
        setLogs(logsList);
      } else {
        setLogs([]);
      }
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error('Failed to load logs:', error);
      setLoading(false);
      setRefreshing(false);
    });

    return unsubscribe;
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    // The real-time listener will automatically refresh the data
  };


  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getActionColor = (message: string | undefined): string => {
    if (!message) return '#666666';
    if (message.includes('created')) return '#4CAF50';
    if (message.includes('deleted')) return '#F44336';
    if (message.includes('updated') || message.includes('moved')) return '#FF9800';
    if (message.includes('renamed')) return '#2196F3';
    return '#666666';
  };

  const getActionIcon = (message: string | undefined): string => {
    if (!message) return '•';
    if (message.includes('created')) return '✓';
    if (message.includes('deleted')) return '✗';
    if (message.includes('updated') || message.includes('moved')) return '↻';
    if (message.includes('renamed')) return '✎';
    return '•';
  };

  const renderLogItem = ({ item }: { item: LogEntry }) => (
    <Card style={styles.logCard}>
      <Card.Content>
        <View style={styles.logHeader}>
          <View style={styles.logUser}>
            <Text style={[styles.actionIcon, { color: getActionColor(item.message) }]}>
              {getActionIcon(item.message)}
            </Text>
            <Chip
              style={[styles.userChip, { borderColor: getActionColor(item.message) }]}
              textStyle={[styles.userChipText, { color: getActionColor(item.message) }]}
              compact
            >
              {item.userName || 'Unknown User'}
            </Chip>
          </View>
          <Text style={styles.timestamp}>
            {item.ts ? formatTimestamp(item.ts) : 'Unknown time'}
          </Text>
        </View>
        <Text style={styles.logMessage}>{item.message || 'Unknown action'}</Text>
      </Card.Content>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📊</Text>
      <Title style={styles.emptyTitle}>No Activity Yet</Title>
      <Text style={styles.emptySubtitle}>
        Inventory changes and user actions will appear here in real-time
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.header}>
        <CustomIconButton
          iconType="back"
          onPress={() => navigation.goBack()}
        />
        <Appbar.Content
          title="Activity Log"
          titleStyle={styles.headerTitle}
        />
        <Appbar.Action
          icon="refresh"
          iconColor="#666666"
          size={28}
          onPress={handleRefresh}
          disabled={refreshing}
          style={{ 
            marginHorizontal: 2,
            minWidth: 48,
            minHeight: 48,
          }}
        />
      </Appbar.Header>

      <View style={styles.content}>
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {logs.length} recent {logs.length === 1 ? 'activity' : 'activities'}
          </Text>
          {refreshing && (
            <ActivityIndicator size="small" style={styles.refreshIndicator} />
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" animating={true} />
            <Text style={styles.loadingText}>Loading activity log...</Text>
          </View>
        ) : (
          <FlatList
            data={logs}
            renderItem={renderLogItem}
            keyExtractor={(item) => item.logId || `${item.userId}-${item.ts}`}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={logs.length === 0 ? styles.emptyListContainer : undefined}
          />
        )}
      </View>
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
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  statsText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  refreshIndicator: {
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  logCard: {
    marginBottom: 12,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
    width: 20,
    textAlign: 'center',
  },
  userChip: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    height: 28,
  },
  userChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '500',
  },
  logMessage: {
    fontSize: 15,
    color: '#333333',
    lineHeight: 20,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
});