import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, SafeAreaView, Keyboard, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSession } from '../context/SessionContext';
import ActualInventoryApp from './InventoryMain';

const PASSWORD = 'monroeville'; // 🔐 change this to whatever password you want

export default function ProtectedInventoryApp() {
  const [enteredPassword, setEnteredPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const { activeUser, isSessionLoaded } = useSession();
  const navigation = useNavigation();

  // Redirect to user selection if no user is selected after session loads
  useFocusEffect(
    React.useCallback(() => {
      if (isSessionLoaded && !activeUser && authenticated) {
        navigation.navigate('UserSelection' as never);
      }
    }, [isSessionLoaded, activeUser, authenticated, navigation])
  );

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
    <View style={styles.background}>
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Fireworks Inventory</Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            secureTextEntry
            placeholder="Enter Password"
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
            <Text style={styles.buttonText}>Authenticate</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginHorizontal: 32,
    marginVertical: 48,
    paddingVertical: 88,
    paddingHorizontal: 80,
    borderRadius: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 48,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 32,
  },
  input: {
    borderWidth: 2,
    borderColor: '#E8E8E8',
    backgroundColor: 'transparent',
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
    width: '100%',
    marginTop: 24,
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
    marginBottom: 24,
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
    backgroundColor: '#5B21B6', // Darker professional purple
    width: '100%',
    height: '100%',
  },
});
