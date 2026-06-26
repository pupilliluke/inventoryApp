import React from 'react';
import DashboardScreen from './DashboardScreen';

// The active user is established by AuthGate from the signed-in Google identity,
// so the home screen is the operations dashboard (tasks, pull lists, container
// status). The full inventory table lives on its own "InventoryList" route.
export default function ProtectedHome() {
  return <DashboardScreen />;
}
