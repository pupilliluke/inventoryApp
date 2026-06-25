import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { color, space } from '../theme/tokens';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <View style={styles.background}>
      <View style={styles.content}>
        <Image
          source={require('../assets/1024.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Phantom Warehouse</Text>
        <ActivityIndicator size="large" color={color.onChrome} animating style={styles.spinner} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: color.chromeAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 4,
    marginBottom: 24,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: color.onChrome,
    marginBottom: 32,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  spinner: {
    marginBottom: space.lg,
  },
  message: {
    fontSize: 14,
    color: color.onChromeMuted,
    fontWeight: '500',
  },
});
