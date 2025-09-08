import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { Modal, Portal, Button as PaperButton, List, Checkbox } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { InventoryItem } from '../types/inventoryItem';
import { useInventory } from '../context/InventoryContext';
import { useSession } from '../context/SessionContext';
import { InventoryMutations, UserNotAuthenticatedError } from '../utils/inventoryMutations';
import { useNavigation } from '@react-navigation/native';

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

    try {
      await InventoryMutations.updateItem(activeUser, item, { 
        ...localItem, 
        code: trimmedCode, 
        name: trimmedName 
      });
      setEditingInfo(false);
    } catch (error) {
      if (error instanceof UserNotAuthenticatedError) {
        navigation.navigate('UserSelection' as never);
      } else {
        Alert.alert('Error', 'Failed to update item');
        console.error(error);
      }
    }
  };



  const handleSaveLocation = async () => {
    try {
      await InventoryMutations.updateItem(activeUser, item, { ...localItem });
      setEditingLocation(false);
    } catch (error) {
      if (error instanceof UserNotAuthenticatedError) {
        navigation.navigate('UserSelection' as never);
      } else {
        Alert.alert('Error', 'Failed to update item quantities');
        console.error(error);
      }
    }
  };

  const handleCheckboxToggle = async () => {
    const newCheckedState = !localItem.checked;
    setLocalItem(prev => ({ ...prev, checked: newCheckedState }));
    
    try {
      await InventoryMutations.updateItem(activeUser, item, { 
        ...localItem, 
        checked: newCheckedState 
      });
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
    try {
      await InventoryMutations.updateItem(activeUser, item, { ...localItem });
      setEditingNote(false);
    } catch (error) {
      if (error instanceof UserNotAuthenticatedError) {
        navigation.navigate('UserSelection' as never);
      } else {
        Alert.alert('Error', 'Failed to update note');
        console.error(error);
      }
    }
  };

  const shouldShow = (key: keyof InventoryItem) =>
    editingLocation || localItem[key] > 0;

  return (
    <View style={styles.row}>
      <View style={styles.headerRow}>
        <View style={styles.nameSection}>
          <Checkbox
            status={localItem.checked ? 'checked' : 'unchecked'}
            onPress={handleCheckboxToggle}
            color="#4CAF50"
          />
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
          >
            {editingInfo ? 'Save' : 'Edit'}
          </PaperButton>

          <View style={{ width: 8 }} />
          <PaperButton
  mode="contained"
  onPress={editingLocation ? handleSaveLocation : () => setEditingLocation(true)}
>
  {editingLocation ? 'Save' : 'Move'}
</PaperButton>

          <View style={{ width: 8 }} />
          <PaperButton
            mode="contained"
            onPress={() => setShowNotes(!showNotes)}
            style={{
              backgroundColor: (localItem.note && localItem.note.trim()) ? '#FF9800' : '#6C757D'
            }}
          >
            Note
          </PaperButton>

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
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: '90%',
    alignSelf: 'center',
    maxHeight: '80%',
  },
  row: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
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
    fontSize: 16,
    color: '#2C3E50',
    flex: 1,
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    color: '#34495E',
    textTransform: 'capitalize',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
    marginVertical: 4,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    maxWidth: 200,
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
});

export default InventoryRow;
