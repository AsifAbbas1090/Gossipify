/**
 * Unit tests for encryption/decryption
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  generateKeyPair,
  deriveSharedKey,
  encryptMessage,
  decryptMessage,
  encryptFile,
  decryptFile,
} from '../lib/crypto';

describe('Crypto', () => {
  beforeAll(async () => {
    // Initialize libsodium
    const { initSodium } = await import('../lib/crypto');
    await initSodium();
  });

  it('should generate keypairs', async () => {
    const keypair = await generateKeyPair();
    expect(keypair.publicKey).toBeDefined();
    expect(keypair.privateKey).toBeDefined();
    expect(keypair.publicKey.length).toBeGreaterThan(0);
    expect(keypair.privateKey.length).toBeGreaterThan(0);
  });

  it('should derive same shared key from both sides', async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();

    const sharedKey1 = await deriveSharedKey(alice.privateKey, bob.publicKey);
    const sharedKey2 = await deriveSharedKey(bob.privateKey, alice.publicKey);

    expect(sharedKey1).toEqual(sharedKey2);
  });

  it('should encrypt and decrypt messages', async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();

    const sharedKey = await deriveSharedKey(alice.privateKey, bob.publicKey);

    const plaintext = 'Hello, world!';
    const { ciphertext, nonce } = await encryptMessage(plaintext, sharedKey);

    expect(ciphertext).toBeDefined();
    expect(nonce).toBeDefined();
    expect(ciphertext).not.toBe(plaintext);

    const decrypted = await decryptMessage(ciphertext, nonce, sharedKey);
    expect(decrypted).toBe(plaintext);
  });

  it('should encrypt and decrypt files', async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();

    const sharedKey = await deriveSharedKey(alice.privateKey, bob.publicKey);

    const file = new Blob(['test file content'], { type: 'text/plain' });
    const { encryptedBlob, nonce, mimeType } = await encryptFile(file, sharedKey);

    expect(encryptedBlob).toBeDefined();
    expect(nonce).toBeDefined();
    expect(mimeType).toBe('text/plain');

    const decrypted = await decryptFile(encryptedBlob, nonce, sharedKey, mimeType);
    expect(decrypted).toBeDefined();

    const decryptedText = await decrypted!.text();
    expect(decryptedText).toBe('test file content');
  });
});

