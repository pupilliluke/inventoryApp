import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { getDatabase, ref, onValue, set, remove } from 'firebase/database';
import { InventoryItem } from '../types/inventoryItem';
import { db } from '../firebaseConfig';

const InventoryContext = createContext(null);

export const useInventory = () => useContext(InventoryContext);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [originalInventory, setOriginalInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [multiTypeFilters, setMultiTypeFilters] = useState<string[]>([]);
  const [filterLocation, setFilterLocation] = useState('');
  const [filterChecked, setFilterChecked] = useState(''); // '' | 'checked' | 'unchecked'
  const [searchQuery, setSearchQuery] = useState('');

  const dbRef = ref(db, 'inventory');

  useEffect(() => {
    const unsubscribe = onValue(dbRef, snapshot => {
      const data = snapshot.val() || {};
      
      // Optimize data processing with memoization
      const loaded: InventoryItem[] = Object.values(data).map(item => ({
        ...item,
        showroom: Number(item.showroom) || 0,
        warehouse: Number(item.warehouse) || 0,
        containers: {
          category: Number(item.containers?.category) || 0,
          quantity: Number(item.containers?.quantity) || 0,
        },
        closet: Number(item.closet) || 0,
        checked: Boolean(item.checked) || false,
        note: String(item.note || ''),
      }));

      // Use batch state updates to avoid multiple re-renders
      setInventory(loaded);
      setOriginalInventory(loaded);
      setLoading(false); // Set loading to false once data is loaded
    });
    
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Memoized filtering to prevent unnecessary recalculations
  const filtered = useMemo(() => {
    return inventory.filter(item => {
      if (!item) return false;

      const itemName = item.name?.toString().toLowerCase() || '';
      const itemType = item.type?.toString().toLowerCase() || '';
      const itemCode = item.code?.toString().toLowerCase() || '';

      const typeMatch =
        multiTypeFilters.length > 0
          ? multiTypeFilters.includes(item.type)
          : (!filterType || itemType.includes(filterType.toLowerCase()));

      const locationMatch = !filterLocation ||
        (filterLocation === 'showroom' && item.showroom > 0) ||
        (filterLocation === 'warehouse' && item.warehouse > 0) ||
        (filterLocation === 'containers' && item.containers.category > 0) ||
        (filterLocation === 'closet' && item.closet > 0);

      const searchMatch = !searchQuery ||
        itemName.includes(searchQuery.toLowerCase()) ||
        itemType.includes(searchQuery.toLowerCase()) ||
        itemCode.includes(searchQuery.toLowerCase());

      const checkedMatch = !filterChecked ||
        (filterChecked === 'checked' && item.checked === true) ||
        (filterChecked === 'unchecked' && item.checked !== true);

      return typeMatch && locationMatch && searchMatch && checkedMatch;
    });
  }, [inventory, multiTypeFilters, filterType, filterLocation, searchQuery, filterChecked]);

  // Stable identities so memoized consumers (InventoryRow) don't re-render
  // every time the provider updates (e.g. on each search keystroke).
  const calculateTotal = useCallback((item: InventoryItem) => {
    // Containers (C1–C4) are tracked separately and not included in the item total
    return item.showroom + item.warehouse + item.closet;
  }, []);

  const updateItem = useCallback((item: InventoryItem) => {
    set(ref(db, `inventory/${item.code}`), item);
  }, []);

  const removeItem = useCallback((code: string) => {
    remove(ref(db, `inventory/${code}`));
  }, []);

  const resetFilters = useCallback(() => {
    setFilterType('');
    setMultiTypeFilters([]);
    setFilterLocation('');
    setFilterChecked('');
    setSearchQuery('');
  }, []);

  const value = useMemo(() => ({
    inventory: filtered,
    originalInventory,
    loading,
    setFilterType,
    setMultiTypeFilters,
    filterType,
    multiTypeFilters,
    setFilterLocation,
    filterLocation,
    setFilterChecked,
    filterChecked,
    updateItem,
    removeItem,
    resetFilters,
    searchQuery,
    setSearchQuery,
    calculateTotal,
  }), [
    filtered, originalInventory, loading,
    filterType, multiTypeFilters, filterLocation, filterChecked, searchQuery,
    updateItem, removeItem, resetFilters, calculateTotal,
  ]);

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};
