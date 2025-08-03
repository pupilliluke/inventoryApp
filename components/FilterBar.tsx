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
              <Text style={[
                { color: filterLocation === 'showroom' ? '#333333' : '#666666', fontWeight: '500' }
              ]}>Showroom Pull List</Text>
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
              <Text style={[
                { color: filterLocation === 'warehouse' ? '#333333' : '#666666', fontWeight: '500' }
              ]}>Warehouse</Text>
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
              <Text style={[
                { color: filterLocation === 'storage' ? '#333333' : '#666666', fontWeight: '500' }
              ]}>Storage</Text>
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
              <Text style={[
                { color: filterLocation === 'closet' ? '#333333' : '#666666', fontWeight: '500' }
              ]}>Closet</Text>
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
    marginBottom: 16,
    marginTop: 20,
    paddingHorizontal: 4,
  },
  searchInput: {
    height: 48,
    borderColor: '#E0E0E0',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  locationFilters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  locationButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activeLocationButton: {
    backgroundColor: '#F5F5F5',
    borderColor: '#D0D0D0',
  },
  readOnlyContainer: {
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  readOnlyText: {
    fontSize: 15,
    color: '#495057',
    marginVertical: 2,
    fontWeight: '500',
  },
});

export default FilterBar;