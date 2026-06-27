import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  SafeAreaView, View, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useInventory } from '../context/InventoryContext';
import ScreenHeader from '../components/ScreenHeader';
import { AddIcon, DeleteIcon, SearchIcon, CloseIcon } from '../components/CustomIcons';
import {
  subscribeLowQuantity, saveLowQuantity, LowQuantityList, LowQuantityItem,
} from '../utils/lowQuantity';
import { color, space, radius, font, mono } from '../theme/tokens';

export default function LowQuantityPage() {
  const navigation = useNavigation<any>();
  const { originalInventory } = useInventory();

  const [loaded, setLoaded] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [items, setItems] = useState<Record<string, LowQuantityItem>>({});
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  // Index of the note currently being edited; null when all notes are read-only.
  const [editingNote, setEditingNote] = useState<number | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    const unsub = subscribeLowQuantity((l: LowQuantityList) => {
      setLoaded(true);
      // Only hydrate local state from remote once, so edits aren't clobbered.
      if (!initialized.current) {
        setNotes(l.notes || []);
        setItems(l.items || {});
        initialized.current = true;
      }
    });
    return unsub;
  }, []);

  const displayItems = useMemo(
    () => Object.values(items).sort((a, b) => a.name.localeCompare(b.name)),
    [items]
  );

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return (originalInventory || [])
      .filter(
        (it: any) =>
          !items[it.code] &&
          ((it.name && it.name.toLowerCase().includes(q)) ||
            (it.code && String(it.code).toLowerCase().includes(q)))
      )
      .slice(0, 25);
  }, [search, originalInventory, items]);

  // --- notes editing ---
  const addNote = () => {
    setEditingNote(notes.length);
    setNotes((prev) => [...prev, '']);
    setDirty(true);
  };
  const setNote = (idx: number, v: string) => {
    setNotes((prev) => prev.map((n, i) => (i === idx ? v : n)));
    setDirty(true);
  };
  const removeNote = (idx: number) => {
    setNotes((prev) => prev.filter((_, i) => i !== idx));
    setEditingNote(null);
    setDirty(true);
  };

  // --- item editing ---
  const addItem = (inv: any) => {
    setItems((prev) =>
      prev[inv.code] ? prev : { ...prev, [inv.code]: { code: inv.code, name: inv.name, quantity: 0 } }
    );
    setDirty(true);
    setSearch('');
  };
  const setQty = (code: string, v: string) => {
    setItems((prev) => ({
      ...prev,
      [code]: { ...prev[code], quantity: Math.max(0, parseInt(v, 10) || 0) },
    }));
    setDirty(true);
  };
  const removeItem = (code: string) => {
    setItems((prev) => {
      const next = { ...prev };
      delete next[code];
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveLowQuantity({ notes, items });
      setDirty(false);
    } catch (e) {
      console.error('Failed to save low-quantity list:', e);
      Alert.alert('Error', 'Could not save the list.');
    } finally {
      setSaving(false);
    }
  };

  const renderItemRow = (item: LowQuantityItem) => (
    <View key={item.code} style={styles.itemRow}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemCode}>{item.code}</Text>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
      </View>
      <TextInput
        style={styles.qtyInput}
        keyboardType="numeric"
        value={String(item.quantity)}
        onChangeText={(v) => setQty(item.code, v)}
        returnKeyType="done"
        selectTextOnFocus
      />
      <TouchableOpacity onPress={() => removeItem(item.code)} style={styles.removeBtn} activeOpacity={0.7}>
        <DeleteIcon size={16} color={color.negative} />
      </TouchableOpacity>
    </View>
  );

  if (!loaded) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Low Quantity / Out" onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" animating color={color.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Low Quantity / Out"
        onBack={() => navigation.goBack()}
        right={
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !dirty}
            style={[styles.saveBtn, (!dirty || saving) && styles.saveBtnDisabled]}
            activeOpacity={0.8}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ padding: space.md, paddingBottom: space.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>
          A single shared list of items running low or out of stock. Everyone can add items and notes.
        </Text>

        {/* Notes (list of text) */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.sectionLabel}>Notes ({notes.length})</Text>
          <TouchableOpacity onPress={addNote} style={styles.addInline} activeOpacity={0.7}>
            <AddIcon size={16} color={color.accent} />
            <Text style={styles.addInlineText}>Add note</Text>
          </TouchableOpacity>
        </View>

        {notes.length === 0 ? (
          <Text style={styles.noResults}>No notes yet. Tap “Add note” to write one.</Text>
        ) : (
          notes.map((note, idx) =>
            editingNote === idx ? (
              <View key={idx} style={styles.noteRow}>
                <TextInput
                  style={styles.noteInput}
                  value={note}
                  onChangeText={(v) => setNote(idx, v)}
                  placeholder={`Note ${idx + 1}`}
                  placeholderTextColor={color.textMuted}
                  multiline
                  textAlignVertical="top"
                  autoFocus
                  onBlur={() => setEditingNote(null)}
                  onSubmitEditing={() => setEditingNote(null)}
                />
                <TouchableOpacity onPress={() => removeNote(idx)} style={styles.removeBtn} activeOpacity={0.7}>
                  <DeleteIcon size={16} color={color.negative} />
                </TouchableOpacity>
              </View>
            ) : (
              <View key={idx} style={styles.noteCard}>
                <TouchableOpacity
                  style={styles.noteCardBody}
                  activeOpacity={0.7}
                  onPress={() => setEditingNote(idx)}
                >
                  <View style={styles.noteAccent} />
                  <Text
                    style={[styles.noteCardText, !note.trim() && styles.noteCardEmpty]}
                    numberOfLines={6}
                  >
                    {note.trim() ? note : 'Empty note — tap to edit'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeNote(idx)} style={styles.removeBtn} activeOpacity={0.7}>
                  <DeleteIcon size={16} color={color.negative} />
                </TouchableOpacity>
              </View>
            )
          )
        )}

        {/* Add items */}
        <Text style={[styles.fieldLabel, { marginTop: space.lg }]}>Add Items</Text>
        <View style={styles.searchWrap}>
          <SearchIcon size={16} color={color.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or code"
            placeholderTextColor={color.textMuted}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
              <CloseIcon size={16} color={color.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {results.length > 0 && (
          <View style={styles.resultsBox}>
            {results.map((it: any) => (
              <TouchableOpacity key={it.code} style={styles.resultRow} onPress={() => addItem(it)} activeOpacity={0.7}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemCode}>{it.code}</Text>
                  <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                </View>
                <AddIcon size={18} color={color.accent} />
              </TouchableOpacity>
            ))}
          </View>
        )}
        {search.trim().length > 0 && results.length === 0 && (
          <Text style={styles.noResults}>No matching items.</Text>
        )}

        <View style={styles.listHeaderRow}>
          <Text style={styles.sectionLabel}>Items ({displayItems.length})</Text>
          <Text style={styles.sectionTotal}>
            {displayItems.reduce((s, it) => s + (it.quantity || 0), 0)} units
          </Text>
        </View>

        {displayItems.length === 0 ? (
          <View style={styles.emptyItems}>
            <Text style={styles.emptySubtitle}>Search above to add items running low or out.</Text>
          </View>
        ) : (
          displayItems.map(renderItemRow)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.appBg },
  content: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.xl },
  intro: { fontSize: 13, color: color.textMuted, lineHeight: 19, marginBottom: space.sm },
  fieldLabel: { ...font.label, marginBottom: space.xs },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, marginBottom: space.sm },
  noteInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: 14,
    color: color.text,
    minHeight: 44,
    lineHeight: 20,
  },
  noteCard: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs, marginBottom: space.sm },
  noteCardBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  noteAccent: { width: 3, backgroundColor: color.accent },
  noteCardText: {
    flex: 1,
    fontSize: 14,
    color: color.text,
    lineHeight: 20,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  noteCardEmpty: { color: color.textMuted, fontStyle: 'italic' },
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
  noResults: { fontSize: 13, color: color.textMuted, marginTop: space.sm },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.xl,
    marginBottom: space.sm,
  },
  sectionLabel: { ...font.label },
  sectionTotal: { fontFamily: mono, fontSize: 13, fontWeight: '700', color: color.text },
  addInline: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  addInlineText: { fontSize: 13, fontWeight: '700', color: color.accent },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    marginBottom: space.sm,
  },
  itemInfo: { flex: 1 },
  itemCode: { fontFamily: mono, fontSize: 13, fontWeight: '700', color: color.accent },
  itemName: { fontSize: 13, color: color.textSecondary, marginTop: 1 },
  qtyInput: {
    width: 56,
    borderWidth: 1,
    borderColor: color.borderFocus,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
    paddingVertical: space.xs,
    textAlign: 'center',
    fontFamily: mono,
    fontSize: 15,
    fontWeight: '700',
    color: color.text,
  },
  removeBtn: { padding: space.xs },
  saveBtn: {
    backgroundColor: color.accent,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  saveBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.12)' },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: color.textInverse },
  emptyItems: { paddingVertical: space.xl, alignItems: 'center' },
  emptySubtitle: { fontSize: 13, color: color.textMuted, textAlign: 'center', lineHeight: 19 },
});
