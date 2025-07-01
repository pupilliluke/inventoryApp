import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useInventory } from '../context/InventoryContext';

const FilterBar = ({ editable = true }) => {
  const { 
    setFilterType, 
    setFilterLocation,
    searchQuery,
    setSearchQuery,
    filterType,
    filterLocation
  } = useInventory();

  return (
    <View style={styles.container}>
      {editable ? (
        <>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, type, or code"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          
          <View style={styles.locationFilters}>
            <TouchableOpacity 
              style={[
                styles.locationButton,
                filterLocation === 'showroom' && styles.activeLocationButton
              ]}
              onPress={() => setFilterLocation(
                filterLocation === 'showroom' ? '' : 'showroom'
              )}
            >
              <Text>Showroom</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.locationButton,
                filterLocation === 'warehouse' && styles.activeLocationButton
              ]}
              onPress={() => setFilterLocation(
                filterLocation === 'warehouse' ? '' : 'warehouse'
              )}
            >
              <Text>Warehouse</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.locationButton,
                filterLocation === 'storage' && styles.activeLocationButton
              ]}
              onPress={() => setFilterLocation(
                filterLocation === 'storage' ? '' : 'storage'
              )}
            >
              <Text>Storage</Text>
            </TouchableOpacity>
            <TouchableOpacity   
              style={[
                styles.locationButton,
                filterLocation === 'closet' && styles.activeLocationButton
              ]}
              onPress={() => setFilterLocation(
                filterLocation === 'closet' ? '' : 'closet'
              )}
            >
              <Text>Closet</Text>
            </TouchableOpacity>

          </View>
        </>
      ) : (
        <View style={styles.readOnlyContainer}>
          {searchQuery && (
            <Text style={styles.readOnlyText}>
              Search: "{searchQuery}"
            </Text>
          )}
          {filterLocation && (
            <Text style={styles.readOnlyText}>
              Location: {filterLocation}
            </Text>
          )}
          {!searchQuery && !filterLocation && (
            <Text style={styles.readOnlyText}>
              No active filters
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    marginTop: 30,
  },
  searchInput: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  locationFilters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  locationButton: {
    flex: 1,
    marginHorizontal: 2,
    padding: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    alignItems: 'center',
  },
  activeLocationButton: {
    backgroundColor: '#3498db',
  },
  readOnlyContainer: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  readOnlyText: {
    fontSize: 14,
    color: '#333',
    marginVertical: 2,
  },
});

export default FilterBar;