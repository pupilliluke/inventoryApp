# Fireworks Inventory App

A mobile-first React Native inventory management system designed specifically for tracking fireworks stock across multiple locations. Built with Expo, React Navigation, Firebase, and React Native Paper.

## 🚀 Features

### Authentication & Security
- **Password Protection**: App is secured with a hardcoded password (`monroeville` - configurable in `screens/HomeScreen.tsx:7`)
- **Anonymous Firebase Authentication**: Users authenticate anonymously with Firebase
- **Beautiful Login Screen**: Elegant login interface with background image and styled components

### Core Inventory Management
- **Multi-Location Tracking**: Track inventory across locations:
  - Showroom
  - Warehouse 
  - Storage
- **Real-time Database Sync**: All changes sync instantly via Firebase Realtime Database
- **Item Management**: Add, edit, and delete inventory items
- **Type Classification**: 19 predefined product types including Assortment, Candle, Firecracker, Rocket, Smoke, Sparkler, Toy, Mortar, Missile, Rack, Fountain, Z-repeater, 200g, 500g, Novelty, Free Item, Shirt, and Other

### Advanced Filtering & Search
- **Text Search**: Search by item name, code, or type
- **Location Filters**: Filter by specific locations (Showroom Pull List, Warehouse, Storage)
- **Type Filters**: Multi-select type filtering with chip-based interface
- **Reset Filters**: One-click filter reset functionality

### User List Management
- **Create User Lists**: Generate personalized firework lists for different users
- **User Management**: Add, rename, and delete users
- **Checklist Interface**: Users can check off items from their personal lists
- **List Tracking**: View item count per user

### Mobile-Optimized Interface
- **Responsive Design**: Optimized for mobile devices with touch-friendly interface
- **Material Design**: Consistent UI using React Native Paper components
- **Card-Based Layout**: Clean, modern card interface for inventory items
- **Modal Dialogs**: Elegant modal interfaces for item management

## 📱 User Interface Components

### Main Screens
1. **Login Screen** (`screens/HomeScreen.tsx`)
   - Password input field
   - Access System button
   - Background image with overlay
   - Error handling for incorrect passwords

2. **Inventory Main** (`screens/InventoryMain.tsx`)
   - Header with app title and action buttons
   - Filter bar with search and location filters
   - Type filter accordion with multi-select chips
   - Inventory list display
   - Item counter
   - Management modal for adding/deleting items

3. **User List Page** (`screens/UserListPage.tsx`)
   - User creation form
   - User list with item counts
   - User management actions (view, edit, delete)
   - Checklist interface for user items

### Key Components
- **FilterBar** (`components/FilterBar.tsx`): Search and location filtering
- **InventoryRow** (`components/InventoryRow.tsx`): Individual item display and editing
- **InventoryContext** (`context/InventoryContext.tsx`): State management and Firebase integration

## 🔘 All Buttons and Functions

### Navigation & Access
- **Access System** - Login button to access the app
- **Account** (👤) - Navigate to User List Page
- **Plus Box Multiple** (📦+) - Open inventory management modal
- **Back** (←) - Return to previous screen

### Inventory Management
- **Edit** - Toggle item editing mode for name, code, and type
- **Move** - Toggle location editing mode for quantity management
- **Save** - Confirm changes to item information or quantities
- **Add Item** - Create new inventory item
- **Delete Item** - Remove item from inventory (with confirmation)
- **Reset** - Clear all active filters
- **Type Selection** - Modal selector for item types

### Filtering & Search
- **Filter by Type** - Accordion with multi-select chip filters
- **Location Buttons**: Showroom Pull List, Warehouse, Storage
- **Search Input** - Real-time text filtering
- **Type Chips** - Individual type filter toggles

### User Management
- **Add User** - Create new user account
- **View** (👁) - Load and display user's firework list
- **Edit** (✏️) - Rename existing user
- **Delete** (🗑️) - Remove user (with confirmation)
- **Save Name** - Confirm user rename
- **Checkboxes** - Toggle items in user lists

## ⚙️ Technical Architecture

### Dependencies
- **React Native**: 0.79.4
- **Expo**: ~53.0.13
- **Firebase**: ^11.9.1
- **React Navigation**: ^7.1.14
- **React Native Paper**: ^5.14.5
- **TypeScript**: ~5.8.3

### Data Structure
```typescript
interface InventoryItem {
  code: string;
  name: string;
  type: string;
  showroom: number;
  warehouse: number;
  storage: number;
  editable?: boolean;
}
```

### Firebase Configuration
- **Real-time Database**: `fireworksapp-8a60e-default-rtdb.firebaseio.com`
- **Authentication**: Anonymous sign-in
- **Project ID**: `fireworksapp-8a60e`
- **Storage**: `fireworksapp-8a60e.firebasestorage.app`

## 📦 Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Android Studio (for Android development) or Xcode (for iOS development)

### Local Development Setup
1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd inventoryApp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   # or
   npx expo start
   ```

4. **Run on platform**
   ```bash
   npm run android  # For Android
   npm run ios      # For iOS  
   npm run web      # For web browser
   ```

### Production Build
```bash
npm run build  # Creates web export in dist/
```

## 🚀 Deployment Options

### Mobile App Deployment (EAS Build)
The app is configured for Expo Application Services (EAS) deployment:

```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Configure builds
eas build --platform android  # Android APK
eas build --platform ios      # iOS build
```

**EAS Configuration** (`eas.json`):
- Development builds with development client
- Preview builds for internal distribution
- Production builds with auto-increment versioning
- Project ID: `0d07f774-8388-4e93-abfe-2bce0852957c`

### Web Deployment (Firebase Hosting)
The app can be deployed to Firebase Hosting:

```bash
# Build for web
npm run build

# Deploy to Firebase
firebase login
firebase init hosting
firebase deploy
```

**Firebase Hosting Configuration** (`firebase.json`):
- Public directory: `dist`
- Redirect rules configured
- Cache control headers for optimization
- Ignores: `firebase.json`, hidden files, `node_modules`

### Platform Support
- **iOS**: Configured with bundle identifier `com.pupilli.dev.inventoryApp`
- **Android**: Adaptive icon and edge-to-edge support
- **Web**: Favicon and web-specific optimizations

## 🔧 Configuration & Customization

### Changing the Password
Edit `screens/HomeScreen.tsx` line 7:
```typescript
const PASSWORD = 'your-new-password';
```

### Adding Product Types
Modify the `typeFilters` array in `screens/InventoryMain.tsx:12-15` and `components/InventoryRow.tsx:8-11`.

### Firebase Configuration
Update `firebaseConfig.ts` with your Firebase project credentials.

### Styling Customization
- Main colors: Defined in component styles
- Theme: Light theme with Material Design principles
- Shadows and elevation: Consistent across components

## 📊 Data Management

### Local State Management
- **InventoryContext**: Centralized state management
- **Real-time Filtering**: Client-side filtering for performance
- **Optimistic Updates**: Immediate UI updates with Firebase sync

### Firebase Structure
```
inventory/
  ├── [item-code]/
  │   ├── code: string
  │   ├── name: string  
  │   ├── type: string
  │   ├── showroom: number
  │   ├── warehouse: number
  │   └── storage: number
  └── ...

users/
  ├── [username]/
  │   ├── name: string
  │   └── list/
  │       ├── [item-code]: boolean
  │       └── ...
  └── ...
```

## 🎯 Use Cases

### Primary Users
- **Fireworks retailers** managing multi-location inventory
- **Event planners** tracking supplies across venues
- **Warehouse managers** coordinating stock movement

### Typical Workflows
1. **Inventory Check**: Search and filter items by location
2. **Stock Updates**: Edit quantities across locations
3. **Customer Lists**: Create personalized shopping lists
4. **Reorder Planning**: Identify low-stock items
5. **Location Management**: Transfer stock between locations

## 🔒 Security Notes

- Password is hardcoded for simplicity (consider environment variables for production)
- Firebase rules should be configured for production use
- Anonymous authentication means no user persistence across devices
- Consider implementing proper user accounts for multi-user scenarios

## 📱 Browser Compatibility

- **Mobile Browsers**: Optimized for mobile Safari and Chrome
- **Desktop**: Full functionality on modern browsers
- **PWA Ready**: Can be installed as a Progressive Web App

---

Built with ❤️ for efficient fireworks inventory management.