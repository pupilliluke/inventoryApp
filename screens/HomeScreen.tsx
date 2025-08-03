import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, SafeAreaView, Keyboard, ImageBackground } from 'react-native';
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
      source={require('../assets/bg.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Fireworks Inventory</Text>
        <Text style={styles.subtitle}>
          Inventory management system for tracking fireworks stock.
        </Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            secureTextEntry
            placeholder="Enter access password"
            placeholderTextColor="#BDC3C7"
            value={enteredPassword}
            onChangeText={setEnteredPassword}
            style={styles.input}
            onSubmitEditing={() => {
              Keyboard.dismiss();
              handleSubmit();
            }}
            returnKeyType="go"
          />
        </View>
        
        {error ? <Text style={styles.error}>{error}</Text> : null}
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Access System</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    margin: 32,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 32,
    color: '#2C3E50',
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 40,
    color: '#7F8C8D',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  inputContainer: {
    width: '85%',
    marginBottom: 24,
  },
  input: {
    borderWidth: 2,
    borderColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    fontSize: 16,
    fontWeight: '500',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonContainer: {
    width: '85%',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#3498DB',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#3498DB',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  error: {
    color: '#E74C3C',
    marginBottom: 16,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    backgroundColor: '#FADBD8',
    padding: 12,
    borderRadius: 8,
    width: '85%',
  },
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
});
