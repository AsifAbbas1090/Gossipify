/**
 * ChatScreen - WhatsApp Web Style
 * Accepts peerUsername as prop or route param
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  FlatList,
  Alert,
  Modal,
  Image,
  useColorScheme,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  getStoredKeypair,
  deriveSharedKey,
  encryptMessage,
  decryptMessage,
  fingerprintPublicKey,
} from '../lib/crypto';
import { getPublicKey, poll, sendMessage, deleteMessage } from '../lib/api';
import {
  pickAttachment,
  encryptAndUploadAttachment,
  downloadAndDecryptAttachment,
} from '../lib/attachments';
import { getUsername } from '../lib/storage';
import { Buffer } from 'buffer';
import { getTheme } from '../theme';
import { ChatBubble, Composer, KeyFingerprintModal } from '../components';
import EmojiPicker from '../components/EmojiPicker';

interface ChatScreenProps {
  peerUsername: string;
  onBack?: () => void;
}

type ChatItem = {
  id: string;
  fromMe: boolean;
  text: string;
  timestamp: number;
  attachment?: { id: string; nonce: string; name: string; mime?: string | null } | null;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'deleted';
  isDecrypting?: boolean;
};

export default function ChatScreen({ peerUsername, onBack }: ChatScreenProps) {
  const scheme = useColorScheme() || 'light';
  const theme = getTheme(scheme);
  const navigation = useNavigation();
  const [input, setInput] = useState('');
  const [items, setItems] = useState<ChatItem[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selfDestructSec, setSelfDestructSec] = useState<number | null>(null);
  const [showFingerprintModal, setShowFingerprintModal] = useState(false);
  const [peerFingerprint, setPeerFingerprint] = useState<string>('');
  const [sendingMessageId, setSendingMessageId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [draftAttachment, setDraftAttachment] = useState<{ uri: string; mime?: string | null; name: string } | null>(null);

  const convoKeyRef = useRef<Uint8Array | null>(null);
  const meRef = useRef<string>('');
  const [since, setSince] = useState<number>(0);
  const meUserRef = useRef<string>('');
  const sinceRef = useRef<number>(0);
  const flatListRef = useRef<FlatList>(null);
  const peerPubRef = useRef<string>('');

  useEffect(() => {
    (async () => {
      const me = await getStoredKeypair();
      if (!me) {
        Alert.alert('Error', 'Missing keys. Please restart and register.');
        return;
      }
      meUserRef.current = (await getUsername()) || '';
      meRef.current = me.publicKey;
      const peerPub = await getPublicKey(peerUsername.trim());
      if (!peerPub) {
        Alert.alert(
          'User not found',
          `User "${peerUsername}" is not registered. They need to register first before you can chat with them.`,
          [{ text: 'OK', onPress: () => {
            if (onBack) {
              onBack();
            } else {
              navigation.goBack();
            }
          }}]
        );
        return;
      }
      peerPubRef.current = peerPub;
      convoKeyRef.current = deriveSharedKey(me.secretKey, peerPub);
      setPeerFingerprint(fingerprintPublicKey(peerPub));
      const start = Date.now() - 1000 * 60 * 60;
      sinceRef.current = start;
      setSince(start);
    })();
  }, [peerUsername, navigation, onBack]);

  useEffect(() => {
    let timer: any;
    const loop = async () => {
      try {
        const user = meUserRef.current;
        const key = convoKeyRef.current;
        if (!user || !key) {
          timer = setTimeout(loop, 2000);
          return;
        }
        const sinceLocal = sinceRef.current;
        const r = await poll(user, sinceLocal);
        let updatedSince = sinceLocal;
        setItems((prev) => {
          const existing = new Set(prev.map((p) => p.id));
          const next = [...prev];
          const currentPeer = peerUsername.trim().toLowerCase();
          const myUsername = String(user || '').trim().toLowerCase();
          
          for (const m of r.messages as any[]) {
            if (existing.has(m.id)) continue;
            const msgFrom = String(m.from || '').trim().toLowerCase();
            const msgTo = String(m.to || '').trim().toLowerCase();
            
            // First check: message must involve current user
            if (msgFrom !== myUsername && msgTo !== myUsername) continue;
            
            // Second check: message must be between current user and current peer ONLY
            // This is critical - we must ensure the message is EXACTLY between these two users
            const isFromMeToPeer = msgFrom === myUsername && msgTo === currentPeer;
            const isFromPeerToMe = msgFrom === currentPeer && msgTo === myUsername;
            
            if (!isFromMeToPeer && !isFromPeerToMe) {
              // This message is not for this chat, skip it
              continue;
            }
            
            // Additional safety check: ensure peer is not empty and matches exactly
            if (!currentPeer || currentPeer === '') continue;
            if (msgFrom !== myUsername && msgFrom !== currentPeer) continue;
            if (msgTo !== myUsername && msgTo !== currentPeer) continue;
            
            // Message is for this chat
            // Compare using lowercase to ensure consistency
            if (msgFrom === myUsername) {
              // This is a message I sent - verify it's to the current peer
              if (msgTo !== currentPeer) {
                // This message is not to the current peer - skip it
                continue;
              }
              
              const tempId = sendingMessageId;
              if (tempId && m.id) {
                setSendingMessageId(null);
                const updated = next.map((item) =>
                  item.id === tempId ? { ...item, id: m.id, status: 'sent' as const } : item
                );
                return updated.sort((a, b) => a.timestamp - b.timestamp);
              }
              
              // Decrypt my own message to display it
              const text = m.ciphertext ? Buffer.from(decryptMessage(m.ciphertext, m.nonce, key) || Buffer.alloc(0)).toString('utf8') : '';
              next.push({
                id: m.id,
                fromMe: true,
                text,
                timestamp: m.timestamp,
                attachment: m.attachmentId ? { 
                  id: m.attachmentId, 
                  nonce: m.nonce, 
                  name: (m as any).name || 'Attachment', 
                  mime: (m as any).mime || null 
                } : null,
                status: 'sent',
              });
              existing.add(m.id);
            } else {
              // This is a message FROM the peer TO me
              // CRITICAL: Verify this message is actually from the current peer by checking fingerprint
              const messageFingerprint = m.fingerprint || '';
              const currentPeerFingerprint = peerPubRef.current ? fingerprintPublicKey(peerPubRef.current) : '';
              
              // If we have fingerprints, they MUST match for this message to belong to this chat
              // This prevents messages from other peers (encrypted with different keys) from appearing
              if (messageFingerprint && currentPeerFingerprint && messageFingerprint !== currentPeerFingerprint) {
                // This message is encrypted with a different key - it's from a different peer
                // Skip it - it doesn't belong in this conversation
                continue;
              }
              
              // Handle text messages
              let decryptedText: string | null = null;
              if (m.ciphertext && m.ciphertext.trim().length > 0) {
                try {
                  const opened = decryptMessage(m.ciphertext, m.nonce, key);
                  if (!opened) {
                    // Decryption failed - this message is not for this conversation
                    // Skip it to prevent wrong messages from appearing
                    console.warn('Failed to decrypt message - wrong key or corrupted', { 
                      from: m.from, 
                      to: m.to, 
                      id: m.id,
                      currentPeer: currentPeer,
                      messageFingerprint,
                      currentPeerFingerprint
                    });
                    continue;
                  }
                  decryptedText = Buffer.from(opened).toString('utf8');
                } catch (error) {
                  // Decryption error - skip this message
                  console.error('Error decrypting message:', error, { from: m.from, to: m.to, id: m.id });
                  continue;
                }
              }
              
              // For attachment messages, verify we can at least access the attachment
              // If decryption would fail, we shouldn't show it
              // Handle attachment messages (ciphertext may be empty)
              next.push({
                id: m.id,
                fromMe: false,
                text: decryptedText || (m.attachmentId ? ((m as any).name || 'Attachment') : ''),
                timestamp: m.timestamp,
                attachment: m.attachmentId ? {
                  id: m.attachmentId,
                  nonce: m.nonce,
                  name: (m as any).name || 'Attachment',
                  mime: (m as any).mime || null,
                } : null,
                status: undefined,
              });
              existing.add(m.id);
            }
          }
          if (r.deletions && Array.isArray(r.deletions)) {
            for (const d of r.deletions as any[]) {
              updatedSince = Math.max(updatedSince, (d.deletedAt || 0) + 1);
            }
            const filtered = next.filter(
              (i) => !r.deletions.find((d: any) => d.id === i.id)
            );
            return filtered.sort((a, b) => a.timestamp - b.timestamp);
          }
          return next.sort((a, b) => a.timestamp - b.timestamp);
        });
        if (updatedSince !== sinceLocal) {
          sinceRef.current = updatedSince;
          setSince(updatedSince);
        }
      } catch {}
      timer = setTimeout(loop, 1500);
    };
    loop();
    return () => clearTimeout(timer);
  }, [peerUsername, since, sendingMessageId]);

  function convertShortcodes(text: string): string {
    const map: Record<string, string> = {
      ':smile:': '😄',
      ':grin:': '😁',
      ':heart:': '❤️',
      ':thumbs_up:': '👍',
      ':thumbsup:': '👍',
      ':fire:': '🔥',
      ':cry:': '😢',
      ':laugh:': '😂',
    };
    return text.replace(/:[a-z_]+:/g, (m) => map[m] || m);
  }

  const onSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    const me = await getStoredKeypair();
    if (!me) return;
    const key = convoKeyRef.current;
    if (!key) return;
    if (!meUserRef.current) {
      const username = await getUsername();
      if (!username) {
        Alert.alert('Error', 'Username not found. Please restart the app.');
        return;
      }
      meUserRef.current = username;
    }
    const bytes = Uint8Array.from(Buffer.from(convertShortcodes(text), 'utf8'));
    const { nonce, ciphertext } = encryptMessage(bytes, key);
    const payload = {
      from: meUserRef.current,
      to: peerUsername.trim(),
      ciphertext,
      nonce,
      fingerprint: fingerprintPublicKey(me.publicKey),
      timestamp: Date.now(),
    };
    const tempId = Math.random().toString(36);
    setSendingMessageId(tempId);
    const newMessage: ChatItem = {
      id: tempId,
      fromMe: true,
      text,
      timestamp: payload.timestamp,
      attachment: null,
      status: 'sending',
    };
    setItems((prev) => [...prev, newMessage].sort((a, b) => a.timestamp - b.timestamp));
    try {
    const resp = await sendMessage(payload);
      const msgId = resp?.id || tempId;
      setSendingMessageId(null);
      setItems((prev) => {
        const updated = prev.map((item) =>
          item.id === tempId
            ? { ...item, id: msgId, status: 'sent' as const }
            : item
        );
        return updated.sort((a, b) => a.timestamp - b.timestamp);
      });
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    if (selfDestructSec) {
      setTimeout(async () => {
          setItems((prev) => prev.filter((i) => i.id !== msgId));
          try {
            await deleteMessage(msgId, meUserRef.current || me.publicKey);
          } catch {}
      }, selfDestructSec * 1000);
      }
    } catch (e) {
      setSendingMessageId(null);
      setItems((prev) => prev.filter((i) => i.id !== tempId));
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const onAttach = async () => {
    try {
      const att = await pickAttachment();
      if (!att) return;
      
      // Show preview/draft for images
      if (att.mime && att.mime.startsWith('image/')) {
        // Convert file URI to data URI for preview (works for both web and native)
        let previewUri = att.uri;
        try {
          // For web, expo-document-picker might return a blob URL or file URI
          if (Platform.OS === 'web') {
            if (att.uri.startsWith('blob:') || att.uri.startsWith('http')) {
              const response = await fetch(att.uri);
              const blob = await response.blob();
              const reader = new FileReader();
              previewUri = await new Promise<string>((resolve, reject) => {
                reader.onloadend = () => {
                  if (reader.result) {
                    resolve(reader.result as string);
                  } else {
                    reject(new Error('Failed to read file'));
                  }
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            } else if (!att.uri.startsWith('data:')) {
              // Try to read as base64
              const response = await fetch(att.uri);
              const blob = await response.blob();
              const reader = new FileReader();
              previewUri = await new Promise<string>((resolve, reject) => {
                reader.onloadend = () => {
                  if (reader.result) {
                    resolve(reader.result as string);
                  } else {
                    reject(new Error('Failed to read file'));
                  }
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            }
          } else {
            // For native, read file as base64
            const { readAsStringAsync, EncodingType } = await import('expo-file-system');
            const base64 = await readAsStringAsync(att.uri, { encoding: EncodingType.Base64 });
            previewUri = `data:${att.mime};base64,${base64}`;
          }
        } catch (e) {
          console.error('Failed to create preview:', e);
          // Fallback to original URI
          previewUri = att.uri;
        }
        setDraftAttachment({ uri: previewUri, mime: att.mime, name: att.name });
        return; // Don't send yet, wait for user to confirm
      }
      
      // For non-images (audio, files), send immediately
      const key = convoKeyRef.current;
      if (!key) return;
      const enc = await encryptAndUploadAttachment(att, key);
      await sendAttachmentMessage(enc);
    } catch (e) {
      console.error('Attachment error:', e);
      Alert.alert('Attachment', 'Failed to attach file: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  const sendAttachmentMessage = async (enc: { id: string; nonce: string; mime?: string | null; name: string }) => {
    try {
      const key = convoKeyRef.current;
      if (!key) return;
      const me = await getStoredKeypair();
      if (!me) return;
      if (!meUserRef.current) {
        const username = await getUsername();
        if (!username) {
          Alert.alert('Error', 'Username not found. Please restart the app.');
          return;
        }
        meUserRef.current = username;
      }
      const payload = {
        from: meUserRef.current,
        to: peerUsername.trim(),
        ciphertext: '',
        nonce: enc.nonce,
        fingerprint: fingerprintPublicKey(me.publicKey),
        timestamp: Date.now(),
        attachmentId: enc.id,
        mime: enc.mime || null,
        name: enc.name || 'Voice message',
      };
      const tempId = Math.random().toString(36);
      setSendingMessageId(tempId);
      const newAttachmentMessage: ChatItem = {
        id: tempId,
        fromMe: true,
        text: enc.name,
        timestamp: payload.timestamp,
        attachment: {
          id: enc.id,
          nonce: enc.nonce,
          name: enc.name,
          mime: enc.mime,
        },
        status: 'sending',
      };
      setItems((prev) => [...prev, newAttachmentMessage].sort((a, b) => a.timestamp - b.timestamp));
      try {
        const resp = await sendMessage(payload);
        const msgId = resp?.id || tempId;
        setSendingMessageId(null);
        setItems((prev) => {
          const updated = prev
            .map((item) =>
              item.id === tempId ? { ...item, id: msgId, status: 'sent' as const } : item
            )
            .sort((a, b) => a.timestamp - b.timestamp);
          return updated;
        });
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 200);
        if (selfDestructSec) {
          setTimeout(async () => {
            setItems((prev) => prev.filter((i) => i.id !== msgId));
            try {
              await deleteMessage(msgId, meUserRef.current || me.publicKey);
            } catch {}
          }, selfDestructSec * 1000);
        }
      } catch (e) {
        setSendingMessageId(null);
        setItems((prev) => prev.filter((i) => i.id !== tempId));
        console.error('Send attachment error:', e);
        Alert.alert('Error', 'Failed to send attachment: ' + (e instanceof Error ? e.message : 'Unknown error'));
      }
    } catch (e) {
      console.error('Attachment error:', e);
      Alert.alert('Error', 'Failed to send attachment: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  const handleSendDraft = async () => {
    if (!draftAttachment) return;
    
    // Save draft before clearing
    const draftToSend = { ...draftAttachment };
    
    try {
      const key = convoKeyRef.current;
      if (!key) {
        Alert.alert('Error', 'Encryption key not available');
        return;
      }
      
      // Convert data URI back to file for encryption
      const att: { name: string; size?: number | null; mime?: string | null; uri: string } = {
        name: draftAttachment.name,
        mime: draftAttachment.mime,
        uri: draftAttachment.uri,
      };
      
      // Clear draft immediately to show it's being sent
      setDraftAttachment(null);
      
      const enc = await encryptAndUploadAttachment(att, key);
      await sendAttachmentMessage(enc);
    } catch (e) {
      console.error('Send draft error:', e);
      // Restore draft on error
      setDraftAttachment(draftToSend);
      Alert.alert('Error', 'Failed to send image: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  const handleCancelDraft = () => {
    setDraftAttachment(null);
  };

  const handleEmojiSelect = (emoji: string) => {
    setInput((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleMessageLongPress = (item: ChatItem) => {
              if (!item.fromMe) return;
    const options = ['Delete (local)', 'Delete for everyone', 'Cancel'];
    const destructiveButtonIndex = 1;
    const cancelButtonIndex = 2;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex,
          cancelButtonIndex,
        },
        async (buttonIndex) => {
          if (buttonIndex === 0) {
            setItems((prev) => prev.filter((i) => i.id !== item.id));
          } else if (buttonIndex === 1) {
            try {
              await deleteMessage(item.id, meUserRef.current || meRef.current);
              setItems((prev) => prev.filter((i) => i.id !== item.id));
            } catch {}
          }
        }
      );
    } else {
              Alert.alert('Message', 'Choose an action', [
        {
          text: 'Delete (local)',
          onPress: () => setItems((prev) => prev.filter((i) => i.id !== item.id)),
        },
        {
          text: 'Delete for everyone',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMessage(item.id, meUserRef.current || meRef.current);
              setItems((prev) => prev.filter((i) => i.id !== item.id));
            } catch {}
          },
        },
                { text: 'Cancel', style: 'cancel' },
              ]);
    }
  };

  const handleAttachmentPress = async (item: ChatItem) => {
    if (!item.attachment) return;
    try {
      const key = convoKeyRef.current;
      if (!key) return;
      
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, isDecrypting: true } : i
        )
      );
      
      const result = await downloadAndDecryptAttachment(
        item.attachment.id,
        item.attachment.nonce,
        key
      );
      
      const mime = item.attachment.mime || result.mime || 'application/octet-stream';
      
      if (mime.startsWith('image/')) {
        setPreviewImage(`data:${mime};base64,${result.base64}`);
      } else if (mime.startsWith('audio/')) {
        // For audio, create a blob URL and play it
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.Audio) {
          try {
            const buffer = result.bytes.buffer instanceof ArrayBuffer 
              ? result.bytes.buffer 
              : new Uint8Array(result.bytes).buffer;
            const audioBlob = new Blob([buffer], { type: mime });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            // Set up event handlers before playing
            audio.onended = () => {
              URL.revokeObjectURL(audioUrl);
            };
            audio.onerror = (e) => {
              console.error('Audio playback error:', e);
              URL.revokeObjectURL(audioUrl);
              Alert.alert('Audio', 'Failed to play audio file');
            };
            
            // Play the audio
            audio.play().catch((e) => {
              console.error('Failed to play audio:', e);
              URL.revokeObjectURL(audioUrl);
              Alert.alert('Audio', 'Failed to play audio. The file may be corrupted or in an unsupported format.');
            });
          } catch (e) {
            console.error('Error creating audio player:', e);
            Alert.alert('Audio', 'Failed to create audio player: ' + (e instanceof Error ? e.message : 'Unknown error'));
          }
        } else {
          Alert.alert('Audio', 'Audio playback is only supported on web');
        }
      } else {
        // For other files, offer download
        const buffer = result.bytes.buffer instanceof ArrayBuffer 
          ? result.bytes.buffer 
          : new Uint8Array(result.bytes).buffer;
        const blob = new Blob([buffer], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.attachment.name || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, isDecrypting: false } : i
        )
      );
    } catch (e) {
      Alert.alert('Attachment', 'Failed to download/decrypt: ' + (e instanceof Error ? e.message : 'Unknown error'));
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isDecrypting: false } : i))
      );
    }
  };

  const handleLongPressSend = () => {
    Alert.alert(
      'Send with expiry?',
      'Choose when this message should disappear',
      [
        { text: '10 seconds', onPress: () => setSelfDestructSec(10) },
        { text: '1 minute', onPress: () => setSelfDestructSec(60) },
        { text: '5 minutes', onPress: () => setSelfDestructSec(300) },
        { text: '1 hour', onPress: () => setSelfDestructSec(3600) },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setSelfDestructSec(null),
        },
      ]
    );
  };

  const handleVoiceRecord = async (uri: string) => {
    try {
      // Convert blob URI to file for attachment
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Use the existing attachment flow
      const key = convoKeyRef.current;
      if (!key) return;
      
      // For web, we need to convert blob to base64 and create a file URI
      // Read blob as base64
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:audio/webm;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      
      // Create a temporary file URI (for web compatibility)
      const mimeType = blob.type || 'audio/webm';
      const fileName = `recording.${mimeType.split('/')[1] || 'webm'}`;
      
      // Convert to PickedAttachment format
      const att = {
        name: fileName,
        size: blob.size,
        mime: mimeType,
        uri: `data:${mimeType};base64,${base64}`, // Use data URI for web
      };
      
      const enc = await encryptAndUploadAttachment(att, key);
      const me = await getStoredKeypair();
      if (!me) return;
      if (!meUserRef.current) {
        const username = await getUsername();
        if (!username) {
          Alert.alert('Error', 'Username not found. Please restart the app.');
          return;
        }
        meUserRef.current = username;
      }
      const payload = {
        from: meUserRef.current,
        to: peerUsername.trim(),
        ciphertext: '',
        nonce: enc.nonce,
        fingerprint: fingerprintPublicKey(me.publicKey),
        timestamp: Date.now(),
        attachmentId: enc.id,
        mime: enc.mime || null,
        name: enc.name || 'Voice message',
      };
      const tempId = Math.random().toString(36);
      setSendingMessageId(tempId);
      const newAttachmentMessage: ChatItem = {
        id: tempId,
        fromMe: true,
        text: 'Voice message',
        timestamp: payload.timestamp,
        attachment: {
          id: enc.id,
          nonce: enc.nonce,
          name: enc.name,
          mime: enc.mime,
        },
        status: 'sending',
      };
      setItems((prev) => [...prev, newAttachmentMessage].sort((a, b) => a.timestamp - b.timestamp));
      try {
        const resp = await sendMessage(payload);
        const msgId = resp?.id || tempId;
        setSendingMessageId(null);
        setItems((prev) => {
          const updated = prev
            .map((item) =>
              item.id === tempId ? { ...item, id: msgId, status: 'sent' as const } : item
            )
            .sort((a, b) => a.timestamp - b.timestamp);
          return updated;
        });
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 200);
      } catch (e) {
        setSendingMessageId(null);
        setItems((prev) => prev.filter((i) => i.id !== tempId));
        console.error('Send voice error:', e);
        Alert.alert('Error', 'Failed to send voice message: ' + (e instanceof Error ? e.message : 'Unknown error'));
      }
    } catch (e) {
      console.error('Voice recording error:', e);
      Alert.alert('Error', 'Failed to process voice recording: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* WhatsApp Web Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.header }]}>
        <View style={styles.headerContent}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        )}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {peerUsername[0]?.toUpperCase() || '?'}
            </Text>
      </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: theme.colors.textPrimary }]}>
              {peerUsername}
            </Text>
            <Text style={[styles.headerSubtext, { color: theme.colors.textSecondary }]}>
              End-to-end encrypted
            </Text>
            </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton}>
              <Text style={styles.headerIcon}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setShowFingerprintModal(true)}
            >
              <Text style={styles.headerIcon}>⋮</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        style={styles.messagesList}
        data={useMemo(() => [...items].sort((a, b) => a.timestamp - b.timestamp), [items])}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatBubble
            text={item.text}
            isFromMe={item.fromMe}
            timestamp={item.timestamp}
            status={item.status}
            attachment={
              item.attachment
                ? {
                    name: item.attachment.name,
                    mime: item.attachment.mime,
                    isDecrypting: item.isDecrypting,
                    id: item.attachment.id,
                    nonce: item.attachment.nonce,
                  }
                : null
            }
            onLongPress={() => handleMessageLongPress(item)}
            onPress={() => handleAttachmentPress(item)}
            onDecryptAttachment={async (id: string, nonce: string) => {
              try {
                const key = convoKeyRef.current;
                if (!key) return null;
                const result = await downloadAndDecryptAttachment(id, nonce, key);
                const mime = item.attachment?.mime || result.mime || 'image/*';
                return `data:${mime};base64,${result.base64}`;
              } catch (e) {
                console.error('Failed to decrypt attachment:', e);
                return null;
              }
            }}
            showEncryptionShimmer={item.fromMe && item.status === 'sending'}
          />
        )}
        contentContainerStyle={styles.messagesContent}
        inverted={false}
        onContentSizeChange={() => {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No messages yet
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>
              Start the conversation
            </Text>
          </View>
        }
      />

      {/* Draft Attachment Preview */}
      {draftAttachment && (
        <View style={[styles.draftContainer, { backgroundColor: theme.colors.header }]}>
          <Image source={{ uri: draftAttachment.uri }} style={styles.draftImage} resizeMode="cover" />
          <View style={styles.draftActions}>
            <TouchableOpacity
              onPress={handleCancelDraft}
              style={[styles.draftButton, { backgroundColor: theme.colors.border }]}
            >
              <Text style={[styles.draftButtonText, { color: theme.colors.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSendDraft}
              style={[styles.draftButton, { backgroundColor: theme.colors.primary }]}
            >
              <Text style={[styles.draftButtonText, { color: theme.colors.textInverse }]}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Composer */}
      <Composer
        value={input}
        onChangeText={setInput}
        onSend={onSend}
        onAttach={onAttach}
        onEmojiPress={() => setShowEmojiPicker(true)}
        onLongPressSend={handleLongPressSend}
        onVoiceRecord={handleVoiceRecord}
        placeholder="Type a message..."
      />

      {/* Emoji Picker */}
      <EmojiPicker
        visible={showEmojiPicker}
        onEmojiSelect={handleEmojiSelect}
        onClose={() => setShowEmojiPicker(false)}
      />

      {/* Image Preview Modal */}
      <Modal
        visible={!!previewImage}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <View style={[styles.imageModal, { backgroundColor: 'rgba(0, 0, 0, 0.9)' }]}>
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
          <TouchableOpacity
            onPress={() => setPreviewImage(null)}
            style={[styles.closeButton, { backgroundColor: theme.colors.backgroundCard }]}
          >
            <Text style={[styles.closeButtonText, { color: theme.colors.textPrimary }]}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <KeyFingerprintModal
        visible={showFingerprintModal}
        fingerprint={peerFingerprint}
        peerUsername={peerUsername}
        onClose={() => setShowFingerprintModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 60,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E9EDEF',
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#54656F',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DFE5E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#54656F',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '400',
  },
  headerSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    fontSize: 20,
    color: '#54656F',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 15,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
  },
  imageModal: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '90%',
    height: '70%',
  },
  closeButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  draftContainer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E9EDEF',
  },
  draftImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: 'center',
  },
  draftActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  draftButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  draftButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
