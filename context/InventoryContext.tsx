import React, { createContext, useContext, useEffect, useState } from 'react';
import { getDatabase, ref, onValue, set, remove } from 'firebase/database';
import { InventoryItem } from '../types/inventoryItem';
import { db } from '../firebaseConfig';

const InventoryContext = createContext(null);

export const useInventory = () => useContext(InventoryContext);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [originalInventory, setOriginalInventory] = useState<InventoryItem[]>([]);
  const [filterType, setFilterType] = useState('');
  const [multiTypeFilters, setMultiTypeFilters] = useState<string[]>([]);
  const [filterLocation, setFilterLocation] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const dbRef = ref(db, 'inventory');

  useEffect(() => {
    onValue(dbRef, snapshot => {
      const data = snapshot.val() || {};
      // console.log('🔥 Firebase Inventory:', data);

      const loaded: InventoryItem[] = Object.values(data).map(item => ({
        ...item,
        showroom: Number(item.showroom) || 0,
        warehouse: Number(item.warehouse) || 0,
        storage: Number(item.storage) || 0
      }));
      setInventory(loaded);
      setOriginalInventory(loaded);
    });
  }, []);

  const filtered = inventory.filter(item => {
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
      (filterLocation === 'storage' && item.storage > 0);

    const searchMatch = !searchQuery ||
      itemName.includes(searchQuery.toLowerCase()) ||
      itemType.includes(searchQuery.toLowerCase()) ||
      itemCode.includes(searchQuery.toLowerCase());

    return typeMatch && locationMatch && searchMatch;
  });

  const calculateTotal = (item: InventoryItem) => {
    return item.showroom + item.warehouse + item.storage;
  };

  const updateItem = (item: InventoryItem) => {
    set(ref(db, `inventory/${item.code}`), item);
  };

  const removeItem = (code: string) => {
    remove(ref(db, `inventory/${code}`));
  };

  const resetFilters = () => {
    setFilterType('');
    setMultiTypeFilters([]);
    setFilterLocation('');
    setSearchQuery('');
  };

  return (
    <InventoryContext.Provider value={{
      inventory: filtered,
      originalInventory,
      setFilterType,
      setMultiTypeFilters,
      filterType,
      multiTypeFilters,
      setFilterLocation,
      updateItem,
      removeItem,
      resetFilters,
      searchQuery,
      setSearchQuery,
      filterLocation,
      calculateTotal
    }}>
      {children}
    </InventoryContext.Provider>
  );
};
