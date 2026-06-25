import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { Modal, Portal, List } from 'react-native-paper';
import { InventoryItem } from '../types/inventoryItem';
import { useInventory } from '../context/InventoryContext';
import { useSession } from '../context/SessionContext';
import { InventoryMutations, UserNotAuthenticatedError } from '../utils/inventoryMutations';
import { useNavigation } from '@react-navigation/native';
import { DeleteIcon } from './CustomIcons';
import { color, space, radius, font, mono } from '../theme/tokens';

const typeOptions = [
  'Assortment', 'Candle', 'Firecracker', 'Rocket', 'Smoke', 'Sparkler', 'Toy',
  'Rack', 'Fountain', 'Mortar', 'Missile', 'Z-repeater', '200g', '500g', 'Novelty', 'Free Item', 'Shirt', 'Other'
];

// Shared column geometry so the table header in InventoryMain stays aligned.
export const COL = {
  qty: 48,
  cont: 60,
  actions: 70,
} as const;

const InventoryRow = ({ item }: { item: InventoryItem }) => {
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [containerModalVisible, setContainerModalVisible] = useState(false);

  const { calculateTotal, updateItem } = useInventory();
  const { activeUser } = useSession();
  const navigation = useNavigation();
  const [localItem, setLocalItem] = useState(item);
  const [editingLocation, setEditingLocation] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

  // Modal form state
  const [modalName, setModalName] = useState(item.name);
  const [modalType, setModalType] = useState(item.type || 'Other');

  useEffect(() => {
    setLocalItem({
      ...item,
      type: item.type || 'Other', // ensure default fallback
    });
    setModalName(item.name);
    setModalType(item.type || 'Other');
  }, [item]);

  const handleChange = (key: keyof InventoryItem, value: string | boolean) => {
    setLocalItem(prev => ({
      ...prev,
      [key]: key === 'showroom' || key === 'warehouse' || key === 'closet'
        ? parseInt(value as string) || 0
        : key === 'checked'
        ? value
        : value,
    }));
  };

  const handleContainerQty = (value: string) => {
    setLocalItem(prev => ({
      ...prev,
      containers: { ...prev.containers, quantity: parseInt(value) || 0 },
    }));
  };

  const handleSelectContainer = async (n: number) => {
    setContainerModalVisible(false);
    const optimisticUpdate = { ...localItem, containers: { ...localItem.containers, category: n } };
    const oldItem = { ...item };

    // Optimistic update - UI responds immediately
    setLocalItem(optimisticUpdate);

    try {
      await InventoryMutations.updateItem(activeUser, item, optimisticUpdate);
    } catch (error) {
      if (error instanceof UserNotAuthenticatedError) {
        navigation.navigate('UserSelection' as never);
      } else {
        Alert.alert('Error', 'Failed to update container');
        console.error(error);
        setLocalItem(oldItem);
      }
    }
  };

  const handleSaveFromModal = async () => {
    const trimmedName = modalName?.trim();

    if (!trimmedName) {
      Alert.alert('Error', 'Name is required.');
      return;
    }

    const optimisticUpdate = {
      ...localItem,
      name: trimmedName,
      type: modalType
    };
    const oldItem = { ...item }; // Store original for potential rollback

    // Optimistic update - UI responds immediately
    setLocalItem(optimisticUpdate);
    setEditModalVisible(false);

    try {
      // Background database update
      await InventoryMutations.updateItem(activeUser, item, optimisticUpdate);
    } catch (error) {
      if (error instanceof UserNotAuthenticatedError) {
        navigation.navigate('UserSelection' as never);
      } else {
        Alert.alert('Error', 'Failed to update item');
        console.error(error);
        // Revert on error
        setLocalItem(oldItem);
        setModalName(oldItem.name);
        setModalType(oldItem.type || 'Other');
      }
    }
  };

  const handleSaveLocation = useCallback(async () => {
    const optimisticUpdate = { ...localItem };
    const oldItem = { ...item }; // Store original for potential rollback

    setSavingLocation(true);

    try {
      // Background database update
      await InventoryMutations.updateItem(activeUser, item, optimisticUpdate);
      setEditingLocation(false);
    } catch (error) {
      if (error instanceof UserNotAuthenticatedError) {
        navigation.navigate('UserSelection' as never);
      } else {
        Alert.alert('Error', 'Failed to update item quantities');
        console.error(error);
        // Revert on error
        setLocalItem(oldItem);
      }
    } finally {
      setSavingLocation(false);
    }
  }, [localItem, item, activeUser, navigation]);

  // Add Enter key listener for saving location quantities
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && editingLocation) {
        event.preventDefault();
        event.stopPropagation();
        handleSaveLocation();
      }
    };

    if (editingLocation) {
      window.addEventListener('keydown', handleKeyPress, true);
      return () => window.removeEventListener('keydown', handleKeyPress, true);
    }
  }, [editingLocation, handleSaveLocation]);

  const handleCheckboxToggle = async () => {
    const newCheckedState = !localItem.checked;
    const optimisticUpdate = { ...localItem, checked: newCheckedState };

    // Optimistic update - UI responds immediately
    setLocalItem(optimisticUpdate);

    try {
      // Background database update
      await InventoryMutations.updateItem(activeUser, item, optimisticUpdate);
    } catch (error) {
      if (error instanceof UserNotAuthenticatedError) {
        navigation.navigate('UserSelection' as never);
      } else {
        Alert.alert('Error', 'Failed to update checkbox');
        console.error(error);
        // Revert the local state on error
        setLocalItem(prev => ({ ...prev, checked: !newCheckedState }));
      }
    }
  };

  const handleSaveNote = async () => {
    const optimisticUpdate = { ...localItem };
    const oldNote = item.note; // Store original note for potential rollback

    // Optimistic update - UI responds immediately
    setEditingNote(false);

    try {
      // Background database update
      await InventoryMutations.updateItem(activeUser, item, optimisticUpdate);
    } catch (error) {
      if (error instanceof UserNotAuthenticatedError) {
        navigation.navigate('UserSelection' as never);
      } else {
        Alert.alert('Error', 'Failed to update note');
        console.error(error);
        // Revert on error
        setLocalItem(prev => ({ ...prev, note: oldNote }));
        setEditingNote(true);
      }
    }
  };

  const handleDelete = async () => {
    console.log('Delete button pressed for item:', localItem.name, localItem.code);

    // Use window.confirm for web compatibility
    const confirmed = window.confirm(`Are you sure you want to delete "${localItem.name}" (${localItem.code})?`);

    if (confirmed) {
      try {
        console.log('Delete confirmed, calling InventoryMutations.deleteItem');
        await InventoryMutations.deleteItem(activeUser, localItem.code, localItem.name);
        console.log('Delete successful');
        // The item will be automatically removed from the list by the context
      } catch (error) {
        console.error('Delete failed:', error);
        if (error instanceof UserNotAuthenticatedError) {
          navigation.navigate('UserSelection' as never);
        } else {
          alert('Error: Failed to delete item');
        }
      }
    } else {
      console.log('Delete cancelled');
    }
  };

  const hasNote = !!(localItem.note && localItem.note.trim());

  // Renders a single numeric quantity cell (display or editable input).
  const QtyCell = ({ value, onChange, width }: { value: number; onChange?: (v: string) => void; width: number }) => (
    editingLocation && onChange ? (
      <TextInput
        style={[styles.qtyInput, { width }]}
        keyboardType="numeric"
        value={String(value)}
        onChangeText={onChange}
        onSubmitEditing={handleSaveLocation}
        returnKeyType="done"
        selectTextOnFocus
      />
    ) : (
      <Text style={[styles.qtyValue, { width }, value === 0 && styles.qtyZero]}>{value}</Text>
    )
  );

  return (
    <View style={[styles.row, localItem.checked && styles.rowChecked]}>
      <View style={styles.dataLine}>
        {/* Item identity cell */}
        <View style={styles.itemCell}>
          <TouchableOpacity onPress={handleCheckboxToggle} style={styles.checkbox} activeOpacity={0.7}>
            {localItem.checked ? (
              <View style={styles.checkboxOn}>
                <Text style={styles.checkboxMark}>✓</Text>
              </View>
            ) : (
              <View style={styles.checkboxOff} />
            )}
          </TouchableOpacity>
          <View style={styles.itemText}>
            <Text style={styles.code} numberOfLines={1}>{localItem.code}</Text>
            <Text style={styles.name} numberOfLines={2}>{localItem.name}</Text>
            <TouchableOpacity onPress={() => setEditModalVisible(true)} style={styles.typeTag} activeOpacity={0.7}>
              <Text style={styles.typeTagText}>{localItem.type}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quantity columns */}
        <View style={styles.qtyGroup}>
          <QtyCell value={localItem.showroom} onChange={(v) => handleChange('showroom', v)} width={COL.qty} />
          <QtyCell value={localItem.warehouse} onChange={(v) => handleChange('warehouse', v)} width={COL.qty} />
          <View style={[styles.contCell, { width: COL.cont }]}>
            <TouchableOpacity
              onPress={() => setContainerModalVisible(true)}
              style={[styles.contTag, localItem.containers.category === 0 && styles.contTagEmpty]}
              activeOpacity={0.7}
            >
              <Text style={[styles.contTagText, localItem.containers.category === 0 && styles.contTagTextEmpty]}>
                {localItem.containers.category > 0 ? `C${localItem.containers.category}` : '—'}
              </Text>
            </TouchableOpacity>
            {editingLocation ? (
              <TextInput
                style={[styles.qtyInput, { width: COL.cont - 8, marginTop: space.xs }]}
                keyboardType="numeric"
                value={String(localItem.containers.quantity)}
                onChangeText={handleContainerQty}
                onSubmitEditing={handleSaveLocation}
                returnKeyType="done"
                selectTextOnFocus
              />
            ) : (
              <Text style={[styles.qtyValue, { width: COL.cont, marginTop: 2 }, localItem.containers.quantity === 0 && styles.qtyZero]}>
                {localItem.containers.quantity}
              </Text>
            )}
          </View>
          <QtyCell value={localItem.closet} onChange={(v) => handleChange('closet', v)} width={COL.qty} />
        </View>

        {/* Actions */}
        <View style={[styles.actionCell, { width: COL.actions }]}>
          <TouchableOpacity onPress={() => setEditModalVisible(true)} style={styles.actionBtn} activeOpacity={0.7}>
            <Text style={styles.actionBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={editingLocation ? handleSaveLocation : () => setEditingLocation(true)}
            style={[styles.actionBtn, editingLocation && styles.actionBtnPrimary]}
            disabled={savingLocation}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionBtnText, editingLocation && styles.actionBtnTextPrimary]}>
              {editingLocation ? 'Save' : 'Move'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowNotes(!showNotes)}
            style={[styles.actionBtn, hasNote && styles.actionBtnNote]}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionBtnText, hasNote && styles.actionBtnTextNote]}>Note</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notes drawer */}
      {showNotes && (
        <View style={styles.notesSection}>
          <View style={styles.noteHeader}>
            <Text style={styles.noteLabel}>Note</Text>
            <TouchableOpacity onPress={editingNote ? handleSaveNote : () => setEditingNote(true)} activeOpacity={0.7}>
              <Text style={styles.noteAction}>{editingNote ? 'Save' : 'Edit'}</Text>
            </TouchableOpacity>
          </View>
          {editingNote ? (
            <TextInput
              style={styles.noteInput}
              multiline
              numberOfLines={3}
              value={localItem.note || ''}
              onChangeText={(val) => handleChange('note', val)}
              placeholder="Add a note for this item…"
              placeholderTextColor={color.textMuted}
              returnKeyType="done"
              onSubmitEditing={handleSaveNote}
            />
          ) : (
            <Text style={[styles.noteText, !hasNote && styles.noteEmpty]}>
              {localItem.note || 'No note added'}
            </Text>
          )}
        </View>
      )}

      {/* Edit Modal */}
      <Portal>
        <Modal
          visible={editModalVisible}
          onDismiss={() => setEditModalVisible(false)}
          contentContainerStyle={styles.editModal}
          dismissable={true}
        >
          <Text style={styles.modalTitle}>Edit Item</Text>

          <Text style={styles.modalLabel}>Code</Text>
          <Text style={styles.readOnlyText}>{localItem.code}</Text>

          <Text style={styles.modalLabel}>Name</Text>
          <TextInput
            style={styles.modalInput}
            value={modalName}
            onChangeText={setModalName}
            placeholder="Enter item name"
            placeholderTextColor={color.textMuted}
            returnKeyType="next"
          />

          <Text style={styles.modalLabel}>Type</Text>
          <TouchableOpacity onPress={() => setTypeModalVisible(true)} style={styles.selectField} activeOpacity={0.7}>
            <Text style={styles.selectFieldText}>{modalType}</Text>
            <Text style={styles.selectFieldChevron}>▾</Text>
          </TouchableOpacity>

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.btnGhost} activeOpacity={0.8}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSaveFromModal} style={styles.btnPrimary} activeOpacity={0.8}>
              <Text style={styles.btnPrimaryText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.btnDanger} activeOpacity={0.8}>
              <DeleteIcon size={18} color={color.textInverse} />
            </TouchableOpacity>
          </View>
        </Modal>
      </Portal>

      {/* Type Selection Modal */}
      <Portal>
        <Modal
          visible={typeModalVisible}
          onDismiss={() => setTypeModalVisible(false)}
          contentContainerStyle={styles.listModal}
          dismissable={true}
        >
          <Text style={styles.modalTitle}>Select Type</Text>
          <ScrollView style={styles.optionList} showsVerticalScrollIndicator={true}>
            {typeOptions.map((type) => {
              const selected = modalType === type;
              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => { setModalType(type); setTypeModalVisible(false); }}
                  style={[styles.optionItem, selected && styles.optionItemSelected]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{type}</Text>
                  {selected && <Text style={styles.optionCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Modal>
      </Portal>

      {/* Container Selection Modal */}
      <Portal>
        <Modal
          visible={containerModalVisible}
          onDismiss={() => setContainerModalVisible(false)}
          contentContainerStyle={styles.listModal}
          dismissable={true}
        >
          <Text style={styles.modalTitle}>Select Container</Text>
          {[1, 2, 3, 4, 0].map((n) => {
            const selected = localItem.containers.category === n;
            return (
              <TouchableOpacity
                key={n}
                onPress={() => handleSelectContainer(n)}
                style={[styles.optionItem, selected && styles.optionItemSelected]}
                activeOpacity={0.7}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {n === 0 ? 'None' : `C${n}`}
                </Text>
                {selected && <Text style={styles.optionCheck}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    backgroundColor: color.surface,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
  },
  rowChecked: {
    backgroundColor: color.positiveBg,
  },
  dataLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemCell: {
    flex: 1,
    minWidth: 120,
    flexDirection: 'row',
    paddingRight: space.sm,
  },
  checkbox: {
    paddingTop: 2,
    paddingRight: space.sm,
  },
  checkboxOn: {
    width: 20,
    height: 20,
    backgroundColor: color.positive,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMark: {
    color: color.textInverse,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 16,
  },
  checkboxOff: {
    width: 20,
    height: 20,
    backgroundColor: color.surface,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: color.borderStrong,
  },
  itemText: {
    flex: 1,
  },
  code: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '700',
    color: color.accent,
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: color.text,
    marginTop: 1,
  },
  typeTag: {
    alignSelf: 'flex-start',
    marginTop: space.xs,
    paddingHorizontal: space.xs,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceAlt,
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: color.textSecondary,
  },
  qtyGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  qtyValue: {
    fontFamily: mono,
    fontSize: 14,
    fontWeight: '600',
    color: color.text,
    textAlign: 'center',
    paddingVertical: 2,
  },
  qtyZero: {
    color: color.textMuted,
    fontWeight: '400',
  },
  qtyInput: {
    fontFamily: mono,
    fontSize: 14,
    color: color.text,
    textAlign: 'center',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.borderFocus,
    borderRadius: radius.sm,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  contCell: {
    alignItems: 'center',
  },
  contTag: {
    paddingHorizontal: space.xs,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: color.accentBorder,
    backgroundColor: color.accentBg,
    borderRadius: radius.sm,
    minWidth: 28,
    alignItems: 'center',
  },
  contTagEmpty: {
    borderColor: color.border,
    backgroundColor: color.surfaceAlt,
  },
  contTagText: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    color: color.accent,
  },
  contTagTextEmpty: {
    color: color.textMuted,
  },
  actionCell: {
    alignItems: 'stretch',
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    borderRadius: radius.sm,
    paddingVertical: 5,
    alignItems: 'center',
    marginBottom: space.xs,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: color.textSecondary,
    letterSpacing: 0.3,
  },
  actionBtnPrimary: {
    backgroundColor: color.accent,
    borderColor: color.accent,
  },
  actionBtnTextPrimary: {
    color: color.textInverse,
  },
  actionBtnNote: {
    backgroundColor: color.warningBg,
    borderColor: color.warning,
  },
  actionBtnTextNote: {
    color: color.warning,
  },
  notesSection: {
    marginTop: space.sm,
    marginLeft: 28,
    padding: space.sm,
    backgroundColor: color.surfaceAlt,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.xs,
  },
  noteLabel: {
    ...font.label,
  },
  noteAction: {
    fontSize: 12,
    fontWeight: '700',
    color: color.accent,
    letterSpacing: 0.3,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: color.borderFocus,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
    fontSize: 14,
    backgroundColor: color.surface,
    color: color.text,
    textAlignVertical: 'top',
    minHeight: 72,
  },
  noteText: {
    fontSize: 14,
    color: color.textSecondary,
    lineHeight: 20,
  },
  noteEmpty: {
    fontStyle: 'italic',
    color: color.textMuted,
  },

  // Modals
  editModal: {
    backgroundColor: color.surface,
    margin: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    padding: space.xl,
    minWidth: 320,
    maxWidth: '92%',
    alignSelf: 'center',
    maxHeight: '85%',
  },
  listModal: {
    backgroundColor: color.surface,
    margin: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    padding: space.lg,
    maxWidth: '92%',
    alignSelf: 'center',
    maxHeight: '75%',
  },
  modalTitle: {
    ...font.title,
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: space.lg,
    paddingBottom: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  modalLabel: {
    ...font.label,
    marginTop: space.md,
    marginBottom: space.xs,
  },
  readOnlyText: {
    fontFamily: mono,
    fontSize: 14,
    color: color.textSecondary,
    backgroundColor: color.surfaceSunken,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.border,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: 14,
    backgroundColor: color.surface,
    color: color.text,
  },
  selectField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: color.surface,
  },
  selectFieldText: {
    fontSize: 14,
    color: color.text,
    fontWeight: '600',
  },
  selectFieldChevron: {
    fontSize: 12,
    color: color.textMuted,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space.xl,
    gap: space.sm,
  },
  btnGhost: {
    flex: 1,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  btnGhostText: {
    fontSize: 14,
    fontWeight: '700',
    color: color.textSecondary,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: color.accent,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: color.textInverse,
  },
  btnDanger: {
    backgroundColor: color.negative,
    borderRadius: radius.sm,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionList: {
    maxHeight: 380,
    flexGrow: 0,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  optionItemSelected: {
    backgroundColor: color.accentBg,
  },
  optionText: {
    fontSize: 14,
    color: color.text,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: color.accent,
    fontWeight: '700',
  },
  optionCheck: {
    fontSize: 14,
    fontWeight: '900',
    color: color.accent,
  },
});

export default InventoryRow;
