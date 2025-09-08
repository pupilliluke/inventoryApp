import { set, ref, remove, getDatabase, update } from 'firebase/database';
import { ActiveUser } from '../types/session';
import { InventoryItem } from '../types/inventoryItem';
import { appendLog, LogMessages, generateQuantityChanges, hasCheckboxChanged, hasNameChanged, hasNoteChanged } from './logging';

/**
 * Error thrown when user is not authenticated
 */
export class UserNotAuthenticatedError extends Error {
  constructor() {
    super('User must be selected before making inventory changes');
    this.name = 'UserNotAuthenticatedError';
  }
}

/**
 * Guards inventory mutations to ensure user is authenticated
 */
function ensureUserAuthenticated(user: ActiveUser | null): asserts user is ActiveUser {
  if (!user) {
    throw new UserNotAuthenticatedError();
  }
}

/**
 * Protected inventory mutation functions that require user authentication and log changes
 */
export const InventoryMutations = {
  /**
   * Create a new inventory item
   */
  async createItem(
    user: ActiveUser | null,
    item: InventoryItem
  ): Promise<void> {
    ensureUserAuthenticated(user);
    
    const db = getDatabase();
    const itemRef = ref(db, `inventory/${item.code}`);
    
    try {
      // Perform the inventory mutation
      await set(itemRef, item);
      
      // Log the action (non-blocking)
      await appendLog({
        userId: user.id,
        userName: user.name,
        message: LogMessages.createItem(user, item.code, item.name, item.type)
      });
    } catch (error) {
      console.error('Failed to create inventory item:', error);
      throw error;
    }
  },

  /**
   * Update an existing inventory item
   */
  async updateItem(
    user: ActiveUser | null,
    oldItem: InventoryItem,
    newItem: InventoryItem
  ): Promise<void> {
    ensureUserAuthenticated(user);
    
    const db = getDatabase();
    const itemRef = ref(db, `inventory/${newItem.code}`);
    
    try {
      // Perform the inventory mutation
      await set(itemRef, newItem);
      
      // Log checkbox changes separately for better tracking
      if (hasCheckboxChanged(oldItem, newItem)) {
        await appendLog({
          userId: user.id,
          userName: user.name,
          message: LogMessages.checkboxChanged(user, newItem.code, newItem.name, newItem.checked || false)
        });
      }
      
      // Log name changes separately
      if (hasNameChanged(oldItem, newItem)) {
        await appendLog({
          userId: user.id,
          userName: user.name,
          message: LogMessages.itemRenamed(user, newItem.code, oldItem.name, newItem.name)
        });
      }
      
      // Log note changes separately
      if (hasNoteChanged(oldItem, newItem)) {
        await appendLog({
          userId: user.id,
          userName: user.name,
          message: LogMessages.noteChanged(user, newItem.code, newItem.name, oldItem.note || '', newItem.note || '')
        });
      }
      
      // Generate quantity change description
      const changes = generateQuantityChanges(oldItem, newItem);
      
      // Log quantity changes if they exist
      if (changes !== 'no quantity changes') {
        await appendLog({
          userId: user.id,
          userName: user.name,
          message: LogMessages.updateItem(user, newItem.code, changes)
        });
      }
    } catch (error) {
      console.error('Failed to update inventory item:', error);
      throw error;
    }
  },

  /**
   * Delete an inventory item
   */
  async deleteItem(
    user: ActiveUser | null,
    itemCode: string,
    itemName?: string
  ): Promise<void> {
    ensureUserAuthenticated(user);
    
    const db = getDatabase();
    const itemRef = ref(db, `inventory/${itemCode}`);
    
    try {
      // Perform the inventory mutation
      await remove(itemRef);
      
      // Log the action (non-blocking)
      await appendLog({
        userId: user.id,
        userName: user.name,
        message: LogMessages.deleteItem(user, itemCode, itemName)
      });
    } catch (error) {
      console.error('Failed to delete inventory item:', error);
      throw error;
    }
  },

  /**
   * Move quantity between locations
   */
  async moveQuantity(
    user: ActiveUser | null,
    item: InventoryItem,
    fromLocation: keyof Pick<InventoryItem, 'showroom' | 'warehouse' | 'storage' | 'closet'>,
    toLocation: keyof Pick<InventoryItem, 'showroom' | 'warehouse' | 'storage' | 'closet'>,
    quantity: number
  ): Promise<void> {
    ensureUserAuthenticated(user);
    
    if (item[fromLocation] < quantity) {
      throw new Error(`Insufficient quantity in ${fromLocation}`);
    }
    
    const updatedItem: InventoryItem = {
      ...item,
      [fromLocation]: item[fromLocation] - quantity,
      [toLocation]: item[toLocation] + quantity,
    };
    
    const db = getDatabase();
    const itemRef = ref(db, `inventory/${item.code}`);
    
    try {
      // Perform the inventory mutation
      await set(itemRef, updatedItem);
      
      // Log the action (non-blocking)
      await appendLog({
        userId: user.id,
        userName: user.name,
        message: LogMessages.moveItem(
          user,
          item.code,
          fromLocation,
          toLocation,
          quantity
        )
      });
    } catch (error) {
      console.error('Failed to move inventory quantity:', error);
      throw error;
    }
  },

  /**
   * Update quantity for a specific location
   */
  async updateQuantity(
    user: ActiveUser | null,
    item: InventoryItem,
    location: keyof Pick<InventoryItem, 'showroom' | 'warehouse' | 'storage' | 'closet'>,
    newQuantity: number
  ): Promise<void> {
    ensureUserAuthenticated(user);
    
    const oldQuantity = item[location];
    const updatedItem: InventoryItem = {
      ...item,
      [location]: newQuantity,
    };
    
    const db = getDatabase();
    const itemRef = ref(db, `inventory/${item.code}`);
    
    try {
      // Perform the inventory mutation
      await set(itemRef, updatedItem);
      
      // Log the action (non-blocking)
      await appendLog({
        userId: user.id,
        userName: user.name,
        message: LogMessages.updateQuantity(
          user,
          item.code,
          location,
          oldQuantity,
          newQuantity
        )
      });
    } catch (error) {
      console.error('Failed to update inventory quantity:', error);
      throw error;
    }
  },

  /**
   * Clear all quantities from a specific location (excludes closet)
   */
  async clearLocation(
    user: ActiveUser | null,
    inventoryItems: InventoryItem[],
    location: keyof Pick<InventoryItem, 'showroom' | 'warehouse' | 'storage'>
  ): Promise<void> {
    ensureUserAuthenticated(user);
    
    const db = getDatabase();
    const updates: { [key: string]: number } = {};
    const itemsToUpdate: Array<{code: string, oldQty: number}> = [];
    
    // Collect all items that need clearing
    inventoryItems.forEach(item => {
      if (item[location] > 0) {
        updates[`inventory/${item.code}/${location}`] = 0;
        itemsToUpdate.push({ code: item.code, oldQty: item[location] });
      }
    });

    if (itemsToUpdate.length === 0) {
      return; // Nothing to clear
    }
    
    try {
      // Perform the batch update
      await update(ref(db), updates);
      
      // Log the action (non-blocking)
      await appendLog({
        userId: user.id,
        userName: user.name,
        message: LogMessages.clearLocation(user, location, itemsToUpdate.length, itemsToUpdate.reduce((sum, item) => sum + item.oldQty, 0))
      });
    } catch (error) {
      console.error(`Failed to clear ${location} quantities:`, error);
      throw error;
    }
  }
};

/**
 * User management mutations that also require authentication and logging
 */
export const UserMutations = {
  /**
   * Create a new user
   */
  async createUser(
    activeUser: ActiveUser | null,
    newUserName: string
  ): Promise<void> {
    ensureUserAuthenticated(activeUser);
    
    const db = getDatabase();
    const userRef = ref(db, `users/${newUserName}`);
    
    try {
      // Create the user
      await set(userRef, {
        name: newUserName,
        list: {},
        createdAt: new Date().toISOString()
      });
      
      // Log the action (non-blocking)
      await appendLog({
        userId: activeUser.id,
        userName: activeUser.name,
        message: LogMessages.userCreated(activeUser, newUserName)
      });
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  },

  /**
   * Delete a user
   */
  async deleteUser(
    activeUser: ActiveUser | null,
    userToDelete: string
  ): Promise<void> {
    ensureUserAuthenticated(activeUser);
    
    const db = getDatabase();
    const userRef = ref(db, `users/${userToDelete}`);
    
    try {
      // Delete the user
      await remove(userRef);
      
      // Log the action (non-blocking)
      await appendLog({
        userId: activeUser.id,
        userName: activeUser.name,
        message: LogMessages.userDeleted(activeUser, userToDelete)
      });
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw error;
    }
  },

  /**
   * Rename a user
   */
  async renameUser(
    activeUser: ActiveUser | null,
    oldName: string,
    newName: string,
    userData: any
  ): Promise<void> {
    ensureUserAuthenticated(activeUser);
    
    const db = getDatabase();
    const oldUserRef = ref(db, `users/${oldName}`);
    const newUserRef = ref(db, `users/${newName}`);
    
    try {
      // Create new user with updated name
      await set(newUserRef, {
        ...userData,
        name: newName,
        updatedAt: new Date().toISOString()
      });
      
      // Remove old user
      await remove(oldUserRef);
      
      // Log the action (non-blocking)
      await appendLog({
        userId: activeUser.id,
        userName: activeUser.name,
        message: LogMessages.userRenamed(activeUser, oldName, newName)
      });
    } catch (error) {
      console.error('Failed to rename user:', error);
      throw error;
    }
  }
};