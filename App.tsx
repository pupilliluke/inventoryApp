import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { signInAnonymously } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { InventoryProvider } from './context/InventoryContext';
import { SessionProvider } from './context/SessionContext';
import InventoryMain from './screens/HomeScreen'; 
import UserListPage from './screens/UserListPage';
import UserSelectionScreen from './screens/UserSelectionScreen';
import LogPage from './screens/LogPage';

const Stack = createNativeStackNavigator();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    backdrop: 'rgba(255, 255, 255, 0.1)',
  },
};

export default function App() {
  useEffect(() => {
    signInAnonymously(auth).catch((err) => console.error('Auth error:', err));
  }, []);

  return (
    <PaperProvider theme={theme}>
      <SessionProvider>
        <InventoryProvider>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="UserSelection" component={UserSelectionScreen} />
              <Stack.Screen name="Inventory" component={InventoryMain} />
              <Stack.Screen name="UserListPage" component={UserListPage} />
              <Stack.Screen name="LogPage" component={LogPage} />
            </Stack.Navigator>
          </NavigationContainer>
        </InventoryProvider>
      </SessionProvider>
    </PaperProvider>
  );
}
