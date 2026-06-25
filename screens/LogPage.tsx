import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { getDatabase, ref, onValue } from 'firebase/database';
import { LogEntry } from '../types/session';
import { useNavigation } from '@react-navigation/native';
import CustomIconButton from '../components/CustomIconButton';
import ScreenHeader from '../components/ScreenHeader';
import { ChartIcon } from '../components/CustomIcons';
import { color, space, radius, font, mono } from '../theme/tokens';

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

  const handleRefresh = () => setRefreshing(true);

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getActionColor = (message: string | undefined): string => {
    if (!message) return color.neutral;
    if (message.includes('created')) return color.positive;
    if (message.includes('deleted')) return color.negative;
    if (message.includes('updated') || message.includes('moved')) return color.warning;
    if (message.includes('renamed')) return color.accent;
    return color.neutral;
  };

  const renderLogItem = ({ item }: { item: LogEntry }) => {
    const accent = getActionColor(item.message);
    return (
      <View style={styles.logRow}>
        <View style={[styles.rail, { backgroundColor: accent }]} />
        <View style={styles.logContent}>
          <View style={styles.logHeader}>
            <Text style={[styles.userName, { color: accent }]} numberOfLines={1}>
              {item.userName || 'Unknown User'}
            </Text>
            <Text style={styles.timestamp}>{item.ts ? formatTimestamp(item.ts) : '—'}</Text>
          </View>
          <Text style={styles.logMessage}>{item.message || 'Unknown action'}</Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <ChartIcon size={40} color={color.textMuted} />
      <Text style={styles.emptyTitle}>No Activity Yet</Text>
      <Text style={styles.emptySubtitle}>Inventory changes and user actions appear here in real time.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Activity Log"
        onBack={() => navigation.goBack()}
        right={<CustomIconButton iconType="refresh" onPress={handleRefresh} disabled={refreshing} color={color.onChrome} />}
      />

      <View style={styles.content}>
        <View style={styles.statsBar}>
          <Text style={styles.statsText}>
            {logs.length} recent {logs.length === 1 ? 'entry' : 'entries'}
          </Text>
          {refreshing && <ActivityIndicator size="small" color={color.accent} />}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" animating color={color.accent} />
            <Text style={styles.loadingText}>Loading activity log…</Text>
          </View>
        ) : (
          <FlatList
            data={logs}
            renderItem={renderLogItem}
            keyExtractor={(item) => item.logId || `${item.userId}-${item.ts}`}
            ListEmptyComponent={renderEmptyState}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={color.accent} />}
            showsVerticalScrollIndicator={false}
            style={styles.list}
            contentContainerStyle={logs.length === 0 ? styles.emptyListContainer : styles.listContent}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.appBg },
  content: { flex: 1, padding: space.md },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
    paddingHorizontal: space.xs,
  },
  statsText: { ...font.label },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: space.md, fontSize: 14, color: color.textMuted },
  list: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
  },
  listContent: {},
  separator: { height: 1, backgroundColor: color.border },
  logRow: {
    flexDirection: 'row',
    backgroundColor: color.surface,
  },
  rail: { width: 3 },
  logContent: { flex: 1, paddingVertical: space.sm, paddingHorizontal: space.md },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  userName: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2, flex: 1, marginRight: space.sm },
  timestamp: { fontFamily: mono, fontSize: 11, color: color.textMuted },
  logMessage: { fontSize: 14, color: color.text, lineHeight: 19 },
  emptyListContainer: { flexGrow: 1, justifyContent: 'center' },
  emptyContainer: { alignItems: 'center', paddingHorizontal: space.xl, paddingVertical: space.xxl },
  emptyTitle: { ...font.title, marginTop: space.md, marginBottom: space.xs },
  emptySubtitle: { fontSize: 13, color: color.textMuted, textAlign: 'center', lineHeight: 19 },
});
