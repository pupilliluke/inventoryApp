import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, SafeAreaView, Keyboard } from 'react-native';
import ActualInventoryApp from './InventoryMain'; // rename your existing HomeScreen to InventoryMain.tsx

const PASSWORD = 'fireworks123'; // 🔐 change this to whatever password you want

export default function ProtectedInventoryApp() {
  const [enteredPassword, setEnteredPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    Keyboard.dismiss();
    if (enteredPassword === PASSWORD) {
      setAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  if (authenticated) return <ActualInventoryApp />;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Enter Password</Text>
      <TextInput
        secureTextEntry
        placeholder="Password"
        value={enteredPassword}
        onChangeText={setEnteredPassword}
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Enter" onPress={handleSubmit} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
  title: { fontSize: 22, marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    width: '80%',
    marginBottom: 12,
    borderRadius: 6,
  },
  error: { color: 'red', marginBottom: 12 },
});
