import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import FilterBar from '../components/FilterBar';
import InventoryRow from '../components/InventoryRow';
import { Button, Modal, Portal, TextInput, Appbar, Chip, List } from 'react-native-paper';
import { Keyboard, SafeAreaView, View, Text, FlatList, StyleSheet, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const typeFilters = [
  'Assortment', 'Candle', 'Firecracker', 'Rocket', 'Smoke', 'Sparkler', 'Toy', 'Mortar', 'Missile', 
  'Rack', 'Fountain', 'Z-repeater', '200g', '500g', 'Novelty', 'Free Item', 'Shirt', 'Other'
];

export default function InventoryMain() {
  const navigation = useNavigation();

  const {
    inventory,
    updateItem,
    resetFilters,
    originalInventory,
    removeItem,
    setFilterType,
    filterType,
    setMultiTypeFilters,
    multiTypeFilters = [],
  } = useInventory();

  const [manageVisible, setManageVisible] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [deleteQuery, setDeleteQuery] = useState('');
  const [showTypeFilters, setShowTypeFilters] = useState(false);
const [addExpanded, setAddExpanded] = useState(false);
const [deleteExpanded, setDeleteExpanded] = useState(false);

  const handleAddItem = () => {
    if (!newCode || !newName) return;
    Keyboard.dismiss(); //  Dismiss keyboard
    updateItem({
      code: newCode,
      name: newName,
      type: 'Other',
      showroom: 0,
      warehouse: 0,
      storage: 0,
      editable: false,
    });
    setNewCode('');
    setNewName('');
    setManageVisible(false);
  };


  const handleDeleteItem = (code) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete item ${code}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeItem(code) }
      ]
    );
  };

  const toggleTypeFilter = (type: string) => {
    setMultiTypeFilters(prev =>
      (prev || []).includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
    setFilterType(''); // Clear single filter usage
  };

  const filteredForDelete = deleteQuery.trim().length > 0 ? originalInventory.filter(item => {
    const query = deleteQuery.toLowerCase();
    return (
      item.code.toLowerCase().includes(query) ||
      item.name.toLowerCase().includes(query) ||
      item.type?.toLowerCase().includes(query) ||
      ['showroom', 'warehouse', 'storage'].some(loc => item[loc] > 0 && loc.includes(query))
    );
  }) : [];

  return (
   <SafeAreaView style={{ flex: 1, backgroundColor: 'white', paddingTop: 0 }}>
    <Appbar.Header
      elevated={true}
      style={{
        paddingTop: 0,
        marginTop: 0,
        position: 'absolute',
        top: 0,
        left: 5,
        right: 5,
        zIndex: 10,
      }}
    >
      <Appbar.Content title="Fireworks Inventory" />
      <Appbar.Action icon="account" onPress={() => navigation.navigate('UserList')} />
      <Appbar.Action icon="plus-box-multiple" onPress={() => setManageVisible(true)} />
</Appbar.Header>


  {/* Add a spacer view below to offset the content below the fixed header */}
  <View style={{ flex: 1, paddingHorizontal: 16 }}>
    <View style={{ height: 56 }} />

        <FilterBar />

     <View style={styles.filterRow}>
        <View style={{ flex: 1 }}>
            <List.Accordion
            title="Filter by Type"
            expanded={showTypeFilters}
            onPress={() => setShowTypeFilters(!showTypeFilters)}
            >
            <View style={styles.typeFilterContainer}>
                {typeFilters.map(type => (
                <Chip
                    key={type}
                    selected={(multiTypeFilters || []).includes(type)}
                    onPress={() => toggleTypeFilter(type)}
                    style={styles.chip}
                >
                    {type}
                </Chip>
                ))}
            </View>
            </List.Accordion>
        </View>

        <View style={styles.resetWrapper}>
            <Button mode="outlined" onPress={resetFilters}>
            <Text>Reset</Text>
            </Button>
        </View>
        </View>


        <Text style={{ marginVertical: 10, color: 'black' }}>
          Showing {inventory.length} items
        </Text>

        <FlatList
          data={inventory}
          keyExtractor={item => item.code}
          renderItem={({ item }) => <InventoryRow item={item} />}
        />

        <Portal>
          <Modal
            visible={manageVisible}
            onDismiss={() => setManageVisible(false)}
            contentContainerStyle={[styles.modal, { justifyContent: 'flex-start' }]}
          >
         <ScrollView>
         <List.Accordion
            title="Add New Item"
            expanded={addExpanded}
            onPress={() => setAddExpanded(!addExpanded)}
            left={props => <List.Icon {...props} icon="plus" />}
          >
            <View>
              <TextInput
                label="Code"
                value={newCode}
                onChangeText={setNewCode}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Name"
                value={newName}
                onChangeText={setNewName}
                mode="outlined"
                style={styles.input}
              />
              <Button
                mode="contained"
                onPress={() => {
                  Keyboard.dismiss();
                  handleAddItem();
                }}
              >
                <Text>Add Item</Text>
              </Button>

            </View>
          </List.Accordion>


          <List.Accordion
            title="Delete Item"
            left={props => <List.Icon {...props} icon="delete" />}
          >
            <View>
              <TextInput
                label="Search by code, name, type, or location"
                value={deleteQuery}
                onChangeText={setDeleteQuery}
                mode="outlined"
                style={styles.input}
              />
              {filteredForDelete.map(item => (
                <View key={item.code} style={{ marginBottom: 8 }}>
                  <Text>{item.code} — {item.name}</Text>
                  <Button
                    mode="outlined"
                    icon="delete"
                    onPress={() => handleDeleteItem(item.code)}
                  >
                    <Text>Delete</Text>
                  </Button>
                </View>
              ))}
            </View>
          </List.Accordion>
        </ScrollView>

          </Modal>

        </Portal>              </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  filterRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 10,
},
resetWrapper: {
  marginLeft: 8,
  justifyContent: 'center',
},

  resetBtn: {
    marginBottom: 10,
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 0,
    borderRadius: 8,
    maxHeight: '90%',
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 16,
    color: 'black',
  },
  input: {
    marginBottom: 12,
  },
  typeFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 10,
    paddingLeft: 10,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
});
