import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import FilterBar from '../components/FilterBar';
import InventoryRow from '../components/InventoryRow';
import { Button, Modal, Portal, TextInput, Appbar, Chip, List } from 'react-native-paper';
import { Keyboard, SafeAreaView, View, Text, FlatList, StyleSheet, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ref, update } from 'firebase/database'; // at the top, if not already
import { db } from '../firebaseConfig'; // make sure this import exists
import UserListPage from './UserListPage'; // Import UserPage if needed

const typeFilters = [
  'Assortment', 'Candle', 'Firecracker', 'Rocket', 'Smoke', 'Sparkler', 'Toy', 'Mortar', 'Missile', 
  'Rack', 'Fountain', 'Z-repeater', '200g', '500g', 'Novelty', 'Free Item', 'Shirt', 'Other'
];



export default function InventoryMain() {

  // const [ getUserPage, setUserPage] = useState(false);

  // if(getUserPage)
  //   {
  //     return <UserListPage />;
  //   }
  

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
    filterLocation,
    multiTypeFilters = [],
  } = useInventory();

  const [manageVisible, setManageVisible] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [deleteQuery, setDeleteQuery] = useState('');
  const [showTypeFilters, setShowTypeFilters] = useState(false);
  const [addExpanded, setAddExpanded] = useState(false);
  const [deleteExpanded, setDeleteExpanded] = useState(false);
  useEffect(() => {
    const patchClosetField = () => {
      originalInventory.forEach((item) => {
        if (item.closet === undefined) {
          const itemRef = ref(db, `inventory/${item.code}`);
          update(itemRef, { closet: 0 });
        }
      });
    };

    if (originalInventory.length > 0) {
      patchClosetField();
    }
  }, [originalInventory]);




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


const clearLocation = async (location: 'warehouse' | 'showroom') => {
  const updates = {};
  originalInventory.forEach(item => {
    if (item[location] !== 0) {
      updates[`inventory/${item.code}/${location}`] = 0;
    }
  });

  try {
    await update(ref(db), updates);
  } catch (error) {
    console.error('Error clearing location:', error);
  }
};



  return (
    
   <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: 0,}}>
    <Appbar.Header
      elevated={true}
      style={{
        paddingTop: 0,
        marginTop: 0,
        position: 'absolute',
        top: 0,
        left: 5,
        right: 5, 
        bottom: 10,
        zIndex: 1,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
      }}
    >
      <Appbar.Content 
        title="Fireworks Inventory" 
        titleStyle={{
          fontSize: 18,
          fontWeight: '600',
          color: '#333333',
        }}
      />
        <Appbar.Action 
          icon="account" 
          iconColor="#666666"
          onPress={() => navigation.navigate('UserListPage')} 
        />
        <Appbar.Action 
          icon="plus-box-multiple" 
          iconColor="#666666"
          onPress={() => setManageVisible(true)} 
        />
      </Appbar.Header>


  {/* Add a spacer view below to offset the content below the fixed header */}
  <View style={{ flex: 1, paddingHorizontal: 16, backgroundColor: '#FFFFFF' }}>
    <View style={{ height: 56 }} />

        <FilterBar />

     <View style={styles.filterRow}>
        <View style={{ flex: 1, flexDirection: 'column', }}>
            <List.Accordion 
            style={{
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: '#E5E5E5',
              borderRadius: 8,
              marginVertical: 8,
            }}
            titleStyle={{
              color: '#333333',
              fontSize: 16,
              fontWeight: '500',
            }}
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
            <Button 
              mode="contained" 
              onPress={resetFilters}
              style={{
                backgroundColor: '#F5F5F5',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#E5E5E5',
              }}
              contentStyle={{
                paddingVertical: 8,
                paddingHorizontal: 16,
              }}
              labelStyle={{
                fontSize: 14,
                fontWeight: '500',
                color: '#666666',
              }}
            >
              Reset
            </Button>
        </View>
        
      

        </View>


        <View style={{
          backgroundColor: '#FFFFFF',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 8,
          marginVertical: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
        }}>
          <Text style={{ 
            fontSize: 16, 
            color: '#495057', 
            fontWeight: '600',
            textAlign: 'center'
          }}>
            Showing {inventory.length} items
          </Text>
        </View>

        <FlatList
          data={inventory}
          keyExtractor={item => item.code}
          renderItem={({ item }) => <InventoryRow item={item} />}
        />

        <Portal>
          <Modal
            visible={manageVisible}
            onDismiss={() => setManageVisible(false)}
            contentContainerStyle={styles.modal}
          >
            <View style={{
              backgroundColor: '#F8F9FA',
              paddingVertical: 20,
              paddingHorizontal: 24,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderBottomWidth: 1,
              borderBottomColor: '#E5E5E5',
            }}>
              <Text style={{
                fontSize: 20,
                fontWeight: '700',
                color: '#2C3E50',
                textAlign: 'center',
              }}>Manage Inventory</Text>
              <Text style={{
                fontSize: 14,
                color: '#7F8C8D',
                textAlign: 'center',
                marginTop: 4,
              }}>Add new items or remove existing ones</Text>
            </View>
         <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
         <List.Accordion
            title="Add New Item"
            expanded={addExpanded}
            onPress={() => setAddExpanded(!addExpanded)}
            left={props => <List.Icon {...props} icon="plus-box" />}
            style={{
              marginBottom: 16,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#E5E5E5',
            }}
            titleStyle={{
              fontSize: 16,
              fontWeight: '600',
              color: '#333333',
            }}
          >
            <View style={{
              padding: 20,
              backgroundColor: '#FAFAFA',
              borderBottomLeftRadius: 12,
              borderBottomRightRadius: 12,
              marginTop: -1,
            }}>
              <TextInput
                label="Product Code"
                value={newCode}
                onChangeText={setNewCode}
                mode="outlined"
                style={[styles.input, { marginBottom: 20 }]}
                outlineStyle={{
                  borderColor: '#E5E5E5',
                  borderRadius: 8,
                }}
              />
              <TextInput
                label="Product Name"
                value={newName}
                onChangeText={setNewName}
                mode="outlined"
                style={[styles.input, { marginBottom: 24 }]}
                outlineStyle={{
                  borderColor: '#E5E5E5',
                  borderRadius: 8,
                }}
              />
              <Button
                mode="contained"
                onPress={() => {
                  Keyboard.dismiss();
                  handleAddItem();
                }}
                style={{
                  backgroundColor: '#4CAF50',
                  borderRadius: 8,
                  paddingVertical: 4,
                }}
                contentStyle={{
                  paddingVertical: 12,
                }}
                labelStyle={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#FFFFFF',
                }}
              >
                Add Item
              </Button>
            </View>
          </List.Accordion>


          <List.Accordion
            title="Delete Item"
            left={props => <List.Icon {...props} icon="delete" />}
            style={{
              marginBottom: 16,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#E5E5E5',
            }}
            titleStyle={{
              fontSize: 16,
              fontWeight: '600',
              color: '#333333',
            }}
          >
            <View style={{
              padding: 20,
              backgroundColor: '#FAFAFA',
              borderBottomLeftRadius: 12,
              borderBottomRightRadius: 12,
              marginTop: -1,
            }}>
              <TextInput
                label="Search by code, name, type, or location"
                value={deleteQuery}
                onChangeText={setDeleteQuery}
                mode="outlined"
                style={[styles.input, { marginBottom: 20 }]}
                outlineStyle={{
                  borderColor: '#E5E5E5',
                  borderRadius: 8,
                }}
              />
              {filteredForDelete.length > 0 && (
                <View style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: '#E5E5E5',
                }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#333333',
                    marginBottom: 16,
                    textAlign: 'center',
                  }}>Found {filteredForDelete.length} item(s)</Text>
                  {filteredForDelete.map(item => (
                    <View key={item.code} style={{
                      backgroundColor: '#F8F9FA',
                      borderRadius: 8,
                      padding: 16,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: '#E9ECEF',
                    }}>
                      <Text style={{
                        fontSize: 15,
                        fontWeight: '600',
                        color: '#333333',
                        marginBottom: 8,
                      }}>{item.code} — {item.name}</Text>
                      <Button
                        mode="contained"
                        icon="delete"
                        onPress={() => handleDeleteItem(item.code)}
                        style={{
                          backgroundColor: '#FF6B6B',
                          borderRadius: 8,
                        }}
                        contentStyle={{
                          paddingVertical: 8,
                        }}
                        labelStyle={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: '#FFFFFF',
                        }}
                      >
                        Delete Item
                      </Button>
                    </View>
                  ))}
                </View>
              )}
              {deleteQuery.trim().length > 0 && filteredForDelete.length === 0 && (
                <View style={{
                  backgroundColor: '#FFF3CD',
                  borderRadius: 8,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#FFEAA7',
                }}>
                  <Text style={{
                    fontSize: 15,
                    color: '#856404',
                    textAlign: 'center',
                  }}>No items found matching your search</Text>
                </View>
              )}
            </View>
          </List.Accordion>
        </ScrollView>
          </Modal>

        </Portal>              
        </View>
    </SafeAreaView>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  resetWrapper: {
    marginLeft: 12,
    justifyContent: 'center',
  },
  resetBtn: {
    marginBottom: 10,
  },
  modal: {
    backgroundColor: 'white',
    padding: 0,
    margin: 20,
    borderRadius: 20,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 15,
  },
  modalTitle: {
    fontWeight: '700',
    fontSize: 20,
    marginBottom: 20,
    color: '#2C3E50',
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  typeFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
});
