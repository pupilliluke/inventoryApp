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
import LogPage from './screens/LogPage';
import RecountPage from './screens/RecountPage';
import ReportPage from './screens/ReportPage';
import PullListPage from './screens/PullListPage';
import PullListDetailPage from './screens/PullListDetailPage';
import { color } from './theme/tokens';

const Stack = createNativeStackNavigator();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Industrial steel-blue Paper theme; functional, low-chroma.
const theme = {
  ...DefaultTheme,
  roundness: 2,
  colors: {
    ...DefaultTheme.colors,
    primary: color.accent,
    accent: color.accent,
    background: color.appBg,
    surface: color.surface,
    text: color.text,
    backdrop: 'rgba(15, 23, 42, 0.55)',
  },
};

const navTheme = {
  dark: false,
  colors: {
    primary: color.accent,
    background: color.appBg,
    card: color.surface,
    text: color.text,
    border: color.border,
    notification: color.accent,
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
        <SessionProvider>
          <AuthGate>
            <InventoryProvider>
              <NavigationContainer theme={navTheme as any}>
                <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.appBg } }}>
                  <Stack.Screen name="Inventory" component={InventoryMain} />
                  <Stack.Screen name="PullLists" component={PullListPage} />
                  <Stack.Screen name="PullListDetail" component={PullListDetailPage} />
                  <Stack.Screen name="UserListPage" component={UserListPage} />
                  <Stack.Screen name="LogPage" component={LogPage} />
                  <Stack.Screen name="RecountPage" component={RecountPage} />
                  <Stack.Screen name="ReportPage" component={ReportPage} />
                </Stack.Navigator>
              </NavigationContainer>
            </InventoryProvider>
          </AuthGate>
        </SessionProvider>
      </PaperProvider>
    </ClerkProvider>
  );
}
