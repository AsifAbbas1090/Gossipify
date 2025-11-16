import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export async function saveString(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem(key, value); } catch {}
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function getString(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { if (typeof window !== 'undefined' && window.localStorage) return window.localStorage.getItem(key); } catch {}
    return null;
  }
  return SecureStore.getItemAsync(key);
}

const USERNAME_KEY = 'gossipify_username';

export async function saveUsername(username: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem(USERNAME_KEY, username); } catch {}
    return;
  }
  await SecureStore.setItemAsync(USERNAME_KEY, username);
}

export async function getUsername(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { if (typeof window !== 'undefined' && window.localStorage) return window.localStorage.getItem(USERNAME_KEY); } catch {}
    return null;
  }
  return SecureStore.getItemAsync(USERNAME_KEY);
}


