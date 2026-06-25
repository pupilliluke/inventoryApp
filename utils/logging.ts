import { getDatabase, ref, push, serverTimestamp, set } from 'firebase/database';
import { ActiveUser } from '../types/session';

/**
 * Sanitizes user input for log messages to prevent injection
 */
function sanitizeForLog(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[\r\n\t]/g, ' ') // Replace newlines/tabs with spaces
    .trim()
    .slice(0, 500); // Limit length as per security rules
}

/**
 * Appends a log entry to Firebase Realtime Database
 */
export async function appendLog({ 
  userId, 
  userName, 
  message 
}: { 
  userId: string; 
  userName: string; 
  message: string; 
}): Promise<void> {
  try {
    const db = getDatabase();
    const logRef = ref(db, 'log');
    const newLogRef = push(logRef);
    
    const sanitizedMessage = sanitizeForLog(message);
    const sanitizedUserName = sanitizeForLog(userName);
    
    await set(newLogRef, {
      message: sanitizedMessage,
      userId: userId,
      userName: sanitizedUserName,
      ts: serverTimestamp()
    });
  } catch (error) {
    // Log error but don't throw - we don't want logging failures to break inventory operations
    console.error('Failed to append log entry:', error);
  }
}

/**
 * Log message generators for different inventory operations
 */
export const LogMessages = {
  createItem: (user: ActiveUser, itemCode: string, itemName: string, itemType: string) =>
    `${user.name} created Item #${itemCode} (${itemType}: ${itemName})`,
  
  updateItem: (user: ActiveUser, itemCode: string, changes: string) =>
    `${user.name} updated Item #${itemCode}: ${changes}`,
  
  moveItem: (user: ActiveUser, itemCode: string, fromLocation: string, toLocation: string, quantity?: number) =>
    `${user.name} moved Item #${itemCode}${quantity ? ` (qty: ${quantity})` : ''}: ${fromLocation} → ${toLocation}`,
  
  deleteItem: (user: ActiveUser, itemCode: string, itemName?: string) =>
    `${user.name} deleted Item #${itemCode}${itemName ? ` (${itemName})` : ''}`,
  
  updateQuantity: (user: ActiveUser, itemCode: string, location: string, oldQty: number, newQty: number) =>
    `${user.name} updated Item #${itemCode} ${location}: qty ${oldQty} → ${newQty}`,
  
  userCreated: (creatorUser: ActiveUser, newUserName: string) =>
    `${creatorUser.name} created new user: ${newUserName}`,
  
  userDeleted: (deleterUser: ActiveUser, deletedUserName: string) =>
    `${deleterUser.name} deleted user: ${deletedUserName}`,
  
  userRenamed: (renamerUser: ActiveUser, oldName: string, newName: string) =>
    `${renamerUser.name} renamed user: ${oldName} → ${newName}`,
  
  clearLocation: (user: ActiveUser, location: string, itemCount: number, totalQuantity: number) =>
    `${user.name} cleared ${location}: ${itemCount} items (${totalQuantity} total qty) → 0`,
  
  checkboxChanged: (user: ActiveUser, itemCode: string, itemName: string, checked: boolean) =>
    `${user.name} ${checked ? 'checked' : 'unchecked'} Item #${itemCode} (${itemName})`,
  
  itemRenamed: (user: ActiveUser, itemCode: string, oldName: string, newName: string) =>
    `${user.name} renamed Item #${itemCode}: "${oldName}" → "${newName}"`,
  
  noteChanged: (user: ActiveUser, itemCode: string, itemName: string, oldNote: string, newNote: string) => {
    const oldNoteDisplay = oldNote?.trim() || '(empty)';
    const newNoteDisplay = newNote?.trim() || '(empty)';
    return `${user.name} updated note for Item #${itemCode} (${itemName}): "${oldNoteDisplay}" → "${newNoteDisplay}"`;
  }
};

/**
 * Helper to generate quantity change descriptions
 */
export function generateQuantityChanges(
  oldItem: any,
  newItem: any
): string {
  const changes: string[] = [];
  const locations = ['showroom', 'warehouse', 'containers', 'closet'];
  
  for (const location of locations) {
    const oldQty = oldItem[location] || 0;
    const newQty = newItem[location] || 0;
    
    if (oldQty !== newQty) {
      changes.push(`${location}: ${oldQty} → ${newQty}`);
    }
  }
  
  return changes.length > 0 ? changes.join(', ') : 'no quantity changes';
}

/**
 * Helper to detect if checkbox state changed
 */
export function hasCheckboxChanged(oldItem: any, newItem: any): boolean {
  const oldChecked = oldItem.checked || false;
  const newChecked = newItem.checked || false;
  return oldChecked !== newChecked;
}

/**
 * Helper to detect if item name changed
 */
export function hasNameChanged(oldItem: any, newItem: any): boolean {
  return oldItem.name !== newItem.name;
}

/**
 * Helper to detect if note changed
 */
export function hasNoteChanged(oldItem: any, newItem: any): boolean {
  const oldNote = (oldItem.note || '').trim();
  const newNote = (newItem.note || '').trim();
  return oldNote !== newNote;
}