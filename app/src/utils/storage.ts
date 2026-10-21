/**
 * Module: Secure Storage
 * Responsibility: Manages cryptographic storage of JWT authentication tokens and user profiles
 * using expo-secure-store (hardware-backed iOS Keychain / Android KeyStore).
 * Strictly avoids plain AsyncStorage per security requirements.
 */

import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'miniledger_auth_token';
const USER_KEY = 'miniledger_user_profile';

export interface StoredUser {
  id: string;
  phone: string;
  createdAt: string;
}

export const storage = {
  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },

  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
  },

  async removeToken(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },

  async setUser(user: StoredUser): Promise<void> {
    const json = JSON.stringify(user);
    await SecureStore.setItemAsync(USER_KEY, json);
  },

  async getUser(): Promise<StoredUser | null> {
    const json = await SecureStore.getItemAsync(USER_KEY);
    if (!json) return null;
    try {
      return JSON.parse(json) as StoredUser;
    } catch {
      return null;
    }
  },

  async clearAll(): Promise<void> {
    await this.removeToken();
    await SecureStore.deleteItemAsync(USER_KEY);
  },
};
