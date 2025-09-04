# User Session & Activity Logging System

## Overview

This implementation adds user session management and comprehensive activity logging to the Fireworks Inventory App using **Firebase Realtime Database v9 modular SDK** with no server-side authentication.

## Features

### 🔐 User Session Management
- **User Selection Screen**: Choose identity from existing users before inventory access
- **Session Persistence**: Active user stored in sessionStorage + React Context
- **Header Badge**: Shows current user with switch functionality
- **Session Guards**: All inventory mutations require active user authentication

### 📊 Activity Logging
- **Real-time Logging**: All inventory and user changes logged to Firebase `/log`
- **Detailed Messages**: Human-readable action descriptions with user attribution
- **Live Activity Feed**: Real-time log page with automatic updates
- **Error Resilience**: Logging failures don't break inventory operations

## Database Structure

```
/
├── inventory/           # Existing inventory items
├── users/              # User accounts
│   └── {userId}/
│       ├── name: string
│       ├── list: {}     # User's personal checklist
│       ├── createdAt: string
│       └── updatedAt: string
└── log/                # NEW: Activity log entries
    └── {logId}/
        ├── message: string      # "Alex created Item #123 (200g fountain)"
        ├── userId: string       # User ID who performed action
        ├── userName: string     # User name (denormalized for readability)
        └── ts: timestamp        # Firebase server timestamp
```

## Implementation Files

### Core Components
- `types/session.ts` - TypeScript interfaces for session and logging
- `context/SessionContext.tsx` - React Context for session management
- `utils/logging.ts` - Firebase logging utilities and message generators
- `utils/inventoryMutations.ts` - Protected inventory operations with logging

### UI Components
- `screens/UserSelectionScreen.tsx` - User selection interface
- `components/UserBadge.tsx` - Header badge with user switching
- `screens/LogPage.tsx` - Real-time activity feed

### Integration
- `App.tsx` - Updated with SessionProvider and new routes
- `screens/HomeScreen.tsx` - Navigation guard for user selection
- `screens/InventoryMain.tsx` - Integrated UserBadge and log navigation

## Firebase Security Rules

```json
{
  "rules": {
    ".read": true,
    ".write": false,
    
    "inventory": {
      ".read": true,
      ".write": true
    },
    
    "log": {
      ".read": true,
      ".write": true,
      "$logId": {
        ".validate": 
          "newData.hasChildren(['message','userId','userName','ts']) && " +
          "newData.child('message').isString() && " +
          "newData.child('message').val().length > 0 && " +
          "newData.child('message').val().length <= 500 && " +
          "newData.child('userId').isString() && " +
          "newData.child('userId').val().length > 0 && " +
          "newData.child('userName').isString() && " +
          "newData.child('userName').val().length > 0 && " +
          "newData.child('ts').val() == now"
      }
    },
    
    "users": { 
      ".read": true,
      ".write": true,
      "$userId": {
        ".validate": "newData.hasChild('name') && newData.child('name').isString()"
      }
    }
  }
}
```

**⚠️ Security Note**: These rules allow open read/write access without authentication. For production use:
1. Implement Firebase Authentication
2. Restrict writes to authenticated users only
3. Add user-specific access controls
4. Consider data validation and sanitization

## Usage Examples

### Starting a Session
1. App launches → redirects to User Selection screen
2. User picks their identity from `/users` list
3. Selection stored in sessionStorage + React Context
4. User navigated to main inventory screen

### Inventory Operations
```typescript
import { InventoryMutations } from './utils/inventoryMutations';
import { useSession } from './context/SessionContext';

const { activeUser } = useSession();

// All operations require authenticated user
await InventoryMutations.createItem(activeUser, newItem);
await InventoryMutations.updateItem(activeUser, oldItem, newItem);
await InventoryMutations.deleteItem(activeUser, itemCode, itemName);
await InventoryMutations.moveQuantity(activeUser, item, 'showroom', 'storage', 5);
```

### Log Messages Generated
- `"Alex created Item #123 (200g: Red Dragon Fountain)"`
- `"Jordan moved Item #456 (qty: 3): Showroom → Storage"`
- `"Riley updated Item #789: showroom: 8 → 12, warehouse: 5 → 3"`
- `"Sam deleted Item #321 (Sparkler: Golden Rain)"`
- `"Taylor created new user: Mike"`
- `"Casey renamed user: John → Johnny"`

### Accessing Activity Log
- Navigate via clipboard icon in inventory header
- Real-time updates via Firebase listeners
- Newest entries first with relative timestamps
- Color-coded by action type (create=green, delete=red, update=orange)

## Error Handling

### User Authentication
```typescript
try {
  await InventoryMutations.createItem(activeUser, item);
} catch (error) {
  if (error instanceof UserNotAuthenticatedError) {
    // Redirect to user selection
    navigation.navigate('UserSelection');
  }
}
```

### Logging Resilience
- All logging wrapped in try/catch blocks
- Inventory operations succeed even if logging fails
- Errors logged to console for debugging
- No user-facing error messages for logging failures

## Configuration

### Firebase Environment Variables
Create `.env` file in project root:
```env
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef
```

### Firebase Rules Deployment
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize project: `firebase init database`
4. Deploy rules: `firebase deploy --only database`

Or manually paste rules into Firebase Console → Database → Rules

## Running Locally

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure Firebase**
   - Set up environment variables
   - Deploy security rules
   - Ensure `/users` node exists with at least one user

3. **Start development server**
   ```bash
   npm start
   # or
   npx expo start
   ```

4. **Access application**
   - Web: http://localhost:8084 (or assigned port)
   - First-time: Create users via User Management
   - Select user identity to begin inventory operations

## Navigation Flow

```
Password Entry → User Selection → Main Inventory
                      ↑              ↓
                   (Switch User)  (Activity Log)
                                     ↓
                              Real-time Log Feed
```

## Security Considerations

### Current Implementation
- **No Authentication**: Open write access to all Firebase nodes
- **Input Validation**: Basic sanitization in logging messages
- **Session Storage**: Client-side only, not server-verified

### Production Recommendations
1. **Add Firebase Authentication**
   - Email/password, Google, or custom auth
   - Verify user tokens on all operations
   
2. **Enhanced Security Rules**
   ```json
   {
     "rules": {
       ".read": "auth != null",
       ".write": "auth != null",
       "log": {
         "$logId": {
           ".validate": "newData.child('userId').val() == auth.uid"
         }
       }
     }
   }
   ```

3. **Data Validation**
   - Server-side input sanitization
   - Rate limiting for log writes
   - User permission checks

4. **Audit Trail**
   - Immutable log entries
   - Digital signatures for critical operations
   - Backup and retention policies

## Troubleshooting

### Common Issues

**"User must be selected" errors**
- Clear sessionStorage and restart app
- Ensure users exist in `/users` Firebase node
- Check SessionProvider wraps entire app

**Logging not working**
- Verify Firebase rules allow writes to `/log`
- Check browser console for Firebase errors
- Ensure serverTimestamp() is properly configured

**Real-time updates not showing**
- Check Firebase connection status
- Verify query syntax in log listeners
- Test with Firebase console directly

### Debug Tools
- Browser DevTools → Application → Session Storage
- Firebase Console → Database → Data viewer
- React DevTools → SessionProvider context
- Network tab for Firebase WebSocket connections

---

The system is now fully functional with user session management and comprehensive activity logging! 🚀