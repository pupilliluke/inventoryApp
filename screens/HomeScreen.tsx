import React from 'react';
import ActualInventoryApp from './InventoryMain';

// The active user is established by AuthGate from the signed-in Google identity,
// so this screen simply renders the inventory app (no operator-selection step).
export default function ProtectedInventoryApp() {
  return <ActualInventoryApp />;
}
