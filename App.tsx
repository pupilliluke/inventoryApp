import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { signInAnonymously } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { InventoryProvider } from './context/InventoryContext';
import { SessionProvider } from './context/SessionContext';
import AuthGate from './components/AuthGate';
import InventoryMain from './screens/HomeScreen';
import UserListPage from './screens/UserListPage';
import UserSelectionScreen from './screens/UserSelectionScreen';
import LogPage from './screens/LogPage';
import RecountPage from './screens/RecountPage';
import ReportPage from './screens/ReportPage';

const Stack = createNativeStackNavigator();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    backdrop: 'rgba(255, 255, 255, 0.1)',
  },
};

export default function App() {
  useEffect(() => {
    // Anonymous Firebase auth for Realtime Database access (Clerk handles user identity).
    signInAnonymously(auth).catch((err) => console.error('Auth error:', err));
  }, []);

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <PaperProvider theme={theme}>
        <AuthGate>
          <SessionProvider>
            <InventoryProvider>
              <NavigationContainer>
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="UserSelection" component={UserSelectionScreen} />
                  <Stack.Screen name="Inventory" component={InventoryMain} />
                  <Stack.Screen name="UserListPage" component={UserListPage} />
                  <Stack.Screen name="LogPage" component={LogPage} />
                  <Stack.Screen name="RecountPage" component={RecountPage} />
                  <Stack.Screen name="ReportPage" component={ReportPage} />
                </Stack.Navigator>
              </NavigationContainer>
            </InventoryProvider>
          </SessionProvider>
        </AuthGate>
      </PaperProvider>
    </ClerkProvider>
  );
}
