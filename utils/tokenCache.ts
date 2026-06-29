import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Token cache for @clerk/clerk-expo. Unlike @clerk/expo, the Core 2 package does
 * not ship a built-in cache, so we provide one backed by expo-secure-store (the
 * device keychain) to persist the Clerk session token between app launches.
 *
 * On web there is no SecureStore (and Clerk uses cookies/localStorage), so we
 * pass `undefined` and let Clerk handle web persistence itself.
 */
interface TokenCache {
  getToken: (key: string) => Promise<string | null>;
  saveToken: (key: string, token: string) => Promise<void>;
  clearToken?: (key: string) => void;
}

function createTokenCache(): TokenCache {
  return {
    getToken: async (key: string) => {
      try {
        return await SecureStore.getItemAsync(key);
      } catch {
        // A corrupt entry should not wedge sign-in; drop it and start fresh.
        try {
          await SecureStore.deleteItemAsync(key);
        } catch {
          // ignore
        }
        return null;
      }
    },
    saveToken: (key: string, token: string) => SecureStore.setItemAsync(key, token),
    clearToken: (key: string) => {
      void SecureStore.deleteItemAsync(key);
    },
  };
}

export const tokenCache = Platform.OS !== 'web' ? createTokenCache() : undefined;
