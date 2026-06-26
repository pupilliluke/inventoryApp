import React, { useState, useEffect, useMemo } from 'react';
import { SafeAreaView, View, StyleSheet, FlatList, Alert, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useInventory } from '../context/InventoryContext';
import { useSession } from '../context/SessionContext';
import CustomIconButton from '../components/CustomIconButton';
import ScreenHeader from '../components/ScreenHeader';
import { CountIcon, ChartIcon } from '../components/CustomIcons';
import { recountedData } from '../data/recountedData';
import { color, space, radius, font, mono } from '../theme/tokens';

interface RecountItem {
  code: string;
  name: string;
  count: number;
  previous: number;
}

export default function RecountPage() {
  const navigation = useNavigation();
  const { activeUser } = useSession();
  const { originalInventory } = useInventory();
  const [loading, setLoading] = useState(false);
  const [recountItems, setRecountItems] = useState<RecountItem[]>([]);

  const loadRecountData = async () => {
    setLoading(true);
    try {
      const lines = recountedData.trim().split('\n');
      const items: RecountItem[] = lines.map(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return null;
        const parts = trimmedLine.split('\t');
        const code = parts[0] || '';
        const name = parts[1] || '';
        const countStr = parts[2] || '';
        const count = countStr.trim() === '' ? -1 : parseInt(countStr) || -1;
        const inventoryItem = originalInventory.find(item => item.code === code);
        const previous = inventoryItem ? inventoryItem.showroom : 0;
        return { code, name, count, previous };
      }).filter(Boolean) as RecountItem[];
      setRecountItems(items);
    } catch (error) {
      console.error('Error loading recount data:', error);
      Alert.alert('Error', 'Failed to load recount data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRecountData(); }, [originalInventory]);

  const inventoryStats = useMemo(() => {
    const totalItems = recountItems.length;
    const itemsWithCount = recountItems.filter(item => item.count !== -1).length;
    const totalCount = recountItems.reduce((sum, item) => item.count !== -1 ? sum + item.count : sum, 0);
    const itemsWithoutCount = recountItems.filter(item => item.count === -1).length;
    return { totalItems, itemsWithCount, totalCount, itemsWithoutCount };
  }, [recountItems]);

  const handleRefreshRecount = () => loadRecountData();

  const renderRecountItem = ({ item }: { item: RecountItem }) => {
    const noCount = item.count === -1;
    return (
      <View style={styles.row}>
        <View style={styles.itemCell}>
          <Text style={styles.code}>{item.code}</Text>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        </View>
        <View style={styles.numCell}>
          <Text style={styles.numLabel}>Prev</Text>
          <Text style={styles.numValue}>{item.previous}</Text>
        </View>
        <View style={styles.numCell}>
          <Text style={styles.numLabel}>Count</Text>
          <Text style={[styles.numValue, { color: noCount ? color.warning : color.accent }]}>
            {noCount ? 'N/A' : item.count}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <CountIcon size={40} color={color.textMuted} />
      <Text style={styles.emptyTitle}>No Recount Data</Text>
      <Text style={styles.emptySubtitle}>Recount data will be loaded from the recount file.</Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={handleRefreshRecount} disabled={loading} activeOpacity={0.8}>
        <Text style={styles.primaryBtnText}>Reload Data</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Inventory Recount"
        onBack={() => navigation.goBack()}
        right={
          <>
            <CustomIconButton iconType="chart" onPress={() => navigation.navigate('ReportPage' as never)} color={color.onChrome} />
            <CustomIconButton iconType="refresh" onPress={handleRefreshRecount} color={color.onChrome} />
          </>
        }
      />

      <View style={styles.content}>
        <View style={styles.statsBar}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{inventoryStats.totalItems}</Text>
            <Text style={styles.statLabel}>Items</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{inventoryStats.totalCount}</Text>
            <Text style={styles.statLabel}>Total Count</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: color.warning }]}>{inventoryStats.itemsWithoutCount}</Text>
            <Text style={styles.statLabel}>No Count</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.primaryBtnFlex} onPress={() => navigation.navigate('ReportPage' as never)} activeOpacity={0.8}>
            <ChartIcon size={16} color={color.textInverse} />
            <Text style={styles.primaryBtnText}>View Report</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtnFlex} onPress={handleRefreshRecount} disabled={loading} activeOpacity={0.8}>
            <Text style={styles.ghostBtnText}>{loading ? 'Loading…' : 'Refresh'}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" animating color={color.accent} />
            <Text style={styles.loadingText}>Loading recount data…</Text>
          </View>
        ) : recountItems.length > 0 ? (
          <>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 1, paddingLeft: 0 }]}>Item</Text>
              <Text style={[styles.th, styles.thNum]}>Prev</Text>
              <Text style={[styles.th, styles.thNum]}>Count</Text>
            </View>
            <FlatList
              data={recountItems}
              renderItem={renderRecountItem}
              keyExtractor={(item) => item.code}
              showsVerticalScrollIndicator={false}
              style={styles.table}
            />
          </>
        ) : (
          <FlatList data={[]} renderItem={() => null} ListEmptyComponent={renderEmptyState} contentContainerStyle={styles.emptyListContainer} />
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
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    marginBottom: space.md,
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: color.border },
  statValue: { fontFamily: mono, fontSize: 22, fontWeight: '700', color: color.text },
  statLabel: { ...font.label, fontSize: 10, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: space.sm, marginBottom: space.md },
  primaryBtnFlex: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: color.accent,
    borderRadius: radius.sm,
    paddingVertical: space.md,
  },
  ghostBtnFlex: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    borderRadius: radius.sm,
    paddingVertical: space.md,
  },
  ghostBtnText: { fontSize: 14, fontWeight: '700', color: color.textSecondary },
  primaryBtn: {
    backgroundColor: color.accent,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    paddingHorizontal: space.xl,
    marginTop: space.lg,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: color.textInverse },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: space.md, fontSize: 14, color: color.textMuted },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderWidth: 1,
    borderColor: color.border,
    borderBottomWidth: 0,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  th: { ...font.label },
  thNum: { width: 56, textAlign: 'right' },
  table: {
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  itemCell: { flex: 1, paddingRight: space.sm },
  code: { fontFamily: mono, fontSize: 13, fontWeight: '700', color: color.accent },
  name: { fontSize: 13, color: color.textSecondary, marginTop: 1 },
  numCell: { width: 56, alignItems: 'flex-end' },
  numLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', color: color.textMuted },
  numValue: { fontFamily: mono, fontSize: 15, fontWeight: '700', color: color.text, marginTop: 1 },
  emptyListContainer: { flexGrow: 1, justifyContent: 'center' },
  emptyContainer: { alignItems: 'center', paddingHorizontal: space.xl },
  emptyTitle: { ...font.title, marginTop: space.md, marginBottom: space.xs },
  emptySubtitle: { fontSize: 13, color: color.textMuted, textAlign: 'center', lineHeight: 19 },
});
