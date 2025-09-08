import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useInventory } from '../context/InventoryContext';
import { CloseIcon } from './CustomIcons';

const FilterBar = ({ editable = true }) => {
  const { 
    setFilterType, 
    setFilterLocation,
    setFilterChecked,
    searchQuery,
    setSearchQuery,
    filterType,
    filterLocation,
    filterChecked
  } = useInventory();

  // Local search state for debouncing
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  // Debounce search input to improve performance
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setSearchQuery(localSearchQuery);
    }, 300); // 300ms delay

    return () => clearTimeout(debounceTimer);
  }, [localSearchQuery, setSearchQuery]);

  return (
    <View style={styles.container}>
      {editable ? (
        <>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, type, or code"
              value={localSearchQuery}
              onChangeText={setLocalSearchQuery}
              returnKeyType="search"
            />
            {localSearchQuery ? (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => {
                  setLocalSearchQuery('');
                  setSearchQuery('');
                }}
              >
                <CloseIcon size={18} color="#666666" />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.checkboxFilters}>
            <TouchableOpacity 
              style={[
                styles.checkboxButton,
                filterChecked === 'checked' && styles.activeCheckboxButton
              ]}
              onPress={() => setFilterChecked(
                filterChecked === 'checked' ? '' : 'checked'
              )}
            >
              <Text style={[
                { color: filterChecked === 'checked' ? '#4CAF50' : '#666666', fontWeight: '600', fontSize: 14 }
              ]}>✓ Checked</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.checkboxButton,
                filterChecked === 'unchecked' && styles.activeCheckboxButton
              ]}
              onPress={() => setFilterChecked(
                filterChecked === 'unchecked' ? '' : 'unchecked'
              )}
            >
              <Text style={[
                { color: filterChecked === 'unchecked' ? '#FF9800' : '#666666', fontWeight: '600', fontSize: 14 }
              ]}>☐ Unchecked</Text>
            </TouchableOpacity>
          </View>
          
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
              ]}>Showroom</Text>
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
  searchContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  searchInput: {
    height: 48,
    borderColor: '#E0E0E0',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingRight: 50,
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
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 15,
    padding: 4,
    borderRadius: 12,
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
  checkboxFilters: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  checkboxButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
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
  activeCheckboxButton: {
    backgroundColor: '#F8F9FA',
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