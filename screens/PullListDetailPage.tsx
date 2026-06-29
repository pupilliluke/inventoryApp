import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  SafeAreaView, View, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Platform,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useInventory } from '../context/InventoryContext';
import { useSession } from '../context/SessionContext';
import ScreenHeader from '../components/ScreenHeader';
import { AddIcon, DeleteIcon, SearchIcon, CloseIcon, CheckIcon } from '../components/CustomIcons';
import {
  subscribePullList, savePullList, deletePullList, PullList, PullListItem,
} from '../utils/pullLists';
import { InventoryMutations } from '../utils/inventoryMutations';
import { useIsAdmin } from '../utils/admin';
import { color, space, radius, font, mono } from '../theme/tokens';

export default function PullListDetailPage() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const listId: string | undefined = route.params?.listId;
  const { activeUser } = useSession();
  const { originalInventory } = useInventory();
  const isAdmin = useIsAdmin();

  const [remote, setRemote] = useState<PullList | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Record<string, PullListItem>>({});
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  // Notes show as a card; the text input only appears while editing.
  const [editingNotes, setEditingNotes] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!listId) {
      setLoaded(true);
      return;
    }
    const unsub = subscribePullList(listId, (l) => {
      setRemote(l);
      setLoaded(true);
      if (!initialized.current && l) {
        setTitle(l.title);
        setNotes(l.notes || '');
        setItems(l.items || {});
        initialized.current = true;
      }
    });
    return unsub;
  }, [listId]);

  const isOwner = !!(remote && activeUser && remote.ownerId === activeUser.id);
  // Owners edit their own lists; admins can edit/delete anyone's.
  const canEdit = isOwner || isAdmin;

  // Editors edit the local copy; viewers see the live remote copy (read-only).
  const displayItems = useMemo(() => {
    const source = canEdit ? items : remote?.items || {};
    return Object.values(source).sort((a, b) => a.name.localeCompare(b.name));
  }, [canEdit, items, remote]);

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

  // Codes currently being checked/unchecked, to block double taps mid-write.
  const [toggling, setToggling] = useState<Record<string, boolean>>({});

  // Toggle the "pulled" checkbox for a line item. Checking moves the item's
  // quantity out of its inventory container and zeroes the pull-list quantity;
  // unchecking restores both. Inventory + pull list are persisted immediately.
  const togglePulled = async (item: PullListItem) => {
    if (!canEdit || !listId || toggling[item.code]) return;
    const willCheck = !item.checked;
    const inv = (originalInventory || []).find((it: any) => it.code === item.code);

    setToggling((p) => ({ ...p, [item.code]: true }));
    try {
      // Adjust the inventory container quantity (clamped at 0), if the item
      // still exists in inventory.
      if (inv) {
        const currentQty = inv.containers?.quantity || 0;
        const delta = willCheck ? item.quantity : (item.pulledQty || 0);
        const newQty = willCheck
          ? Math.max(0, currentQty - delta)
          : currentQty + delta;
        const newInv = {
          ...inv,
          containers: { ...(inv.containers || { category: 0, quantity: 0 }), quantity: newQty },
        };
        await InventoryMutations.updateItem(activeUser, inv, newInv);
      }

      // Update the pull-list line item.
      const updatedItem: PullListItem = willCheck
        ? { ...item, checked: true, pulledQty: item.quantity, quantity: 0 }
        : { ...item, checked: false, quantity: item.pulledQty || 0, pulledQty: 0 };

      const nextItems = { ...items, [item.code]: updatedItem };
      setItems(nextItems);
      await savePullList(listId, { items: nextItems });
    } catch (e) {
      console.error('Failed to toggle pulled state:', e);
      Alert.alert('Error', 'Could not update the pulled state for this item.');
    } finally {
      setToggling((p) => {
        const next = { ...p };
        delete next[item.code];
        return next;
      });
    }
  };

  const handleSave = async () => {
    if (!canEdit || !listId) return;
    setSaving(true);
    try {
      await savePullList(listId, {
        title: title.trim() || `${activeUser?.name ?? 'Untitled'} Pull List`,
        notes,
        items,
      });
      setDirty(false);
    } catch (e) {
      console.error('Failed to save pull list:', e);
      Alert.alert('Error', 'Could not save pull list.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!canEdit || !listId) return;
    const doDelete = async () => {
      try {
        await deletePullList(listId);
        navigation.goBack();
      } catch (e) {
        console.error('Failed to delete pull list:', e);
        Alert.alert('Error', 'Could not delete pull list.');
      }
    };
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm('Delete this pull list? This cannot be undone.')) doDelete();
    } else {
      Alert.alert('Delete pull list', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const renderItemRow = (item: PullListItem) => {
    const checkbox = (
      <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
        {item.checked && <CheckIcon size={14} color={color.textInverse} />}
      </View>
    );
    return (
      <View key={item.code} style={[styles.itemRow, item.checked && styles.itemRowChecked]}>
        {canEdit ? (
          <TouchableOpacity
            onPress={() => togglePulled(item)}
            disabled={!!toggling[item.code]}
            style={styles.checkboxBtn}
            activeOpacity={0.7}
          >
            {checkbox}
          </TouchableOpacity>
        ) : (
          checkbox
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemCode}>{item.code}</Text>
          <Text style={[styles.itemName, item.checked && styles.itemTextStruck]} numberOfLines={2}>
            {item.name}
          </Text>
        </View>
        {canEdit && !item.checked ? (
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
          <Text style={[styles.qtyReadonly, item.checked && styles.itemTextStruck]}>
            {item.checked ? (item.pulledQty ?? 0) : item.quantity}
          </Text>
        )}
      </View>
    );
  };

  const header = (
    <View>
      {canEdit ? (
        <>
          <Text style={styles.fieldLabel}>List Title</Text>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={(t) => { setTitle(t); setDirty(true); }}
            placeholder="Pull list title"
            placeholderTextColor={color.textMuted}
          />
        </>
      ) : (
        <>
          <Text style={styles.viewerTitle}>{remote?.title}</Text>
          <Text style={styles.viewerOwner}>by {remote?.ownerName} · view only</Text>
        </>
      )}

      {canEdit ? (
        <>
          <Text style={[styles.fieldLabel, { marginTop: space.lg }]}>Notes</Text>
          {editingNotes ? (
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={(t) => { setNotes(t); setDirty(true); }}
              placeholder="Add notes for this pull list…"
              placeholderTextColor={color.textMuted}
              multiline
              textAlignVertical="top"
              autoFocus
              onBlur={() => setEditingNotes(false)}
            />
          ) : (
            <TouchableOpacity
              style={styles.noteCardBody}
              activeOpacity={0.7}
              onPress={() => setEditingNotes(true)}
            >
              <View style={styles.noteAccent} />
              <Text style={[styles.noteCardText, !notes.trim() && styles.noteCardEmpty]}>
                {notes.trim() ? notes : 'No notes yet — tap to add.'}
              </Text>
            </TouchableOpacity>
          )}
        </>
      ) : remote?.notes ? (
        <View style={styles.viewerNotes}>
          <Text style={styles.viewerNotesLabel}>Notes</Text>
          <Text style={styles.viewerNotesText}>{remote.notes}</Text>
        </View>
      ) : null}

      {canEdit && (
        <>
          <Text style={[styles.fieldLabel, { marginTop: space.lg }]}>Add Fireworks</Text>
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
        <ScreenHeader title="Pull List" onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" animating color={color.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!remote) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Pull List" onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyTitle}>Pull list not found</Text>
          <Text style={styles.emptySubtitle}>It may have been deleted.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Pull List"
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
              {canEdit ? 'Search above to add fireworks to this list.' : 'This pull list has no items yet.'}
            </Text>
          </View>
        ) : (
          displayItems.map(renderItemRow)
        )}
      </ScrollView>

      {canEdit && (
        <TouchableOpacity style={styles.deleteListBtn} onPress={handleDelete} activeOpacity={0.85}>
          <DeleteIcon size={16} color={color.negative} />
          <Text style={styles.deleteListText}>Delete pull list</Text>
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
  notesInput: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: 14,
    color: color.text,
    minHeight: 72,
    lineHeight: 20,
  },
  // Tappable note card shown when not editing.
  noteCardBody: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    overflow: 'hidden',
    minHeight: 44,
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
  viewerNotes: {
    marginTop: space.lg,
    borderWidth: 1,
    borderColor: color.border,
    borderLeftWidth: 3,
    borderLeftColor: color.accent,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
    padding: space.md,
  },
  viewerNotesLabel: { ...font.label, marginBottom: space.xs },
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
    alignItems: 'baseline',
    marginTop: space.xl,
    marginBottom: space.sm,
  },
  sectionLabel: { ...font.label },
  sectionTotal: { fontFamily: mono, fontSize: 13, fontWeight: '700', color: color.text },
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
  itemRowChecked: { opacity: 0.6 },
  checkboxBtn: { padding: space.xs, marginLeft: -space.xs },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: color.border,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: color.accent, borderColor: color.accent },
  itemTextStruck: { textDecorationLine: 'line-through', color: color.textMuted },
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
