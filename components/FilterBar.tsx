import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useInventory } from '../context/InventoryContext';
import { CloseIcon, SearchIcon } from './CustomIcons';
import { color, space, radius, font, mono } from '../theme/tokens';

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

  const locations: { key: string; label: string }[] = [
    { key: 'showroom', label: 'Showroom' },
    { key: 'warehouse', label: 'Warehouse' },
    { key: 'containers', label: 'Containers' },
    { key: 'closet', label: 'Closet' },
  ];

  if (!editable) {
    return (
      <View style={styles.container}>
        <View style={styles.readOnlyContainer}>
          {searchQuery ? <Text style={styles.readOnlyText}>Search: "{searchQuery}"</Text> : null}
          {filterLocation ? <Text style={styles.readOnlyText}>Location: {filterLocation}</Text> : null}
          {!searchQuery && !filterLocation ? <Text style={styles.readOnlyText}>No active filters</Text> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchIcon}>
          <SearchIcon size={16} color={color.textMuted} />
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, type, or code"
          placeholderTextColor={color.textMuted}
          value={localSearchQuery}
          onChangeText={setLocalSearchQuery}
          returnKeyType="search"
        />
        {localSearchQuery ? (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => { setLocalSearchQuery(''); setSearchQuery(''); }}
          >
            <CloseIcon size={16} color={color.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.groupLabel}>Status</Text>
      <View style={styles.segmentRow}>
        {(['checked', 'unchecked'] as const).map((state) => {
          const active = filterChecked === state;
          return (
            <TouchableOpacity
              key={state}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => setFilterChecked(filterChecked === state ? '' : state)}
              activeOpacity={0.7}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {state === 'checked' ? 'Checked' : 'Unchecked'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.groupLabel}>Location</Text>
      <View style={styles.segmentRow}>
        {locations.map(({ key, label }) => {
          const active = filterLocation === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.segment, styles.segmentFlex, active && styles.segmentActive]}
              onPress={() => setFilterLocation(filterLocation === key ? '' : key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: space.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    marginBottom: space.md,
  },
  searchIcon: {
    marginRight: space.sm,
  },
  searchInput: {
    flex: 1,
    height: 42,
    fontSize: 14,
    color: color.text,
  },
  clearButton: {
    padding: space.xs,
  },
  groupLabel: {
    ...font.label,
    marginBottom: space.xs,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: space.xs,
    marginBottom: space.md,
  },
  segment: {
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  segmentFlex: {
    flex: 1,
    paddingHorizontal: space.xs,
  },
  segmentActive: {
    backgroundColor: color.accent,
    borderColor: color.accent,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: color.textSecondary,
  },
  segmentTextActive: {
    color: color.textInverse,
  },
  readOnlyContainer: {
    padding: space.md,
    backgroundColor: color.surfaceAlt,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.border,
  },
  readOnlyText: {
    fontSize: 13,
    color: color.textSecondary,
    marginVertical: 2,
    fontWeight: '500',
  },
});

export default FilterBar;
