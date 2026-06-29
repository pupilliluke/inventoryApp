import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import { CloseIcon, SearchIcon } from '../components/CustomIcons';
import { useInventory } from '../context/InventoryContext';
import { InventoryItem } from '../types/inventoryItem';
import {
  subscribeMovements,
  withinRange,
  totals,
  aggregateItems,
  aggregateUsers,
  indexByCode,
  Movement,
  RANGE_OPTIONS,
  RangeKey,
} from '../utils/analytics';
import { color, space, radius, font, mono } from '../theme/tokens';

const CONTAINER_OPTIONS: { key: number; label: string }[] = [
  { key: 0, label: 'No Container' },
  { key: 1, label: 'C1' },
  { key: 2, label: 'C2' },
  { key: 3, label: 'C3' },
  { key: 4, label: 'C4' },
];

function timeAgo(ts: number): string {
  if (!ts) return '';
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function AnalyticsPage() {
  const navigation = useNavigation<any>();
  const { originalInventory } = useInventory() as unknown as {
    originalInventory: InventoryItem[];
  };

  const [movements, setMovements] = useState<Movement[]>([]);
  const [range, setRange] = useState<RangeKey>('7d');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>(''); // item.type, '' = all
  const [container, setContainer] = useState<number | null>(null); // null = all

  useEffect(() => subscribeMovements(setMovements, 1000), []);

  const itemsByCode = useMemo(() => indexByCode(originalInventory || []), [originalInventory]);

  // Distinct categories (item types) present in inventory, for the category filter.
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const it of originalInventory || []) {
      if (it.type) set.add(it.type);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [originalInventory]);

  // Movements after applying the time-range filter only (shared baseline).
  const rangeMs = RANGE_OPTIONS.find((r) => r.key === range)?.ms ?? Infinity;
  const inRange = useMemo(
    () => withinRange(movements, rangeMs, Date.now()),
    [movements, rangeMs]
  );

  // Apply item / category / container filters. Movements without a resolvable
  // item are kept only when no item-scoped filter is active.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const hasItemFilter = !!q || !!category || container !== null;
    return inRange.filter((mv) => {
      if (!mv.itemCode) return !hasItemFilter;
      const inv = itemsByCode.get(mv.itemCode);
      if (q) {
        const hay = `${mv.itemCode} ${inv?.name || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (category && inv?.type !== category) return false;
      if (container !== null && (inv?.containers?.category || 0) !== container) return false;
      return true;
    });
  }, [inRange, search, category, container, itemsByCode]);

  const stats = useMemo(() => totals(filtered), [filtered]);
  const topItems = useMemo(
    () => aggregateItems(filtered, itemsByCode, 15),
    [filtered, itemsByCode]
  );
  const topUsers = useMemo(() => aggregateUsers(filtered, 8), [filtered]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) + (category ? 1 : 0) + (container !== null ? 1 : 0);

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setContainer(null);
  };

  const diffColor = (n: number) =>
    n > 0 ? color.positive : n < 0 ? color.negative : color.text;
  const fmtNet = (n: number) => `${n > 0 ? '+' : ''}${n}`;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Analytics" onBack={() => navigation.goBack()} />

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: space.xxl }}>
        {/* Time range */}
        <Text style={styles.groupLabel}>Time Range</Text>
        <View style={styles.chipRow}>
          {RANGE_OPTIONS.map((r) => {
            const active = range === r.key;
            return (
              <TouchableOpacity
                key={r.key}
                style={[styles.chip, styles.chipFlex, active && styles.chipActive]}
                onPress={() => setRange(r.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Item search */}
        <Text style={styles.groupLabel}>Item</Text>
        <View style={styles.searchContainer}>
          <SearchIcon size={16} color={color.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Filter by item code or name"
            placeholderTextColor={color.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
              <CloseIcon size={16} color={color.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Category */}
        <Text style={styles.groupLabel}>Category</Text>
        <View style={styles.wrapRow}>
          <TouchableOpacity
            style={[styles.chip, !category && styles.chipActive]}
            onPress={() => setCategory('')}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, !category && styles.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {categories.map((c) => {
            const active = category === c;
            return (
              <TouchableOpacity
                key={c}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setCategory(active ? '' : c)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Container */}
        <Text style={styles.groupLabel}>Container</Text>
        <View style={styles.wrapRow}>
          <TouchableOpacity
            style={[styles.chip, container === null && styles.chipActive]}
            onPress={() => setContainer(null)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, container === null && styles.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {CONTAINER_OPTIONS.map((c) => {
            const active = container === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setContainer(active ? null : c.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeFilterCount > 0 && (
          <TouchableOpacity onPress={clearFilters} activeOpacity={0.7} style={styles.clearFiltersRow}>
            <Text style={styles.clearFiltersText}>
              Clear {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} ✕
            </Text>
          </TouchableOpacity>
        )}

        {/* Summary */}
        <View style={styles.statGrid}>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: color.positive }]}>{stats.inUnits}</Text>
            <Text style={styles.statLabel}>Units In</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: color.negative }]}>{stats.outUnits}</Text>
            <Text style={styles.statLabel}>Units Out</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: diffColor(stats.net) }]}>{fmtNet(stats.net)}</Text>
            <Text style={styles.statLabel}>Net</Text>
          </View>
        </View>
        <View style={styles.netRow}>
          <Text style={styles.netMeta}>{stats.movements} changes</Text>
          <Text style={styles.netMeta}>{stats.activeItems} items</Text>
          <Text style={styles.netMeta}>{stats.activeUsers} users</Text>
        </View>

        {/* Top items */}
        <Text style={[styles.sectionTitle, { marginTop: space.xl }]}>Top Items by Movement</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 1 }]}>Item</Text>
            <Text style={[styles.th, styles.thNum]}>In</Text>
            <Text style={[styles.th, styles.thNum]}>Out</Text>
            <Text style={[styles.th, styles.thNum]}>Net</Text>
          </View>
          {topItems.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No quantity changes match these filters.</Text>
            </View>
          ) : (
            topItems.map((it, idx) => (
              <View key={it.itemCode} style={[styles.tr, idx % 2 === 1 && styles.trAlt]}>
                <View style={{ flex: 1, paddingRight: space.sm }}>
                  <Text style={styles.code}>{it.itemCode}</Text>
                  <Text style={styles.name} numberOfLines={1}>
                    {it.name}
                    {it.container > 0 ? ` · C${it.container}` : ''}
                  </Text>
                </View>
                <Text style={[styles.td, styles.thNum, { color: color.positive }]}>+{it.inUnits}</Text>
                <Text style={[styles.td, styles.thNum, { color: color.negative }]}>-{it.outUnits}</Text>
                <Text style={[styles.td, styles.thNum, { color: diffColor(it.net), fontWeight: '700' }]}>
                  {fmtNet(it.net)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Users */}
        <Text style={[styles.sectionTitle, { marginTop: space.xl }]}>Activity by User</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 1 }]}>User</Text>
            <Text style={[styles.th, styles.thNum]}>Acts</Text>
            <Text style={[styles.th, styles.thNum]}>In</Text>
            <Text style={[styles.th, styles.thNum]}>Out</Text>
            <Text style={[styles.th, styles.thWhen]}>Last</Text>
          </View>
          {topUsers.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No user activity matches these filters.</Text>
            </View>
          ) : (
            topUsers.map((u, idx) => (
              <View key={u.userId || u.userName} style={[styles.tr, idx % 2 === 1 && styles.trAlt]}>
                <Text style={[styles.userName, { flex: 1 }]} numberOfLines={1}>{u.userName}</Text>
                <Text style={[styles.td, styles.thNum]}>{u.actions}</Text>
                <Text style={[styles.td, styles.thNum, { color: color.positive }]}>+{u.inUnits}</Text>
                <Text style={[styles.td, styles.thNum, { color: color.negative }]}>-{u.outUnits}</Text>
                <Text style={[styles.tdWhen, styles.thWhen]}>{timeAgo(u.lastTs)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.appBg },
  content: { flex: 1, padding: space.md },

  groupLabel: { ...font.label, marginBottom: space.xs, marginTop: space.sm },

  chipRow: { flexDirection: 'row', gap: space.xs },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  chip: {
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  chipFlex: { flex: 1 },
  chipActive: { backgroundColor: color.accent, borderColor: color.accent },
  chipText: { fontSize: 13, fontWeight: '600', color: color.textSecondary },
  chipTextActive: { color: color.textInverse },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
  },
  searchInput: { flex: 1, height: 42, fontSize: 14, color: color.text },
  clearBtn: { padding: space.xs },

  clearFiltersRow: { alignSelf: 'flex-start', marginTop: space.md },
  clearFiltersText: { fontSize: 12, fontWeight: '700', color: color.accent },

  statGrid: {
    flexDirection: 'row',
    marginTop: space.lg,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
  },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: space.md },
  statValue: { fontFamily: mono, fontSize: 22, fontWeight: '800' },
  statLabel: { ...font.label, fontSize: 9, marginTop: 2 },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: color.surfaceAlt,
    borderWidth: 1,
    borderColor: color.border,
    borderTopWidth: 0,
    borderBottomLeftRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
    paddingVertical: space.sm,
  },
  netMeta: { fontSize: 11, fontWeight: '600', color: color.textMuted },

  sectionTitle: { ...font.label, fontSize: 12, marginBottom: space.sm },

  table: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  th: { ...font.label },
  thNum: { width: 46, textAlign: 'right' },
  thWhen: { width: 52, textAlign: 'right' },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  trAlt: { backgroundColor: color.surfaceAlt },
  td: { fontFamily: mono, fontSize: 13, color: color.text, textAlign: 'right' },
  tdWhen: { fontFamily: mono, fontSize: 11, color: color.textMuted, textAlign: 'right' },
  code: { fontFamily: mono, fontSize: 13, fontWeight: '700', color: color.accent },
  name: { fontSize: 12, color: color.textSecondary, marginTop: 1 },
  userName: { fontSize: 13, fontWeight: '600', color: color.text },
  emptyRow: { padding: space.lg, alignItems: 'center' },
  emptyText: { fontSize: 13, color: color.textMuted, textAlign: 'center' },
});
