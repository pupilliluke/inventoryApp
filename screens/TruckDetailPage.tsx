import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  SafeAreaView, View, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Platform,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSession } from '../context/SessionContext';
import ScreenHeader from '../components/ScreenHeader';
import { AddIcon, DeleteIcon, SearchIcon, CloseIcon, CheckIcon } from '../components/CustomIcons';
import { subscribeTruck, saveTruck, deleteTruck, TruckList, TruckItem } from '../utils/trucks';
import { useIsAdmin } from '../utils/admin';
import { color, space, radius, font, mono } from '../theme/tokens';

export default function TruckDetailPage() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const listId: string | undefined = route.params?.listId;
  const { activeUser } = useSession();
  const isAdmin = useIsAdmin();

  const [remote, setRemote] = useState<TruckList | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const [items, setItems] = useState<Record<string, TruckItem>>({});
  // Filters the items already in this truck list (by code or name).
  const [listFilter, setListFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  // Index of the note currently being edited; null when all notes are read-only.
  const [editingNote, setEditingNote] = useState<number | null>(null);
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

  // Items shown after applying the in-list filter (by code or name).
  const visibleItems = useMemo(() => {
    const q = listFilter.trim().toLowerCase();
    if (!q) return displayItems;
    return displayItems.filter(
      (it) =>
        (it.name && it.name.toLowerCase().includes(q)) ||
        (it.code && String(it.code).toLowerCase().includes(q))
    );
  }, [displayItems, listFilter]);

  const checkedCount = useMemo(() => displayItems.filter((it) => it.checked).length, [displayItems]);

  const displayNotes = canEdit ? notes : remote?.notes || [];

  // --- notes editing ---
  const addNote = () => {
    // Open the new note straight into edit mode (its index is the old length).
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
  const setQty2 = (code: string, v: string) => {
    setItems((prev) => ({
      ...prev,
      [code]: { ...prev[code], quantity2: Math.max(0, parseInt(v, 10) || 0) },
    }));
    setDirty(true);
  };
  const toggleChecked = (code: string) => {
    setItems((prev) => ({
      ...prev,
      [code]: { ...prev[code], checked: !prev[code]?.checked },
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
    <View key={item.code} style={[styles.itemRow, item.checked && styles.itemRowChecked]}>
      <TouchableOpacity
        style={[styles.checkBox, item.checked && styles.checkBoxChecked]}
        onPress={canEdit ? () => toggleChecked(item.code) : undefined}
        disabled={!canEdit}
        activeOpacity={0.7}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: !!item.checked }}
      >
        {item.checked && <CheckIcon size={14} color={color.textInverse} />}
      </TouchableOpacity>
      <View style={styles.itemInfo}>
        <Text style={styles.itemCode}>{item.code}</Text>
        <Text style={[styles.itemName, item.checked && styles.itemNameChecked]} numberOfLines={2}>{item.name}</Text>
      </View>
      {canEdit ? (
        <>
          <View style={styles.qtyGroup}>
            <Text style={styles.qtyTag}>QTY</Text>
            <Text style={styles.qtyReadonly}>{item.quantity}</Text>
          </View>
          <View style={styles.qtyGroup}>
            <Text style={styles.qtyTag}>COUNT</Text>
            <TextInput
              style={[styles.qtyInput, styles.qtyInput2]}
              keyboardType="numeric"
              value={item.quantity2 != null ? String(item.quantity2) : ''}
              onChangeText={(v) => setQty2(item.code, v)}
              placeholder="0"
              placeholderTextColor={color.textMuted}
              returnKeyType="done"
              selectTextOnFocus
            />
          </View>
          <TouchableOpacity onPress={() => removeItem(item.code)} style={styles.removeBtn} activeOpacity={0.7}>
            <DeleteIcon size={16} color={color.negative} />
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.qtyGroup}>
            <Text style={styles.qtyTag}>QTY</Text>
            <Text style={styles.qtyReadonly}>{item.quantity}</Text>
          </View>
          <View style={styles.qtyGroup}>
            <Text style={styles.qtyTag}>COUNT</Text>
            <Text style={styles.qtyReadonly}>{item.quantity2 != null ? item.quantity2 : '—'}</Text>
          </View>
        </>
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
          ) : (
            <View key={idx} style={styles.viewerNoteCard}>
              <Text style={styles.viewerNotesText}>{note}</Text>
            </View>
          )
        )
      )}

      <View style={styles.listHeaderRow}>
        <Text style={styles.sectionLabel}>
          Items ({displayItems.length}){checkedCount > 0 ? ` · ${checkedCount} checked` : ''}
        </Text>
        <Text style={styles.sectionTotal}>
          {displayItems.reduce((s, it) => s + (it.quantity || 0), 0)} units
        </Text>
      </View>

      {displayItems.length > 0 && (
        <View style={styles.searchWrap}>
          <SearchIcon size={16} color={color.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={listFilter}
            onChangeText={setListFilter}
            placeholder="Search items in this list"
            placeholderTextColor={color.textMuted}
          />
          {listFilter.length > 0 && (
            <TouchableOpacity onPress={() => setListFilter('')} activeOpacity={0.7}>
              <CloseIcon size={16} color={color.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}
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
        ) : visibleItems.length === 0 ? (
          <View style={styles.emptyItems}>
            <Text style={styles.emptySubtitle}>No items match “{listFilter.trim()}”.</Text>
          </View>
        ) : (
          visibleItems.map(renderItemRow)
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
  // Read-only note card shown when not editing (owner/admin).
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
  viewerNoteCard: {
    borderWidth: 1,
    borderColor: color.border,
    borderLeftWidth: 3,
    borderLeftColor: color.accent,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
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
  itemRowChecked: { opacity: 0.6, backgroundColor: color.surfaceAlt },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxChecked: { backgroundColor: color.accent, borderColor: color.accent },
  itemInfo: { flex: 1 },
  itemCode: { fontFamily: mono, fontSize: 13, fontWeight: '700', color: color.accent },
  itemName: { fontSize: 13, color: color.textSecondary, marginTop: 1 },
  itemNameChecked: { textDecorationLine: 'line-through' },
  qtyGroup: { alignItems: 'center' },
  qtyTag: { fontSize: 8, fontWeight: '800', letterSpacing: 0.4, color: color.textMuted, marginBottom: 2 },
  qtyInput: {
    width: 48,
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
  // Second (user count) field — accent border to distinguish from the order qty.
  qtyInput2: { borderColor: color.accentBorder, backgroundColor: color.accentBg },
  qtyReadonly: { fontFamily: mono, fontSize: 16, fontWeight: '700', color: color.text, width: 48, textAlign: 'center' },
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
