import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import FilterBar from '../components/FilterBar';
import InventoryRow from '../components/InventoryRow';
import { Button, Modal, Portal, TextInput, Appbar, Chip, List, Dialog, Text as PaperText } from 'react-native-paper';
import { Keyboard, SafeAreaView, View, Text, FlatList, StyleSheet, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ref, update } from 'firebase/database'; // at the top, if not already
import { db } from '../firebaseConfig'; // make sure this import exists
import UserListPage from './UserListPage'; // Import UserPage if needed
import UserBadge from '../components/UserBadge';
import { useSession } from '../context/SessionContext';
import { InventoryMutations, UserNotAuthenticatedError } from '../utils/inventoryMutations';
import CustomIconButton from '../components/CustomIconButton';
import { EraserIcon, AddIcon, DropdownIcon, CollapseIcon, FilterIcon, CheckIcon, LogIcon, UsersIcon, CountIcon } from '../components/CustomIcons';

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
  const { activeUser } = useSession();

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
    loading,
  } = useInventory();

  const [manageVisible, setManageVisible] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [showTypeFilters, setShowTypeFilters] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(true);
  const [addExpanded, setAddExpanded] = useState(false);
  const [clearLocationExpanded, setClearLocationExpanded] = useState(false);
  const [confirmClearVisible, setConfirmClearVisible] = useState(false);
  const [locationToClear, setLocationToClear] = useState<'warehouse' | 'showroom' | null>(null);
  const [clearLocationStats, setClearLocationStats] = useState<{itemCount: number, totalQuantity: number}>({ itemCount: 0, totalQuantity: 0 });
  const [navigationMenuVisible, setNavigationMenuVisible] = useState(false);
  useEffect(() => {
    const patchMissingFields = () => {
      originalInventory.forEach((item) => {
        const updates: any = {};
        if (item.closet === undefined) {
          updates.closet = 0;
        }
        if (item.checked === undefined) {
          updates.checked = false;
        }
        if (item.note === undefined) {
          updates.note = '';
        }
        if (Object.keys(updates).length > 0) {
          const itemRef = ref(db, `inventory/${item.code}`);
          update(itemRef, updates);
        }
      });
    };

    if (originalInventory.length > 0) {
      patchMissingFields();
    }
  }, [originalInventory]);




  const handleAddItem = async () => {
    if (!newCode || !newName) return;
    Keyboard.dismiss(); 
    
    try {
      await InventoryMutations.createItem(activeUser, {
        code: newCode,
        name: newName,
        type: 'Other',
        showroom: 0,
        warehouse: 0,
        containers: { category: 0, quantity: 0 },
        closet: 0,
        checked: false,
        note: '',
        editable: false,
      });
      setNewCode('');
      setNewName('');
      setManageVisible(false);
    } catch (error) {
      if (error instanceof UserNotAuthenticatedError) {
        navigation.navigate('UserSelection' as never);
      } else {
        Alert.alert('Error', 'Failed to create item');
        console.error(error);
      }
    }
  };



  const toggleTypeFilter = useCallback((type: string) => {
    setMultiTypeFilters(prev =>
      (prev || []).includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
    setFilterType(''); // Clear single filter usage
  }, [setMultiTypeFilters, setFilterType]);

  // Memoize the selected type filters to avoid recalculating on every render
  const selectedTypeFilters = useMemo(() => new Set(multiTypeFilters || []), [multiTypeFilters]);



  const handleClearLocation = async (location: 'warehouse' | 'showroom') => {
    console.log(`Clear location button clicked for: ${location}`);

    const itemsWithQuantity = originalInventory.filter(item => item[location] > 0);
    const totalQuantity = itemsWithQuantity.reduce((sum, item) => sum + item[location], 0);
    
    console.log(`Items with quantity in ${location}:`, itemsWithQuantity.length, 'Total quantity:', totalQuantity);
    
    if (itemsWithQuantity.length === 0) {
      Alert.alert('Info', `No items found in ${location} to clear`);
      return;
    }

    setLocationToClear(location);
    setClearLocationStats({ itemCount: itemsWithQuantity.length, totalQuantity });
    setConfirmClearVisible(true);
  };

  const confirmClearLocation = async () => {
    if (!locationToClear) return;
    
    console.log(`Confirming clear for location: ${locationToClear}`);
    
    try {
      await InventoryMutations.clearLocation(activeUser, originalInventory, locationToClear);
      setConfirmClearVisible(false);
      setLocationToClear(null);
      Alert.alert('Success', `All ${locationToClear} quantities cleared`);
    } catch (error) {
      if (error instanceof UserNotAuthenticatedError) {
        navigation.navigate('UserSelection' as never);
      } else {
        Alert.alert('Error', `Failed to clear ${locationToClear} quantities`);
        console.error('Clear location error:', error);
      }
    }
  };

  const cancelClearLocation = () => {
    setConfirmClearVisible(false);
    setLocationToClear(null);
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
        <UserBadge style={{ marginRight: 4 }} />
        <CustomIconButton
          iconType="filter"
          onPress={() => setFiltersVisible(!filtersVisible)}
          color={filtersVisible ? '#2196F3' : '#666666'}
        />
        <CustomIconButton
          iconType="menu"
          onPress={() => setNavigationMenuVisible(true)}
        />
      </Appbar.Header>


  {/* Add a spacer view below to offset the content below the fixed header */}
  <ScrollView style={{ flex: 1, paddingHorizontal: 16, backgroundColor: '#FFFFFF' }}>
    <View style={{ height: 56 }} />

    {filtersVisible && (
      <>
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
            right={props => (
              <View>
                {showTypeFilters ? (
                  <CollapseIcon size={24} color="#333333" />
                ) : (
                  <DropdownIcon size={24} color="#333333" />
                )}
              </View>
            )}
            >
            <View style={styles.typeFilterContainer}>
                {typeFilters.map(type => {
                  const isSelected = selectedTypeFilters.has(type);
                  return (
                    <Chip
                        key={type}
                        selected={isSelected}
                        onPress={() => toggleTypeFilter(type)}
                        style={styles.chip}
                        icon={isSelected ? () => <CheckIcon size={16} color="#4CAF50" /> : undefined}
                    >
                        {type}
                    </Chip>
                  );
                })}
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
      </>
    )}


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

        {loading ? (
          // Loading skeleton
          <>
            {[1,2,3,4,5].map(i => (
              <View key={i} style={styles.skeletonCard}>
                <View style={styles.skeletonHeader} />
                <View style={styles.skeletonLine} />
                <View style={styles.skeletonLineShort} />
              </View>
            ))}
          </>
        ) : (
          inventory.map((item) => (
            <InventoryRow key={item.code} item={item} />
          ))
        )}
        
        <View style={{ height: 20 }} />
  </ScrollView>

        <Portal>
          <Modal
            visible={manageVisible}
            onDismiss={() => setManageVisible(false)}
            contentContainerStyle={styles.modal}
            dismissable={true}
            style={{ backgroundColor: 'transparent' }}
          >
            <View style={{
              backgroundColor: '#F8F9FA',
              paddingVertical: 24,
              paddingHorizontal: 32,
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
         <ScrollView contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 8 }}>
         <List.Accordion
            title="Add New Item"
            expanded={addExpanded}
            onPress={() => setAddExpanded(!addExpanded)}
            left={props => <AddIcon size={24} color="#333333" />}
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
                onSubmitEditing={() => {
                  if (newCode && newName) {
                    handleAddItem();
                  }
                }}
                mode="outlined"
                style={[styles.input, { marginBottom: 20 }]}
                outlineStyle={{
                  borderColor: '#E5E5E5',
                  borderRadius: 8,
                }}
                returnKeyType="done"
              />
              <TextInput
                label="Product Name"
                value={newName}
                onChangeText={setNewName}
                onSubmitEditing={() => {
                  if (newCode && newName) {
                    handleAddItem();
                  }
                }}
                mode="outlined"
                style={[styles.input, { marginBottom: 24 }]}
                outlineStyle={{
                  borderColor: '#E5E5E5',
                  borderRadius: 8,
                }}
                returnKeyType="done"
              />
              <Button
                mode="contained"
                icon={() => <AddIcon size={18} color="#FFFFFF" />}
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
            title="Clear Locations"
            left={props => <EraserIcon size={24} color="#333333" />}
            expanded={clearLocationExpanded}
            onPress={() => setClearLocationExpanded(!clearLocationExpanded)}
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
              <Text style={{
                fontSize: 14,
                color: '#666666',
                marginBottom: 16,
                textAlign: 'center',
                lineHeight: 20,
              }}>
                Clear all quantities from specific locations (Closet is protected)
              </Text>
              
              <View style={{ gap: 12 }}>
                {(['showroom', 'warehouse'] as const).map((location) => (
                  <Button
                    key={location}
                    mode="contained"
                    icon={() => <EraserIcon size={20} color="#FFFFFF" />}
                    onPress={() => {
                      console.log(`Button pressed for: ${location}`);
                      handleClearLocation(location);
                    }}
                    style={{
                      backgroundColor: '#FF9800',
                      borderRadius: 8,
                    }}
                    contentStyle={{
                      paddingVertical: 8,
                    }}
                    labelStyle={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: '#FFFFFF',
                      textTransform: 'capitalize',
                    }}
                  >
                    Clear All {location}
                  </Button>
                ))}
              </View>
            </View>
          </List.Accordion>
        </ScrollView>
          </Modal>

        </Portal>

        {/* Clear Location Confirmation Dialog */}
        <Portal>
          <Dialog
            visible={confirmClearVisible}
            onDismiss={cancelClearLocation}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              elevation: 10,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
            }}
            theme={{
              colors: { backdrop: 'rgba(0, 0, 0, 0.5)' }
            }}
          >
            <Dialog.Icon icon={() => <EraserIcon size={48} color="#FF9800" />} />
            <Dialog.Title style={{
              fontSize: 20,
              fontWeight: '700',
              color: '#1A1A1A',
              textAlign: 'center',
              marginBottom: 8,
            }}>
              Clear {locationToClear}
            </Dialog.Title>
            <Dialog.Content>
              <PaperText style={{
                fontSize: 16,
                color: '#333333',
                textAlign: 'center',
                marginBottom: 12,
                lineHeight: 22,
              }}>
                Are you sure you want to clear all quantities from {locationToClear}?
              </PaperText>
              <PaperText style={{
                fontSize: 14,
                color: '#666666',
                textAlign: 'center',
                marginBottom: 8,
              }}>
                This will affect {clearLocationStats.itemCount} items
              </PaperText>
              <PaperText style={{
                fontSize: 14,
                color: '#FF9800',
                textAlign: 'center',
                fontWeight: '600',
              }}>
                Total quantity to clear: {clearLocationStats.totalQuantity}
              </PaperText>
            </Dialog.Content>
            <Dialog.Actions style={{
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingTop: 20,
            }}>
              <Button
                mode="text"
                onPress={cancelClearLocation}
                textColor="#666666"
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={confirmClearLocation}
                buttonColor="#FF9800"
              >
                Clear All
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {/* Navigation Menu Modal */}
        <Portal>
          <Modal
            visible={navigationMenuVisible}
            onDismiss={() => setNavigationMenuVisible(false)}
            contentContainerStyle={styles.navigationModal}
            dismissable={true}
          >
            <View style={styles.navigationModalHeader}>
              <Text style={styles.navigationModalTitle}>Navigation</Text>
              <CustomIconButton
                iconType="close"
                onPress={() => setNavigationMenuVisible(false)}
                size={24}
              />
            </View>
            
            <View style={styles.navigationMenuItems}>
              <Button
                mode="contained"
                icon={() => <LogIcon size={20} color="#FFFFFF" />}
                onPress={() => {
                  setNavigationMenuVisible(false);
                  navigation.navigate('LogPage');
                }}
                style={[styles.navigationMenuItem, { backgroundColor: '#9C27B0' }]}
                contentStyle={styles.navigationMenuItemContent}
                labelStyle={styles.navigationMenuItemLabel}
              >
                Activity Log
              </Button>
              
              <Button
                mode="contained"
                icon={() => <UsersIcon size={20} color="#FFFFFF" />}
                onPress={() => {
                  setNavigationMenuVisible(false);
                  navigation.navigate('UserListPage');
                }}
                style={[styles.navigationMenuItem, { backgroundColor: '#9C27B0' }]}
                contentStyle={styles.navigationMenuItemContent}
                labelStyle={styles.navigationMenuItemLabel}
              >
                User Management
              </Button>
              
              <Button
                mode="contained"
                icon={() => <CountIcon size={20} color="#FFFFFF" />}
                onPress={() => {
                  setNavigationMenuVisible(false);
                  navigation.navigate('RecountPage');
                }}
                style={[styles.navigationMenuItem, { backgroundColor: '#9C27B0' }]}
                contentStyle={styles.navigationMenuItemContent}
                labelStyle={styles.navigationMenuItemLabel}
              >
                Recount
              </Button>
              
              <Button
                mode="contained"
                icon={() => <AddIcon size={20} color="#FFFFFF" />}
                onPress={() => {
                  setNavigationMenuVisible(false);
                  setManageVisible(true);
                }}
                style={[styles.navigationMenuItem, { backgroundColor: '#9C27B0' }]}
                contentStyle={styles.navigationMenuItemContent}
                labelStyle={styles.navigationMenuItemLabel}
              >
                Manage Inventory
              </Button>
            </View>
          </Modal>
        </Portal>              
    </SafeAreaView>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#5B21B6',
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
    backgroundColor: '#FFFFFF',
    padding: 0,
    margin: 24,
    borderRadius: 20,
    maxHeight: '88%',
    maxWidth: '92%',
    alignSelf: 'center',
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
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  skeletonHeader: {
    height: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 12,
    width: '80%',
  },
  skeletonLine: {
    height: 16,
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
    marginBottom: 8,
    width: '60%',
  },
  skeletonLineShort: {
    height: 16,
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
    width: '40%',
  },
  navigationModal: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 20,
    padding: 0,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 15,
  },
  navigationModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  navigationModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
  },
  navigationMenuItems: {
    padding: 24,
    gap: 16,
  },
  navigationMenuItem: {
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navigationMenuItemContent: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  navigationMenuItemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
