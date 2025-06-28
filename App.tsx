// App.tsx
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { InventoryProvider } from './context/InventoryContext';
import HomeScreen from './screens/HomeScreen';
import { signInAnonymously } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { Provider as PaperProvider } from 'react-native-paper';

export default function App() {
  useEffect(() => {
    signInAnonymously(auth)
      // .then(() => console.log('✅ Signed in anonymously'))
      .catch((err) => console.error('Auth error:', err));
  }, []);


  return (
    <PaperProvider>
      <InventoryProvider>
        <HomeScreen />
      </InventoryProvider>
    </PaperProvider>
  );


}
