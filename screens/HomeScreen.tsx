import React from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSession } from '../context/SessionContext';
import ActualInventoryApp from './InventoryMain';

export default function ProtectedInventoryApp() {
  const { activeUser, isSessionLoaded } = useSession();
  const navigation = useNavigation();

  // If no Firebase user has been selected yet, send the user back to selection.
  // (Clerk authentication is handled upstream by AuthGate.)
  useFocusEffect(
    React.useCallback(() => {
      if (isSessionLoaded && !activeUser) {
        navigation.navigate('UserSelection' as never);
      }
    }, [isSessionLoaded, activeUser, navigation])
  );

  return <ActualInventoryApp />;
}
