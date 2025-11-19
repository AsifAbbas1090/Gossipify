/**
 * Media upload/download utilities
 * All media is encrypted client-side before upload
 * Updated to use 'end-to-end app' bucket and chat-based paths
 */

import { supabase } from './supabase';
import { encryptFile, decryptFile } from './crypto';

/**
 * Upload encrypted media file to Supabase Storage
 * 
 * @param file - File to upload
 * @param sharedKey - Shared symmetric key for encryption
 * @param chatId - Chat ID for path organization
 * @returns Storage path and metadata
 */
export async function uploadEncryptedMedia(
  file: File,
  sharedKey: Uint8Array,
  chatId: string
): Promise<{ path: string; nonce: string; mimeType: string }> {
  // Encrypt file client-side
  const { encryptedBlob, nonce, mimeType } = await encryptFile(file, sharedKey);
  
  // Generate unique path: chat_<chatId>/<randomId>_<filename>.enc
  const randomId = crypto.randomUUID();
  const filename = `${randomId}_${file.name}.enc`;
  const path = `chat_${chatId}/${filename}`;
  
  // Upload encrypted blob to Supabase Storage
  const { error } = await supabase.storage
    .from('end-to-end app')
    .upload(path, encryptedBlob, {
      contentType: 'application/octet-stream',
      upsert: false,
    });
  
  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
  
  return {
    path,
    nonce,
    mimeType,
  };
}

/**
 * Download and decrypt media file
 * 
 * @param path - Storage path
 * @param nonce - Encryption nonce
 * @param sharedKey - Shared symmetric key
 * @param mimeType - Original MIME type
 * @returns Decrypted blob or null
 */
export async function downloadDecryptedMedia(
  path: string,
  nonce: string,
  sharedKey: Uint8Array,
  mimeType: string
): Promise<Blob | null> {
  // Download encrypted blob from 'end-to-end app' bucket
  const { data, error } = await supabase.storage
    .from('end-to-end app')
    .download(path);
  
  if (error || !data) {
    console.error('Download failed:', error);
    return null;
  }
  
  // Decrypt client-side
  return await decryptFile(data, nonce, sharedKey, mimeType);
}

/**
 * Delete media file from storage
 */
export async function deleteMedia(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from('end-to-end app')
    .remove([path]);
  
  if (error) {
    console.error('Delete failed:', error);
  }
}

