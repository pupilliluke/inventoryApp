import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import FilterBar from '../components/FilterBar';
import InventoryRow, { COL } from '../components/InventoryRow';
import { InventoryItem } from '../types/inventoryItem';
import { Modal, Portal } from 'react-native-paper';
import { Keyboard, SafeAreaView, View, Text, StyleSheet, Alert, ScrollView, TextInput, TouchableOpacity, FlatList, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ref, update } from 'firebase/database';
import { db } from '../firebaseConfig';
import UserBadge from '../components/UserBadge';
import { useSession } from '../context/SessionContext';
import { InventoryMutations, UserNotAuthenticatedError } from '../utils/inventoryMutations';
import CustomIconButton from '../components/CustomIconButton';
import { useIsAdmin } from '../utils/admin';
import { CollapseIcon, DropdownIcon, LogIcon, UsersIcon, CountIcon, AddIcon, EraserIcon, PullListIcon, AccountIcon } from '../components/CustomIcons';
import { color, space, radius, font, mono } from '../theme/tokens';

const typeFilters = [
  'Assortment', 'Candle', 'Firecracker', 'Rocket', 'Smoke', 'Sparkler', 'Toy', 'Mortar', 'Missile',
  'Rack', 'Fountain', 'Z-repeater', '200g', '500g', 'Novelty', 'Free Item', 'Shirt', 'Other'
];

export default function InventoryMain() {
  const navigation = useNavigation();
  const { activeUser } = useSession();
  const isAdmin = useIsAdmin();

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
  const [confirmClearVisible, setConfirmClearVisible] = useState(false);
  const [locationToClear, setLocationToClear] = useState<'warehouse' | 'showroom' | null>(null);
  const [clearLocationStats, setClearLocationStats] = useState<{ itemCount: number, totalQuantity: number }>({ itemCount: 0, totalQuantity: 0 });
  const [navigationMenuVisible, setNavigationMenuVisible] = useState(false);
  const [sortByContainer, setSortByContainer] = useState(false);

  // Optionally order the visible items by container category (C1→C4, then none).
  const displayInventory = useMemo(() => {
    if (!sortByContainer) return inventory;
    const key = (it: InventoryItem) => {
      const cat = it.containers?.category ?? 0;
      return cat > 0 ? cat : 99;
    };
    return [...inventory].sort(
      (a, b) => key(a) - key(b) || (a.name || '').localeCompare(b.name || '')
    );
  }, [inventory, sortByContainer]);

  useEffect(() => {
    const patchMissingFields = () => {
      originalInventory.forEach((item) => {
        const updates: any = {};
        if (item.checked === undefined) updates.checked = false;
        if (item.note === undefined) updates.note = '';
        if (Object.keys(updates).length > 0) {
          const itemRef = ref(db, `inventory/${item.code}`);
          update(itemRef, updates);
        }
      });
    };
    if (originalInventory.length > 0) patchMissingFields();
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
        checked: false,
        note: '',
        editable: false,
      });
      setNewCode('');
      setNewName('');
      setManageVisible(false);
    } catch (error) {
      if (error instanceof UserNotAuthenticatedError) {
        console.warn('No active user — please sign out and sign in again.');
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
    setFilterType('');
  }, [setMultiTypeFilters, setFilterType]);

  const selectedTypeFilters = useMemo(() => new Set(multiTypeFilters || []), [multiTypeFilters]);

  const handleClearLocation = async (location: 'warehouse' | 'showroom') => {
    const itemsWithQuantity = originalInventory.filter(item => item[location] > 0);
    const totalQuantity = itemsWithQuantity.reduce((sum, item) => sum + item[location], 0);
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
    try {
      await InventoryMutations.clearLocation(activeUser, originalInventory, locationToClear);
      setConfirmClearVisible(false);
      setLocationToClear(null);
      Alert.alert('Success', `All ${locationToClear} quantities cleared`);
    } catch (error) {
      if (error instanceof UserNotAuthenticatedError) {
        console.warn('No active user — please sign out and sign in again.');
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

  const navItems = [
    { label: 'Tasks', icon: PullListIcon, onPress: () => { setNavigationMenuVisible(false); navigation.navigate('Tasks' as never); } },
    { label: 'Activity Log', icon: LogIcon, onPress: () => { setNavigationMenuVisible(false); navigation.navigate('LogPage' as never); } },
    { label: 'Account', icon: AccountIcon, onPress: () => { setNavigationMenuVisible(false); navigation.navigate('AccountPage' as never); } },
    // Admin-only entries.
    ...(isAdmin ? [
      { label: 'User Management', icon: UsersIcon, onPress: () => { setNavigationMenuVisible(false); navigation.navigate('UserListPage' as never); } },
      { label: 'Recount', icon: CountIcon, onPress: () => { setNavigationMenuVisible(false); navigation.navigate('RecountPage' as never); } },
    ] : []),
    { label: 'Manage Inventory', icon: AddIcon, onPress: () => { setNavigationMenuVisible(false); setManageVisible(true); } },
  ];

  const renderRow = useCallback(({ item }: { item: InventoryItem }) => <InventoryRow item={item} />, []);
  const keyExtractor = useCallback((item: InventoryItem) => item.code, []);

  return (
    <SafeAreaView style={styles.screen}>
      {/* Command bar */}
      <View style={styles.header}>
        {navigation.canGoBack() && (
          <CustomIconButton iconType="back" onPress={() => navigation.goBack()} color={color.onChrome} />
        )}
        <View style={styles.headerTitleBlock}>
          <Text style={styles.headerEyebrow}>Phantom Warehouse</Text>
          <Text style={styles.headerTitle}>Inventory</Text>
        </View>
        <UserBadge style={{ marginRight: space.xs }} />
        <CustomIconButton
          iconType="filter"
          onPress={() => setFiltersVisible(!filtersVisible)}
          color={filtersVisible ? '#7cb3e8' : color.onChromeMuted}
        />
        <CustomIconButton
          iconType="menu"
          onPress={() => setNavigationMenuVisible(true)}
          color={color.onChrome}
        />
      </View>

      <FlatList
        style={styles.body}
        contentContainerStyle={{ paddingBottom: space.xl }}
        data={loading ? [] : displayInventory}
        renderItem={renderRow}
        keyExtractor={keyExtractor}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={11}
        removeClippedSubviews={Platform.OS !== 'web'}
        ListHeaderComponent={
          <View>
            {filtersVisible && (
              <View style={styles.filterPanel}>
                <FilterBar />

                <View style={styles.typeToolbar}>
                  <TouchableOpacity
                    style={styles.typeToggle}
                    onPress={() => setShowTypeFilters(!showTypeFilters)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.typeToggleText}>
                      Filter by Type{selectedTypeFilters.size > 0 ? ` (${selectedTypeFilters.size})` : ''}
                    </Text>
                    {showTypeFilters
                      ? <CollapseIcon size={18} color={color.textSecondary} />
                      : <DropdownIcon size={18} color={color.textSecondary} />}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.resetBtn} onPress={resetFilters} activeOpacity={0.7}>
                    <Text style={styles.resetBtnText}>Reset</Text>
                  </TouchableOpacity>
                </View>

                {showTypeFilters && (
                  <View style={styles.typeTagWrap}>
                    {typeFilters.map(type => {
                      const isSelected = selectedTypeFilters.has(type);
                      return (
                        <TouchableOpacity
                          key={type}
                          onPress={() => toggleTypeFilter(type)}
                          style={[styles.filterTag, isSelected && styles.filterTagOn]}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.filterTagText, isSelected && styles.filterTagTextOn]}>
                            {isSelected ? '✓ ' : ''}{type}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* Count strip */}
            <View style={styles.countStrip}>
              <View style={styles.countLeft}>
                <Text style={styles.countText}>
                  {inventory.length} {inventory.length === 1 ? 'item' : 'items'}
                </Text>
                {originalInventory.length > 0 && inventory.length !== originalInventory.length && (
                  <Text style={styles.countSub}>of {originalInventory.length}</Text>
                )}
              </View>
              <TouchableOpacity
                style={[styles.sortBtn, sortByContainer && styles.sortBtnOn]}
                onPress={() => setSortByContainer((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={[styles.sortBtnText, sortByContainer && styles.sortBtnTextOn]}>
                  {sortByContainer ? '✓ ' : ''}Sort: Container
                </Text>
              </TouchableOpacity>
            </View>

            {/* Table column header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.thItem]}>Item</Text>
              <View style={styles.thQtyGroup}>
                <Text style={[styles.th, { width: COL.qty }]}>S</Text>
                <Text style={[styles.th, { width: COL.qty }]}>W</Text>
                <Text style={[styles.th, { width: COL.cont }]}>C</Text>
              </View>
              <View style={{ width: COL.actions }} />
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.tableBody}>
              {[1, 2, 3, 4, 5].map(i => (
                <View key={i} style={styles.skeletonRow}>
                  <View style={styles.skeletonItem} />
                  <View style={styles.skeletonNums} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No items</Text>
              <Text style={styles.emptySub}>Adjust filters or add inventory from the menu.</Text>
            </View>
          )
        }
      />

      {/* Manage Inventory modal */}
      <Portal>
        <Modal
          visible={manageVisible}
          onDismiss={() => setManageVisible(false)}
          contentContainerStyle={styles.sheet}
          dismissable
        >
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Manage Inventory</Text>
            <TouchableOpacity onPress={() => setManageVisible(false)}>
              <Text style={styles.sheetClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: space.lg }}>
            <Text style={styles.sectionLabel}>Add New Item</Text>
            <View style={styles.formBlock}>
              <Text style={styles.fieldLabel}>Product Code</Text>
              <TextInput
                value={newCode}
                onChangeText={setNewCode}
                onSubmitEditing={() => { if (newCode && newName) handleAddItem(); }}
                style={styles.field}
                placeholder="e.g. F-1024"
                placeholderTextColor={color.textMuted}
                returnKeyType="next"
              />
              <Text style={[styles.fieldLabel, { marginTop: space.md }]}>Product Name</Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                onSubmitEditing={() => { if (newCode && newName) handleAddItem(); }}
                style={styles.field}
                placeholder="Item name"
                placeholderTextColor={color.textMuted}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.primaryAction, { marginTop: space.lg }]}
                onPress={() => { Keyboard.dismiss(); handleAddItem(); }}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryActionText}>Add Item</Text>
              </TouchableOpacity>
            </View>

            {/* Clearing a whole location is destructive and admin-only. */}
            {isAdmin && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: space.xl }]}>Clear Locations</Text>
                <View style={styles.formBlock}>
                  <Text style={styles.helperText}>
                    Clear all quantities from a location.
                  </Text>
                  {(['showroom', 'warehouse'] as const).map((location) => (
                    <TouchableOpacity
                      key={location}
                      style={styles.warningAction}
                      onPress={() => handleClearLocation(location)}
                      activeOpacity={0.8}
                    >
                      <EraserIcon size={18} color={color.warning} />
                      <Text style={styles.warningActionText}>Clear all {location}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        </Modal>
      </Portal>

      {/* Clear confirmation */}
      <Portal>
        <Modal
          visible={confirmClearVisible}
          onDismiss={cancelClearLocation}
          contentContainerStyle={styles.dialog}
          dismissable
        >
          <Text style={styles.dialogTitle}>Clear {locationToClear}</Text>
          <Text style={styles.dialogBody}>
            Clear all quantities from {locationToClear}? This affects{' '}
            <Text style={styles.dialogEmphasis}>{clearLocationStats.itemCount} items</Text> totaling{' '}
            <Text style={styles.dialogEmphasis}>{clearLocationStats.totalQuantity} units</Text>.
          </Text>
          <View style={styles.dialogActions}>
            <TouchableOpacity style={styles.dialogGhost} onPress={cancelClearLocation} activeOpacity={0.8}>
              <Text style={styles.dialogGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dialogWarning} onPress={confirmClearLocation} activeOpacity={0.8}>
              <Text style={styles.dialogWarningText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </Portal>

      {/* Navigation menu */}
      <Portal>
        <Modal
          visible={navigationMenuVisible}
          onDismiss={() => setNavigationMenuVisible(false)}
          contentContainerStyle={styles.sheet}
          dismissable
        >
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Navigation</Text>
            <TouchableOpacity onPress={() => setNavigationMenuVisible(false)}>
              <Text style={styles.sheetClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={{ paddingVertical: space.xs }}>
            {navItems.map(({ label, icon: Icon, onPress }) => (
              <TouchableOpacity key={label} style={styles.navItem} onPress={onPress} activeOpacity={0.7}>
                <Icon size={20} color={color.accent} />
                <Text style={styles.navItemText}>{label}</Text>
                <Text style={styles.navItemChevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.appBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.chrome,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: 56,
  },
  headerTitleBlock: {
    flex: 1,
  },
  headerEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: color.onChromeMuted,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: color.onChrome,
    letterSpacing: 0.3,
  },
  body: {
    flex: 1,
    paddingHorizontal: space.md,
  },
  filterPanel: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    padding: space.md,
    marginTop: space.md,
  },
  typeToolbar: {
    flexDirection: 'row',
    gap: space.sm,
  },
  typeToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    backgroundColor: color.surface,
  },
  typeToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: color.text,
  },
  resetBtn: {
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceAlt,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: color.textSecondary,
  },
  typeTagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  filterTag: {
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
  },
  filterTagOn: {
    backgroundColor: color.accentBg,
    borderColor: color.accent,
  },
  filterTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: color.textSecondary,
  },
  filterTagTextOn: {
    color: color.accent,
  },
  countStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.md,
    marginBottom: space.sm,
    paddingHorizontal: space.xs,
  },
  countLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: space.xs,
  },
  sortBtn: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  sortBtnOn: {
    backgroundColor: color.accentBg,
    borderColor: color.accent,
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: color.textSecondary,
  },
  sortBtnTextOn: {
    color: color.accent,
  },
  countText: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '700',
    color: color.text,
  },
  countSub: {
    fontSize: 12,
    color: color.textMuted,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.surfaceAlt,
    borderWidth: 1,
    borderColor: color.border,
    borderBottomWidth: 0,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
  },
  thItem: {
    flex: 1,
    minWidth: COL.item,
    paddingLeft: 28,
    ...font.label,
  },
  thQtyGroup: {
    flexDirection: 'row',
  },
  th: {
    ...font.label,
    textAlign: 'center',
  },
  tableBody: {
    borderWidth: 1,
    borderColor: color.border,
    borderTopWidth: 0,
    backgroundColor: color.surface,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: color.surface,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
    padding: space.md,
  },
  skeletonItem: {
    height: 16,
    width: '45%',
    backgroundColor: color.surfaceSunken,
    borderRadius: radius.sm,
  },
  skeletonNums: {
    height: 16,
    width: '30%',
    backgroundColor: color.surfaceSunken,
    borderRadius: radius.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: space.xxl,
    borderWidth: 1,
    borderColor: color.border,
    borderTopWidth: 0,
    backgroundColor: color.surface,
  },
  emptyTitle: {
    ...font.title,
    marginBottom: space.xs,
  },
  emptySub: {
    fontSize: 13,
    color: color.textMuted,
  },

  // Sheets / modals
  sheet: {
    backgroundColor: color.surface,
    marginHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    maxHeight: '86%',
    maxWidth: 520,
    alignSelf: 'center',
    width: '92%',
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: color.chrome,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: color.onChrome,
  },
  sheetClose: {
    fontSize: 16,
    fontWeight: '700',
    color: color.onChromeMuted,
  },
  sectionLabel: {
    ...font.label,
    marginBottom: space.sm,
  },
  formBlock: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    backgroundColor: color.surfaceAlt,
    padding: space.md,
  },
  fieldLabel: {
    ...font.label,
    marginBottom: space.xs,
  },
  field: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: 14,
    backgroundColor: color.surface,
    color: color.text,
  },
  primaryAction: {
    backgroundColor: color.accent,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: color.textInverse,
    letterSpacing: 0.5,
  },
  helperText: {
    fontSize: 13,
    color: color.textSecondary,
    marginBottom: space.md,
  },
  warningAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderColor: color.warning,
    backgroundColor: color.warningBg,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    marginTop: space.sm,
  },
  warningActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: color.warning,
    textTransform: 'capitalize',
  },

  // Dialog
  dialog: {
    backgroundColor: color.surface,
    marginHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    padding: space.xl,
    maxWidth: 420,
    alignSelf: 'center',
    width: '88%',
  },
  dialogTitle: {
    ...font.title,
    fontSize: 16,
    textTransform: 'capitalize',
    marginBottom: space.sm,
  },
  dialogBody: {
    fontSize: 14,
    color: color.textSecondary,
    lineHeight: 21,
  },
  dialogEmphasis: {
    fontFamily: mono,
    fontWeight: '700',
    color: color.text,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.xl,
  },
  dialogGhost: {
    flex: 1,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  dialogGhostText: {
    fontSize: 14,
    fontWeight: '700',
    color: color.textSecondary,
  },
  dialogWarning: {
    flex: 1,
    backgroundColor: color.warning,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  dialogWarningText: {
    fontSize: 14,
    fontWeight: '700',
    color: color.textInverse,
  },

  // Nav menu
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  navItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: color.text,
  },
  navItemChevron: {
    fontSize: 20,
    color: color.textMuted,
  },
});
