import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Modal, Portal, Button as PaperButton, List } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { InventoryItem } from '../types/InventoryItem';
import { useInventory } from '../context/InventoryContext';

const typeOptions = [
  'Assortment', 'Candle', 'Firecracker', 'Rocket',
  'Smoke', 'Sparkler', 'Toy', 'Mortar', '500g', 'Other'
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
      [key]: key === 'showroom' || key === 'warehouse' || key === 'storage'
        ? parseInt(value) || 0
        : value,
    }));
  };

  const handleSaveInfo = () => {
    updateItem({ ...localItem });
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
        <Text style={{ marginBottom: 6 }}>Type: {item.type}</Text>
      )}

      {(['showroom', 'warehouse', 'storage'] as const).map((loc) =>
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
              <Text>{localItem[loc]}</Text>
            )}
          </View>
        ) : null
      )}

      {calculateTotal(localItem) > 0 && (
        <Text>Total: {calculateTotal(localItem)}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  modal: {
  backgroundColor: 'white',
  margin: 20,
  borderRadius: 8,
  padding: 16,
},
  row: {
    borderBottomWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  header: {
    fontWeight: 'bold',
    flex: 1,
    paddingRight: 10,
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    width: 90,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 180,
    marginVertical: 4,
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
