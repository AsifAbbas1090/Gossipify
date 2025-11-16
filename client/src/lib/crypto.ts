import nacl from 'tweetnacl';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { Buffer } from 'buffer';

// Utilities for encoding/decoding
export function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

export function fromBase64(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

const PRIVATE_KEY_KEY = 'gossipify_privkey';
const PUBLIC_KEY_KEY = 'gossipify_pubkey';

export type KeyPairBase64 = { publicKey: string; secretKey: string };

async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem(key, value); } catch {}
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { if (typeof window !== 'undefined' && window.localStorage) return window.localStorage.getItem(key); } catch {}
    return null;
  }
  return await SecureStore.getItemAsync(key);
}

// Generate a long-term X25519 keypair
export async function generateKeypair(): Promise<KeyPairBase64> {
  const kp = nacl.box.keyPair();
  const publicKey = toBase64(kp.publicKey);
  const secretKey = toBase64(kp.secretKey);
  await setSecureItem(PRIVATE_KEY_KEY, secretKey);
  await setSecureItem(PUBLIC_KEY_KEY, publicKey);
  return { publicKey, secretKey };
}

export async function getStoredKeypair(): Promise<KeyPairBase64 | null> {
  const publicKey = await getSecureItem(PUBLIC_KEY_KEY);
  const secretKey = await getSecureItem(PRIVATE_KEY_KEY);
  if (!publicKey || !secretKey) return null;
  return { publicKey, secretKey };
}

export async function storeKeypair(kp: KeyPairBase64): Promise<void> {
  await setSecureItem(PUBLIC_KEY_KEY, kp.publicKey);
  await setSecureItem(PRIVATE_KEY_KEY, kp.secretKey);
}

// Derive a conversation shared key using X25519
export function deriveSharedKey(mySecretKeyB64: string, peerPublicKeyB64: string): Uint8Array {
  const mySecretKey = fromBase64(mySecretKeyB64);
  const peerPublicKey = fromBase64(peerPublicKeyB64);
  const shared = nacl.box.before(peerPublicKey, mySecretKey);
  // For XSalsa20-Poly1305 secretbox we need a 32-byte key already; nacl.box.before returns 32 bytes.
  return shared;
}

export function encryptMessage(plaintext: Uint8Array, key: Uint8Array): { nonce: string; ciphertext: string } {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const box = nacl.secretbox(plaintext, nonce, key);
  return { nonce: toBase64(nonce), ciphertext: toBase64(box) };
}

export function decryptMessage(ciphertextB64: string, nonceB64: string, key: Uint8Array): Uint8Array | null {
  const nonce = fromBase64(nonceB64);
  const ciphertext = fromBase64(ciphertextB64);
  const opened = nacl.secretbox.open(ciphertext, nonce, key);
  return opened || null;
}

export function fingerprintPublicKey(publicKeyB64: string): string {
  // Simple fingerprint: first 8 bytes of publicKey base64-decoded, then base64 them again
  const pk = fromBase64(publicKeyB64);
  const fp = pk.slice(0, 8);
  return toBase64(fp);
}


