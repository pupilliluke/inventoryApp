import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, SafeAreaView, Keyboard, ImageBackground } from 'react-native';
import ActualInventoryApp from './InventoryMain'; 
import { TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const PASSWORD = 'monroeville'; // 🔐 change this to whatever password you want

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
      <ImageBackground
      source={require('../assets/bg.jpg')} // or use a URI: { uri: 'https://example.com/bg.jpg' }
      style={styles.background}
      resizeMode="cover"
    >
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Enter Password</Text>
      <TextInput
        secureTextEntry
        placeholder="Password"
        value={enteredPassword}
        onChangeText={setEnteredPassword}
        style={styles.input}
        
        onSubmitEditing={() => {
        Keyboard.dismiss();
        
        handleSubmit();
      }}
      returnKeyType="next"
   
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Enter" onPress={handleSubmit} />
    </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255, 255, 255, 0.8)', 
    padding: 20, maxHeight: 200, width: '70%', 
    borderRadius: 10, 
    borderWidth: 20, 
    borderColor: '#fff' 
  },
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
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
});
