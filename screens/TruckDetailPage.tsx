import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  SafeAreaView, View, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Platform,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useInventory } from '../context/InventoryContext';
import { useSession } from '../context/SessionContext';
import ScreenHeader from '../components/ScreenHeader';
import { AddIcon, DeleteIcon, SearchIcon, CloseIcon } from '../components/CustomIcons';
import { subscribeTruck, saveTruck, deleteTruck, TruckList, TruckItem } from '../utils/trucks';
import { useIsAdmin } from '../utils/admin';
import { color, space, radius, font, mono } from '../theme/tokens';

export default function TruckDetailPage() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const listId: string | undefined = route.params?.listId;
  const { activeUser } = useSession();
  const { originalInventory } = useInventory();
  const isAdmin = useIsAdmin();

  const [remote, setRemote] = useState<TruckList | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const [items, setItems] = useState<Record<string, TruckItem>>({});
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!listId) {
      setLoaded(true);
      return;
    }
    const unsub = subscribeTruck(listId, (l) => {
      setRemote(l);
      setLoaded(true);
      if (!initialized.current && l) {
        setTitle(l.title);
        setNotes(l.notes || []);
        setItems(l.items || {});
        initialized.current = true;
      }
    });
    return unsub;
  }, [listId]);

  const isOwner = !!(remote && activeUser && remote.ownerId === activeUser.id);
  // Owners edit their own lists; admins can edit/delete anyone's.
  const canEdit = isOwner || isAdmin;

  const displayItems = useMemo(() => {
    const source = canEdit ? items : remote?.items || {};
    return Object.values(source).sort((a, b) => a.name.localeCompare(b.name));
  }, [canEdit, items, remote]);

  const displayNotes = canEdit ? notes : remote?.notes || [];

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
    setNotes((prev) => [...prev, '']);
    setDirty(true);
  };
  const setNote = (idx: number, v: string) => {
    setNotes((prev) => prev.map((n, i) => (i === idx ? v : n)));
    setDirty(true);
  };
  const removeNote = (idx: number) => {
    setNotes((prev) => prev.filter((_, i) => i !== idx));
    setDirty(true);
  };

  // --- item editing ---
  const addItem = (inv: any) => {
    setItems((prev) =>
      prev[inv.code] ? prev : { ...prev, [inv.code]: { code: inv.code, name: inv.name, quantity: 1 } }
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
    if (!canEdit || !listId) return;
    setSaving(true);
    try {
      await saveTruck(listId, {
        title: title.trim() || `${activeUser?.name ?? 'Untitled'} Truck`,
        notes,
        items,
      });
      setDirty(false);
    } catch (e) {
      console.error('Failed to save truck:', e);
      Alert.alert('Error', 'Could not save truck list.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!canEdit || !listId) return;
    const doDelete = async () => {
      try {
        await deleteTruck(listId);
        navigation.goBack();
      } catch (e) {
        console.error('Failed to delete truck:', e);
        Alert.alert('Error', 'Could not delete truck list.');
      }
    };
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm('Delete this truck list? This cannot be undone.')) doDelete();
    } else {
      Alert.alert('Delete truck list', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const renderItemRow = (item: TruckItem) => (
    <View key={item.code} style={styles.itemRow}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemCode}>{item.code}</Text>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
      </View>
      {canEdit ? (
        <>
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
        </>
      ) : (
        <Text style={styles.qtyReadonly}>{item.quantity}</Text>
      )}
    </View>
  );

  const header = (
    <View>
      {canEdit ? (
        <>
          <Text style={styles.fieldLabel}>Truck Title</Text>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={(t) => { setTitle(t); setDirty(true); }}
            placeholder="Truck list title"
            placeholderTextColor={color.textMuted}
          />
        </>
      ) : (
        <>
          <Text style={styles.viewerTitle}>{remote?.title}</Text>
          <Text style={styles.viewerOwner}>by {remote?.ownerName} · view only</Text>
        </>
      )}

      {/* Notes (list of text) */}
      <View style={styles.listHeaderRow}>
        <Text style={styles.sectionLabel}>Notes ({displayNotes.length})</Text>
        {canEdit && (
          <TouchableOpacity onPress={addNote} style={styles.addInline} activeOpacity={0.7}>
            <AddIcon size={16} color={color.accent} />
            <Text style={styles.addInlineText}>Add note</Text>
          </TouchableOpacity>
        )}
      </View>

      {displayNotes.length === 0 ? (
        <Text style={styles.noResults}>
          {canEdit ? 'No notes yet. Tap “Add note” to write one.' : 'No notes.'}
        </Text>
      ) : (
        displayNotes.map((note, idx) =>
          canEdit ? (
            <View key={idx} style={styles.noteRow}>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={(v) => setNote(idx, v)}
                placeholder={`Note ${idx + 1}`}
                placeholderTextColor={color.textMuted}
                multiline
                textAlignVertical="top"
              />
              <TouchableOpacity onPress={() => removeNote(idx)} style={styles.removeBtn} activeOpacity={0.7}>
                <DeleteIcon size={16} color={color.negative} />
              </TouchableOpacity>
            </View>
          ) : (
            <View key={idx} style={styles.viewerNoteCard}>
              <Text style={styles.viewerNotesText}>{note}</Text>
            </View>
          )
        )
      )}

      {/* Add items */}
      {canEdit && (
        <>
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
        </>
      )}

      <View style={styles.listHeaderRow}>
        <Text style={styles.sectionLabel}>Items ({displayItems.length})</Text>
        <Text style={styles.sectionTotal}>
          {displayItems.reduce((s, it) => s + (it.quantity || 0), 0)} units
        </Text>
      </View>
    </View>
  );

  if (!loaded) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Truck List" onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" animating color={color.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!remote) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Truck List" onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyTitle}>Truck list not found</Text>
          <Text style={styles.emptySubtitle}>It may have been deleted.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Truck List"
        onBack={() => navigation.goBack()}
        right={
          canEdit ? (
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || !dirty}
              style={[styles.saveBtn, (!dirty || saving) && styles.saveBtnDisabled]}
              activeOpacity={0.8}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ padding: space.md, paddingBottom: space.xxl }}
        keyboardShouldPersistTaps="handled"
      >
        {header}
        {displayItems.length === 0 ? (
          <View style={styles.emptyItems}>
            <Text style={styles.emptySubtitle}>
              {canEdit ? 'Search above to add items to this truck.' : 'This truck list has no items yet.'}
            </Text>
          </View>
        ) : (
          displayItems.map(renderItemRow)
        )}
      </ScrollView>

      {canEdit && (
        <TouchableOpacity style={styles.deleteListBtn} onPress={handleDelete} activeOpacity={0.85}>
          <DeleteIcon size={16} color={color.negative} />
          <Text style={styles.deleteListText}>Delete truck list</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.appBg },
  content: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.xl },
  fieldLabel: { ...font.label, marginBottom: space.xs },
  titleInput: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: 16,
    fontWeight: '600',
    color: color.text,
  },
  viewerTitle: { ...font.title, fontSize: 18 },
  viewerOwner: { fontSize: 12, color: color.textMuted, marginTop: 2 },
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
  viewerNoteCard: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceAlt,
    padding: space.md,
    marginBottom: space.sm,
  },
  viewerNotesText: { fontSize: 14, color: color.text, lineHeight: 20 },
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
  qtyReadonly: { fontFamily: mono, fontSize: 16, fontWeight: '700', color: color.text, width: 56, textAlign: 'center' },
  removeBtn: { padding: space.xs },
  saveBtn: {
    backgroundColor: color.accent,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  saveBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.12)' },
  saveBtnText: { fontSize: 13, fontWeight: '700', color: color.textInverse },
  deleteListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderTopWidth: 1,
    borderTopColor: color.border,
    backgroundColor: color.surface,
    paddingVertical: space.md,
  },
  deleteListText: { fontSize: 14, fontWeight: '700', color: color.negative },
  emptyItems: { paddingVertical: space.xl, alignItems: 'center' },
  emptyTitle: { ...font.title, marginBottom: space.xs },
  emptySubtitle: { fontSize: 13, color: color.textMuted, textAlign: 'center', lineHeight: 19 },
});
