import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { encryptMessage, decryptMessage, toBase64, fromBase64 } from './crypto';
import { uploadAttachment, downloadAttachment } from './api';
import { SERVER_URL } from '../config';

export type PickedAttachment = {
  name: string;
  size?: number | null;
  mime?: string | null;
  uri: string;
};

export async function pickAttachment(): Promise<PickedAttachment | null> {
  const res = await DocumentPicker.getDocumentAsync({ 
    copyToCacheDirectory: true, 
    multiple: false,
    type: ['image/*', 'audio/*', '*/*'], // Allow images, audio, and all files
  });
  if (res.canceled) return null;
  const file = res.assets[0];
  return { name: file.name, size: file.size ?? null, mime: file.mimeType ?? null, uri: file.uri };
}

export async function encryptAndUploadAttachment(att: PickedAttachment, key: Uint8Array): Promise<{ id: string; nonce: string; mime?: string | null; name: string; size?: number | null }>{
  let base64: string;
  
  // Handle data URIs (web) vs file URIs (native)
  if (att.uri.startsWith('data:')) {
    // Extract base64 from data URI
    const commaIndex = att.uri.indexOf(',');
    base64 = att.uri.substring(commaIndex + 1);
  } else if (att.uri.startsWith('blob:') || (typeof window !== 'undefined' && att.uri.startsWith('http'))) {
    // For web blob URLs or http URLs, fetch and convert to base64
    try {
      const response = await fetch(att.uri);
      const blob = await response.blob();
      const reader = new FileReader();
      base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          if (reader.result) {
            const dataUrl = reader.result as string;
            const commaIndex = dataUrl.indexOf(',');
            resolve(dataUrl.substring(commaIndex + 1));
          } else {
            reject(new Error('Failed to read blob'));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      throw new Error('Failed to read file: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  } else {
    // Use FileSystem for native file URIs
    try {
      base64 = await FileSystem.readAsStringAsync(att.uri, { encoding: FileSystem.EncodingType.Base64 });
    } catch (e) {
      throw new Error('Failed to read file: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  }
  
  const bytes = fromBase64(base64);
  const { nonce, ciphertext } = encryptMessage(bytes, key);
  
  // ciphertext from encryptMessage is already base64-encoded string
  // For web, we need to decode it to bytes, then create Blob
  // For native, we can write the base64 string directly
  if (typeof window !== 'undefined') {
    // Web: convert base64 ciphertext to Uint8Array, then to Blob
    try {
      const cipherBytes = fromBase64(ciphertext);
      const cipherBlob = new Blob([cipherBytes], { type: 'application/octet-stream' });
      const form = new FormData();
      form.append('blob', cipherBlob, 'encrypted.bin');
      
      const r = await fetch(`${SERVER_URL}/upload`, {
        method: 'POST',
        body: form,
      });
      if (!r.ok) {
        const errorText = await r.text();
        console.error('Upload failed:', errorText);
        throw new Error(`upload failed: ${errorText}`);
      }
      const { id } = await r.json();
      return { id, nonce, mime: att.mime ?? null, name: att.name, size: att.size ?? null };
    } catch (e) {
      console.error('Upload error:', e);
      throw new Error('Failed to upload attachment: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  } else {
    // Native: use FileSystem - write base64 string directly
    try {
      const tmp = FileSystem.cacheDirectory + 'enc-' + Date.now() + '.bin';
      await FileSystem.writeAsStringAsync(tmp, ciphertext, { encoding: FileSystem.EncodingType.Base64 });
      const { uploadAttachment } = await import('./api');
      const { id } = await uploadAttachment(tmp);
      return { id, nonce, mime: att.mime ?? null, name: att.name, size: att.size ?? null };
    } catch (e) {
      console.error('Upload error:', e);
      throw new Error('Failed to upload attachment: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  }
}

function detectMime(bytes: Uint8Array): string {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 3 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
  return 'application/octet-stream';
}

export async function downloadAndDecryptAttachment(id: string, nonce: string, key: Uint8Array): Promise<{ bytes: Uint8Array; base64: string; mime: string }>{
  const buf = await downloadAttachment(id);
  const bytes = new Uint8Array(buf);
  const cipherB64 = toBase64(bytes);
  const opened = decryptMessage(cipherB64, nonce, key);
  if (!opened) throw new Error('Decryption failed');
  const mime = detectMime(opened);
  return { bytes: opened, base64: toBase64(opened), mime };
}


