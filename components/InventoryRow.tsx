import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Modal, Portal, Button as PaperButton, List } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { InventoryItem } from '../types/inventoryItem';
import { useInventory } from '../context/InventoryContext';
import { useSession } from '../context/SessionContext';
import { InventoryMutations, UserNotAuthenticatedError } from '../utils/inventoryMutations';
import { useNavigation } from '@react-navigation/native';
import { CloseIcon, DeleteIcon } from './CustomIcons';

const typeOptions = [
  'Assortment', 'Candle', 'Firecracker', 'Rocket', 'Smoke', 'Sparkler', 'Toy', 
  'Rack', 'Fountain', 'Mortar', 'Missile', 'Z-repeater', '200g', '500g', 'Novelty', 'Free Item', 'Shirt', 'Other'
];

const InventoryRow = ({ item }: { item: InventoryItem }) => {
  const [typeModalVisible, setTypeModalVisible] = useState(false);

  const { calculateTotal, updateItem } = useInventory();
  const { activeUser } = useSession();
  const navigation = useNavigation();
  const [localItem, setLocalItem] = useState(item);
  const [editingInfo, setEditingInfo] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [editingNote, setEditingNote] = useState(false);

useEffect(() => {
  setLocalItem({
    ...item,
    type: item.type || 'Other', // ensure default fallback
  });
}, [item]);


  const handleChange = (key: keyof InventoryItem, value: string | boolean) => {
    setLocalItem(prev => ({
      ...prev,
      [key]: key === 'showroom' || key === 'warehouse' || key === 'storage' || key === 'closet'
        ? parseInt(value as string) || 0
        : key === 'checked'
        ? value
        : value,
    }));
  };

  const handleSaveInfo = async () => {
    const trimmedCode = localItem.code?.trim();
    const trimmedName = localItem.name?.trim();

    if (!trimmedCode || !trimmedName) {
      Alert.alert("Error", "Both code and name are required.");
      return;
    }

    const optimisticUpdate = { 
      ...localItem, 
      code: trimmedCode, 
      name: trimmedName 
    };
    const oldItem = { ...item }; // Store original for potential rollback
    
    // Optimistic update - UI responds immediately
    setLocalItem(optimisticUpdate);
    setEditingInfo(false);
    
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
        setEditingInfo(true);
      }
    }
  };



  const handleSaveLocation = async () => {
    const optimisticUpdate = { ...localItem };
    const oldItem = { ...item }; // Store original for potential rollback
    
    // Optimistic update - UI responds immediately
    setEditingLocation(false);
    
    try {
      // Background database update
      await InventoryMutations.updateItem(activeUser, item, optimisticUpdate);
    } catch (error) {
      if (error instanceof UserNotAuthenticatedError) {
        navigation.navigate('UserSelection' as never);
      } else {
        Alert.alert('Error', 'Failed to update item quantities');
        console.error(error);
        // Revert on error
        setLocalItem(oldItem);
        setEditingLocation(true);
      }
    }
  };

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

  const shouldShow = (key: keyof InventoryItem) =>
    editingLocation || localItem[key] > 0;

  return (
    <View style={styles.row}>
      <View style={styles.headerRow}>
        <View style={styles.nameSection}>
          <TouchableOpacity
            onPress={handleCheckboxToggle}
            style={styles.customCheckbox}
          >
            {localItem.checked ? (
              <View style={styles.checkedCheckbox}>
                <CloseIcon size={16} color="#FFFFFF" />
              </View>
            ) : (
              <View style={styles.uncheckedCheckbox} />
            )}
          </TouchableOpacity>
          {editingInfo ? (
            <TextInput
              style={[styles.input, { flex: 1, marginLeft: 8 }]}
              value={localItem.code}
              onChangeText={(val) => handleChange('code', val)}
              onSubmitEditing={handleSaveInfo}
              returnKeyType="done"
            />
          ) : (
            <Text style={[styles.header, { marginLeft: 8 }]}>
              {item.code} — {item.name}
            </Text>
          )}
        </View>
        <View style={styles.buttonGroup}>
         <PaperButton
            mode="contained"
            onPress={editingInfo ? handleSaveInfo : () => setEditingInfo(true)}
            compact
            style={styles.actionButton}
            contentStyle={styles.buttonContent}
          >
            {editingInfo ? 'Save' : 'Edit'}
          </PaperButton>

          <PaperButton
            mode="contained"
            onPress={editingLocation ? handleSaveLocation : () => setEditingLocation(true)}
            compact
            style={styles.actionButton}
            contentStyle={styles.buttonContent}
          >
            {editingLocation ? 'Save' : 'Move'}
          </PaperButton>

          <PaperButton
            mode="contained"
            onPress={() => setShowNotes(!showNotes)}
            compact
            style={[
              styles.actionButton,
              {
                backgroundColor: (localItem.note && localItem.note.trim()) ? '#FF9800' : '#6C757D'
              }
            ]}
            contentStyle={styles.buttonContent}
          >
            Note
          </PaperButton>

          {editingInfo && (
            <PaperButton
              mode="contained"
              onPress={handleDelete}
              compact
              style={[styles.actionButton, styles.deleteButton]}
              contentStyle={styles.buttonContent}
              icon={() => <DeleteIcon size={16} color="#FFFFFF" />}
            >
              Delete
            </PaperButton>
          )}

        </View>
      </View>

      {editingInfo && (
        <TextInput
          style={styles.input}
          value={localItem.name}
          onChangeText={(val) => handleChange('name', val)}
          onSubmitEditing={handleSaveInfo}
          returnKeyType="done"
        />
      )}

      {editingInfo ? (
        <View>
          <PaperButton mode="outlined" onPress={() => setTypeModalVisible(true)}>
            {localItem.type || 'Select Type'}
          </PaperButton>

          <Portal>
            <Modal 
              visible={typeModalVisible} 
              onDismiss={() => setTypeModalVisible(false)} 
              contentContainerStyle={styles.modal}
              dismissable={true}
              style={{ backgroundColor: 'transparent' }}
            >
              {typeOptions.map((type) => (
                <List.Item
                  key={type}
                  title={type}
                  onPress={() => {
                    handleChange('type', type);
                    setTypeModalVisible(false);
                  }}
                />
              ))}
            </Modal>
          </Portal>
        </View>
      ) : (
        <Text style={{ marginBottom: 8, fontSize: 15, color: '#6C757D', fontWeight: '500' }}>Type: {item.type}</Text>
      )}

      {(['showroom', 'warehouse', 'storage', 'closet'] as const).map((loc) =>
        shouldShow(loc) ? (
          <View key={loc} style={styles.inputRow}>
            <Text style={styles.label}>{loc}:</Text>
            {editingLocation ? (
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(localItem[loc])}
                onChangeText={(val) => handleChange(loc, val)}
                onSubmitEditing={handleSaveLocation}
                returnKeyType="done"
              />
            ) : (
              <Text style={{ 
                fontSize: 16, 
                fontWeight: '600', 
                color: '#495057',
                minWidth: 30 
              }}>{localItem[loc]}</Text>
            )}
          </View>
        ) : null
      )}

      {showNotes && (
        <View style={styles.notesSection}>
          <View style={styles.noteHeader}>
            <Text style={styles.noteLabel}>Note:</Text>
            <PaperButton
              mode="text"
              onPress={editingNote ? handleSaveNote : () => setEditingNote(true)}
              compact
            >
              {editingNote ? 'Save' : 'Edit'}
            </PaperButton>
          </View>
          {editingNote ? (
            <TextInput
              style={styles.noteInput}
              multiline
              numberOfLines={3}
              value={localItem.note || ''}
              onChangeText={(val) => handleChange('note', val)}
              placeholder="Add a note for this item..."
              returnKeyType="done"
              onSubmitEditing={handleSaveNote}
            />
          ) : (
            <Text style={[
              styles.noteText, 
              { fontStyle: (localItem.note && localItem.note.trim()) ? 'normal' : 'italic' }
            ]}>
              {localItem.note || 'No note added'}
            </Text>
          )}
        </View>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  modal: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
    maxWidth: '90%',
    alignSelf: 'center',
    maxHeight: '80%',
  },
  row: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#F8F9FA',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  nameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  header: {
    fontWeight: '700',
    fontSize: 17,
    color: '#2C3E50',
    flex: 1,
  },
  buttonGroup: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 6,
  },
  actionButton: {
    minWidth: 0,
    paddingHorizontal: 8,
  },
  buttonContent: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  label: {
    width: 90,
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
    textTransform: 'capitalize',
  },
  input: {
    borderWidth: 2,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flex: 1,
    marginVertical: 4,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
    maxWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pickerContainer: {
    height: 40,
    width: 150,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 6,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 40,
    width: '100%',
  },
  notesSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#34495E',
  },
  noteInput: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  noteText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
    minHeight: 60,
  },
  customCheckbox: {
    marginRight: 8,
  },
  checkedCheckbox: {
    width: 24,
    height: 24,
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  uncheckedCheckbox: {
    width: 24,
    height: 24,
    backgroundColor: 'transparent',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#CCCCCC',
  },
  deleteButton: {
    backgroundColor: '#E74C3C',
  },
});

export default InventoryRow;
