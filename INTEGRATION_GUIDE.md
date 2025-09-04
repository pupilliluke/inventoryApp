# Integration Guide: Session & Logging System

## Quick Integration Steps

### 1. Update Existing Inventory Operations

Replace direct Firebase calls with protected mutation functions:

**Before (InventoryMain.tsx):**
```typescript
// Old direct Firebase call
updateItem({
  code: newCode,
  name: newName,
  type: 'Other',
  showroom: 0,
  warehouse: 0,
  storage: 0,
  closet: 0,
  editable: false,
});
```

**After (InventoryMain.tsx):**
```typescript
import { InventoryMutations } from '../utils/inventoryMutations';
import { useSession } from '../context/SessionContext';

const { activeUser } = useSession();

// New protected call with logging
try {
  await InventoryMutations.createItem(activeUser, {
    code: newCode,
    name: newName,
    type: 'Other',
    showroom: 0,
    warehouse: 0,
    storage: 0,
    closet: 0,
    editable: false,
  });
} catch (error) {
  if (error instanceof UserNotAuthenticatedError) {
    navigation.navigate('UserSelection');
  } else {
    Alert.alert('Error', 'Failed to create item');
  }
}
```

### 2. Update User Management Operations

**Before (UserListPage.tsx):**
```typescript
// Old direct Firebase call
await set(ref(db, `users/${username}`), { 
  name: username, 
  list: {},
  createdAt: new Date().toISOString()
});
```

**After (UserListPage.tsx):**
```typescript
import { UserMutations } from '../utils/inventoryMutations';
import { useSession } from '../context/SessionContext';

const { activeUser } = useSession();

// New protected call with logging
try {
  await UserMutations.createUser(activeUser, username);
} catch (error) {
  if (error instanceof UserNotAuthenticatedError) {
    navigation.navigate('UserSelection');
  } else {
    Alert.alert('Error', 'Failed to create user');
  }
}
```

### 3. Add Session Guards to Components

**Add to any component that modifies data:**
```typescript
import { useSession } from '../context/SessionContext';
import { UserNotAuthenticatedError } from '../utils/inventoryMutations';

const MyComponent = () => {
  const { activeUser } = useSession();
  const navigation = useNavigation();

  const handleDataChange = async () => {
    try {
      // Your protected operation here
      await InventoryMutations.updateItem(activeUser, oldItem, newItem);
    } catch (error) {
      if (error instanceof UserNotAuthenticatedError) {
        navigation.navigate('UserSelection');
        return;
      }
      Alert.alert('Error', 'Operation failed');
    }
  };
};
```

## Protected Operations Available

### Inventory Operations
```typescript
import { InventoryMutations } from '../utils/inventoryMutations';

// Create new item
await InventoryMutations.createItem(activeUser, newItem);

// Update existing item  
await InventoryMutations.updateItem(activeUser, oldItem, newItem);

// Delete item
await InventoryMutations.deleteItem(activeUser, itemCode, itemName);

// Move quantity between locations
await InventoryMutations.moveQuantity(
  activeUser, 
  item, 
  'showroom',    // from location
  'storage',     // to location  
  5              // quantity
);

// Update quantity for specific location
await InventoryMutations.updateQuantity(
  activeUser,
  item,
  'warehouse',   // location
  15             // new quantity
);
```

### User Management Operations
```typescript
import { UserMutations } from '../utils/inventoryMutations';

// Create new user
await UserMutations.createUser(activeUser, 'NewUserName');

// Delete user  
await UserMutations.deleteUser(activeUser, 'UserToDelete');

// Rename user
await UserMutations.renameUser(activeUser, 'OldName', 'NewName', userData);
```

## Migration Checklist

### ✅ Files to Update:

1. **screens/InventoryMain.tsx**
   - Import `InventoryMutations` and `useSession`
   - Replace `updateItem()` calls in `handleAddItem()`
   - Replace `removeItem()` calls in `handleDeleteItem()`
   - Add error handling for authentication

2. **screens/UserListPage.tsx**  
   - Import `UserMutations` and `useSession`
   - Replace direct Firebase calls in user CRUD operations
   - Add authentication error handling

3. **components/InventoryRow.tsx**
   - Import `InventoryMutations` and `useSession`
   - Replace `updateItem()` calls with protected versions
   - Add session validation

4. **context/InventoryContext.tsx**
   - Update `updateItem()` and `removeItem()` methods
   - Use protected mutation functions
   - Handle authentication errors

### ⚠️ Breaking Changes:

- All inventory operations now require active user session
- Operations will throw `UserNotAuthenticatedError` if no user selected
- Components need error handling for authentication failures

### 🔒 Security Improvements:

- All data changes are now attributed to specific users
- Complete audit trail of who did what and when
- Input sanitization for log messages
- Validation rules prevent malformed log entries

## Testing the Integration

### 1. User Session Flow
1. Start app → should show User Selection screen
2. Pick a user → navigate to inventory
3. Try inventory operations → should work normally
4. Switch user → should return to selection screen

### 2. Activity Logging
1. Create/edit/delete inventory items
2. Navigate to Activity Log (clipboard icon)
3. Verify all actions appear with correct user attribution
4. Check timestamps and action descriptions

### 3. Error Handling  
1. Clear sessionStorage in browser dev tools
2. Try inventory operations → should redirect to user selection
3. Network failure during logging → inventory ops should still work

## Firebase Console Setup

### 1. Deploy Security Rules
Copy `firebase-rules.json` content to Firebase Console → Database → Rules

### 2. Create Test Users
In Firebase Console → Database → Data:
```json
{
  "users": {
    "alice": { "name": "Alice", "list": {} },
    "bob": { "name": "Bob", "list": {} },  
    "carol": { "name": "Carol", "list": {} }
  }
}
```

### 3. Monitor Activity Log
Watch `/log` node in real-time as users perform operations

---

**The integration is complete and ready for testing! 🚀**

All inventory operations now require user authentication and generate detailed activity logs.