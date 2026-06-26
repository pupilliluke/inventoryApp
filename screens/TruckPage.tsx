import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, StyleSheet, FlatList, Alert, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSession } from '../context/SessionContext';
import ScreenHeader from '../components/ScreenHeader';
import { TruckIcon, AddIcon } from '../components/CustomIcons';
import { subscribeTrucks, createTruck, truckLineCount, truckTotal, TruckList } from '../utils/trucks';
import { color, space, radius, font, mono } from '../theme/tokens';

function formatWhen(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function TruckPage() {
  const navigation = useNavigation<any>();
  const { activeUser } = useSession();
  const [lists, setLists] = useState<TruckList[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const unsub = subscribeTrucks((l) => {
      setLists(l);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleCreate = async () => {
    if (!activeUser || creating) return;
    setCreating(true);
    try {
      const title = `${activeUser.name}'s Truck`;
      const id = await createTruck(activeUser, title);
      navigation.navigate('TruckDetail', { listId: id });
    } catch (e) {
      console.error('Failed to create truck:', e);
      Alert.alert('Error', 'Could not create truck list.');
    } finally {
      setCreating(false);
    }
  };

  const renderItem = ({ item }: { item: TruckList }) => {
    const mine = !!activeUser && item.ownerId === activeUser.id;
    const noteCount = (item.notes || []).length;
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('TruckDetail', { listId: item.id })}
      >
        <View style={styles.rowMain}>
          <View style={styles.titleLine}>
            <Text style={styles.listTitle} numberOfLines={1}>{item.title}</Text>
            {mine && <Text style={styles.mineBadge}>YOU</Text>}
            {noteCount > 0 ? <Text style={styles.noteBadge}>{noteCount} NOTE{noteCount === 1 ? '' : 'S'}</Text> : null}
          </View>
          <Text style={styles.owner} numberOfLines={1}>by {item.ownerName}</Text>
        </View>
        <View style={styles.rowMeta}>
          <Text style={styles.metaValue}>{truckLineCount(item)}</Text>
          <Text style={styles.metaLabel}>items</Text>
        </View>
        <View style={styles.rowMeta}>
          <Text style={styles.metaValue}>{truckTotal(item)}</Text>
          <Text style={styles.metaLabel}>units</Text>
        </View>
        <Text style={styles.when}>{formatWhen(item.updatedAt)}</Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <TruckIcon size={40} color={color.textMuted} />
      <Text style={styles.emptyTitle}>No truck lists yet</Text>
      <Text style={styles.emptySubtitle}>
        Create a truck list to keep text notes and a list of items together. Everyone can see each other's lists.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Truck" onBack={() => navigation.goBack()} />

      <View style={styles.content}>
        <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={creating} activeOpacity={0.85}>
          <AddIcon size={18} color={color.textInverse} />
          <Text style={styles.createBtnText}>{creating ? 'Creating…' : 'New Truck List'}</Text>
        </TouchableOpacity>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" animating color={color.accent} />
            <Text style={styles.loadingText}>Loading truck lists…</Text>
          </View>
        ) : (
          <FlatList
            data={lists}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            style={styles.table}
            contentContainerStyle={lists.length === 0 ? styles.emptyListContainer : undefined}
            ListEmptyComponent={renderEmpty}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.appBg },
  content: { flex: 1, padding: space.md },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: color.accent,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    marginBottom: space.md,
  },
  createBtnText: { fontSize: 14, fontWeight: '700', color: color.textInverse, letterSpacing: 0.3 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: space.md, fontSize: 14, color: color.textMuted },
  table: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    marginBottom: space.sm,
    gap: space.md,
  },
  rowMain: { flex: 1 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  listTitle: { ...font.title, flexShrink: 1 },
  mineBadge: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: color.accent,
    backgroundColor: color.accentBg,
    borderWidth: 1,
    borderColor: color.accentBorder,
    borderRadius: radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  noteBadge: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: color.textSecondary,
    backgroundColor: color.surfaceAlt,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  owner: { fontSize: 12, color: color.textMuted, marginTop: 2 },
  rowMeta: { alignItems: 'center', width: 44 },
  metaValue: { fontFamily: mono, fontSize: 16, fontWeight: '700', color: color.text },
  metaLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', color: color.textMuted },
  when: { fontSize: 11, color: color.textMuted, width: 44, textAlign: 'right' },
  emptyListContainer: { flexGrow: 1, justifyContent: 'center' },
  emptyContainer: { alignItems: 'center', paddingHorizontal: space.xl },
  emptyTitle: { ...font.title, marginTop: space.md, marginBottom: space.xs },
  emptySubtitle: { fontSize: 13, color: color.textMuted, textAlign: 'center', lineHeight: 19 },
});
