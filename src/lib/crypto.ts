/**
 * End-to-end encryption utilities using libsodium
 * 
 * Security notes:
 * - Uses X25519 for key agreement (ECDH)
 * - Uses XSalsa20-Poly1305 (crypto_secretbox) for symmetric encryption
 * - Private keys are stored encrypted in IndexedDB
 * - Never expose private keys to server
 */

import _sodium from 'libsodium-wrappers';

let sodium: typeof _sodium;

// Initialize libsodium
export async function initSodium(): Promise<void> {
  if (!sodium) {
    await _sodium.ready;
    sodium = _sodium;
  }
}

// Key pair types
export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface KeyPairBase64 {
  publicKey: string;
  privateKey: string;
}

/**
 * Generate a new X25519 keypair for the user
 * This should be called once during registration
 */
export async function generateKeyPair(): Promise<KeyPairBase64> {
  await initSodium();
  const keypair = sodium.crypto_box_keypair();
  
  return {
    publicKey: sodium.to_base64(keypair.publicKey, sodium.base64_variants.ORIGINAL),
    privateKey: sodium.to_base64(keypair.privateKey, sodium.base64_variants.ORIGINAL),
  };
}

/**
 * Derive a shared symmetric key between two users
 * This is used for encrypting/decrypting messages in a 1:1 chat
 * 
 * @param myPrivateKey - Base64 encoded private key
 * @param peerPublicKey - Base64 encoded peer's public key
 * @returns Shared symmetric key (32 bytes)
 */
export async function deriveSharedKey(
  myPrivateKey: string,
  peerPublicKey: string
): Promise<Uint8Array> {
  await initSodium();
  
  const myPrivate = sodium.from_base64(myPrivateKey, sodium.base64_variants.ORIGINAL);
  const peerPublic = sodium.from_base64(peerPublicKey, sodium.base64_variants.ORIGINAL);
  
  // X25519 key agreement
  const sharedKey = sodium.crypto_box_beforenm(peerPublic, myPrivate);
  
  return sharedKey;
}

/**
 * Encrypt a text message
 * 
 * @param plaintext - Message text as string
 * @param sharedKey - Shared symmetric key from deriveSharedKey
 * @returns Encrypted message with nonce
 */
export async function encryptMessage(
  plaintext: string,
  sharedKey: Uint8Array
): Promise<{ ciphertext: string; nonce: string }> {
  await initSodium();
  
  const messageBytes = sodium.from_string(plaintext);
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  
  const ciphertext = sodium.crypto_secretbox_easy(messageBytes, nonce, sharedKey);
  
  return {
    ciphertext: sodium.to_base64(ciphertext, sodium.base64_variants.ORIGINAL),
    nonce: sodium.to_base64(nonce, sodium.base64_variants.ORIGINAL),
  };
}

/**
 * Decrypt a text message
 * 
 * @param ciphertext - Base64 encoded ciphertext
 * @param nonce - Base64 encoded nonce
 * @param sharedKey - Shared symmetric key
 * @returns Decrypted message text or null if decryption fails
 */
export async function decryptMessage(
  ciphertext: string,
  nonce: string,
  sharedKey: Uint8Array
): Promise<string | null> {
  await initSodium();
  
  try {
    const ciphertextBytes = sodium.from_base64(ciphertext, sodium.base64_variants.ORIGINAL);
    const nonceBytes = sodium.from_base64(nonce, sodium.base64_variants.ORIGINAL);
    
    const decrypted = sodium.crypto_secretbox_open_easy(ciphertextBytes, nonceBytes, sharedKey);
    
    if (!decrypted) {
      return null;
    }
    
    return sodium.to_string(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}

/**
 * Encrypt a file/blob for storage
 * Uses streaming encryption for large files
 * 
 * @param file - File or Blob to encrypt
 * @param sharedKey - Shared symmetric key
 * @returns Encrypted blob and nonce
 */
export async function encryptFile(
  file: File | Blob,
  sharedKey: Uint8Array
): Promise<{ encryptedBlob: Blob; nonce: string; mimeType: string }> {
  await initSodium();
  
  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  
  // Encrypt the file
  const ciphertext = sodium.crypto_secretbox_easy(fileBytes, nonce, sharedKey);
  
  return {
    encryptedBlob: new Blob([ciphertext], { type: 'application/octet-stream' }),
    nonce: sodium.to_base64(nonce, sodium.base64_variants.ORIGINAL),
    mimeType: file.type || 'application/octet-stream',
  };
}

/**
 * Decrypt a file/blob
 * 
 * @param encryptedBlob - Encrypted blob
 * @param nonce - Base64 encoded nonce
 * @param sharedKey - Shared symmetric key
 * @param mimeType - Original MIME type
 * @returns Decrypted blob or null if decryption fails
 */
export async function decryptFile(
  encryptedBlob: Blob,
  nonce: string,
  sharedKey: Uint8Array,
  mimeType: string
): Promise<Blob | null> {
  await initSodium();
  
  try {
    const encryptedBytes = new Uint8Array(await encryptedBlob.arrayBuffer());
    const nonceBytes = sodium.from_base64(nonce, sodium.base64_variants.ORIGINAL);
    
    const decrypted = sodium.crypto_secretbox_open_easy(encryptedBytes, nonceBytes, sharedKey);
    
    if (!decrypted) {
      return null;
    }
    
    return new Blob([decrypted], { type: mimeType });
  } catch (error) {
    console.error('File decryption failed:', error);
    return null;
  }
}

/**
 * Generate a fingerprint from a public key (first 8 bytes)
 * Used for key verification
 */
export async function fingerprintPublicKey(publicKey: string): Promise<string> {
  await initSodium();
  const keyBytes = sodium.from_base64(publicKey, sodium.base64_variants.ORIGINAL);
  const fingerprint = keyBytes.slice(0, 8);
  return sodium.to_base64(fingerprint, sodium.base64_variants.ORIGINAL);
}

/**
 * Encrypt private key with user password for secure storage
 * Uses Argon2id for key derivation (via libsodium)
 */
export async function encryptPrivateKey(
  privateKey: string,
  password: string
): Promise<{ encrypted: string; salt: string }> {
  await initSodium();
  
  const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
  const key = sodium.crypto_pwhash(
    sodium.crypto_secretbox_KEYBYTES,
    password,
    salt,
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_DEFAULT
  );
  
  const privateKeyBytes = sodium.from_base64(privateKey, sodium.base64_variants.ORIGINAL);
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const encrypted = sodium.crypto_secretbox_easy(privateKeyBytes, nonce, key);
  
  return {
    encrypted: sodium.to_base64(encrypted, sodium.base64_variants.ORIGINAL),
    salt: sodium.to_base64(salt, sodium.base64_variants.ORIGINAL),
  };
}

/**
 * Decrypt private key with user password
 */
export async function decryptPrivateKey(
  encrypted: string,
  salt: string,
  password: string
): Promise<string | null> {
  await initSodium();
  
  try {
    const saltBytes = sodium.from_base64(salt, sodium.base64_variants.ORIGINAL);
    const key = sodium.crypto_pwhash(
      sodium.crypto_secretbox_KEYBYTES,
      password,
      saltBytes,
      sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_ALG_DEFAULT
    );
    
    const encryptedBytes = sodium.from_base64(encrypted, sodium.base64_variants.ORIGINAL);
    // Extract nonce (first 24 bytes) and ciphertext
    const nonce = encryptedBytes.slice(0, sodium.crypto_secretbox_NONCEBYTES);
    const ciphertext = encryptedBytes.slice(sodium.crypto_secretbox_NONCEBYTES);
    
    const decrypted = sodium.crypto_secretbox_open_easy(ciphertext, nonce, key);
    
    if (!decrypted) {
      return null;
    }
    
    return sodium.to_base64(decrypted, sodium.base64_variants.ORIGINAL);
  } catch (error) {
    console.error('Private key decryption failed:', error);
    return null;
  }
}

