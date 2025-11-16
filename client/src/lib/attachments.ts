import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { encryptMessage, decryptMessage, toBase64, fromBase64 } from './crypto';
import { uploadAttachment, downloadAttachment } from './api';

export type PickedAttachment = {
  name: string;
  size?: number | null;
  mime?: string | null;
  uri: string;
};

export async function pickAttachment(): Promise<PickedAttachment | null> {
  const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
  if (res.canceled) return null;
  const file = res.assets[0];
  return { name: file.name, size: file.size ?? null, mime: file.mimeType ?? null, uri: file.uri };
}

export async function encryptAndUploadAttachment(att: PickedAttachment, key: Uint8Array): Promise<{ id: string; nonce: string; mime?: string | null; name: string; size?: number | null }>{
  const base64 = await FileSystem.readAsStringAsync(att.uri, { encoding: FileSystem.EncodingType.Base64 });
  const bytes = fromBase64(base64);
  const { nonce, ciphertext } = encryptMessage(bytes, key);
  const tmp = FileSystem.cacheDirectory + 'enc-' + Date.now() + '.bin';
  await FileSystem.writeAsStringAsync(tmp, ciphertext, { encoding: FileSystem.EncodingType.Base64 });
  const { id } = await uploadAttachment(tmp);
  return { id, nonce, mime: att.mime ?? null, name: att.name, size: att.size ?? null };
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


