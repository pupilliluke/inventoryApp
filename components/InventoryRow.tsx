import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Modal, Portal, Button as PaperButton, List } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { InventoryItem } from '../types/InventoryItem';
import { useInventory } from '../context/InventoryContext';

const typeOptions = [
  'Assortment', 'Candle', 'Firecracker', 'Rocket', 'Smoke', 'Sparkler', 'Toy', 
  'Rack', 'Fountain', 'Mortar', 'Missile', 'Z-repeater', '200g', '500g', 'Novelty', 'Free Item', 'Shirt', 'Other'
];

const InventoryRow = ({ item }: { item: InventoryItem }) => {
  const [typeModalVisible, setTypeModalVisible] = useState(false);

  const { calculateTotal, updateItem } = useInventory();
  const [localItem, setLocalItem] = useState(item);
  const [editingInfo, setEditingInfo] = useState(false);
  const [editingLocation, setEditingLocation] = useState(false);

useEffect(() => {
  setLocalItem({
    ...item,
    type: item.type || 'Other', // ensure default fallback
  });
}, [item]);


  const handleChange = (key: keyof InventoryItem, value: string) => {
    setLocalItem(prev => ({
      ...prev,
      [key]: key === 'showroom' || key === 'warehouse' || key === 'storage' || key === 'closet'
        ? parseInt(value) || 0
        : value,
    }));
  };

  const handleSaveInfo = () => {
  const trimmedCode = localItem.code?.trim();
  const trimmedName = localItem.name?.trim();

  if (!trimmedCode || !trimmedName) {
    alert("Both code and name are required.");
    return;
  }

  updateItem({ ...localItem, code: trimmedCode, name: trimmedName });
  setEditingInfo(false);
};



  const handleSaveLocation = () => {
    updateItem({ ...localItem });
    setEditingLocation(false);
  };

  const shouldShow = (key: keyof InventoryItem) =>
    editingLocation || localItem[key] > 0;

  return (
    <View style={styles.row}>
      <View style={styles.headerRow}>
        {editingInfo ? (
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 10 }]}
            value={localItem.code}
            onChangeText={(val) => handleChange('code', val)}
          />
        ) : (
          <Text style={styles.header}>
            {item.code} — {item.name}
          </Text>
        )}
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

        </View>
      </View>

      {editingInfo && (
        <TextInput
          style={styles.input}
          value={localItem.name}
          onChangeText={(val) => handleChange('name', val)}
        />
      )}

      {editingInfo ? (
        <View>
          <PaperButton mode="outlined" onPress={() => setTypeModalVisible(true)}>
            {localItem.type || 'Select Type'}
          </PaperButton>

          <Portal>
            <Modal visible={typeModalVisible} onDismiss={() => setTypeModalVisible(false)} contentContainerStyle={styles.modal}>
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

      {calculateTotal(localItem) > 0 && (
        <View style={{ 
          backgroundColor: '#E8F5E8', 
          padding: 10, 
          borderRadius: 8, 
          marginTop: 8,
          borderLeftWidth: 4,
          borderLeftColor: '#4CAF50'
        }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: '700', 
            color: '#2E7D32' 
          }}>Total: {calculateTotal(localItem)}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  modal: {
    backgroundColor: 'white',
    margin: 20,
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
  header: {
    fontWeight: '700',
    fontSize: 16,
    color: '#2C3E50',
    flex: 1,
    paddingRight: 12,
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
});

export default InventoryRow;
