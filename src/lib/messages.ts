/**
 * Message operations with Supabase
 * Updated to use new schema: chats, chat_members, messages with bytea
 */

import { supabase, Message } from './supabase';
import { encryptMessage, decryptMessage, deriveSharedKey, fingerprintPublicKey } from './crypto';
import { uploadEncryptedMedia, downloadDecryptedMedia } from './media';

export interface MessageWithDecrypted extends Message {
  decryptedText?: string;
  decryptedMedia?: Blob;
  isFromMe: boolean;
}

/**
 * Get or create a 1:1 chat between two users
 * Uses the function from chats.ts to avoid duplication
 */
async function getOrCreateChat(userId1: string, userId2: string): Promise<string> {
  const { getOrCreateChatWithPeer } = await import('./chats');
  return getOrCreateChatWithPeer(userId2, false);
}

/**
 * Send a text message
 */
export async function sendTextMessage(
  recipientId: string,
  text: string,
  myPrivateKey: string,
  peerPublicKey: string
): Promise<Message> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  // Get or create chat
  const chatId = await getOrCreateChat(user.id, recipientId);
  
  // Derive shared key
  const sharedKey = await deriveSharedKey(myPrivateKey, peerPublicKey);
  
  // Encrypt message
  const { ciphertext, nonce } = await encryptMessage(text, sharedKey);
  
  // Convert base64 to Uint8Array for bytea storage
  // Supabase PostgREST accepts bytea as base64 strings or Uint8Array
  // We'll convert to Uint8Array which Supabase handles correctly
  const ciphertextBytes = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const nonceBytes = Uint8Array.from(atob(nonce), c => c.charCodeAt(0));
  
  // Insert message - Supabase accepts Uint8Array for bytea columns
  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_id: user.id,
      ciphertext: ciphertextBytes, // Uint8Array for bytea
      nonce: nonceBytes, // Uint8Array for bytea
      kind: 'text',
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to send message: ${error.message}`);
  }
  
  return data;
}

/**
 * Send a media message
 */
export async function sendMediaMessage(
  recipientId: string,
  file: File,
  myPrivateKey: string,
  peerPublicKey: string
): Promise<Message> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  // Get or create chat
  const chatId = await getOrCreateChat(user.id, recipientId);
  
  // Derive shared key
  const sharedKey = await deriveSharedKey(myPrivateKey, peerPublicKey);
  
  // Upload encrypted media
  const { path, nonce, mimeType } = await uploadEncryptedMedia(
    file,
    sharedKey,
    chatId
  );
  
  // Determine media kind
  let kind: 'image' | 'audio' | 'file' = 'file';
  if (mimeType.startsWith('image/')) kind = 'image';
  else if (mimeType.startsWith('audio/')) kind = 'audio';
  
  // Encrypt empty text (or a placeholder) for bytea field
  const { ciphertext, nonce: textNonce } = await encryptMessage('', sharedKey);
  
  // Convert to Uint8Array for bytea
  const ciphertextBytes = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const nonceBytes = Uint8Array.from(atob(nonce), c => c.charCodeAt(0));
  
  // Insert message with media metadata
  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_id: user.id,
      ciphertext: ciphertextBytes, // Uint8Array for bytea
      nonce: nonceBytes, // Use media encryption nonce, Uint8Array
      kind,
      media_path: path,
      media_mime: mimeType,
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to send media: ${error.message}`);
  }
  
  return data;
}

/**
 * Fetch messages for a chat
 */
export async function fetchMessages(
  chatId: string,
  myPrivateKey: string,
  peerPublicKey: string
): Promise<MessageWithDecrypted[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  // Fetch messages for this chat
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });
  
  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }
  
  // Derive shared key
  const sharedKey = await deriveSharedKey(myPrivateKey, peerPublicKey);
  
  // Decrypt messages
  const decryptedMessages: MessageWithDecrypted[] = await Promise.all(
    (messages || []).map(async (msg) => {
      const isFromMe = msg.sender_id === user.id;
      const decrypted: MessageWithDecrypted = {
        ...msg,
        isFromMe,
      };
      
      // Supabase returns bytea as base64-encoded string by default
      // Convert to base64 string for decryption
      let ciphertextBase64: string;
      let nonceBase64: string;
      
      if (typeof msg.ciphertext === 'string') {
        // Already base64 string from Supabase
        ciphertextBase64 = msg.ciphertext;
        nonceBase64 = typeof msg.nonce === 'string' ? msg.nonce : btoa(String.fromCharCode(...msg.nonce));
      } else if (msg.ciphertext instanceof Uint8Array) {
        // Convert Uint8Array to base64
        ciphertextBase64 = btoa(String.fromCharCode(...msg.ciphertext));
        nonceBase64 = msg.nonce instanceof Uint8Array 
          ? btoa(String.fromCharCode(...msg.nonce))
          : msg.nonce as string;
      } else {
        // Fallback: try to convert
        ciphertextBase64 = btoa(String.fromCharCode(...(msg.ciphertext as any)));
        nonceBase64 = btoa(String.fromCharCode(...(msg.nonce as any)));
      }
      
      // Decrypt text if present
      if (msg.kind === 'text' || (ciphertextBase64 && ciphertextBase64.length > 0)) {
        const text = await decryptMessage(ciphertextBase64, nonceBase64, sharedKey);
        if (text) {
          decrypted.decryptedText = text;
        }
      }
      
      // Decrypt media if present
      if (msg.media_path && msg.media_mime) {
        const media = await downloadDecryptedMedia(
          msg.media_path,
          nonceBase64,
          sharedKey,
          msg.media_mime
        );
        if (media) {
          decrypted.decryptedMedia = media;
        }
      }
      
      return decrypted;
    })
  );
  
  return decryptedMessages;
}

/**
 * Mark message as delivered
 */
export async function markMessageAsDelivered(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ delivered: true })
    .eq('id', messageId);
  
  if (error) {
    console.error('Failed to mark as delivered:', error);
  }
}

/**
 * Delete message (hard delete - RLS will handle permissions)
 */
export async function deleteMessage(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId);
  
  if (error) {
    console.error('Failed to delete message:', error);
  }
}

