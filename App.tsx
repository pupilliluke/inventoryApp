import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { signInAnonymously } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { InventoryProvider } from './context/InventoryContext';
import InventoryMain from './screens/HomeScreen'; // <- renamed to InventoryMain
// import UserListPage from './screens/UserListPage';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    signInAnonymously(auth).catch((err) => console.error('Auth error:', err));
  }, []);

  return (
    <PaperProvider>
      <InventoryProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Inventory" component={InventoryMain} />
            {/* <Stack.Screen name="UserList" component={UserListPage} /> */}
          </Stack.Navigator>
        </NavigationContainer>
      </InventoryProvider>
    </PaperProvider>
  );
}
