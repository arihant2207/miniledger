/**
 * Module: Secure Storage
 * Responsibility: Manages cryptographic storage of JWT authentication tokens and user profiles
 * using expo-secure-store (hardware-backed iOS Keychain / Android KeyStore).
 * Strictly avoids plain AsyncStorage per security requirements.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'miniledger_auth_token';
const USER_KEY = 'miniledger_user_profile';

// In-memory fallback for environments where SecureStore is unavailable (e.g. web testing)
const memoryStore = new Map<string, string>();

async function isSecureStoreAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export interface StoredUser {
  id: string;
  phone: string;
  createdAt: string;
}

export const storage = {
  async setToken(token: string): Promise<void> {
    if (await isSecureStoreAvailable()) {
      await SecureStore.setItemAsync(TOKEN_KEY, token, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } else {
      memoryStore.set(TOKEN_KEY, token);
    }
  },

  async getToken(): Promise<string | null> {
    if (await isSecureStoreAvailable()) {
      return SecureStore.getItemAsync(TOKEN_KEY);
    }
    return memoryStore.get(TOKEN_KEY) ?? null;
  },

  async removeToken(): Promise<void> {
    if (await isSecureStoreAvailable()) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } else {
      memoryStore.delete(TOKEN_KEY);
    }
  },

  async setUser(user: StoredUser): Promise<void> {
    const json = JSON.stringify(user);
    if (await isSecureStoreAvailable()) {
      await SecureStore.setItemAsync(USER_KEY, json);
    } else {
      memoryStore.set(USER_KEY, json);
    }
  },

  async getUser(): Promise<StoredUser | null> {
    let json: string | null = null;
    if (await isSecureStoreAvailable()) {
      json = await SecureStore.getItemAsync(USER_KEY);
    } else {
      json = memoryStore.get(USER_KEY) ?? null;
    }

    if (!json) return null;
    try {
      return JSON.parse(json) as StoredUser;
    } catch {
      return null;
    }
  },

  async clearAll(): Promise<void> {
    await this.removeToken();
    if (await isSecureStoreAvailable()) {
      await SecureStore.deleteItemAsync(USER_KEY);
    } else {
      memoryStore.delete(USER_KEY);
    }
  },
};
