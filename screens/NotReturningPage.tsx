import React, { useMemo, useState } from 'react';
import {
  SafeAreaView, View, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useInventory } from '../context/InventoryContext';
import { useNotReturning, NOT_RETURNING_COLOR } from '../context/NotReturningContext';
import ScreenHeader from '../components/ScreenHeader';
import { AddIcon, DeleteIcon, SearchIcon, CloseIcon } from '../components/CustomIcons';
import { color, space, radius, font, mono } from '../theme/tokens';

export default function NotReturningPage() {
  const navigation = useNavigation<any>();
  const { originalInventory } = useInventory() as unknown as {
    originalInventory: { code: string; name: string }[];
  };
  const { items, codes, isNotReturning, addItem, removeItem } = useNotReturning();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');

  // Map live inventory by code so we can show the current catalog name when the
  // SKU still exists, falling back to the buyer-provided name when it doesn't.
  const inventoryByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const it of originalInventory || []) {
      if (it.code) map.set(String(it.code).toLowerCase(), it.name);
    }
    return map;
  }, [originalInventory]);

  // Inventory items matching the "add" search that aren't already flagged.
  const addResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return (originalInventory || [])
      .filter(
        (it) =>
          !isNotReturning(it.code) &&
          ((it.name && it.name.toLowerCase().includes(q)) ||
            (it.code && String(it.code).toLowerCase().includes(q)))
      )
      .slice(0, 25);
  }, [search, originalInventory, isNotReturning, codes]);

  const rows = useMemo(
    () =>
      items.map((it) => ({
        ...it,
        name: inventoryByCode.get(it.code.toLowerCase()) || it.name,
        inDatabase: inventoryByCode.has(it.code.toLowerCase()),
      })),
    [items, inventoryByCode]
  );

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (it) => it.code.toLowerCase().includes(q) || it.name.toLowerCase().includes(q)
    );
  }, [rows, filter]);

  const handleAdd = async (inv: { code: string; name: string }) => {
    setSearch('');
    try {
      await addItem({ code: inv.code, name: inv.name });
    } catch (e) {
      console.error('Failed to add not-returning item:', e);
      Alert.alert('Error', 'Could not add the item.');
    }
  };

  const handleRemove = async (code: string) => {
    try {
      await removeItem(code);
    } catch (e) {
      console.error('Failed to remove not-returning item:', e);
      Alert.alert('Error', 'Could not remove the item.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Not Getting Back" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ padding: space.md, paddingBottom: space.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>
          Discontinued items that will not be restocked. Flagged items show a{' '}
          <Text style={styles.introDotWord}>● </Text>
          dot in inventory and pull-list searches so the team knows not to expect them back.
        </Text>

        {/* Add items from live inventory */}
        <Text style={styles.fieldLabel}>Add Items</Text>
        <View style={styles.searchWrap}>
          <SearchIcon size={16} color={color.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search inventory by name or code"
            placeholderTextColor={color.textMuted}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
              <CloseIcon size={16} color={color.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {addResults.length > 0 && (
          <View style={styles.resultsBox}>
            {addResults.map((it) => (
              <TouchableOpacity
                key={it.code}
                style={styles.resultRow}
                onPress={() => handleAdd(it)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemCode}>{it.code}</Text>
                  <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                </View>
                <AddIcon size={18} color={color.accent} />
              </TouchableOpacity>
            ))}
          </View>
        )}
        {search.trim().length > 0 && addResults.length === 0 && (
          <Text style={styles.noResults}>No matching inventory items to add.</Text>
        )}

        {/* The list itself, with its own filter */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.sectionLabel}>Items</Text>
          <Text style={styles.sectionTotal}>{filtered.length}</Text>
        </View>

        <View style={styles.searchWrap}>
          <SearchIcon size={16} color={color.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={filter}
            onChangeText={setFilter}
            placeholder="Filter this list"
            placeholderTextColor={color.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {filter.length > 0 && (
            <TouchableOpacity onPress={() => setFilter('')} activeOpacity={0.7}>
              <CloseIcon size={16} color={color.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {filtered.length === 0 ? (
          <Text style={styles.noResults}>No matching items.</Text>
        ) : (
          <View style={[styles.listCard, { marginTop: space.sm }]}>
            {filtered.map((it, i) => (
              <View
                key={it.code}
                style={[styles.itemRow, i === filtered.length - 1 && styles.itemRowLast]}
              >
                <View style={styles.dot} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemCode}>{it.code}</Text>
                  <Text style={styles.itemName} numberOfLines={2}>{it.name}</Text>
                </View>
                {!it.inDatabase && <Text style={styles.notInDbTag}>NOT IN DB</Text>}
                {!it.seeded && (
                  <TouchableOpacity
                    onPress={() => handleRemove(it.code)}
                    style={styles.removeBtn}
                    activeOpacity={0.7}
                  >
                    <DeleteIcon size={16} color={color.negative} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.appBg },
  content: { flex: 1 },
  intro: { fontSize: 13, color: color.textMuted, lineHeight: 19, marginBottom: space.md },
  introDotWord: { color: NOT_RETURNING_COLOR, fontWeight: '800' },
  fieldLabel: { ...font.label, marginBottom: space.xs },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
    paddingHorizontal: space.md,
  },
  searchInput: { flex: 1, paddingVertical: space.sm, fontSize: 14, color: color.text },
  resultsBox: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
    marginTop: space.sm,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.xl,
    marginBottom: space.sm,
  },
  sectionLabel: { ...font.label },
  sectionTotal: { fontFamily: mono, fontSize: 13, fontWeight: '700', color: color.text },
  noResults: { fontSize: 13, color: color.textMuted, marginTop: space.sm },
  listCard: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  itemRowLast: { borderBottomWidth: 0 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: NOT_RETURNING_COLOR },
  itemInfo: { flex: 1 },
  itemCode: { fontFamily: mono, fontSize: 13, fontWeight: '700', color: color.accent },
  itemName: { fontSize: 13, color: color.textSecondary, marginTop: 1 },
  notInDbTag: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: color.textMuted,
    backgroundColor: color.surfaceAlt,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  removeBtn: { padding: space.xs },
});
